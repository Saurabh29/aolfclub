/**
 * QueryExecutor — shared in-memory filter, sort, and paginate logic.
 *
 * Extracted from 7 near-identical implementations across DataSources.
 * Every DynamoDB and Dummy DataSource delegates here after loading items.
 */

import type { QuerySpec, QueryResult } from "~/lib/schemas/query";

/**
 * Apply filter conditions to an array of items.
 * String comparisons are case-insensitive for contains/startsWith/endsWith.
 */
export function applyFilters<T>(
  items: readonly T[],
  filters: QuerySpec<string>["filters"]
): T[] {
  let results = [...items];

  for (const filter of filters) {
    results = results.filter((item) => {
      const value = (item as Record<string, unknown>)[filter.field];
      switch (filter.op) {
        case "eq":
          return value === filter.value;
        case "neq":
          return value !== filter.value;
        case "contains":
          return (
            typeof value === "string" &&
            value.toLowerCase().includes(String(filter.value).toLowerCase())
          );
        case "startsWith":
          return (
            typeof value === "string" &&
            value.toLowerCase().startsWith(String(filter.value).toLowerCase())
          );
        case "endsWith":
          return (
            typeof value === "string" &&
            value.toLowerCase().endsWith(String(filter.value).toLowerCase())
          );
        case "gt":
          return (value as number) > (filter.value as number);
        case "lt":
          return (value as number) < (filter.value as number);
        case "gte":
          return (value as number) >= (filter.value as number);
        case "lte":
          return (value as number) <= (filter.value as number);
        case "in":
          return Array.isArray(filter.value) && filter.value.includes(value);
        default:
          return true;
      }
    });
  }

  return results;
}

/**
 * Sort an array of items by the given sort specs.
 * Returns a new sorted array (does not mutate input).
 */
export function applySorting<T>(
  items: readonly T[],
  sorting: QuerySpec<string>["sorting"]
): T[] {
  if (sorting.length === 0) return [...items];

  return [...items].sort((a, b) => {
    for (const sort of sorting) {
      const aVal = (a as Record<string, unknown>)[sort.field];
      const bVal = (b as Record<string, unknown>)[sort.field];
      if (aVal === bVal) continue;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (aVal < (bVal as typeof aVal)) return sort.direction === "asc" ? -1 : 1;
      if (aVal > (bVal as typeof aVal)) return sort.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Apply pagination (offset-based) and return a QueryResult.
 */
export function applyPagination<T>(
  items: readonly T[],
  pagination: QuerySpec<string>["pagination"]
): QueryResult<T> {
  const totalCount = items.length;
  const pageIndex = pagination.pageIndex ?? 0;
  const offset = pageIndex * pagination.pageSize;
  const page = items.slice(offset, offset + pagination.pageSize);

  return {
    items: page,
    pageInfo: {
      totalCount,
      hasNextPage: offset + pagination.pageSize < totalCount,
    },
  };
}

/**
 * Execute a full QuerySpec against an in-memory array.
 * Convenience wrapper that chains filter → sort → paginate.
 */
export function executeQuery<T>(
  items: readonly T[],
  spec: QuerySpec<string>
): QueryResult<T> {
  const filtered = applyFilters(items, spec.filters);
  const sorted = applySorting(filtered, spec.sorting);
  return applyPagination(sorted, spec.pagination);
}
