import { locationsDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Location, LocationField } from "~/lib/schemas/domain";

/**
 * Location Service - Uses generic collection service factory
 * Eliminates boilerplate by delegating to createCollectionService
 */
const service = createCollectionService<Location, LocationField>(locationsDataSource);

/**
 * Query locations using QuerySpec
 */
export const queryLocations = service.query;

/**
 * Get location by ID
 */
export const getLocationById = service.getById;

/**
 * Get location count with optional filters
 */
export const getLocationCount = service.getCount;
