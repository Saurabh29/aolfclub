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
 * Core Entities: Teacher, Volunteer, Member, Lead, Location
 * Access Policy: Role, Permission, UserGroup
 * Identity & Auth: Email
 * Relationship: Relationship (generic edge)
 * 
 * Note: User is NOT included - it's an internal base schema
 *       that Teacher, Volunteer, Member, and Lead extend from
 */
export const AllEntityTypeSchema = z.enum([
  // Core Entities (User-like entities that extend UserSchema)
  "Teacher",
  "Volunteer",
  "Member",
  "Lead",
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
    id: z.string().uuid(),
    entityType: AllEntityTypeSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strip();

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
