import { query } from "@solidjs/router";
import { queryLocations, getLocationById } from "../services/locations.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LocationField } from "~/lib/schemas/domain";

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
  const result = await queryLocations(spec);
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
