import { query } from "@solidjs/router";
import {
  queryLocations,
  getLocationById,
  getLocationBySlug,
  isSlugTaken,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../services/locations.service";
import type { QuerySpec } from "~/lib/schemas/query";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { LocationField, CreateLocationRequest, UpdateLocationRequest } from "~/lib/schemas/domain";

/**
 * Query locations with filters, sorting, and pagination
 * 
 * Usage in routes:
 * ```tsx
 * const locations = createAsync(() => queryLocationsQuery({
 *   filters: [{ field: "isActive", op: "eq", value: true }],
 *   sorting: [{ field: "name", direction: "asc" }],
 *   pagination: { pageSize: 20, pageIndex: 0 }
 * }));
 * ```
 */
export const queryLocationsQuery = query(async (spec: QuerySpec<LocationField>) => {
  "use server";
  // Validate input spec
  const validatedSpec = QuerySpecSchema.parse(spec);
  const result = await queryLocations(validatedSpec as QuerySpec<LocationField>);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-locations");

/**
 * Get location by ID
 * 
 * Usage in routes:
 * ```tsx
 * const location = createAsync(() => getLocationByIdQuery(locationId));
 * ```
 */
export const getLocationByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getLocationById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "location-by-id");

export const getLocationBySlugQuery = query(async (slug: string) => {
  "use server";
  const result = await getLocationBySlug(slug);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "location-by-slug");

export const checkSlugAvailableQuery = query(async (slug: string, excludeId?: string) => {
  "use server";
  const taken = await isSlugTaken(slug, excludeId);
  return !taken;
}, "location-slug-available");

export const createLocationMutation = query(async (data: CreateLocationRequest) => {
  "use server";
  const result = await createLocation(data);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "create-location");

export const updateLocationMutation = query(async (id: string, data: UpdateLocationRequest) => {
  "use server";
  const result = await updateLocation(id, data);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "update-location");

export const deleteLocationMutation = query(async (id: string) => {
  "use server";
  const result = await deleteLocation(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "delete-location");
