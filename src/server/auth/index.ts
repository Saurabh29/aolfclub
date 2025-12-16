import { type SolidAuthConfig } from "@solid-mediakit/auth";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import type { JWT } from "@auth/core/jwt";
import {
  createOrGetOAuthUser,
  findUserByEmail,
} from "~/server/services/auth.service";

export const authOptions: SolidAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "profile email",
        },
      },
    }),
  ],
  debug: true,
  secret: process.env.AUTH_SECRET!,
  trustHost: true,
  basePath: import.meta.env.VITE_AUTH_PATH || "/api/auth",
  // HTTP-specific settings for local development
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? `__Secure-authjs.session-token`
          : `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    signIn: async ({ user, account }) => {
      try {
        // Extract email from OAuth response
        const emailAddress = user.email?.toLowerCase();
        if (!emailAddress) {
          console.error("No email provided by OAuth provider");
          return false;
        }

        // Create or retrieve user
        const result = await createOrGetOAuthUser(
          emailAddress,
          user.name || null,
          user.image || null,
          account?.provider,
        );

        if (result.isNewUser) {
          console.log("Created new user:", emailAddress);
        } else {
          console.log("Existing user login:", emailAddress);
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    jwt: async ({ token, user }) => {
      // Add user ID to token if available
      if (user?.email) {
        const dbUser = await findUserByEmail(user.email);
        if (dbUser) {
          token.userId = dbUser.userId;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Add user info to session from token
      if (token.userId) {
        (session as any).user.id = token.userId;
      }
      return session;
    },
  },
};
