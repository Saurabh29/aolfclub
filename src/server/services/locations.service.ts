import { locationsDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Location, LocationField, CreateLocationRequest, UpdateLocationRequest } from "~/lib/schemas/domain";
import type { ApiResult } from "~/lib/types";

/**
 * Location Service - Uses generic collection service factory
 * Eliminates boilerplate by delegating to createCollectionService
 */
const service = createCollectionService<Location, LocationField>(locationsDataSource);

export const queryLocations = service.query;
export const getLocationById = service.getById;
export const getLocationCount = service.getCount;

export async function getLocationBySlug(slug: string): Promise<ApiResult<Location | null>> {
  return locationsDataSource.getBySlug(slug);
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  return locationsDataSource.isSlugTaken(slug, excludeId);
}

export async function createLocation(data: CreateLocationRequest): Promise<ApiResult<Location>> {
  // Check slug uniqueness
  if (await locationsDataSource.isSlugTaken(data.slug)) {
    return { success: false, error: `Slug "${data.slug}" is already in use` };
  }
  return locationsDataSource.create(data);
}

export async function updateLocation(id: string, data: UpdateLocationRequest): Promise<ApiResult<Location>> {
  if (data.slug && await locationsDataSource.isSlugTaken(data.slug, id)) {
    return { success: false, error: `Slug "${data.slug}" is already in use` };
  }
  return locationsDataSource.update(id, data);
}

export async function deleteLocation(id: string): Promise<ApiResult<void>> {
  return locationsDataSource.delete!(id);
}
