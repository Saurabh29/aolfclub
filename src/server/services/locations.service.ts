import { locationsDataSource } from "../data-sources/instances";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { Location, LocationField } from "~/lib/schemas/domain";

/**
 * Query locations
 */
export async function queryLocations(spec: QuerySpec<LocationField>): Promise<ApiResult<QueryResult<Location>>> {
  return await locationsDataSource.query(spec);
}

/**
 * Get location by ID
 */
export async function getLocationById(id: string): Promise<ApiResult<Location | null>> {
  if (!locationsDataSource.getById) {
    return { success: false, error: "getById not supported" };
  }
  return await locationsDataSource.getById(id);
}

/**
 * Get location count
 */
export async function getLocationCount(filters?: QuerySpec<LocationField>["filters"]): Promise<ApiResult<number>> {
  if (!locationsDataSource.getCount) {
    return { success: false, error: "getCount not supported" };
  }
  return await locationsDataSource.getCount(filters);
}
