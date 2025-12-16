/**
 * ROLE-PAGE ACCESS SCHEMA (ReBAC Design)
 *
 * Defines which pages a role can access (boolean allow/deny)
 * Query pattern: Get all pages for a role OR check if role allows page
 *
 * DynamoDB Keys:
 * - PK: ROLE#<roleName>
 * - SK: PAGE#<pageName>
 *
 * Access Pattern:
 * - Query by PK=ROLE#<name> to get all pages for role
 * - Get by PK=ROLE#<name> + SK=PAGE#<name> to check specific access
 */

import { z } from "zod";
import { RoleNameSchema } from "./role.schema";
import { PageNameSchema } from "./page.schema";

export const RolePageAccessSchema = z.object({
  PK: z.string().regex(/^ROLE#[a-zA-Z0-9_-]+$/),
  SK: z.string().regex(/^PAGE#[A-Z_]+$/),
  itemType: z.literal("RolePageAccess"),
  roleName: RoleNameSchema,
  pageName: PageNameSchema,
  allowed: z.boolean(),
  grantedAt: z.string().datetime(),
  grantedBy: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RolePageAccess = z.infer<typeof RolePageAccessSchema>;
