import github from "@auth/core/providers/github";
import type { StartAuthJSConfig } from "start-authjs";
import { env } from "~/server/config";
import { createOrGetOAuthUser, findUserByEmail } from "../services/auth.service";

export const authConfig: StartAuthJSConfig = {
  secret: env.AUTH_SECRET,
  basePath: new URL(env.AUTH_URL).pathname,
  session: {
    strategy: "jwt",
  },
  providers: [
    github({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "read:user user:email" } },
    }),
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
        return true;
      } catch (err) {
        console.error("[auth] signIn callback error:", err);
        return false;
      }
    },

    jwt: async ({ token, user }) => {
      // Skip DB lookup on subsequent token refreshes
      if (token.userId) return token;

      // Initial sign-in: resolve our DB userId from the OAuth email
      if (user?.email) {
        const dbUser = await findUserByEmail(user.email);
        if (dbUser) {
          token.userId = dbUser.id;
          if (dbUser.activeLocationId) {
            token.activeLocationId = dbUser.activeLocationId;
          }
        }
      }
      return token;
    },

    session: async ({ session, token }) => {
      // Promote token fields to session.user — no extra DB call here
      if (token.userId) (session as any).user.id = token.userId;
      if (token.activeLocationId)
        (session as any).user.activeLocationId = token.activeLocationId;
      return session;
    },
  },
};
