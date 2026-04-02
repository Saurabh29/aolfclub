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

/**
 * Get the active location ID for a user from their persisted profile.
 */
export async function getActiveLocationId(
  userId: string
): Promise<ApiResult<string | null>> {
  const result = await usersDataSource.getById(userId);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: result.data?.activeLocationId ?? null };
}

/**
 * Persist the active location ID on the user record.
 */
export async function setActiveLocation(
  userId: string,
  locationId: string
): Promise<ApiResult<void>> {
  const result = await usersDataSource.update!(userId, { activeLocationId: locationId });
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: undefined };
}
