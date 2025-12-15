/**
 * ENTITY-SPECIFIC REPOSITORIES
 * 
 * Repositories for core entity types
 * Server-side only - NO UI concerns
 * 
 * Entities: User, Location
 */

import { BaseRepository } from "./base.repository";
import {
  UserSchema,
  LocationSchema,
  type User,
  type Location,
} from "~/lib/schemas/db/core-entities.schema";

/**
 * User Repository
 * 
 * Handles user entity operations (all user types: teacher, volunteer, member, guest, admin)
 */
export class UserRepository extends BaseRepository<typeof UserSchema> {
  constructor() {
    super(UserSchema, "User");
  }

  /**
   * Find users by type
   * 
   * @param userType - User type to filter by
   * @param options - Pagination options
   * @returns List of users
   */
  async findByUserType(
    userType: "teacher" | "volunteer" | "member" | "guest" | "admin" | "pending",
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: User[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((user) =>
      user.userType === userType
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find users by status
   * 
   * @param status - Status to filter by
   * @param options - Pagination options
   * @returns List of users
   */
  async findByStatus(
    status: "active" | "pending_assignment" | "inactive" | "suspended",
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: User[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((user) =>
      user.status === status
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find pending assignment users (OAuth users waiting for admin)
   * 
   * @param options - Pagination options
   * @returns List of pending users
   */
  async findPending(
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: User[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    return this.findByStatus("pending_assignment", options);
  }

  /**
   * Find active users
   * 
   * @param options - Pagination options
   * @returns List of active users
   */
  async findActive(
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: User[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    return this.findByStatus("active", options);
  }

  /**
   * Assign user type (e.g., after OAuth login, admin assigns role)
   * 
   * @param userId - User ID
   * @param userType - User type to assign
   * @returns Updated user
   */
  async assignUserType(
    userId: string,
    userType: "teacher" | "volunteer" | "member" | "guest" | "admin"
  ): Promise<User> {
    return this.update(userId, {
      userType,
      status: "active" as const,
    });
  }

  /**
   * Update user status
   * 
   * @param userId - User ID
   * @param status - New status
   * @returns Updated user
   */
  async updateStatus(
    userId: string,
    status: "active" | "inactive" | "suspended"
  ): Promise<User> {
    return this.update(userId, { status });
  }
}

/**
 * Location Repository
 * 
 * Handles location entity operations
 */
export class LocationRepository extends BaseRepository<typeof LocationSchema> {
  constructor() {
    super(LocationSchema, "Location");
  }

  /**
   * Find locations by city
   * 
   * @param city - City name
   * @param options - Pagination options
   * @returns List of locations
   */
  async findByCity(
    city: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (location) => location.city?.toLowerCase() === city.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find locations by state
   * 
   * @param state - State name
   * @param options - Pagination options
   * @returns List of locations
   */
  async findByState(
    state: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (location) => location.state?.toLowerCase() === state.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find active locations
   * 
   * @param options - Pagination options
   * @returns List of active locations
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    // Location schema doesn't have status field, return all
    const items = result.items;

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find locations with capacity
   * 
   * @param minCapacity - Minimum capacity
   * @param options - Pagination options
   * @returns List of locations
   */
  async findByMinCapacity(
    minCapacity: number,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (location) => (location.capacity || 0) >= minCapacity
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }
}

// Singleton instances
export const userRepository = new UserRepository();
export const locationRepository = new LocationRepository();
