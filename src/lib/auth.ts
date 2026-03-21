import { isServer } from "solid-js/web";
import { query, redirect } from "@solidjs/router";

/**
 * Unified session query — works on both server and client.
 *
 * Server: reads the JWT session from the incoming request via start-authjs.
 * Client: fetches /api/auth/session (cookie-based).
 *
 * Wrapped with query() for caching. Use with createAsync() in components.
 */
export const getAuthSession = query(async () => {
  "use server";
  try {
    if (isServer) {
      const { getSession } = await import("start-authjs");
      const { getRequestEvent } = await import("solid-js/web");
      const { authConfig } = await import("~/server/auth");

      const ev = getRequestEvent?.();
      if (!ev) return null;
      return (await getSession(ev.request as Request, authConfig as any)) ?? null;
    } else {
      const resp = await fetch("/api/auth/session", { credentials: "include" });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data || null;
    }
  } catch (err) {
    console.error("[auth] getAuthSession failed:", err);
    return null;
  }
}, "auth-session");

/**
 * Get the authenticated user or redirect to "/".
 * Use with { deferStream: true } in protected layouts to block rendering
 * until auth is confirmed.
 */
export const getUser = query(async () => {
  "use server";
  const session = await getAuthSession();
  if (!session?.user) throw redirect("/");
  return session.user;
}, "auth-user");

export type SessionInfo = {
  userId: string | null;
  activeLocationId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  raw?: any | null;
};

/**
 * Returns structured session info for use inside server functions.
 * Reads userId from session.user.id (set by the jwt → session callback).
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  const session = await getAuthSession();
  const raw = session ?? null;
  const userId =
    raw?.user?.id ?? raw?.user?.userId ?? raw?.user?.sub ?? null;

  if (!userId) {
    return { userId: null, activeLocationId: null, email: null, name: null, image: null, raw };
  }

  const activeLocationId = raw?.user?.activeLocationId ?? null;

  return {
    userId,
    activeLocationId,
    email: raw?.user?.email ?? null,
    name: raw?.user?.name ?? null,
    image: raw?.user?.image ?? null,
    raw,
  };
}
