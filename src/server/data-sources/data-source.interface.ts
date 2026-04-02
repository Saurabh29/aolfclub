import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * DataSource<T, TField> - Universal data access interface
 *
 * Core Principle: DataSources EXECUTE QuerySpec — they never mutate it.
 *
 * Rules:
 * ✅ Implementations decide HOW to execute queries
 * ✅ UI only knows QuerySpec and QueryResult
 * ✅ Swap implementations without changing UI code
 * ✅ DataSources execute what they can, gracefully handle what they can't
 * ❌ NO database-specific methods (no DynamoDB, no SQL)
 * ❌ NO implementation details leaked to callers
 *
 * @template T The entity type (User, Location, etc.)
 * @template TField Field names for type-safe queries (optional)
 */
export interface DataSource<T, TField extends string = string> {
  // ── Reads ───────────────────────────────────────────────────────────────

  /**
   * Execute a query
   *
   * Implementation strategies:
   * - InMemoryDataSource: Execute everything (filter, sort, paginate)
   * - DynamoDBDataSource: Push down what DynamoDB can do, pull up the rest
   * - CachedDataSource: Hybrid approach
   */
  query(query: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>>;

  /** Get item by ID (optional optimization) */
  getById?(id: string): Promise<ApiResult<T | null>>;

  /** Get total count (optional, for offset pagination) */
  getCount?(filters?: QuerySpec<TField>["filters"]): Promise<ApiResult<number>>;

  // ── Writes (optional — not every DataSource is writable) ────────────────

  /** Create a new entity */
  create?(data: unknown): Promise<ApiResult<T>>;

  /** Update an existing entity by ID */
  update?(id: string, data: unknown): Promise<ApiResult<T>>;

  /** Delete an entity by ID */
  delete?(id: string): Promise<ApiResult<void>>;

  // ── Lookup helpers (optional — entity-specific) ─────────────────────────

  /** Look up entity by a unique field other than ID (e.g. email, phone, slug) */
  getByUniqueField?(field: string, value: string): Promise<ApiResult<T | null>>;
}
