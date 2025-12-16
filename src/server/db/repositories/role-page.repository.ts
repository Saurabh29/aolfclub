/**
 * ROLE & PAGE REPOSITORY (ReBAC Design)
 *
 * Manages global roles and pages
 * Controls which roles can access which pages
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "../rebac-client";
import {
  RoleSchema,
  type Role,
  type RoleName,
} from "~/lib/schemas/db/role.schema";
import {
  PageSchema,
  type Page,
  type PageName,
} from "~/lib/schemas/db/page.schema";
import {
  RolePageAccessSchema,
  type RolePageAccess,
} from "~/lib/schemas/db/role-page-access.schema";

/**
 * Create a new role
 */
export async function createRole(input: {
  roleName: RoleName;
  description?: string;
  status?: "active" | "inactive";
}): Promise<Role> {
  const timestamp = now();

  const role: Role = {
    PK: Keys.rolePK(input.roleName),
    SK: Keys.roleSK(),
    itemType: "Role",
    roleName: input.roleName,
    description: input.description,
    status: input.status || "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate with Zod
  const validated = RoleSchema.parse(role);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: validated,
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );

  return validated;
}

/**
 * Create a new page
 */
export async function createPage(input: {
  pageName: PageName;
  displayName: string;
  description?: string;
  status?: "active" | "inactive";
}): Promise<Page> {
  const timestamp = now();

  const page: Page = {
    PK: Keys.pagePK(input.pageName),
    SK: Keys.pageSK(),
    itemType: "Page",
    pageName: input.pageName,
    displayName: input.displayName,
    description: input.description,
    status: input.status || "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate with Zod
  const validated = PageSchema.parse(page);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: validated,
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );

  return validated;
}

/**
 * Allow (or deny) a role access to a page
 */
export async function allowRoleAccessToPage(
  roleName: RoleName,
  pageName: PageName,
  allowed: boolean,
  grantedBy?: string,
): Promise<RolePageAccess> {
  const timestamp = now();

  const access: RolePageAccess = {
    PK: Keys.rolePageAccessPK(roleName),
    SK: Keys.rolePageAccessSK(pageName),
    itemType: "RolePageAccess",
    roleName,
    pageName,
    allowed,
    grantedAt: timestamp,
    grantedBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate with Zod
  const validated = RolePageAccessSchema.parse(access);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: validated,
    }),
  );

  return validated;
}

/**
 * Check if a role has access to a page
 * Returns true if allowed, false if denied or not found
 */
export async function checkRolePageAccess(
  roleName: RoleName,
  pageName: PageName,
): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.rolePageAccessPK(roleName),
        SK: Keys.rolePageAccessSK(pageName),
      },
    }),
  );

  if (!result.Item) {
    return false;
  }

  const access = RolePageAccessSchema.parse(result.Item);
  return access.allowed;
}
