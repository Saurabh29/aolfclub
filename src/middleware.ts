import { createMiddleware } from "@solidjs/start/middleware";
import { getAuthSession } from "~/lib/auth";

/**
 * Authentication middleware — matches the pattern from aolf-club.
 *
 * Public routes (no session required):
 *   /               — landing page
 *   /about          — about page
 *   /api/auth/*     — Auth.js endpoints (signin, callback, signout, session…)
 *   /assets/*       — static assets
 *   /_build/*       — Vite build chunks
 *
 * Everything else requires a valid session → 302 → /
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
      if (!session?.user) {
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
