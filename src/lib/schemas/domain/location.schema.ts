import { z } from "zod";

export const LocationSchema = z.object({
  id: z.ulid(),
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * LocationField - Type-safe field names for Location entity
 * Used in QuerySpec<LocationField> for compile-time safety
 */
export type LocationField = keyof Location;
