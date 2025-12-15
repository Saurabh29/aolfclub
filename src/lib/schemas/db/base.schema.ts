/**
 * BASE DATABASE SCHEMAS
 * 
 * Server-side only - NO UI concerns
 * All entities extend these base schemas
 */

import { z } from "zod";

/**
 * ALL ENTITY TYPES (Authoritative List)
 * 
 * Core Entities: User, Location
 * Access Policy: Role, Permission, UserGroup
 * Identity & Auth: Email
 * Relationship: Relationship (generic edge)
 * 
 * Note: User is the single entity type for all users (teacher, volunteer, member, guest, admin)
 *       userType field distinguishes user types
 */
export const AllEntityTypeSchema = z.enum([
  // Core Entities
  "User",
  "Location",
  // Access Policy Entities
  "Role",
  "Permission",
  "UserGroup",
  // Identity & Auth
  "Email",
  // Relationship
  "Relationship",
]);

export type AllEntityTypes = z.infer<typeof AllEntityTypeSchema>;

/**
 * Base Entity Schema
 * All entities must extend this
 */
export const BaseEntitySchema = z
  .object({
    id: z.string().length(26, "ID must be a valid ULID (26 characters)"),
    entityType: AllEntityTypeSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strip();

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
