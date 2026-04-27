import { query, action } from "@solidjs/router";
import { z } from "zod";
import { execQuery, unwrap, requireAuth, requireLocationScope, requireAdminRole, requireCapability } from "./helpers";
import {
  queryUsers,
  getUserById,
  getActiveLocationId,
  setActiveLocation,
  assignUserRole,
  getTeamForLocation,
  createTeamMember,
} from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { UserField, GroupType } from "~/lib/schemas/domain";

export const queryUsersQuery = query(async (spec: QuerySpec<UserField>) => {
  "use server";
  const session = await requireCapability("community:read");
  return execQuery(spec, queryUsers);
}, "query-users");

export const getUserByIdQuery = query(async (id: string) => {
  "use server";
  await requireAuth();
  return unwrap(await getUserById(id));
}, "user-by-id");

/**
 * Get the active location ID for the currently authenticated user.
 * userId is read from the session server-side  -  never trusted from the client.
 */
export const getActiveLocationIdQuery = query(async () => {
  "use server";
  const session = await requireAuth();
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
    const session = await requireAuth();
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
  const session = await requireCapability("community:read");
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
  const session = await requireCapability("community:write");
  requireAdminRole(session);

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      assignUserRole(userId, session.activeLocationId, groupType)
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

const CreateTeamMemberInputSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
});

/**
 * Create a new team member at the active location.
 * Only Admins may call this.
 */
export const createTeamMemberAction = action(
  async (input: z.infer<typeof CreateTeamMemberInputSchema>) => {
    "use server";
    const session = await requireCapability("community:write");
    requireAdminRole(session);
    const validated = CreateTeamMemberInputSchema.parse(input);
    const result = await createTeamMember(
      validated.displayName,
      validated.email,
      validated.phone,
      session.activeLocationId
    );
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
  "create-team-member"
);

// -- Accessible pages (for client-side nav filtering) -------------------------

/**
 * Return the list of page names the current user can access at their active location.
 * Derives page visibility from capabilities using PAGE_CAPABILITY_MAP.
 * Used by the shell to build role-aware navigation.
 */
export const getAccessiblePagesQuery = query(async () => {
  "use server";
  const session = await requireLocationScope();

  const { ALL_PAGES } = await import("~/lib/schemas/domain/capability.schema");
  if (session.isAdmin) return [...ALL_PAGES];

  const { getAccessiblePages } = await import(
    "~/server/db/repositories/access.repository"
  );
  return getAccessiblePages(
    session.userId,
    session.activeLocationId,
    [...ALL_PAGES],
  );
}, "accessible-pages");
