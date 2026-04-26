import { query, action } from "@solidjs/router";
import { execQuery, unwrap, requireAuth, requireAdminRole } from "./helpers";
import {
  queryLocations,
  getLocationById,
  getLocationBySlug,
  isSlugTaken,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../services/locations.service";
import { setActiveLocation } from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LocationField, CreateLocationRequest, UpdateLocationRequest } from "~/lib/schemas/domain";
import { CreateLocationSchema, UpdateLocationSchema } from "~/lib/schemas/domain/location.schema";

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

// -- Actions (mutations)  -  use action(), NOT query() -------------------------

export const createLocationAction = action(async (data: CreateLocationRequest) => {
  "use server";
  CreateLocationSchema.parse(data);
  const result = await createLocation(data);
  if (!result.success) return result;

  // Setup completion: grant location-admin + set active location + consume bootstrap flag
  const { getSessionInfo } = await import("~/lib/auth");
  const { grantLocationAdmin } = await import("~/server/db/repositories/location-admin.repository");
  const { consumeBootstrapFlag } = await import("~/server/db/repositories/whitelist.repository");

  const session = await getSessionInfo();
  if (session.userId && result.data?.id) {
    const locationId = result.data.id;
    await grantLocationAdmin(locationId, session.userId);

    // Create the three canonical role-groups for this location
    const { createUserGroup, addUserToGroup } = await import(
      "~/server/db/repositories/user-group.repository"
    );
    const adminGroup = await createUserGroup({ locationId, groupType: "ADMIN", name: "Admin" });
    await createUserGroup({ locationId, groupType: "TEACHER", name: "Teacher" });
    await createUserGroup({ locationId, groupType: "VOLUNTEER", name: "Volunteer" });

    // Assign the creator as ADMIN of this location
    await addUserToGroup(session.userId, adminGroup.groupId, {
      locationId,
      groupType: "ADMIN",
      groupName: "Admin",
    });

    // Set active location — resolves & caches activeRole from the group just added
    await setActiveLocation(session.userId, locationId);

    if (session.canBootstrap && session.email) {
      await consumeBootstrapFlag(session.email);
    }
  }

  return result;
}, "create-location");

export const updateLocationAction = action(async (id: string, data: UpdateLocationRequest) => {
  "use server";
  const session = await requireAuth();
  requireAdminRole(session);
  UpdateLocationSchema.parse(data);
  return await updateLocation(id, data);
}, "update-location");

export const deleteLocationAction = action(async (id: string) => {
  "use server";
  const session = await requireAuth();
  requireAdminRole(session);
  return await deleteLocation(id);
}, "delete-location");
