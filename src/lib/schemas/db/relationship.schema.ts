/**
 * RELATIONSHIP SCHEMA
 *
 * Generic edge entity for connecting any two entities
 * Server-side only - NO UI concerns
 *
 * DESIGN PRINCIPLES:
 * - Single, generic schema with validation rules
 * - Validates allowed source/target combinations
 * - Supports all defined entity-to-entity connections
 * - Source can be ANY entity type (including Email)
 * - Target can be ANY entity type
 */

import { z } from "zod";
import { BaseEntitySchema, AllEntityTypeSchema } from "./base.schema";

/**
 * Allowed relationship rules
 * Maps relation type to allowed source and target entity types
 */
const ALLOWED_RELATIONSHIPS = {
  IDENTIFIES: {
    allowedSources: ["Email"] as const,
    allowedTargets: ["User"] as const,
  },
  HAS_EMAIL: {
    allowedSources: ["User"] as const,
    allowedTargets: ["Email"] as const,
  },
  MEMBER_OF: {
    allowedSources: ["User"] as const,
    allowedTargets: ["UserGroup"] as const,
  },
  ASSIGNED_ROLE: {
    allowedSources: ["UserGroup"] as const,
    allowedTargets: ["Role"] as const,
  },
  HAS_PERMISSION: {
    allowedSources: ["Role"] as const,
    allowedTargets: ["Permission"] as const,
  },
  ASSIGNED_TO: {
    allowedSources: ["User"] as const,
    allowedTargets: ["Location", "User"] as const,
  },
  WORKS_AT: {
    allowedSources: ["User"] as const,
    allowedTargets: ["Location"] as const,
  },
  MANAGED_BY: {
    allowedSources: ["Location"] as const,
    allowedTargets: ["User"] as const,
  },
} as const;

/**
 * RELATIONSHIP ENTITY
 *
 * Generic edge connecting two entities with validation
 *
 * ALLOWED RELATIONSHIPS:
 * - Email → User (IDENTIFIES)
 * - User → Email (HAS_EMAIL)
 * - User → UserGroup (MEMBER_OF)
 * - UserGroup → Role (ASSIGNED_ROLE)
 * - Role → Permission (HAS_PERMISSION)
 * - User → Location/User (ASSIGNED_TO)
 * - User → Location (WORKS_AT)
 * - Location → User (MANAGED_BY)
 */
export const RelationshipSchema = BaseEntitySchema.extend({
  entityType: z.literal("Relationship"),

  /**
   * Source entity ID
   */
  sourceId: z
    .string()
    .length(26, "Source ID must be a valid ULID (26 characters)"),

  /**
   * Source entity type
   * Can be ANY entity type, including Email
   */
  sourceType: AllEntityTypeSchema,

  /**
   * Target entity ID
   */
  targetId: z
    .string()
    .length(26, "Target ID must be a valid ULID (26 characters)"),

  /**
   * Target entity type
   * Can be ANY entity type
   */
  targetType: AllEntityTypeSchema,

  /**
   * Relationship type
   * Must be one of the defined relationship types
   */
  relation: z.enum([
    "IDENTIFIES",
    "HAS_EMAIL",
    "MEMBER_OF",
    "ASSIGNED_ROLE",
    "HAS_PERMISSION",
    "ASSIGNED_TO",
    "TEACHES_AT",
    "VOLUNTEERS_AT",
    "BELONGS_TO",
    "MANAGED_BY",
    "WORKS_AT",
  ]),

  /**
   * Optional metadata for relationship
   */
  metadata: z.record(z.string(), z.unknown()).optional(),
})
  .strip()
  .refine(
    (data) => {
      const rules =
        ALLOWED_RELATIONSHIPS[
          data.relation as keyof typeof ALLOWED_RELATIONSHIPS
        ];
      if (!rules) return false;

      const isSourceValid = (
        rules.allowedSources as readonly string[]
      ).includes(data.sourceType);
      const isTargetValid = (
        rules.allowedTargets as readonly string[]
      ).includes(data.targetType);

      return isSourceValid && isTargetValid;
    },
    {
      message:
        "Invalid relationship: relation type doesn't allow this source → target combination",
      path: ["relation"],
    },
  );

export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Helper function to check if a relationship is valid
 */
export function isRelationshipValid(
  relation: string,
  sourceType: string,
  targetType: string,
): boolean {
  const rules =
    ALLOWED_RELATIONSHIPS[relation as keyof typeof ALLOWED_RELATIONSHIPS];
  if (!rules) return false;

  return (
    (rules.allowedSources as readonly string[]).includes(sourceType) &&
    (rules.allowedTargets as readonly string[]).includes(targetType)
  );
}

/**
 * Get allowed source types for a relation
 */
export function getAllowedSources(relation: string): readonly string[] {
  const rules =
    ALLOWED_RELATIONSHIPS[relation as keyof typeof ALLOWED_RELATIONSHIPS];
  return rules?.allowedSources ?? [];
}

/**
 * Get allowed target types for a relation
 */
export function getAllowedTargets(relation: string): readonly string[] {
  const rules =
    ALLOWED_RELATIONSHIPS[relation as keyof typeof ALLOWED_RELATIONSHIPS];
  return rules?.allowedTargets ?? [];
}
