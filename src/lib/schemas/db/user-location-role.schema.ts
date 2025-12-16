/**
 * USER-LOCATION ROLE ASSIGNMENT SCHEMA (ReBAC Design)
 *
 * Links a user to a location with a specific role
 * Query pattern: Get all users at a location OR get user's role at location
 *
 * DynamoDB Keys:
 * - PK: LOCATION#<locationId>
 * - SK: USER#<userId>
 *
 * Access Pattern:
 * - Query by PK=LOCATION#<id> to get all users at location
 * - Get by PK=LOCATION#<id> + SK=USER#<id> to get user's role at location
 */

import { z } from "zod";
import { RoleNameSchema } from "./role.schema";

export const UserLocationRoleSchema = z.object({
  PK: z.string().regex(/^LOCATION#[a-zA-Z0-9-]+$/),
  SK: z.string().regex(/^USER#[a-zA-Z0-9-]+$/),
  itemType: z.literal("UserLocationRole"),
  locationId: z.string().min(1),
  userId: z.string().min(1),
  roleName: RoleNameSchema,
  assignedAt: z.string().datetime(),
  assignedBy: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserLocationRole = z.infer<typeof UserLocationRoleSchema>;
