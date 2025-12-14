"use server";

import { ulid } from "ulid";
import { locationRepository } from "~/server/db/repositories";
import type { Location } from "~/lib/schemas/db/core-entities.schema";
import { LocationSchema } from "~/lib/schemas/db/core-entities.schema";
import type { AddLocationForm } from "~/lib/schemas/ui/location.schema";
import { AddLocationFormSchema } from "~/lib/schemas/ui/location.schema";

/**
 * Create a new location
 */
export async function createLocation(formData: AddLocationForm) {
  "use server";

  try {
    // Validate input
    const validatedData = AddLocationFormSchema.parse(formData);

    // Create location entity
    const now = new Date().toISOString();
    const location: Location = {
      id: ulid(),
      entityType: "Location" as const,
      locationId: validatedData.locationId,
      name: validatedData.name,
      address: validatedData.address,
      description: validatedData.description,
      placeId: validatedData.placeId,
      formattedAddress: validatedData.formattedAddress,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      createdAt: now,
      updatedAt: now,
    };

    // Validate against DB schema
    LocationSchema.parse(location);

    // Save to database
    await locationRepository.create(location);

    return {
      success: true,
      data: location,
    };
  } catch (error) {
    console.error("Failed to create location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create location",
    };
  }
}

/**
 * Update an existing location
 */
export async function updateLocation(id: string, formData: AddLocationForm) {
  "use server";

  try {
    // Validate input
    const validatedData = AddLocationFormSchema.parse(formData);

    // Get existing location
    const existing = await locationRepository.getById(id);
    if (!existing || existing.entityType !== "Location") {
      return {
        success: false,
        error: "Location not found",
      };
    }

    // Update location entity
    const now = new Date().toISOString();
    const location: Location = {
      ...existing,
      locationId: validatedData.locationId,
      name: validatedData.name,
      address: validatedData.address,
      description: validatedData.description,
      placeId: validatedData.placeId,
      formattedAddress: validatedData.formattedAddress,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      updatedAt: now,
    } as Location;

    // Validate against DB schema
    LocationSchema.parse(location);

    // Save to database
    await locationRepository.update(id, location);

    return {
      success: true,
      data: location,
    };
  } catch (error) {
    console.error("Failed to update location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update location",
    };
  }
}

/**
 * Delete a location
 */
export async function deleteLocation(id: string) {
  "use server";

  try {
    await locationRepository.delete(id);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete location",
    };
  }
}

/**
 * Get all locations
 */
export async function getLocations() {
  "use server";

  try {
    const allEntities = await locationRepository.list();
    const locations = allEntities.items.filter((entity: Location) => entity.entityType === "Location");

    return {
      success: true,
      data: locations,
    };
  } catch (error) {
    console.error("Failed to get locations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get locations",
    };
  }
}

/**
 * Get a single location by ID
 */
export async function getLocationById(id: string) {
  "use server";

  try {
    const entity = await locationRepository.getById(id);
    
    if (!entity || entity.entityType !== "Location") {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: entity as Location,
    };
  } catch (error) {
    console.error("Failed to get location:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get location",
    };
  }
}
