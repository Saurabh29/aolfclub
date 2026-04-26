/**
 * Access Repository  -  RBAC permission chain
 *
 * Canonical access check that walks the full permission chain:
 *   User → Groups (at location) → Roles → Page permissions
 *
 * Fail-closed: returns false on any error or missing data.
 * Super-admins (isAdmin=true) bypass all checks.
 *
 * Depends on:
 *   - user-group.repository (getGroupsForUser, getUserGroupById)
 *   - user.repository (getUserById)
 *   - DynamoDB Role→Page permission edges (ROLE#<name> / PAGE#<pageName>)
 */

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { getUserById } from "./user.repository";
import { getGroupsForUser } from "./user-group.repository";

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Get all role names assigned to a group.
 * Reads GROUP#<groupId> / ROLE#* edges.
 */
async function getRolesForGroup(groupId: string): Promise<string[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.groupPK(groupId),
        ":prefix": Keys.ROLE_PREFIX,
      },
    })
  );

  return (result.Items ?? []).map((item) => item.roleName as string);
}

/**
 * Check if a role has ALLOW permission for a specific page.
 * Reads ROLE#<roleName> / PAGE#<pageName> edge.
 */
async function canRoleAccessPage(
  roleName: string,
  pageName: string
): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.rolePK(roleName),
        SK: Keys.pageSK(pageName),
      },
    })
  );

  if (!result.Item) return false;
  return result.Item.permission === "ALLOW";
}

// ---------------------------------------------------------------------------
// Canonical access checks
// ---------------------------------------------------------------------------

/**
 * CANONICAL ACCESS CHECK
 *
 * Can user X access page Y at location Z?
 *
 * Walk: User → Groups (at location) → Roles (per group) → Page permission
 * Returns true on first ALLOW found.
 * Fails closed: returns false on error.
 *
 * Super-admin shortcut: if user.isAdmin === true, returns true immediately.
 */
export async function canUserAccessPage(
  userId: string,
  locationId: string,
  pageName: string
): Promise<boolean> {
  try {
    // Super-admin bypass
    const user = await getUserById(userId);
    if (!user) return false;
    if (user.isAdmin) return true;

    // Step 1: Get user's groups at this location
    const groups = await getGroupsForUser(userId, locationId);
    if (groups.length === 0) return false;

    // Step 2: For each group, get assigned roles and check page permission
    for (const group of groups) {
      const roleNames = await getRolesForGroup(group.groupId);
      for (const roleName of roleNames) {
        const allowed = await canRoleAccessPage(roleName, pageName);
        if (allowed) return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[access] canUserAccessPage failed (fail-closed):", error);
    return false;
  }
}

/**
 * Can user X access page Y at ANY of their locations?
 *
 * Useful for navigation menus before a location is selected.
 */
export async function canUserAccessPageAnyLocation(
  userId: string,
  pageName: string
): Promise<boolean> {
  try {
    const user = await getUserById(userId);
    if (!user) return false;
    if (user.isAdmin) return true;

    // Get ALL groups the user belongs to (no location filter)
    const allGroups = await getGroupsForUser(userId);
    if (allGroups.length === 0) return false;

    for (const group of allGroups) {
      const roleNames = await getRolesForGroup(group.groupId);
      for (const roleName of roleNames) {
        const allowed = await canRoleAccessPage(roleName, pageName);
        if (allowed) return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[access] canUserAccessPageAnyLocation failed (fail-closed):", error);
    return false;
  }
}

/**
 * Get the list of accessible pages for a user at a location.
 *
 * Useful for building dynamic navigation menus.
 *
 * @param userId - User ID
 * @param locationId - Location to check permissions at
 * @param candidatePages - All pages to test (e.g. ["/leads", "/community", "/tasks", "/locations"])
 * @returns Array of page names the user can access
 */
export async function getAccessiblePages(
  userId: string,
  locationId: string,
  candidatePages: string[]
): Promise<string[]> {
  try {
    const user = await getUserById(userId);
    if (!user) return [];
    if (user.isAdmin) return candidatePages;

    // Collect all allowed pages from user's groups at this location
    const groups = await getGroupsForUser(userId, locationId);
    if (groups.length === 0) return [];

    const allowedPages = new Set<string>();

    for (const group of groups) {
      const roleNames = await getRolesForGroup(group.groupId);
      for (const roleName of roleNames) {
        for (const pageName of candidatePages) {
          if (allowedPages.has(pageName)) continue; // Already known to be allowed
          const allowed = await canRoleAccessPage(roleName, pageName);
          if (allowed) allowedPages.add(pageName);
        }
      }
    }

    // Preserve the original ordering from candidatePages
    return candidatePages.filter((p) => allowedPages.has(p));
  } catch (error) {
    console.error("[access] getAccessiblePages failed (fail-closed):", error);
    return [];
  }
}
