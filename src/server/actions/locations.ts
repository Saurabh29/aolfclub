"use server";

import {
  createLocation as createLocationRepo,
  getLocationById as getLocationByIdRepo,
  listAllLocations,
  type CreateLocationInput,
} from "~/server/db/repositories";
import type { AddLocationForm } from "~/lib/schemas/ui/location.schema";
import { AddLocationFormSchema } from "~/lib/schemas/ui/location.schema";
import type { Location } from "~/lib/schemas/ui/location.schema";

// Action result shape used by server actions
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Map DB Location (server schema) to UI Location shape
function toUiLocation(dbLoc: any): Location {
  return {
    id: dbLoc.locationId,
    locationCode: dbLoc.locationCode,
    name: dbLoc.name,
    address: dbLoc.address,
    description: (dbLoc as any).description,
    placeId: (dbLoc as any).placeId,
    formattedAddress: (dbLoc as any).formattedAddress,
    latitude: (dbLoc as any).latitude,
    longitude: (dbLoc as any).longitude,
    createdAt: dbLoc.createdAt,
    updatedAt: dbLoc.updatedAt,
  } as Location;
}

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
      locationCode: validatedData.locationCode,
      name: validatedData.name,
      address: validatedData.formattedAddress || validatedData.address,
      // UI form doesn't include city/state/zipCode/phone — set status to default
      status: "active",
    };

    // Create location using repository
    const dbLocation = await createLocationRepo(dbInput);

    return {
      success: true,
      data: toUiLocation(dbLocation),
    };
  } catch (error) {
    console.error("[createLocation] Error:", error);
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
    const dbLocation = await getLocationByIdRepo(locationId);

    if (!dbLocation) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: toUiLocation(dbLocation),
    };
  } catch (error) {
    console.error("Failed to get location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get location",
    };
  }
}

// TODO: Implement updateLocation, deleteLocation
// These require additional repository methods not yet implemented in the ReBAC design

/**
 * Get all locations
 */
export async function getLocations(): Promise<ActionResult<Location[]>> {
  "use server";

  try {
    const dbLocations = await listAllLocations();
    const uiLocations = dbLocations.map(toUiLocation);
    return {
      success: true,
      data: uiLocations,
    };
  } catch (error) {
    console.error("[getLocations] Failed to fetch locations:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch locations. Please try again.",
    };
  }
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
