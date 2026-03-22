/**
 * Permission Repository
 *
 * Manages roles, pages, and their relationships (data-driven ReBAC).
 * Backend is kept ready; page-level enforcement is not yet wired into routes.
 *
 * Item shapes:
 *   ROLE#<roleName>   / META              — Role entity
 *   PAGE#<pageName>   / META              — Page entity
 *   GROUP#<groupId>   / ROLE#<roleName>   — Group→Role assignment edge
 *   ROLE#<roleName>   / PAGE#<pageName>   — Role→Page permission edge (ALLOW | DENY)
 */

import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Permission = "ALLOW" | "DENY";

export interface Role {
  roleName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  pageName: string;
  description?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Create a role. Throws if the role already exists.
 */
export async function createRole(roleName: string, description?: string): Promise<Role> {
  const timestamp = now();

  const role: Role = { roleName, description, createdAt: timestamp, updatedAt: timestamp };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { PK: Keys.rolePK(roleName), SK: Keys.metaSK(), itemType: "Role", ...role },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return role;
}

/** Get a role by name. */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.rolePK(roleName), SK: Keys.metaSK() },
    })
  );

  if (!result.Item) return null;

  const item = result.Item as Record<string, unknown>;
  return {
    roleName: item.roleName as string,
    description: item.description as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

/**
 * Register a page. Idempotent — uses attribute_not_exists guard.
 * Pages represent route slugs like "/leads", "/members", "/tasks", "/locations".
 */
export async function createPage(pageName: string, description?: string): Promise<Page> {
  const timestamp = now();

  const page: Page = { pageName, description, createdAt: timestamp };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { PK: Keys.pagePK(pageName), SK: Keys.metaSK(), itemType: "Page", ...page },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return page;
}

/** Get a page by name. */
export async function getPageByName(pageName: string): Promise<Page | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.pagePK(pageName), SK: Keys.metaSK() },
    })
  );

  if (!result.Item) return null;

  const item = result.Item as Record<string, unknown>;
  return {
    pageName: item.pageName as string,
    description: item.description as string | undefined,
    createdAt: item.createdAt as string,
  };
}

// ---------------------------------------------------------------------------
// Group → Role assignments
// ---------------------------------------------------------------------------

/**
 * Assign a role to a group. Idempotent.
 */
export async function assignRoleToGroup(groupId: string, roleName: string): Promise<void> {
  const timestamp = now();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: Keys.groupPK(groupId),
        SK: Keys.roleSK(roleName),
        itemType: "GroupRoleEdge",
        groupId,
        roleName,
        assignedAt: timestamp,
      },
    })
  );
}

/**
 * Remove a role from a group.
 */
export async function removeRoleFromGroup(groupId: string, roleName: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.groupPK(groupId), SK: Keys.roleSK(roleName) },
    })
  );
}

/**
 * Get all role names assigned to a group.
 */
export async function getRolesForGroup(groupId: string): Promise<string[]> {
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

// ---------------------------------------------------------------------------
// Role → Page permissions
// ---------------------------------------------------------------------------

/**
 * Set a role's permission for a page.
 * Creates the edge with ALLOW or DENY. Overwrites if it already exists.
 */
export async function setRolePagePermission(
  roleName: string,
  pageName: string,
  permission: Permission
): Promise<void> {
  const timestamp = now();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: Keys.rolePK(roleName),
        SK: Keys.pageSK(pageName),
        itemType: "RolePagePermission",
        roleName,
        pageName,
        permission,
        updatedAt: timestamp,
      },
    })
  );
}

/**
 * Check if a role allows access to a page.
 * Returns true only if the permission is explicitly ALLOW.
 * No edge or DENY → false (fail-closed).
 */
export async function canRoleAccessPage(roleName: string, pageName: string): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.rolePK(roleName), SK: Keys.pageSK(pageName) },
    })
  );

  if (!result.Item) return false;
  return (result.Item.permission as string) === "ALLOW";
}

/**
 * Get all page permissions for a role.
 */
export async function getPermissionsForRole(
  roleName: string
): Promise<Array<{ pageName: string; permission: Permission }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": Keys.rolePK(roleName),
        ":prefix": Keys.PAGE_PREFIX,
      },
    })
  );

  return (result.Items ?? []).map((item) => ({
    pageName: item.pageName as string,
    permission: item.permission as Permission,
  }));
}
