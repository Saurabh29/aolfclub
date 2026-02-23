import { usersDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { User, UserField } from "~/lib/schemas/domain";

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
