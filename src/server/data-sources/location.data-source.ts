import { ulid } from "ulid";
import type { Location, LocationField, CreateLocationRequest, UpdateLocationRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { generateDummyLocations } from "./dummy-data";
import { executeQuery, applyFilters } from "./query-executor";

/**
 * In-memory writable data source for Location entities.
 * Mirrors DummyTaskDataSource pattern — swap for DynamoDB by changing instances.ts only.
 */
export class DummyLocationDataSource implements DataSource<Location, LocationField> {
  private locations: Location[];

  constructor() {
    this.locations = generateDummyLocations(4);
  }

  async query(spec: QuerySpec<LocationField>): Promise<ApiResult<QueryResult<Location>>> {
    try {
      return { success: true, data: executeQuery(this.locations, spec) };
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
    return { success: true, data: applyFilters(this.locations, filters).length };
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
