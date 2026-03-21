import { query } from "@solidjs/router";
import { queryUsers, getUserById, getActiveLocationId, setActiveLocation } from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { UserField } from "~/lib/schemas/domain";

/**
 * Query users with filters, sorting, and pagination
 * 
 * Usage in routes:
 * ```tsx
 * const users = createAsync(() => queryUsersQuery({
 *   filters: [{ field: "userType", op: "eq", value: "MEMBER" }],
 *   sorting: [{ field: "displayName", direction: "asc" }],
 *   pagination: { pageSize: 20, pageIndex: 0 }
 * }));
 * ```
 */
export const queryUsersQuery = query(async (spec: QuerySpec<UserField>) => {
  "use server";
  // Validate input spec
  const validatedSpec = QuerySpecSchema.parse(spec);
  const result = await queryUsers(validatedSpec as QuerySpec<UserField>);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-users");

/**
 * Get user by ID
 * 
 * Usage in routes:
 * ```tsx
 * const user = createAsync(() => getUserByIdQuery(userId));
 * ```
 */
export const getUserByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getUserById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "user-by-id");

/**
 * Get the active location ID stored for a user.
 * Returns null if the user has not selected a location yet.
 */
export const getActiveLocationIdQuery = query(async (userId: string) => {
  "use server";
  const result = await getActiveLocationId(userId);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "user-active-location-id");

/**
 * Set the active location for a user.
 * Stub: persists in server memory. Replace with real DB update once auth is wired.
 */
export const setActiveLocationMutation = query(
  async (userId: string, locationId: string) => {
    "use server";
    const result = await setActiveLocation(userId, locationId);
    if (!result.success) throw new Error(result.error);
  },
  "set-active-location"
);
