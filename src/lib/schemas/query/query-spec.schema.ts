import { z } from "zod";

/**
 * FilterOperator - Supported filter operations
 * 
 * EXECUTION STRATEGY:
 * - DataSources decide HOW to execute each operator
 * - InMemoryDataSource: Executes all operators in-memory
 * - DynamoDBDataSource: Push-down capable operators (eq, gt, lt, gte, lte, in) to DynamoDB;
 *   Post-fetch operators (contains, startsWith, endsWith, neq) applied after retrieval
 * - DataSources MAY reject unsupported operators in strict mode
 * 
 * ❌ Do NOT remove operators from this list
 * ✅ Document execution capabilities per DataSource implementation
 * 
 * Keep minimal and universal (works for in-memory AND databases)
 * Rule: Only add operators that ALL data sources can support
 */
export const FilterOperatorSchema = z.enum([
  "eq",        // Equals
  "neq",       // Not equals
  "contains",  // String contains (case-insensitive)
  "startsWith", // String starts with
  "endsWith",  // String ends with
  "gt",        // Greater than
  "lt",        // Less than
  "gte",       // Greater than or equal
  "lte",       // Less than or equal
  "in",        // Value in array
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * FilterCondition - Single filter criterion
 * Represents: field <operator> value
 * 
 * Generic TField ensures type-safe field names
 */
export interface FilterCondition<TField extends string = string> {
  field: TField;
  op: FilterOperator;
  value: unknown; // Runtime type depends on field
}

export const FilterConditionSchema = z.object({
  field: z.string().min(1),
  op: FilterOperatorSchema,
  value: z.unknown(),
});

/**
 * SortSpec - Sort specification
 */
export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export interface SortSpec<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export const SortSpecSchema = z.object({
  field: z.string().min(1),
  direction: SortDirectionSchema,
});

/**
 * PaginationSpec - Unified pagination specification
 * Supports both offset-based (pageSize + pageIndex) and cursor-based (pageSize + cursor)
 * 
 * CANONICAL SHAPE:
 * - pageSize: Required number of items per page
 * - pageIndex: Zero-based page number (offset = pageIndex × pageSize)
 * - cursor: Opaque cursor string for cursor-based pagination
 * 
 * Rule: Use pageSize + pageIndex (not limit / offset)
 */
export interface PaginationSpec {
  pageSize: number;      // Always required
  pageIndex?: number;    // For offset-based (default: 0)
  cursor?: string;       // For cursor-based
}

export const PaginationSpecSchema = z.object({
  pageSize: z.number().int().positive().max(100).default(20),
  pageIndex: z.number().int().nonnegative().optional(),
  cursor: z.string().optional(),
});

/**
 * QuerySpec - Complete query specification
 * 
 * This is the CANONICAL query language:
 * - UI produces this
 * - DataSources consume this
 * - NO UI framework knowledge
 * - NO database-specific concepts
 * 
 * Generic TField provides compile-time field name checking
 * 
 * @example
 * ```ts
 * type UserField = "displayName" | "email" | "userType";
 * const spec: QuerySpec<UserField> = {
 *   filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
 *   sorting: [{ field: "displayName", direction: "asc" }],
 *   pagination: { pageSize: 20, pageIndex: 0 }
 * };
 * ```
 */
export interface QuerySpec<TField extends string = string> {
  filters: FilterCondition<TField>[];
  sorting: SortSpec<TField>[];
  pagination: PaginationSpec;
}

export const QuerySpecSchema = z.object({
  filters: z.array(FilterConditionSchema).default([]),
  sorting: z.array(SortSpecSchema).default([]),
  pagination: PaginationSpecSchema,
});

export type QuerySpecInput = z.input<typeof QuerySpecSchema>;
export type QuerySpecOutput = z.output<typeof QuerySpecSchema>;
