import { query, redirect } from "@solidjs/router";
import type { Capability } from "~/lib/schemas/domain";

/**
 * Client-side helper to sign in with a specific OAuth provider.
 *
 * Auth.js v0.x requires a POST to /api/auth/signin/{provider} with a valid
 * csrfToken. A plain GET to that URL throws "UnknownAction".
 * This helper fetches the CSRF token then programmatically submits a form.
 */
export async function signInWithProvider(provider: string, callbackUrl = "/") {
  const csrfRes = await fetch("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/auth/signin/${encodeURIComponent(provider)}`;

  const addField = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  addField("csrfToken", csrfToken);
  addField("callbackUrl", callbackUrl);

  document.body.appendChild(form);
  form.submit();
}

/**
 * Unified session query  -  works on both server and client.
 *
 * Server: reads the JWT session from the incoming request via start-authjs.
 * Client: fetches /api/auth/session (cookie-based).
 *
 * Wrapped with query() for caching. Use with createAsync() in components.
 */
export const getAuthSession = query(async () => {
  "use server";
  try {
    const { getSession } = await import("start-authjs");
    const { getRequestEvent } = await import("solid-js/web");
    const { authConfig } = await import("~/server/auth");

    const ev = getRequestEvent?.();
    if (!ev) return null;
    return (await getSession(ev.request as Request, authConfig as any)) ?? null;
  } catch (err) {
    console.error("[auth] getAuthSession failed:", err);
    return null;
  }
}, "auth-session");

/**
 * Returns the list of provider IDs that are currently configured on the server
 * (e.g. ["github"] or ["github", "google"]).
 * Use in sign-in UI to show only the buttons that will actually work.
 */
export const getAvailableProviders = query(async () => {
  "use server";
  const { authConfig } = await import("~/server/auth");
  return (authConfig.providers as any[]).map((p: any) => p.id as string);
}, "auth-providers");

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
  activeRole: import("~/lib/schemas/domain/user.schema").GroupType | null;
  isAdmin: boolean;
  canBootstrap: boolean;
  email: string | null;
  name: string | null;
  image: string | null;
  raw?: any | null;
};

/**
 * Returns structured session info for use inside server functions.
 * Reads userId from session.user.id (set by the jwt > session callback).
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  const session = await getAuthSession();
  const raw = session ?? null;
  // Auth.js types session.user as AuthUser which lacks our custom fields.
  // Cast to any for the fields we promote via the jwt → session callback.
  const rawUser = (raw?.user as any) ?? null;
  const userId =
    rawUser?.id ?? rawUser?.userId ?? rawUser?.sub ?? null;

  if (!userId) {
    return { userId: null, activeLocationId: null, activeRole: null, isAdmin: false, canBootstrap: false, email: null, name: null, image: null, raw };
  }

  let activeLocationId: string | null = rawUser?.activeLocationId ?? null;
  const canBootstrap: boolean = rawUser?.canBootstrap === true;
  let activeRole: import("~/lib/schemas/domain/user.schema").GroupType | null = null;
  let isAdmin = false;

  // Read fresh activeRole and isAdmin from DB (always authoritative)
  // Reuse the user record cached by middleware (if available) to avoid a duplicate read
  if (typeof window === "undefined") {
    try {
      const { getRequestEvent } = await import("solid-js/web");
      const ev = getRequestEvent?.();
      const cachedUser = (ev as any)?.locals?._cachedUser as import("~/lib/schemas/domain/user.schema").User | undefined;

      if (cachedUser) {
        if (!activeLocationId) activeLocationId = cachedUser.activeLocationId ?? null;
        activeRole = cachedUser.activeRole ?? null;
        isAdmin = cachedUser.isAdmin ?? false;
      } else {
        const { usersDataSource } = await import("~/server/data-sources/instances");
        const userResult = await usersDataSource.getById(userId);
        if (userResult.success && userResult.data) {
          if (!activeLocationId) activeLocationId = userResult.data.activeLocationId ?? null;
          activeRole = userResult.data.activeRole ?? null;
          isAdmin = userResult.data.isAdmin ?? false;
          // Cache for any further calls in this request
          if (ev) {
            (ev as any).locals = (ev as any).locals ?? {};
            (ev as any).locals._cachedUser = userResult.data;
          }
        }
      }
    } catch {
      // Ignore DB errors
    }
  }

  return {
    userId,
    activeLocationId,
    activeRole,
    isAdmin,
    canBootstrap,
    email: rawUser?.email ?? null,
    name: rawUser?.name ?? null,
    image: rawUser?.image ?? null,
    raw,
  };
}

/**
 * Page-level capability guard for use with createAsync(..., { deferStream: true }).
 * Throws redirect("/") when the user lacks the required capability,
 * so the browser navigates to the home page instead of showing an error.
 */
export const requirePageCapability = query(async (capability: Capability) => {
  "use server";
  const { requireCapability } = await import("~/server/api/helpers");
  try {
    await requireCapability(capability);
  } catch {
    throw redirect("/");
  }
}, "require-page-capability");
