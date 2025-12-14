import { type SolidAuthConfig } from "@solid-mediakit/auth";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import type { JWT } from "@auth/core/jwt";

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
    callbacks: {
        signIn: async ({ user, account, profile, email, credentials }) => {
            return true;
        },
        jwt: async ({ token, user }) => {
            return token;
        },
        session: async ({ session, token }) => {
            return session;
        },
    }
};