import { query, action } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import {
  queryUsers,
  getUserById,
  getActiveLocationId,
  setActiveLocation,
  assignUserRole,
  getTeamForLocation,
} from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { UserField, GroupType } from "~/lib/schemas/domain";

export const queryUsersQuery = query(async (spec: QuerySpec<UserField>) => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.userId) throw new Error("Not authenticated");
  if (!session.isAdmin && !session.activeLocationId) {
    throw new Error("No active location selected.");
  }
  return execQuery(spec, queryUsers);
}, "query-users");

export const getUserByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getUserById(id));
}, "user-by-id");

/**
 * Get the active location ID for the currently authenticated user.
 * userId is read from the session server-side  -  never trusted from the client.
 */
export const getActiveLocationIdQuery = query(async () => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.userId) return null;
  const result = await getActiveLocationId(session.userId);
  return result.success ? (result.data ?? null) : null;
}, "user-active-location-id");

/**
 * Set the active location for the currently authenticated user.
 * userId is read from the session  -  not accepted from the client.
 */
export const setActiveLocationMutation = action(
  async (locationId: string) => {
    "use server";
    const { getSessionInfo } = await import("~/lib/auth");
    const session = await getSessionInfo();
    if (!session.userId) throw new Error("Not authenticated");
    const result = await setActiveLocation(session.userId, locationId);
    if (!result.success) throw new Error(result.error);
  },
  "set-active-location"
);

/**
 * Get all team members for the current user's active location,
 * each enriched with their role at that location.
 */
export const getCommunityTeamQuery = query(async () => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.activeLocationId) return [];
  const result = await getTeamForLocation(session.activeLocationId);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "community-team");

/**
 * Assign a role to a list of users at the active location.
 * Only Admins (or super-admins) may call this.
 */
export const assignRoleAction = action(async (userIds: string[], groupType: GroupType) => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();

  if (!session.userId) return { success: false, error: "Not authenticated" } as const;
  if (!session.activeLocationId) return { success: false, error: "No active location" } as const;

  // Only super-admins or location Admins may assign roles
  if (!session.isAdmin && session.activeRole !== "ADMIN") {
    return { success: false, error: "Unauthorized: only Admins can assign roles." } as const;
  }

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      assignUserRole(userId, session.activeLocationId!, groupType)
    )
  );

  let assigned = 0;
  const errors: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.success) {
      assigned++;
    } else {
      const msg =
        r.status === "rejected"
          ? String(r.reason)
          : r.value.success === false
            ? r.value.error
            : "unknown";
      errors.push(`${userIds[i]}: ${msg}`);
    }
  }

  return { success: true, data: { assigned, failed: errors.length, errors } } as const;
}, "assign-role");
