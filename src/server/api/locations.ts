import { query, action } from "@solidjs/router";
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

// ── Actions (mutations) — use action(), NOT query() ─────────────────────────

export const createLocationAction = action(async (data: CreateLocationRequest) => {
  "use server";
  const result = await createLocation(data);
  if (!result.success) return result;

  // Setup completion: grant location-admin + set active location + consume bootstrap flag
  const { getSessionInfo } = await import("~/lib/auth");
  const { grantLocationAdmin } = await import("~/server/db/repositories/location-admin.repository");
  const { consumeBootstrapFlag } = await import("~/server/db/repositories/whitelist.repository");
  const { usersDataSource } = await import("~/server/data-sources/instances");

  const session = await getSessionInfo();
  if (session.userId && result.data?.id) {
    const locationId = result.data.id;
    await grantLocationAdmin(locationId, session.userId);
    await usersDataSource.update!(session.userId, { activeLocationId: locationId });
    if (session.canBootstrap && session.email) {
      await consumeBootstrapFlag(session.email);
    }
  }

  return result;
}, "create-location");

export const updateLocationAction = action(async (id: string, data: UpdateLocationRequest) => {
  "use server";
  return await updateLocation(id, data);
}, "update-location");

export const deleteLocationAction = action(async (id: string) => {
  "use server";
  return await deleteLocation(id);
}, "delete-location");
