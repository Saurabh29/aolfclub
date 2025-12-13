import { z } from "zod";

// ============================================================================
// LOCATION SCHEMA
// ============================================================================

/**
 * Location Schema
 */
export const LocationSchema = z.object({
  id: z.string(),
  locationId: z.string().regex(/^[a-z0-9-]{6,50}$/, "Location ID must be 6-50 characters with lowercase letters, numbers, and hyphens only"),
  name: z.string().min(2, "Location name is required (minimum 2 characters)"),
  address: z.string().optional(),
  description: z.string().optional(),
  // Google Places API data (optional)
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * Add Location Form Schema
 */
export const AddLocationFormSchema = z.object({
  locationId: z.string().regex(/^[a-z0-9-]{6,50}$/, "Location ID must be 6-50 characters with lowercase letters, numbers, and hyphens only"),
  name: z.string().min(2, "Location name is required (minimum 2 characters)"),
  address: z.string().optional(),
  description: z.string().optional(),
  // Google Places API data (optional)
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type AddLocationForm = z.infer<typeof AddLocationFormSchema>;
