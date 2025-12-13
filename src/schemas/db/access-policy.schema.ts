/**
 * ACCESS POLICY ENTITY SCHEMAS
 * 
 * Server-side schemas for access control entities
 * NO UI concerns, NO embedded relationships
 */

import { z } from "zod";
import { BaseEntitySchema } from "./base.schema";

/**
 * ROLE ENTITY
 * 
 * Defines system roles
 * Closed enum: admin, teacher, volunteer, member, guest
 */
export const RoleNameSchema = z.enum([
  "admin",
  "teacher",
  "volunteer",
  "member",
  "guest",
]);

export type RoleName = z.infer<typeof RoleNameSchema>;

export const RoleSchema = BaseEntitySchema.extend({
  entityType: z.literal("Role"),
  name: RoleNameSchema,
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strip();

export type Role = z.infer<typeof RoleSchema>;

/**
 * PERMISSION ENTITY
 * 
 * Defines granular permissions
 */
export const PermissionSchema = BaseEntitySchema.extend({
  entityType: z.literal("Permission"),
  name: z.string().min(1),
  description: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
}).strip();

export type Permission = z.infer<typeof PermissionSchema>;

/**
 * USER GROUP ENTITY
 * 
 * Logical grouping of users
 */
export const UserGroupSchema = BaseEntitySchema.extend({
  entityType: z.literal("UserGroup"),
  name: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strip();

export type UserGroup = z.infer<typeof UserGroupSchema>;
