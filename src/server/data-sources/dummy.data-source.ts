import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { DataSource } from "./data-source.interface";
import type { ApiResult } from "~/lib/types";
import { executeQuery, applyFilters } from "./query-executor";

/**
 * DummyDataSource - In-memory implementation with static data
 * Perfect for development and testing without database
 * 
 * Generic TField provides type-safe field names
 */
export class DummyDataSource<
  T extends { id: string },
  TField extends string = string
> implements DataSource<T, TField> {
  private data: T[];

  constructor(data: T[]) {
    this.data = data;
  }

  async query(query: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>> {
    try {
      return { success: true, data: executeQuery(this.data, query) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Query failed",
      };
    }
  }

  async getById(id: string): Promise<ApiResult<T | null>> {
    const item = this.data.find((item) => item.id === id);
    return { success: true, data: item ?? null };
  }

  async getCount(filters?: QuerySpec<TField>["filters"]): Promise<ApiResult<number>> {
    if (!filters || filters.length === 0) {
      return { success: true, data: this.data.length };
    }
    return { success: true, data: applyFilters(this.data, filters).length };
  }
}
