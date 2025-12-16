/**
 * SCHEMA HELPER TYPES
 *
 * Utility types to ensure type safety between DB schemas and repository inputs
 */

import type { z } from "zod";

/**
 * Extract the input type for creating an entity from a Zod schema
 * Omits generated fields: PK, SK, itemType, createdAt, updatedAt, and the ID field
 */
export type CreateInput<
  TSchema extends z.ZodType,
  TIdField extends string = never,
> = Omit<
  z.infer<TSchema>,
  "PK" | "SK" | "itemType" | "createdAt" | "updatedAt" | TIdField
>;

/**
 * Extract the update input type from a Zod schema
 * All fields optional except PK/SK (which are omitted)
 * Omits: PK, SK, itemType, createdAt, and the ID field (IDs can't change)
 */
export type UpdateInput<
  TSchema extends z.ZodType,
  TIdField extends string = never,
> = Partial<
  Omit<z.infer<TSchema>, "PK" | "SK" | "itemType" | "createdAt" | TIdField>
>;
