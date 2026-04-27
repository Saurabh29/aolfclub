import { createMiddleware } from "@solidjs/start/middleware";
import { getAuthSession } from "~/lib/auth";

/**
 * Authentication + setup-mode middleware.
 *
 * Per SolidStart docs, middleware should NOT perform authorization because it
 * does not run on every request (client-side navigations bypass it).
 * Authorization is enforced in server functions via requireCapability().
 *
 * This middleware handles:
 *   1. Public route bypass (no session required)
 *   2. Authentication gate (redirect to "/" if not signed in)
 *   3. Setup mode routing (bootstrap user → /locations/new)
 *   4. Blocked user routing (no location + can't bootstrap → "/")
 *   5. Caching the DB user record on event.locals for downstream use
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

      // Not authenticated → back to landing
      if (!session?.user) {
        return new Response(null, { status: 302, headers: { Location: "/" } });
      }

      const userId: string | undefined =
        (session as any).user?.id ?? (session as any).user?.userId;
      const activeLocationId = (session as any).user?.activeLocationId ?? null;
      const canBootstrap = (session as any).user?.canBootstrap === true;

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

      // ── Cache DB user for downstream server functions ──────────────────────
      if (userId) {
        try {
          const { usersDataSource } = await import("~/server/data-sources/instances");
          const result = await usersDataSource.getById(userId);
          if (result.success && result.data) {
            (event as any).locals = (event as any).locals ?? {};
            (event as any).locals._cachedUser = result.data;
          }
        } catch {
          // fail open — downstream functions will read from DB if cache misses
        }
      }
    } catch (err) {
      console.error("[middleware] auth check failed:", err);
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }
  },
});
