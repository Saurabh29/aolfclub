import type { QuerySpec, QueryResult, FilterCondition, SortSpec } from "~/lib/schemas/query";
import type { DataSource } from "./data-source.interface";
import type { ApiResult } from "~/lib/types";

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
      let filtered = [...this.data];

      // Apply filters
      filtered = this.applyFilters(filtered, query.filters);

      // Apply sorting (array of sort specs)
      if (query.sorting && query.sorting.length > 0) {
        filtered = this.applySorting(filtered, query.sorting);
      }

      // Apply pagination
      const result = this.applyPagination(filtered, query.pagination);

      return {
        success: true,
        data: result,
      };
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
    const filtered = this.applyFilters([...this.data], filters);
    return { success: true, data: filtered.length };
  }

  // Private helpers
  private applyFilters(items: T[], filters: FilterCondition<TField>[]): T[] {
    return items.filter((item) => {
      return filters.every((filter) => {
        const value = (item as any)[filter.field];
        const filterValue = filter.value;

        switch (filter.op) {
          case "eq":
            return value === filterValue;
          case "contains":
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case "gt":
            return (value as any) > (filterValue as any);
          case "lt":
            return (value as any) < (filterValue as any);
          case "gte":
            return (value as any) >= (filterValue as any);
          case "lte":
            return (value as any) <= (filterValue as any);
          case "in":
            return Array.isArray(filterValue) && filterValue.includes(value);
          case "neq":
            return value !== filterValue;
          case "startsWith":
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case "endsWith":
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          default:
            return true;
        }
      });
    });
  }

  /**
   * Apply sorting (supports multiple sort specs)
   * Sorts in order: first sort spec is primary, second is tiebreaker, etc.
   */
  private applySorting(items: T[], sorting: SortSpec<TField>[]): T[] {
    return items.sort((a, b) => {
      for (const sortSpec of sorting) {
        const aVal = (a as any)[sortSpec.field];
        const bVal = (b as any)[sortSpec.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        
        if (comparison !== 0) {
          return sortSpec.direction === "asc" ? comparison : -comparison;
        }
        // If equal, continue to next sort spec
      }
      return 0; // All sort specs were equal
    });
  }

  /**
   * Apply pagination using canonical pageSize/pageIndex
   * offset = pageIndex × pageSize
   */
  private applyPagination(
    items: T[],
    pagination: QuerySpec<TField>["pagination"]
  ): QueryResult<T> {
    const { pageSize, pageIndex, cursor } = pagination;

    // Cursor-based pagination (for compatibility)
    if (cursor) {
      let start = 0;
      try {
        start = parseInt(atob(cursor), 10);
      } catch {
        start = 0;
      }
      const end = start + pageSize;
      const page = items.slice(start, end);
      const hasMore = end < items.length;

      return {
        items: page,
        pageInfo: {
          hasNextPage: hasMore,
          nextCursor: hasMore ? btoa(String(end)) : undefined,
        },
      };
    }

    // Offset-based pagination (canonical)
    const start = (pageIndex ?? 0) * pageSize;
    const end = start + pageSize;
    const page = items.slice(start, end);
    
    return {
      items: page,
      pageInfo: {
        hasNextPage: end < items.length,
        totalCount: items.length,
      },
    };
  }
}
