/**
 * ROLE SCHEMA (ReBAC Design)
 *
 * Global role definition (teacher, volunteer, member, guest)
 * Roles are assigned to users at specific locations
 * Roles grant access to pages
 *
 * DynamoDB Keys:
 * - PK: ROLE#<roleName>
 * - SK: META
 */

import { z } from "zod";

export const RoleNameSchema = z.enum([
  "teacher",
  "volunteer",
  "member",
  "guest",
  "admin",
]);

export const RoleSchema = z.object({
  PK: z.string().regex(/^ROLE#[a-zA-Z0-9_-]+$/),
  SK: z.literal("META"),
  itemType: z.literal("Role"),
  roleName: RoleNameSchema,
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RoleName = z.infer<typeof RoleNameSchema>;
export type Role = z.infer<typeof RoleSchema>;
