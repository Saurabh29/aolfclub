/**
 * DATABASE SCHEMA EXPORTS
 * 
 * Phase 1: Schema Definitions Only
 * 
 * Central export point for all database schemas
 * Server-side only - NO UI concerns
 */

// ========== BASE SCHEMAS ==========
export {
  AllEntityTypeSchema,
  BaseEntitySchema,
  type AllEntityTypes,
  type BaseEntity,
} from "./base.schema";

// ========== CORE ENTITY SCHEMAS ==========
export {
  UserSchema,
  LocationSchema,
  type User,
  type Location,
} from "./core-entities.schema";

// ========== ACCESS POLICY SCHEMAS ==========
export {
  RoleSchema,
  RoleNameSchema,
  PermissionSchema,
  UserGroupSchema,
  type Role,
  type RoleName,
  type Permission,
  type UserGroup,
} from "./access-policy.schema";

// ========== EMAIL SCHEMA ==========
export {
  EmailSchema,
  EmailStatusSchema,
  type Email,
  type EmailStatus,
} from "./email.schema";

// ========== RELATIONSHIP SCHEMA ==========
export {
  RelationshipSchema,
  isRelationshipValid,
  getAllowedSources,
  getAllowedTargets,
  type Relationship,
} from "./relationship.schema";

// ========== SCHEMA MAP ==========

import { z } from "zod";
import type { AllEntityTypes } from "./base.schema";
import {
  UserSchema,
  LocationSchema,
} from "./core-entities.schema";
import {
  RoleSchema,
  PermissionSchema,
  UserGroupSchema,
} from "./access-policy.schema";
import { EmailSchema } from "./email.schema";
import { RelationshipSchema } from "./relationship.schema";

/**
 * DB Entity Schema Map
 * Maps entity type to its Zod schema
 * Used for dynamic schema validation
 */
export const DBEntitySchemaMap = {
  // Core Entities
  User: UserSchema,
  Location: LocationSchema,
  // Access Policy
  Role: RoleSchema,
  Permission: PermissionSchema,
  UserGroup: UserGroupSchema,
  // Email
  Email: EmailSchema,
  // Relationship
  Relationship: RelationshipSchema,
} as const;

/**
 * Get schema for a given entity type
 */
export function getSchemaForEntityType(
  entityType: AllEntityTypes
): z.ZodType {
  return DBEntitySchemaMap[entityType];
}

/**
 * Validate entity against its schema
 */
export function validateEntity(
  entityType: AllEntityTypes,
  data: unknown
): unknown {
  const schema = DBEntitySchemaMap[entityType];
  return schema.parse(data);
}

/**
 * Safe validation that returns result object
 */
export function validateEntitySafe(
  entityType: AllEntityTypes,
  data: unknown
) {
  const schema = DBEntitySchemaMap[entityType];
  return schema.safeParse(data);
}
