import { DefaultSession, DefaultUser, Account as AuthAccount } from "@auth/core/types";
import type { OAuthProvider } from "~/lib/schemas/db";

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}
