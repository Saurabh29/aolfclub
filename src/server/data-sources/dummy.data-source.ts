import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { DataSource } from "./data-source.interface";
import type { ApiResult } from "~/lib/types";
import { executeQuery, applyFilters } from "./query-executor";
import { ulid } from "ulid";

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

  // ── Write operations (in-memory mutations) ────────────────────────────

  async create(data: unknown): Promise<ApiResult<T>> {
    try {
      const now = new Date().toISOString();
      const newItem = {
        ...(data as Partial<T>),
        id: ulid(),
        createdAt: now,
        updatedAt: now,
      } as unknown as T;
      this.data.push(newItem);
      return { success: true, data: newItem };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Create failed",
      };
    }
  }

  async update(id: string, data: unknown): Promise<ApiResult<T>> {
    try {
      const index = this.data.findIndex((item) => item.id === id);
      if (index === -1) {
        return { success: false, error: "Item not found" };
      }
      const now = new Date().toISOString();
      const updated = {
        ...this.data[index],
        ...(data as Partial<T>),
        id, // Ensure ID doesn't change
        updatedAt: now,
      } as unknown as T;
      this.data[index] = updated;
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const index = this.data.findIndex((item) => item.id === id);
      if (index === -1) {
        return { success: false, error: "Item not found" };
      }
      this.data.splice(index, 1);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }

  async getByUniqueField(field: string, value: string): Promise<ApiResult<T | null>> {
    try {
      const item = this.data.find((item) => {
        const fieldValue = (item as Record<string, unknown>)[field];
        // Case-insensitive comparison for strings
        if (typeof fieldValue === "string" && typeof value === "string") {
          return fieldValue.toLowerCase() === value.toLowerCase();
        }
        return fieldValue === value;
      });
      return { success: true, data: item ?? null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lookup failed",
      };
    }
  }
}
