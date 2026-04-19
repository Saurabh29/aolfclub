import { createMiddleware } from "@solidjs/start/middleware";
import { getAuthSession } from "~/lib/auth";
import type { GroupType } from "~/lib/schemas/domain/user.schema";

/**
 * Routes each role is allowed to access.
 * Super-admins (isAdmin=true) bypass this table entirely.
 */
const ROLE_ROUTES: Record<GroupType, string[]> = {
  ADMIN:     ["/leads", "/members", "/tasks", "/locations", "/community"],
  TEACHER:   ["/leads", "/members", "/tasks", "/locations", "/community"],
  VOLUNTEER: ["/tasks", "/community"],
};

/**
 * Authentication + Authorization + setup-mode middleware.
 *
 * Public routes (no session required):
 *   /                -  landing page
 *   /about           -  about page
 *   /api/auth/*      -  Auth.js endpoints
 *   /assets/*        -  static assets
 *   /_build/*        -  Vite build chunks
 *
 * Setup mode (authenticated + no activeLocationId + canBootstrap=true):
 *   > Only /locations/new is permitted; all other protected routes redirect there.
 *
 * Blocked (authenticated + no activeLocationId + canBootstrap=false):
 *   > Redirect to /  -  user was added without bootstrap rights, wait for an admin
 *     to assign them to a location through the UI.
 *
 * Role enforcement (authenticated + has activeLocationId):
 *   > isAdmin=true → full access (super-admin bypass)
 *   > No activeRole → redirect to /  (user has no role at active location)
 *   > Role present → check against ROLE_ROUTES table; deny if not listed
 */
export default createMiddleware({
  onRequest: async (event) => {
    const { pathname } = new URL(event.request.url);

    const publicPrefixes = ["/api/auth/", "/assets/", "/_build/"];
    const publicExact = ["/", "/about"];

    if (
      publicExact.includes(pathname) ||
      publicPrefixes.some((p) => pathname.startsWith(p))
    ) {
      return;
    }

    try {
      const session = await getAuthSession();

      // Not authenticated > back to landing
      if (!session?.user) {
        return new Response(null, { status: 302, headers: { Location: "/" } });
      }

      const userId: string | undefined =
        (session as any).user?.id ?? (session as any).user?.userId;
      const activeLocationId = (session as any).user?.activeLocationId ?? null;
      const canBootstrap = (session as any).user?.canBootstrap === true;
      const isAdmin: boolean = (session as any).user?.isAdmin === true;

      // ── Setup mode ─────────────────────────────────────────────────────────
      if (!activeLocationId && canBootstrap) {
        if (!pathname.startsWith("/locations/new")) {
          return new Response(null, { status: 302, headers: { Location: "/locations/new" } });
        }
        return;
      }

      if (!activeLocationId && !canBootstrap) {
        return new Response(null, { status: 302, headers: { Location: "/" } });
      }

      // ── Super-admin bypass ─────────────────────────────────────────────────
      // Read fresh isAdmin + activeRole from DB (not JWT) so revocation is immediate
      if (!userId) {
        return new Response(null, { status: 302, headers: { Location: "/" } });
      }

      let activeRole: GroupType | null = null;
      let isAdminFromDB = false;
      try {
        const { usersDataSource } = await import("~/server/data-sources/instances");
        const result = await usersDataSource.getById(userId);
        if (result.success && result.data) {
          activeRole = result.data.activeRole ?? null;
          isAdminFromDB = result.data.isAdmin ?? false;
          // Stash on event.locals so downstream getSessionInfo() can reuse it
          (event as any).locals = (event as any).locals ?? {};
          (event as any).locals._cachedUser = result.data;
        }
      } catch {
        // fail closed
      }

      if (isAdminFromDB) return;

      // ── Role-based authorization ──────────────────────────────────────────

      // No role at active location → no access
      if (!activeRole) {
        return new Response(null, { status: 302, headers: { Location: "/" } });
      }

      const allowed = ROLE_ROUTES[activeRole] ?? [];
      const isAllowed = allowed.some((route) => pathname.startsWith(route));

      if (!isAllowed) {
        // Redirect to the first route allowed for this role
        const fallback = allowed[0] ?? "/";
        return new Response(null, { status: 302, headers: { Location: fallback } });
      }
    } catch (err) {
      console.error("[middleware] auth check failed:", err);
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
  },
});
