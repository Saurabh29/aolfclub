/**
 * USER SCHEMA (ReBAC Design)
 *
 * Global user identity - not tied to any specific location
 * Users can belong to multiple locations with different roles
 *
 * DynamoDB Keys:
 * - PK: USER#<userId>
 * - SK: META
 */

import { z } from "zod";

export const UserSchema = z.object({
  PK: z.string().regex(/^USER#[a-zA-Z0-9-]+$/),
  SK: z.literal("META"),
  itemType: z.literal("User"),
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
