/**
 * User-Group Repository
 *
 * Manages UserGroup entities and user↔group memberships.
 *
 * Item shapes:
 *   GROUP#<id>            / META              — Group entity
 *   LOCATION#<locationId> / GROUP#<groupId>   — Location→Group edge (list groups in location)
 *   USER#<userId>         / GROUP#<groupId>   — User→Group edge
 *   GROUP#<groupId>       / USER#<userId>     — Group→User edge (list users in group)
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupType = "ADMIN" | "TEACHER" | "VOLUNTEER";

export interface UserGroup {
  groupId: string;
  locationId: string;
  groupType: GroupType;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserGroupInput {
  locationId: string;
  groupType: GroupType;
  name: string;
}

// ---------------------------------------------------------------------------
// Group CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new group and its Location→Group edge atomically.
 */
export async function createUserGroup(input: CreateUserGroupInput): Promise<UserGroup> {
  const groupId = ulid();
  const timestamp = now();

  const groupItem = {
    PK: Keys.groupPK(groupId),
    SK: Keys.metaSK(),
    itemType: "Group",
    groupId,
    locationId: input.locationId,
    groupType: input.groupType,
    name: input.name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const locationGroupEdge = {
    PK: Keys.locationPK(input.locationId),
    SK: Keys.groupSK(groupId),
    itemType: "LocationGroupEdge",
    groupId,
    locationId: input.locationId,
    groupType: input.groupType,
    name: input.name,
    createdAt: timestamp,
  };

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: groupItem,
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
        { Put: { TableName: TABLE_NAME, Item: locationGroupEdge } },
      ],
    })
  );

  return {
    groupId,
    locationId: input.locationId,
    groupType: input.groupType,
    name: input.name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Get a group by ID.
 */
export async function getUserGroupById(groupId: string): Promise<UserGroup | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.groupPK(groupId), SK: Keys.metaSK() },
    })
  );

  if (!result.Item) return null;

  const item = result.Item as Record<string, unknown>;
  return {
    groupId: item.groupId as string,
    locationId: item.locationId as string,
    groupType: item.groupType as GroupType,
    name: item.name as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

/**
 * List all groups for a location using LOCATION→GROUP edges.
 * Optionally filter by groupType.
 */
export async function getGroupsForLocation(
  locationId: string,
  groupType?: GroupType
): Promise<Array<{ groupId: string; groupType: GroupType; name: string }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.locationPK(locationId),
        ":prefix": Keys.GROUP_PREFIX,
      },
    })
  );

  const groups = (result.Items ?? []).map((item) => ({
    groupId: item.groupId as string,
    groupType: item.groupType as GroupType,
    name: item.name as string,
  }));

  return groupType ? groups.filter((g) => g.groupType === groupType) : groups;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/**
 * Add a user to a group (bidirectional edges).
 * Idempotent — uses attribute_not_exists guard.
 */
export async function addUserToGroup(
  userId: string,
  groupId: string,
  options?: {
    locationId?: string;
    groupType?: GroupType;
    groupName?: string;
    userDisplayName?: string;
  }
): Promise<void> {
  const timestamp = now();

  let locationId = options?.locationId;
  let groupType = options?.groupType;
  let groupName = options?.groupName;

  if (!locationId || !groupType) {
    const group = await getUserGroupById(groupId);
    if (!group) throw new Error(`Group "${groupId}" not found`);
    locationId = group.locationId;
    groupType = group.groupType;
    groupName = groupName ?? group.name;
  }

  const userGroupEdge = {
    PK: Keys.userPK(userId),
    SK: Keys.groupSK(groupId),
    itemType: "UserGroupEdge",
    userId,
    groupId,
    locationId,
    groupType,
    groupName,
    joinedAt: timestamp,
  };

  const groupUserEdge = {
    PK: Keys.groupPK(groupId),
    SK: Keys.userSK(userId),
    itemType: "GroupUserEdge",
    groupId,
    userId,
    userDisplayName: options?.userDisplayName,
    joinedAt: timestamp,
  };

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: userGroupEdge,
            ConditionExpression: "attribute_not_exists(PK) OR attribute_not_exists(SK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: groupUserEdge,
            ConditionExpression: "attribute_not_exists(PK) OR attribute_not_exists(SK)",
          },
        },
      ],
    })
  );
}

/**
 * Remove a user from a group (deletes both edges).
 */
export async function removeUserFromGroup(userId: string, groupId: string): Promise<void> {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.userPK(userId), SK: Keys.groupSK(groupId) },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.groupPK(groupId), SK: Keys.userSK(userId) },
          },
        },
      ],
    })
  );
}

/**
 * List all groups a user belongs to.
 * Optionally filtered by locationId (post-query in-memory, since no GSI).
 */
export async function getGroupsForUser(
  userId: string,
  locationId?: string
): Promise<Array<{ groupId: string; locationId: string; groupType: GroupType; groupName?: string }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.userPK(userId),
        ":prefix": Keys.GROUP_PREFIX,
      },
    })
  );

  const groups = (result.Items ?? []).map((item) => ({
    groupId: item.groupId as string,
    locationId: item.locationId as string,
    groupType: item.groupType as GroupType,
    groupName: item.groupName as string | undefined,
  }));

  return locationId ? groups.filter((g) => g.locationId === locationId) : groups;
}

/**
 * List all users in a group using GROUP→USER edges.
 */
export async function getUsersInGroup(
  groupId: string
): Promise<Array<{ userId: string; userDisplayName?: string; joinedAt: string }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.groupPK(groupId),
        ":prefix": Keys.USER_PREFIX,
      },
    })
  );

  return (result.Items ?? []).map((item) => ({
    userId: item.userId as string,
    userDisplayName: item.userDisplayName as string | undefined,
    joinedAt: item.joinedAt as string,
  }));
}
