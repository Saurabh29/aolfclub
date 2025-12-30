/**
 * Auth.js API Route Handler
 * 
 * Handles all authentication routes via catch-all [...solidauth] parameter.
 * Routes handled: /api/auth/signin, /api/auth/callback/*, /api/auth/signout, etc.
 */

import { StartAuthJS } from "start-authjs";
import { authConfig } from "~/server/auth";

// Export GET and POST handlers directly from StartAuthJS
// These handle all Auth.js actions (signin, callback, signout, session, etc.)
export const { GET, POST } = StartAuthJS(authConfig);