"use server";

import {
  createLocation as createLocationRepo,
  getLocationById as getLocationByIdRepo,
  type CreateLocationInput,
} from "~/server/db/repositories";
import type { AddLocationForm } from "~/lib/schemas/ui/location.schema";
import { AddLocationFormSchema } from "~/lib/schemas/ui/location.schema";

/**
 * Create a new location
 *
 * TYPE SAFETY PATTERN:
 * - UI form validated with AddLocationFormSchema (runtime + compile-time)
 * - Transform to CreateLocationInput (compile-time checked against DB schema)
 * - TypeScript errors if:
 *   1. We try to access DB schema fields from UI
 *   2. We pass wrong fields to repository
 *   3. DB schema changes but we don't update transform
 *
 * Example: If DB schema adds required field 'country', TypeScript will error here:
 *   Type '{ name: string; address: string; status: string }' is not assignable to type 'CreateLocationInput'.
 *   Property 'country' is missing in type...
 */
export async function createLocation(formData: AddLocationForm) {
  "use server";

  try {
    // Validate input
    const validatedData = AddLocationFormSchema.parse(formData);

    // Transform to repository input - TypeScript will error if types don't match
    const dbInput: CreateLocationInput = {
      name: validatedData.name,
      address: validatedData.formattedAddress || validatedData.address,
      status: "active",
    };

    // Create location using repository
    const location = await createLocationRepo(dbInput);

    return {
      success: true,
      data: location,
    };
  } catch (error) {
    console.error("Failed to create location:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create location",
    };
  }
}

/**
 * Get a single location by ID
 */
export async function getLocationById(locationId: string) {
  "use server";

  try {
    const location = await getLocationByIdRepo(locationId);

    if (!location) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: location,
    };
  } catch (error) {
    console.error("Failed to get location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get location",
    };
  }
}

// TODO: Implement updateLocation, deleteLocation, getLocations
// These require additional repository methods not yet implemented in the ReBAC design

/**
 * Get all locations (stub)
 */
export async function getLocations() {
  "use server";

  // TODO: Implement list locations functionality
  return {
    success: true,
    data: [],
  };
}

/**
 * Delete a location (stub)
 */
export async function deleteLocation(locationId: string) {
  "use server";

  // TODO: Implement delete location functionality
  return {
    success: false,
    error: "Delete location not yet implemented",
  };
}
