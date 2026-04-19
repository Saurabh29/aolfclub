import { usersDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { User, UserField, GroupType } from "~/lib/schemas/domain";
import type { ApiResult } from "~/lib/types";

/**
 * User Service - Uses generic collection service factory
 * Eliminates boilerplate by delegating to createCollectionService
 */
const service = createCollectionService<User, UserField>(usersDataSource);

/**
 * Query users using QuerySpec
 */
export const queryUsers = service.query;

/**
 * Get user by ID
 */
export const getUserById = service.getById;

/**
 * Get user count with optional filters
 */
export const getUserCount = service.getCount;

// -- Active location tracking -------------------------------------------------

/**
 * Get the active location ID for a user from their persisted profile.
 */
export async function getActiveLocationId(
  userId: string
): Promise<ApiResult<string | null>> {
  const result = await usersDataSource.getById(userId);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: result.data?.activeLocationId ?? null };
}

/**
 * Persist the active location ID on the user record, and cache the user's
 * resolved role at that location as activeRole.
 * If the user has no group at the new location, activeRole is set to null.
 */
export async function setActiveLocation(
  userId: string,
  locationId: string
): Promise<ApiResult<void>> {
  // Resolve the user's role at the new location
  let activeRole: GroupType | null = null;
  try {
    const { getGroupsForUser } = await import("~/server/db/repositories/user-group.repository");
    const groups = await getGroupsForUser(userId, locationId);
    // One role per location — take the first group's type (if any)
    activeRole = groups.length > 0 ? groups[0].groupType as GroupType : null;
  } catch {
    // Fall through — role remains null
  }

  const result = await usersDataSource.update!(userId, { activeLocationId: locationId, activeRole });
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: undefined };
}

// -- Role assignment ----------------------------------------------------------

/**
 * Assign a team member role (ADMIN | TEACHER | VOLUNTEER) at a location.
 *
 * Enforces one-role-per-location:
 *   1. Remove the user from ALL existing groups at that location.
 *   2. Add the user to the target group.
 *   3. If this is the user's activeLocationId, update their cached activeRole.
 */
export async function assignUserRole(
  userId: string,
  locationId: string,
  groupType: GroupType
): Promise<ApiResult<void>> {
  try {
    const {
      getGroupsForLocation,
      removeUserFromAllGroupsAtLocation,
      addUserToGroup,
    } = await import("~/server/db/repositories/user-group.repository");

    // Find the target group for this role/location
    const groups = await getGroupsForLocation(locationId, groupType);
    if (!groups.length) {
      return {
        success: false,
        error: `No ${groupType} group found for location. Create the location groups first.`,
      };
    }
    const targetGroup = groups[0];

    // Enforce one-role-per-location
    await removeUserFromAllGroupsAtLocation(userId, locationId);

    // Assign to new group
    await addUserToGroup(userId, targetGroup.groupId, {
      locationId,
      groupType,
      groupName: targetGroup.name,
    });

    // Keep cached activeRole in sync
    const userResult = await usersDataSource.getById(userId);
    if (userResult.success && userResult.data?.activeLocationId === locationId) {
      await usersDataSource.update!(userId, { activeRole: groupType });
    }

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "assignUserRole failed",
    };
  }
}

// -- Community team query -----------------------------------------------------

export interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  image?: string;
  activeRole: GroupType | null;
  isAdmin: boolean;
  createdAt: string;
}

/**
 * Get all users at a location, each enriched with their role at that location.
 */
export async function getTeamForLocation(
  locationId: string
): Promise<ApiResult<TeamMember[]>> {
  try {
    const { getGroupsForLocation, getUsersInGroup } = await import(
      "~/server/db/repositories/user-group.repository"
    );

    // Collect all groups at this location
    const groups = await getGroupsForLocation(locationId);

    // Build userId → groupType map
    const userRoleMap = new Map<string, GroupType>();
    for (const group of groups) {
      const members = await getUsersInGroup(group.groupId);
      for (const m of members) {
        // First match wins (shouldn't be duplicates after one-role enforcement)
        if (!userRoleMap.has(m.userId)) {
          userRoleMap.set(m.userId, group.groupType as GroupType);
        }
      }
    }

    // Fetch user records
    const teamMembers: TeamMember[] = [];
    for (const [userId, role] of userRoleMap.entries()) {
      const result = await usersDataSource.getById(userId);
      if (result.success && result.data) {
        const u = result.data;
        teamMembers.push({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          image: u.image,
          activeRole: role,
          isAdmin: u.isAdmin ?? false,
          createdAt: u.createdAt,
        });
      }
    }

    return { success: true, data: teamMembers };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "getTeamForLocation failed",
    };
  }
}
