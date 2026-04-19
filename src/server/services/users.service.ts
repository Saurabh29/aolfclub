import { usersDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { User, UserField, GroupType } from "~/lib/schemas/domain";
import type { ApiResult } from "~/lib/types";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { fromItem } from "~/server/data-sources/dynamo-helpers";

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
      getGroupsForUser,
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

    // Get existing memberships at this location to remove in the same transaction
    const existingGroups = await getGroupsForUser(userId, locationId);

    // Build transact items: delete old edges + add new edges atomically
    const timestamp = new Date().toISOString();
    const transactItems: any[] = [];

    // Remove old group edges
    for (const g of existingGroups) {
      transactItems.push(
        { Delete: { TableName: TABLE_NAME, Key: { PK: Keys.userPK(userId), SK: Keys.groupSK(g.groupId) } } },
        { Delete: { TableName: TABLE_NAME, Key: { PK: Keys.groupPK(g.groupId), SK: Keys.userSK(userId) } } },
      );
    }

    // Add new group edges
    transactItems.push(
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: Keys.userPK(userId),
            SK: Keys.groupSK(targetGroup.groupId),
            itemType: "UserGroupEdge",
            userId,
            groupId: targetGroup.groupId,
            locationId,
            groupType,
            groupName: targetGroup.name,
            joinedAt: timestamp,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: Keys.groupPK(targetGroup.groupId),
            SK: Keys.userSK(userId),
            itemType: "GroupUserEdge",
            groupId: targetGroup.groupId,
            userId,
            joinedAt: timestamp,
          },
        },
      },
    );

    // Execute atomically
    const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));

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

    // Fetch members for all groups in parallel
    const groupMemberResults = await Promise.all(
      groups.map(async (group) => ({
        groupType: group.groupType as GroupType,
        members: await getUsersInGroup(group.groupId),
      }))
    );

    // Build userId → groupType map
    const userRoleMap = new Map<string, GroupType>();
    for (const { groupType, members } of groupMemberResults) {
      for (const m of members) {
        if (!userRoleMap.has(m.userId)) {
          userRoleMap.set(m.userId, groupType);
        }
      }
    }

    if (userRoleMap.size === 0) {
      // No DynamoDB groups exist (e.g. dummy/dev mode). Fall back to
      // querying usersDataSource directly, filtered by activeLocationId.
      const fallback = await usersDataSource.query({
        filters: [{ field: "activeLocationId" as any, op: "eq", value: locationId }],
        sorting: [{ field: "displayName" as any, direction: "asc" }],
        pagination: { pageSize: 100, pageIndex: 0 },
      });
      if (!fallback.success) return { success: true, data: [] };
      return {
        success: true,
        data: fallback.data.items.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          image: u.image,
          activeRole: u.activeRole ?? null,
          isAdmin: u.isAdmin ?? false,
          createdAt: u.createdAt,
        })),
      };
    }

    // Batch-get all user records (DynamoDB BatchGet supports up to 100 keys)
    const userIds = Array.from(userRoleMap.keys());
    const allUsers: User[] = [];

    // Process in chunks of 100 (DynamoDB BatchGetItem limit)
    for (let i = 0; i < userIds.length; i += 100) {
      const chunk = userIds.slice(i, i + 100);
      let keys = chunk.map((uid) => ({
        PK: Keys.userPK(uid),
        SK: Keys.metaSK(),
      }));

      while (keys.length > 0) {
        const batchResult = await docClient.send(
          new BatchGetCommand({
            RequestItems: {
              [TABLE_NAME]: { Keys: keys },
            },
          })
        );
        const items = batchResult.Responses?.[TABLE_NAME] ?? [];
        for (const item of items) {
          allUsers.push(fromItem<User>(item));
        }
        // Retry any unprocessed keys
        const unprocessed = batchResult.UnprocessedKeys?.[TABLE_NAME]?.Keys;
        keys = (unprocessed as typeof keys) ?? [];
      }
    }

    // Build TeamMember array
    const teamMembers: TeamMember[] = allUsers
      .filter((u) => userRoleMap.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        image: u.image,
        activeRole: userRoleMap.get(u.id)!,
        isAdmin: u.isAdmin ?? false,
        createdAt: u.createdAt,
      }));

    return { success: true, data: teamMembers };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "getTeamForLocation failed",
    };
  }
}
