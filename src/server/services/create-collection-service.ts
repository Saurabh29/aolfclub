import type { DataSource } from "../data-sources/data-source.interface";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Collection Service - Generic service functions for any entity
 * 
 * Factory pattern to eliminate boilerplate across service files.
 * Usage:
 * ```ts
 * import { usersDataSource } from "../data-sources/instances";
 * import { createCollectionService } from "./create-collection-service";
 * 
 * const { query, getById, getCount } = createCollectionService(usersDataSource);
 * export { query as queryUsers, getById as getUserById, getCount as getUserCount };
 * ```
 */
export function createCollectionService<T, TField extends string = string>(
  dataSource: DataSource<T, TField>
) {
  return {
    /**
     * Query items using QuerySpec
     */
    async query(spec: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>> {
      return await dataSource.query(spec);
    },

    /**
     * Get item by ID
     */
    async getById(id: string): Promise<ApiResult<T | null>> {
      if (!dataSource.getById) {
        return { success: false, error: "getById not supported" };
      }
      return await dataSource.getById(id);
    },

    /**
     * Get item count with optional filters
     */
    async getCount(filters?: QuerySpec<TField>["filters"]): Promise<ApiResult<number>> {
      if (!dataSource.getCount) {
        return { success: false, error: "getCount not supported" };
      }
      return await dataSource.getCount(filters);
    },
  };
}
