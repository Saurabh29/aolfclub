import { createMiddleware } from "@solidjs/start/middleware";
import { getAuthSession } from "~/lib/auth";

/**
 * Authentication + setup-mode middleware.
 *
 * Public routes (no session required):
 *   /               — landing page
 *   /about          — about page
 *   /api/auth/*     — Auth.js endpoints
 *   /assets/*       — static assets
 *   /_build/*       — Vite build chunks
 *
 * Setup mode (authenticated + no activeLocationId + canBootstrap=true):
 *   → Only /locations/new is permitted; all other protected routes redirect there.
 *
 * Blocked (authenticated + no activeLocationId + canBootstrap=false):
 *   → Redirect to / — user was added without bootstrap rights, wait for an admin
 *     to assign them to a location through the UI.
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
        return new Response(null, {
          status: 302,
          headers: { Location: "/" },
        });
      }

      const activeLocationId = (session as any).user?.activeLocationId ?? null;
      const canBootstrap = (session as any).user?.canBootstrap === true;

      // Setup mode: no location yet, has bootstrap privilege
      if (!activeLocationId && canBootstrap) {
        // Allow only the location creation page
        if (!pathname.startsWith("/locations/new")) {
          return new Response(null, {
            status: 302,
            headers: { Location: "/locations/new" },
          });
        }
        return; // permit /locations/new
      }

      // No location + no bootstrap rights → back to landing
      if (!activeLocationId && !canBootstrap) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/" },
        });
      }
    } catch (err) {
      console.error("[middleware] auth check failed:", err);
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }
  },
});
