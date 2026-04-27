/**
 * Access Repository  -  Capability-based RBAC permission chain
 *
 * Canonical access check that walks the full permission chain:
 *   User → Groups (at location) → Roles → Capabilities
 *
 * Fail-closed: returns false on any error or missing data.
 * Super-admins (isAdmin=true) bypass all checks.
 *
 * Depends on:
 *   - user-group.repository (getGroupsForUser)
 *   - user.repository (getUserById)
 *   - DynamoDB Role→Capability edges (ROLE#<name> / CAP#<capability>)
 */

import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { getUserById } from "./user.repository";
import { getGroupsForUser } from "./user-group.repository";
import type { Capability } from "~/lib/schemas/domain/capability.schema";
import { PAGE_CAPABILITY_MAP } from "~/lib/schemas/domain/capability.schema";

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
 * Check if a role grants a specific capability.
 * Reads ROLE#<roleName> / CAP#<capability> edge.
 */
async function roleHasCapability(
  roleName: string,
  capability: Capability
): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.rolePK(roleName),
        SK: Keys.capSK(capability),
      },
    })
  );

  if (!result.Item) return false;
  return result.Item.permission === "ALLOW";
}

/**
 * Get all capabilities granted by a role.
 * Reads ROLE#<roleName> / CAP#* edges.
 */
async function getCapabilitiesForRole(roleName: string): Promise<string[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.rolePK(roleName),
        ":prefix": Keys.CAP_PREFIX,
      },
    })
  );

  return (result.Items ?? [])
    .filter((item) => item.permission === "ALLOW")
    .map((item) => item.capability as string);
}

// ---------------------------------------------------------------------------
// Canonical access checks
// ---------------------------------------------------------------------------

/**
 * CANONICAL CAPABILITY CHECK
 *
 * Does user X have capability Y at location Z?
 *
 * Walk: User → Groups (at location) → Roles (per group) → Capabilities
 * Returns true on first ALLOW found.
 * Fails closed: returns false on error.
 *
 * Super-admin shortcut: if user.isAdmin === true, returns true immediately.
 */
export async function hasCapability(
  userId: string,
  locationId: string,
  capability: Capability
): Promise<boolean> {
  try {
    // Super-admin bypass
    const user = await getUserById(userId);
    if (!user) return false;
    if (user.isAdmin) return true;

    // Step 1: Get user's groups at this location
    const groups = await getGroupsForUser(userId, locationId);
    if (groups.length === 0) return false;

    // Step 2: For each group, get assigned roles and check capability
    for (const group of groups) {
      const roleNames = await getRolesForGroup(group.groupId);
      for (const roleName of roleNames) {
        const allowed = await roleHasCapability(roleName, capability);
        if (allowed) return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[access] hasCapability failed (fail-closed):", error);
    return false;
  }
}

/**
 * Get all capabilities a user has at a location.
 *
 * Walks: User → Groups (at location) → Roles → Capabilities
 * Returns deduplicated list of capability strings.
 */
export async function getUserCapabilities(
  userId: string,
  locationId: string
): Promise<Capability[]> {
  try {
    const user = await getUserById(userId);
    if (!user) return [];

    // Super-admins get all capabilities
    if (user.isAdmin) {
      const { ALL_CAPABILITIES } = await import("~/lib/schemas/domain/capability.schema");
      return [...ALL_CAPABILITIES];
    }

    const groups = await getGroupsForUser(userId, locationId);
    if (groups.length === 0) return [];

    const capabilities = new Set<string>();

    for (const group of groups) {
      const roleNames = await getRolesForGroup(group.groupId);
      for (const roleName of roleNames) {
        const caps = await getCapabilitiesForRole(roleName);
        for (const cap of caps) capabilities.add(cap);
      }
    }

    return [...capabilities] as Capability[];
  } catch (error) {
    console.error("[access] getUserCapabilities failed (fail-closed):", error);
    return [];
  }
}

/**
 * Get the list of accessible pages for a user at a location.
 *
 * Derives page visibility from capabilities using PAGE_CAPABILITY_MAP.
 * A page is visible if the user has the capability mapped to that page.
 *
 * @param userId - User ID
 * @param locationId - Location to check permissions at
 * @param candidatePages - Page names to test (e.g. ["leads", "community", "tasks", "locations"])
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

    // Get all user capabilities once, then derive page visibility
    const capabilities = new Set(await getUserCapabilities(userId, locationId));

    return candidatePages.filter((page) => {
      const requiredCap = PAGE_CAPABILITY_MAP[page];
      if (!requiredCap) return false;
      return capabilities.has(requiredCap);
    });
  } catch (error) {
    console.error("[access] getAccessiblePages failed (fail-closed):", error);
    return [];
  }
}
