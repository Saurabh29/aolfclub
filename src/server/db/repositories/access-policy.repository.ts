/**
 * ACCESS POLICY REPOSITORIES
 * 
 * Repositories for access control entities
 * Server-side only - NO UI concerns
 * 
 * Entities: Role, Permission, UserGroup
 */

import { BaseRepository } from "./base.repository";
import {
  RoleSchema,
  PermissionSchema,
  UserGroupSchema,
  type Role,
  type RoleName,
  type Permission,
  type UserGroup,
} from "~/lib/schemas/db/access-policy.schema";

/**
 * Role Repository
 * 
 * Handles role entity operations
 */
export class RoleRepository extends BaseRepository<typeof RoleSchema> {
  constructor() {
    super(RoleSchema, "Role");
  }

  /**
   * Get role by name
   * 
   * @param name - Role name
   * @returns Role or null
   */
  async getByName(name: RoleName): Promise<Role | null> {
    const result = await this.list();
    return result.items.find((role) => role.name === name) || null;
  }

  /**
   * Find active roles
   * 
   * @param options - Pagination options
   * @returns List of active roles
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Role[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    // Role schema doesn't have status field, return all
    const items = result.items;

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Check if role exists by name
   * 
   * @param name - Role name
   * @returns True if role exists
   */
  async existsByName(name: RoleName): Promise<boolean> {
    const role = await this.getByName(name);
    return role !== null;
  }
}

/**
 * Permission Repository
 * 
 * Handles permission entity operations
 */
export class PermissionRepository extends BaseRepository<typeof PermissionSchema> {
  constructor() {
    super(PermissionSchema, "Permission");
  }

  /**
   * Find permissions by resource
   * 
   * @param resource - Resource name
   * @param options - Pagination options
   * @returns List of permissions
   */
  async findByResource(
    resource: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Permission[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (permission) =>
        permission.resource?.toLowerCase() === resource.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find permissions by action
   * 
   * @param action - Action name (create, read, update, delete, etc.)
   * @param options - Pagination options
   * @returns List of permissions
   */
  async findByAction(
    action: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Permission[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (permission) => permission.action?.toLowerCase() === action.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find permission by resource and action
   * 
   * @param resource - Resource name
   * @param action - Action name
   * @returns Permission or null
   */
  async findByResourceAndAction(
    resource: string,
    action: string
  ): Promise<Permission | null> {
    const result = await this.list();

    return (
      result.items.find(
        (permission) =>
          permission.resource?.toLowerCase() === resource.toLowerCase() &&
          permission.action?.toLowerCase() === action.toLowerCase()
      ) || null
    );
  }

  /**
   * Find active permissions
   * 
   * @param options - Pagination options
   * @returns List of active permissions
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Permission[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    // Permission schema doesn't have status field, return all
    const items = result.items;

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }
}

/**
 * UserGroup Repository
 * 
 * Handles user group entity operations
 */
export class UserGroupRepository extends BaseRepository<typeof UserGroupSchema> {
  constructor() {
    super(UserGroupSchema, "UserGroup");
  }

  /**
   * Find user groups by name
   * 
   * @param name - Group name (partial match)
   * @param options - Pagination options
   * @returns List of user groups
   */
  async findByName(
    name: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: UserGroup[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((group) =>
      group.name?.toLowerCase().includes(name.toLowerCase())
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Get user group by exact name
   * 
   * @param name - Group name
   * @returns User group or null
   */
  async getByName(name: string): Promise<UserGroup | null> {
    const result = await this.list();
    return (
      result.items.find(
        (group) => group.name?.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  /**
   * Find active user groups
   * 
   * @param options - Pagination options
   * @returns List of active user groups
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: UserGroup[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    // UserGroup schema doesn't have status field, return all
    const items = result.items;

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Check if user group exists by name
   * 
   * @param name - Group name
   * @returns True if group exists
   */
  async existsByName(name: string): Promise<boolean> {
    const group = await this.getByName(name);
    return group !== null;
  }
}

// Singleton instances
export const roleRepository = new RoleRepository();
export const permissionRepository = new PermissionRepository();
export const userGroupRepository = new UserGroupRepository();
