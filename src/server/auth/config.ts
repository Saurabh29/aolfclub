import github from "@auth/core/providers/github";
import google from "@auth/core/providers/google";
import type { StartAuthJSConfig } from "start-authjs";
import { env } from "~/server/config";
import { createOrGetOAuthUser, findUserByEmail, AuthDeniedError } from "../services/auth.service";

export const authConfig: StartAuthJSConfig = {
  secret: env.AUTH_SECRET,
  basePath: new URL(env.AUTH_URL).pathname,
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? [
          github({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            authorization: { params: { scope: "read:user user:email" } },
          }),
        ]
      : []),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      try {
        const email = user.email?.toLowerCase();
        if (!email) {
          console.error("[auth] No email from OAuth provider");
          return false;
        }
        const result = await createOrGetOAuthUser(
          email,
          user.name ?? null,
          user.image ?? null,
          account?.provider,
        );
        if (result.isNewUser) {
          console.log("[auth] New user created:", email);
        } else {
          console.log("[auth] Existing user signed in:", email);
        }
        // Stash canBootstrap on the user object so the jwt callback can read it
        (user as any)._canBootstrap = result.canBootstrap;
        return true;
      } catch (err) {
        // AuthDeniedError = known denial (not in DB, not on bootstrap whitelist).
        // Log as a warning (expected case) and redirect with a user-friendly message.
        if (err instanceof AuthDeniedError) {
          console.warn("[auth] sign-in denied:", err.message);
          return "/?error=not_authorized";
        }
        // Unexpected error (DB down, network failure, etc.) — log as a real error.
        console.error("[auth] signIn callback error:", err);
        return "/?error=auth_error";
      }
    },

    jwt: async ({ token, user }) => {
      // Initial sign-in: resolve our DB userId from the OAuth email
      if (!token.userId && user?.email) {
        const dbUser = await findUserByEmail(user.email);
        if (dbUser) {
          token.userId = dbUser.id;
          if (dbUser.activeLocationId) {
            token.activeLocationId = dbUser.activeLocationId;
          }
          token.isAdmin = dbUser.isAdmin ?? false;
        }
        // Carry canBootstrap into the token (only true before setup completes)
        if ((user as any)._canBootstrap) {
          token.canBootstrap = true;
        }
        return token;
      }

      // Subsequent requests: refresh mutable fields from DB
      if (token.userId) {
        try {
          const dbUser = await findUserByEmail(token.email as string);
          if (dbUser) {
            token.activeLocationId = dbUser.activeLocationId ?? undefined;
            token.isAdmin = dbUser.isAdmin ?? false;
            // Clear canBootstrap once a location has been set
            if (dbUser.activeLocationId) {
              token.canBootstrap = undefined;
            }
          }
        } catch {
          // Keep existing token values on DB error
        }
      }
      return token;
    },

    session: async ({ session, token }) => {
      // Promote token fields to session.user  -  no extra DB call here
      if (token.userId) (session as any).user.id = token.userId;
      if (token.activeLocationId)
        (session as any).user.activeLocationId = token.activeLocationId;
      if (token.canBootstrap)
        (session as any).user.canBootstrap = token.canBootstrap;
      if (token.isAdmin !== undefined)
        (session as any).user.isAdmin = token.isAdmin;
      return session;
    },
  },
};
