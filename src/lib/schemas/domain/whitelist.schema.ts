import { z } from "zod";

/**
 * Whitelist entry — pre-authorized email allowed to sign in via OAuth.
 *
 * canBootstrap: when true, the first sign-in creates the initial location
 * and is consumed (set to false) once setup is complete.
 *
 * DB key:
 *   WHITELIST#<email> / META
 */
export const WhitelistSchema = z.object({
  email: z.email(),
  canBootstrap: z.boolean().default(false),
  createdAt: z.iso.datetime(),
});

export type WhitelistEntry = z.infer<typeof WhitelistSchema>;
