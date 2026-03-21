import { usersDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { User, UserField } from "~/lib/schemas/domain";
import type { ApiResult } from "~/lib/types";

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

// ── Active location tracking ─────────────────────────────────────────────────
// Stub: stored per-server-process in memory.
// Replace with a real DB update (usersDataSource update) once auth is wired.
const _activeLocationByUser = new Map<string, string>();

/**
 * Get the active location ID for a user.
 * Returns null if the user has not selected one yet.
 */
export async function getActiveLocationId(
  userId: string
): Promise<ApiResult<string | null>> {
  return { success: true, data: _activeLocationByUser.get(userId) ?? null };
}

/**
 * Set the active location ID for a user.
 * When auth is wired, replace the Map with a real DB update on the User record.
 */
export async function setActiveLocation(
  userId: string,
  locationId: string
): Promise<ApiResult<void>> {
  _activeLocationByUser.set(userId, locationId);
  return { success: true, data: undefined };
}
