import { query, action } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
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
import type { LocationField, CreateLocationRequest, UpdateLocationRequest } from "~/lib/schemas/domain";

export const queryLocationsQuery = query(async (spec: QuerySpec<LocationField>) => {
  "use server";
  return execQuery(spec, queryLocations);
}, "query-locations");

export const getLocationByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getLocationById(id));
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
