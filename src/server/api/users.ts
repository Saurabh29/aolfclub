import { query } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import { queryUsers, getUserById, getActiveLocationId, setActiveLocation } from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { UserField } from "~/lib/schemas/domain";

export const queryUsersQuery = query(async (spec: QuerySpec<UserField>) => {
  "use server";
  return execQuery(spec, queryUsers);
}, "query-users");

export const getUserByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getUserById(id));
}, "user-by-id");

/**
 * Get the active location ID for the currently authenticated user.
 * userId is read from the session server-side — never trusted from the client.
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
 * userId is read from the session — not accepted from the client.
 */
export const setActiveLocationMutation = query(
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
