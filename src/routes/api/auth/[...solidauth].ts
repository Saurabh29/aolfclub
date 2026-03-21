/**
 * Auth.js catch-all route.
 * Handles: /api/auth/signin, /api/auth/signout, /api/auth/callback/github,
 *          /api/auth/session, /api/auth/csrf, etc.
 */
import { StartAuthJS } from "start-authjs";
import { authConfig } from "~/server/auth";

export const { GET, POST } = StartAuthJS(authConfig);
