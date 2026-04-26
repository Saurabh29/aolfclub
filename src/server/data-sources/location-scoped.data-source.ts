/**
 * Location-Scoped Data Source (generic base)
 *
 * Shared implementation for Lead and Member data sources that follow
 * the same location-scoped CRUD pattern. Eliminates ~95% code duplication.
 *
 * Subclasses only need to provide:
 *   - Repository functions (create, getById, getByLocation, update, delete)
 *   - PK key helper for GetCommand
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "~/server/db/client";
import { fromItem } from "./dynamo-helpers";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { executeQuery } from "./query-executor";
import type { QueryValidationConfig } from "./query-validation";
import { assertValidQuery } from "./query-validation";

export interface LocationScopedRepo<T, TCreate> {
  create: (input: TCreate) => Promise<T>;
  getById: (id: string) => Promise<T | null>;
  getByLocation: (locationId: string) => Promise<T[]>;
  update: (id: string, data: Partial<any>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  getByPhoneInLocation?: (locationId: string, phone: string) => Promise<T | null>;
}

export class LocationScopedDataSource<
  T extends { id: string },
  TField extends string,
  TCreate = unknown
> implements DataSource<T, TField> {
  constructor(
    private repo: LocationScopedRepo<T, TCreate>,
    private pkFn: (id: string) => string,
    private metaSK: string,
    private validationConfig?: QueryValidationConfig<TField>
  ) {}

  async queryByLocation(
    locationId: string,
    spec: QuerySpec<TField>
  ): Promise<ApiResult<QueryResult<T>>> {
    try {
      if (this.validationConfig) {
        assertValidQuery(spec, this.validationConfig);
      }
      const items = await this.repo.getByLocation(locationId);
      return { success: true, data: executeQuery(items, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "queryByLocation failed",
      };
    }
  }

  async query(_spec: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>> {
    return { success: false, error: "Use queryByLocation() for location-scoped reads." };
  }

  async getById(id: string): Promise<ApiResult<T | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: this.pkFn(id), SK: this.metaSK },
        })
      );
      if (!result.Item) return { success: true, data: null };
      return { success: true, data: fromItem<T>(result.Item) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getById failed",
      };
    }
  }

  async getCount(
    _filters?: QuerySpec<TField>["filters"]
  ): Promise<ApiResult<number>> {
    return { success: false, error: "Use queryByLocation() for count." };
  }

  async create(data: TCreate): Promise<ApiResult<T>> {
    try {
      const item = await this.repo.create(data);
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "create failed",
      };
    }
  }

  async update(id: string, data: Partial<Omit<T, "id" | "createdAt">>): Promise<ApiResult<T>> {
    try {
      const item = await this.repo.update(id, data);
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      await this.repo.delete(id);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }

  async getByUniqueField(field: string, value: string): Promise<ApiResult<T | null>> {
    if (field !== "phone" || !this.repo.getByPhoneInLocation) {
      return { success: false, error: `Unsupported lookup field: ${field}` };
    }
    try {
      const { locationId, phone } = JSON.parse(value) as { locationId: string; phone: string };
      const item = await this.repo.getByPhoneInLocation(locationId, phone);
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByUniqueField failed",
      };
    }
  }
}
