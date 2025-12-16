/**
 * ACCESS CONTROL REPOSITORY (ReBAC Design)
 *
 * Manages user-location-role assignments and access checks
 * Core ReBAC logic: User → Location+Role → Page
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "../rebac-client";
import {
  UserLocationRoleSchema,
  type UserLocationRole,
} from "~/lib/schemas/db/user-location-role.schema";
import { type RoleName } from "~/lib/schemas/db/role.schema";
import { type PageName } from "~/lib/schemas/db/page.schema";
import { checkRolePageAccess } from "./role-page.repository";

/**
 * Assign a user to a location with a specific role
 */
export async function assignUserRoleAtLocation(
  userId: string,
  locationId: string,
  roleName: RoleName,
  assignedBy?: string,
): Promise<UserLocationRole> {
  const timestamp = now();

  const assignment: UserLocationRole = {
    PK: Keys.userLocationRolePK(locationId),
    SK: Keys.userLocationRoleSK(userId),
    itemType: "UserLocationRole",
    locationId,
    userId,
    roleName,
    assignedAt: timestamp,
    assignedBy,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate with Zod
  const validated = UserLocationRoleSchema.parse(assignment);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: validated,
    }),
  );

  return validated;
}

/**
 * Get a user's role at a specific location
 * Returns null if user is not assigned to location
 */
export async function getUserRoleAtLocation(
  userId: string,
  locationId: string,
): Promise<RoleName | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.userLocationRolePK(locationId),
        SK: Keys.userLocationRoleSK(userId),
      },
    }),
  );

  if (!result.Item) {
    return null;
  }

  const assignment = UserLocationRoleSchema.parse(result.Item);
  return assignment.status === "active" ? assignment.roleName : null;
}

/**
 * Check if a user can access a page at a location
 *
 * ReBAC Logic:
 * 1. Get user's role at location (1 read)
 * 2. Check if role allows page access (1 read)
 * Total: 2 DynamoDB reads
 *
 * Returns true if user has access, false otherwise
 */
export async function checkUserPageAccess(
  userId: string,
  locationId: string,
  pageName: PageName,
): Promise<boolean> {
  // Step 1: Get user's role at location
  const roleName = await getUserRoleAtLocation(userId, locationId);

  if (!roleName) {
    return false; // User not assigned to location
  }

  // Step 2: Check if role allows page access
  return await checkRolePageAccess(roleName, pageName);
}
