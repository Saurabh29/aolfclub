/**
 * Query Validation  -  Field whitelists and operator restrictions per entity.
 *
 * Prevents arbitrary field filtering via crafted QuerySpec payloads (OWASP input validation).
 * Each entity defines:
 *   - Which fields are filterable
 *   - Which operators are allowed per field
 *   - Which fields are sortable
 *
 * DataSources call validateQuerySpec() before executing.
 */

import type { QuerySpec, FilterOperator } from "~/lib/schemas/query";

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

export interface FieldValidation {
  /** Allowed filter operators for this field. Empty = field is not filterable. */
  operators: readonly FilterOperator[];
}

export interface QueryValidationConfig<TField extends string = string> {
  /** Whitelist of filterable fields with per-field operator restrictions. */
  filterableFields: Record<TField, FieldValidation>;
  /** Fields that can be used in sorting. */
  sortableFields: readonly TField[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  type: "INVALID_FILTER_FIELD" | "INVALID_FILTER_OPERATOR" | "INVALID_SORT_FIELD";
  message: string;
}

/**
 * Validate a QuerySpec against an entity's validation config.
 * Returns an array of errors (empty = valid).
 */
export function validateQuerySpec<TField extends string>(
  spec: QuerySpec<TField>,
  config: QueryValidationConfig<TField>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate filters
  for (const filter of spec.filters) {
    const fieldConfig = config.filterableFields[filter.field];
    if (!fieldConfig) {
      errors.push({
        type: "INVALID_FILTER_FIELD",
        message: `Field "${filter.field}" is not filterable.`,
      });
      continue;
    }
    if (!fieldConfig.operators.includes(filter.op)) {
      errors.push({
        type: "INVALID_FILTER_OPERATOR",
        message: `Operator "${filter.op}" is not allowed on field "${filter.field}". Allowed: ${fieldConfig.operators.join(", ")}`,
      });
    }
  }

  // Validate sorting
  for (const sort of spec.sorting) {
    if (!config.sortableFields.includes(sort.field)) {
      errors.push({
        type: "INVALID_SORT_FIELD",
        message: `Field "${sort.field}" is not sortable.`,
      });
    }
  }

  return errors;
}

/**
 * Validate and throw if invalid. Use in DataSource.query() implementations.
 */
export function assertValidQuery<TField extends string>(
  spec: QuerySpec<TField>,
  config: QueryValidationConfig<TField>,
): void {
  const errors = validateQuerySpec(spec, config);
  if (errors.length > 0) {
    throw new Error(
      `Invalid query: ${errors.map((e) => e.message).join("; ")}`
    );
  }
}

// ---------------------------------------------------------------------------
// Per-entity configs
// ---------------------------------------------------------------------------

/** String search operators (contains, startsWith, etc.) */
const STRING_OPS: readonly FilterOperator[] = ["eq", "neq", "contains", "startsWith", "endsWith"];
/** Equality-only operators */
const ENUM_OPS: readonly FilterOperator[] = ["eq", "neq", "in"];
/** Date/number comparison operators */
const COMPARABLE_OPS: readonly FilterOperator[] = ["eq", "gt", "lt", "gte", "lte"];
/** Boolean operators */
const BOOL_OPS: readonly FilterOperator[] = ["eq"];

// ── Users ─────────────────────────────────────────────────────────────────

import type { UserField } from "~/lib/schemas/domain";

export const USER_QUERY_CONFIG: QueryValidationConfig<UserField> = {
  filterableFields: {
    displayName: { operators: STRING_OPS },
    email: { operators: STRING_OPS },
    activeLocationId: { operators: ENUM_OPS },
    activeRole: { operators: ENUM_OPS },
    isAdmin: { operators: BOOL_OPS },
    createdAt: { operators: COMPARABLE_OPS },
    updatedAt: { operators: COMPARABLE_OPS },
    // Not filterable: id, phone, image
  } as Record<UserField, FieldValidation>,
  sortableFields: ["displayName", "email", "createdAt", "updatedAt", "activeRole"],
};

// ── Leads ─────────────────────────────────────────────────────────────────

import type { LeadField } from "~/lib/schemas/domain";

export const LEAD_QUERY_CONFIG: QueryValidationConfig<LeadField> = {
  filterableFields: {
    displayName: { operators: STRING_OPS },
    phone: { operators: STRING_OPS },
    email: { operators: STRING_OPS },
    locationId: { operators: ENUM_OPS },
    interestedPrograms: { operators: ["in", "contains"] as readonly FilterOperator[] },
    lastInterestLevel: { operators: ENUM_OPS },
    lastCallDate: { operators: COMPARABLE_OPS },
    nextFollowUpDate: { operators: COMPARABLE_OPS },
    totalCallCount: { operators: COMPARABLE_OPS },
    tags: { operators: ["in", "contains"] as readonly FilterOperator[] },
    createdAt: { operators: COMPARABLE_OPS },
    updatedAt: { operators: COMPARABLE_OPS },
    // Not filterable: id, image, lastNotes
  } as Record<LeadField, FieldValidation>,
  sortableFields: [
    "displayName", "phone", "lastCallDate", "nextFollowUpDate",
    "totalCallCount", "lastInterestLevel", "createdAt", "updatedAt",
  ],
};

// ── Members ───────────────────────────────────────────────────────────────

import type { MemberField } from "~/lib/schemas/domain";

export const MEMBER_QUERY_CONFIG: QueryValidationConfig<MemberField> = {
  filterableFields: {
    displayName: { operators: STRING_OPS },
    phone: { operators: STRING_OPS },
    email: { operators: STRING_OPS },
    locationId: { operators: ENUM_OPS },
    memberSince: { operators: COMPARABLE_OPS },
    programsDone: { operators: ["in", "contains"] as readonly FilterOperator[] },
    interestedPrograms: { operators: ["in", "contains"] as readonly FilterOperator[] },
    createdAt: { operators: COMPARABLE_OPS },
    updatedAt: { operators: COMPARABLE_OPS },
    // Not filterable: id, image
  } as Record<MemberField, FieldValidation>,
  sortableFields: [
    "displayName", "phone", "email", "memberSince", "createdAt", "updatedAt",
  ],
};

// ── Locations ─────────────────────────────────────────────────────────────

import type { LocationField } from "~/lib/schemas/domain";

export const LOCATION_QUERY_CONFIG: QueryValidationConfig<LocationField> = {
  filterableFields: {
    name: { operators: STRING_OPS },
    slug: { operators: STRING_OPS },
    city: { operators: STRING_OPS },
    state: { operators: STRING_OPS },
    country: { operators: STRING_OPS },
    isActive: { operators: BOOL_OPS },
    createdAt: { operators: COMPARABLE_OPS },
    updatedAt: { operators: COMPARABLE_OPS },
    // Not filterable: id, placeId, lat, lng, address, description, etc.
  } as Record<LocationField, FieldValidation>,
  sortableFields: ["name", "city", "state", "createdAt", "updatedAt"],
};

// ── Tasks ─────────────────────────────────────────────────────────────────

import type { TaskField } from "~/lib/schemas/domain";

export const TASK_QUERY_CONFIG: QueryValidationConfig<TaskField> = {
  filterableFields: {
    name: { operators: STRING_OPS },
    locationId: { operators: ENUM_OPS },
    status: { operators: ENUM_OPS },
    targetUserType: { operators: ENUM_OPS },
    assignmentMode: { operators: ENUM_OPS },
    deadline: { operators: COMPARABLE_OPS },
    createdBy: { operators: ENUM_OPS },
    createdAt: { operators: COMPARABLE_OPS },
    updatedAt: { operators: COMPARABLE_OPS },
    // Not filterable: id, objective, contactFilterSpec, matchedContactIds, etc.
  } as Record<TaskField, FieldValidation>,
  sortableFields: ["name", "status", "deadline", "createdAt", "updatedAt"],
};
