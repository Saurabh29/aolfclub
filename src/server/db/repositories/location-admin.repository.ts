/**
 * Location Admin Repository
 *
 * Manages location-scoped admin relationships.
 *
 * Item shape:
 *   PK = "LOCATION_ADMIN#<locationId>"  SK = "USER#<userId>"
 *   { locationId, userId, grantedAt }
 *
 * Queries supported (no GSI — all via PK):
 *   - Is user X an admin of location Y?  → GetItem by PK+SK
 *   - Which locations is user X admin of? → Scan (small dataset, acceptable)
 *   - Who are the admins of location Y?  → Query by PK
 */

import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";

export interface LocationAdminEdge {
  locationId: string;
  userId: string;
  grantedAt: string;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Check whether a user is an admin of a specific location.
 */
export async function isLocationAdmin(
  locationId: string,
  userId: string
): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.locationAdminPK(locationId),
        SK: Keys.userSK(userId),
      },
    })
  );
  return !!result.Item;
}

/**
 * Get all location IDs that a user is admin of.
 * Uses a Scan filtered by userId — acceptable for a small admin population.
 */
export async function getAdminLocationIds(userId: string): Promise<string[]> {
  const locationIds: string[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "begins_with(PK, :prefix) AND SK = :userSK AND itemType = :t",
        ExpressionAttributeValues: {
          ":prefix": Keys.LOCATION_ADMIN_PREFIX,
          ":userSK": Keys.userSK(userId),
          ":t": "LocationAdmin",
        },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of result.Items ?? []) {
      locationIds.push(item.locationId as string);
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return locationIds;
}

/**
 * Get all admins (user IDs) for a specific location.
 */
export async function getLocationAdminUserIds(
  locationId: string
): Promise<string[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :userPrefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.locationAdminPK(locationId),
        ":userPrefix": Keys.USER_PREFIX,
      },
    })
  );
  return (result.Items ?? []).map((item) => item.userId as string);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Grant a user location-admin rights.
 * Idempotent — granting an existing admin does nothing.
 */
export async function grantLocationAdmin(
  locationId: string,
  userId: string
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: Keys.locationAdminPK(locationId),
        SK: Keys.userSK(userId),
        itemType: "LocationAdmin",
        locationId,
        userId,
        grantedAt: now(),
      },
    })
  );
}

/**
 * Revoke location-admin rights for a user.
 */
export async function revokeLocationAdmin(
  locationId: string,
  userId: string
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.locationAdminPK(locationId),
        SK: Keys.userSK(userId),
      },
    })
  );
}
