import github from "@auth/core/providers/github";
import type { StartAuthJSConfig } from "start-authjs";
import { env } from "../config";
import { getUserById } from "../db/repositories";
import {
	createOrGetOAuthUser,
	findUserByEmail,
} from "../services/auth.service";

export const authConfig: StartAuthJSConfig = {
	secret: env.AUTH_SECRET,
	basePath: new URL(env.AUTH_URL!).pathname,
	session: {
		strategy: "jwt",
	},
	providers: [
		github({
			clientId: env.GITHUB_CLIENT_ID!,
			clientSecret: env.GITHUB_CLIENT_SECRET!,
			authorization: { params: { scope: "read:user user:email" } },
		}),
	],
	debug: true,
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
			// If we already have userId in token, skip DB lookup
			if (token.userId) return token;

			// During initial sign-in `user` may be present; try resolving userId
			if (user?.email) {
				const dbUser = await findUserByEmail(user.email);
				if (dbUser) token.userId = dbUser.userId;
			}

			return token;
		},
		session: async ({ session, token }) => {
			// Add user info to session from token
			if (token.userId) {
				(session as any).user.id = token.userId;
				try {
					// Populate activeLocationId from persisted user preference if set
					const u = await getUserById(token.userId as string);
					if (u?.activeLocationId) {
						(session as any).user.activeLocationId = u.activeLocationId;
					}
				} catch (e) {
					// ignore errors here
				}
			}
			return session;
		},
	},
};
