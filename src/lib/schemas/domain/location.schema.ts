import { z } from "zod";

export const LocationSchema = z.object({
  id: z.ulid(),

  // Identity
  /** URL-safe unique slug, e.g. "bangalore-south". Part of /locations/:slug */
  slug: z.string().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers and hyphens"),
  name: z.string().min(1),
  description: z.string().optional(),

  // Google Place data (populated from GooglePlaceSearch)
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),

  // Structured address (auto-filled from Place, editable)
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().max(2).optional(),

  // Contact
  phone: z.string().optional(),
  email: z.string().email().optional(),

  // Operations
  /** Maximum member / batch capacity for this centre */
  capacity: z.number().int().positive().optional(),

  isActive: z.boolean().default(true),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Location = z.infer<typeof LocationSchema>;

export const CreateLocationSchema = LocationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateLocationRequest = z.infer<typeof CreateLocationSchema>;

export const UpdateLocationSchema = CreateLocationSchema.partial();
export type UpdateLocationRequest = z.infer<typeof UpdateLocationSchema>;

/**
 * LocationField - Type-safe field names for Location entity
 * Used in QuerySpec<LocationField> for compile-time safety
 */
export type LocationField = keyof Location;
