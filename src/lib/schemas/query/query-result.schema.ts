import { z } from "zod";

/**
 * PageInfo - Pagination metadata
 */
export const PageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  nextCursor: z.string().optional(),  // For cursor-based
  totalCount: z.number().int().nonnegative().optional(), // For offset-based
});

export type PageInfo = z.infer<typeof PageInfoSchema>;

/**
 * QueryResult<T> - Paginated response wrapper
 * API-safe: no internal implementation details leaked
 * 
 * Items array is readonly to prevent accidental mutation and encourage immutable data flow
 */
export interface QueryResult<T> {
  items: readonly T[];
  pageInfo: PageInfo;
}

/**
 * Helper to create QueryResult
 */
export function createQueryResult<T>(
  items: T[],
  pageInfo: PageInfo
): QueryResult<T> {
  return { items, pageInfo };
}
