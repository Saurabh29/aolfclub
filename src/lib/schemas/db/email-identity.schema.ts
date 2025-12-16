/**
 * EMAIL IDENTITY SCHEMA (ReBAC Design)
 *
 * Maps email addresses to user IDs for OAuth login
 * Provides O(1) email → userId lookup without GSI
 *
 * DynamoDB Keys:
 * - PK: EMAIL#<normalizedEmail>
 * - SK: USER#<userId>
 *
 * Example:
 * - PK: EMAIL#john.doe@gmail.com
 * - SK: USER#01HQZX1234ABCDEFGHIJK
 */

import { z } from "zod";

export const EmailIdentitySchema = z.object({
  PK: z.string().regex(/^EMAIL#.+$/),
  SK: z.string().regex(/^USER#[a-zA-Z0-9-]+$/),
  itemType: z.literal("EmailIdentity"),
  email: z.string().email(),
  userId: z.string().min(1),
  provider: z.string().optional(), // e.g., "google", "github"
  createdAt: z.string().datetime(),
});

export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;
