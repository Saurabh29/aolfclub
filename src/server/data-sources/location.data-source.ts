import { ulid } from "ulid";
import type { Location, LocationField, CreateLocationRequest, UpdateLocationRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { WritableDataSource } from "./task.data-source";
import { generateDummyLocations } from "./dummy-data";

/**
 * In-memory writable data source for Location entities.
 * Mirrors DummyTaskDataSource pattern — swap for DynamoDB by changing instances.ts only.
 */
export class DummyLocationDataSource implements WritableDataSource<Location, LocationField> {
  private locations: Location[];

  constructor() {
    this.locations = generateDummyLocations(4);
  }

  async query(spec: QuerySpec<LocationField>): Promise<ApiResult<QueryResult<Location>>> {
    try {
      let results = [...this.locations];

      // Filters
      for (const filter of spec.filters) {
        results = results.filter((loc) => {
          const value = (loc as any)[filter.field];
          switch (filter.op) {
            case "eq": return value === filter.value;
            case "neq": return value !== filter.value;
            case "contains": return typeof value === "string" && value.toLowerCase().includes(String(filter.value).toLowerCase());
            case "startsWith": return typeof value === "string" && value.toLowerCase().startsWith(String(filter.value).toLowerCase());
            case "endsWith": return typeof value === "string" && value.toLowerCase().endsWith(String(filter.value).toLowerCase());
            case "gt": return (value as any) > (filter.value as any);
            case "lt": return (value as any) < (filter.value as any);
            case "gte": return (value as any) >= (filter.value as any);
            case "lte": return (value as any) <= (filter.value as any);
            case "in": return Array.isArray(filter.value) && filter.value.includes(value);
            default: return true;
          }
        });
      }

      // Sorting
      if (spec.sorting.length > 0) {
        results.sort((a, b) => {
          for (const sort of spec.sorting) {
            const aVal = (a as any)[sort.field];
            const bVal = (b as any)[sort.field];
            if (aVal === bVal) continue;
            if (aVal === undefined) return 1;
            if (bVal === undefined) return -1;
            const cmp = aVal < bVal ? -1 : 1;
            return sort.direction === "asc" ? cmp : -cmp;
          }
          return 0;
        });
      }

      const totalCount = results.length;
      const pageIndex = spec.pagination.pageIndex ?? 0;
      const offset = pageIndex * spec.pagination.pageSize;
      const items = results.slice(offset, offset + spec.pagination.pageSize);

      return {
        success: true,
        data: {
          items,
          pageInfo: {
            totalCount,
            hasNextPage: offset + spec.pagination.pageSize < totalCount,
          },
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Query failed" };
    }
  }

  async getById(id: string): Promise<ApiResult<Location | null>> {
    return { success: true, data: this.locations.find((l) => l.id === id) ?? null };
  }

  async getBySlug(slug: string): Promise<ApiResult<Location | null>> {
    return { success: true, data: this.locations.find((l) => l.slug === slug) ?? null };
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    return this.locations.some((l) => l.slug === slug && l.id !== excludeId);
  }

  async getCount(filters?: QuerySpec<LocationField>["filters"]): Promise<ApiResult<number>> {
    if (!filters || filters.length === 0) return { success: true, data: this.locations.length };
    const result = await this.query({
      filters,
      sorting: [],
      pagination: { pageSize: 10000, pageIndex: 0 },
    });
    return result.success ? { success: true, data: result.data!.items.length } : result;
  }

  async create(data: CreateLocationRequest): Promise<ApiResult<Location>> {
    try {
      const now = new Date().toISOString();
      const location: Location = {
        id: ulid(),
        ...data,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      this.locations.unshift(location);
      return { success: true, data: location };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Create failed" };
    }
  }

  async update(id: string, data: UpdateLocationRequest): Promise<ApiResult<Location>> {
    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) return { success: false, error: "Location not found" };
    const updated: Location = {
      ...this.locations[index],
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.locations[index] = updated;
    return { success: true, data: updated };
  }

  async delete(id: string): Promise<ApiResult<void>> {
    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) return { success: false, error: "Location not found" };
    this.locations.splice(index, 1);
    return { success: true, data: undefined };
  }
}
