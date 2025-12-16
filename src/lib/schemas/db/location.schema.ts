/**
 * LOCATION SCHEMA (ReBAC Design)
 *
 * Represents a physical shop location
 * All business operations are scoped to locations
 *
 * DynamoDB Keys:
 * - PK: LOCATION#<locationId>
 * - SK: META
 */

import { z } from "zod";

export const LocationSchema = z.object({
  PK: z.string().regex(/^LOCATION#[a-zA-Z0-9-]+$/),
  SK: z.literal("META"),
  itemType: z.literal("Location"),
  locationId: z.string().min(1), // ULID - auto-generated database ID
  locationCode: z.string().min(6).max(50), // Human-readable code (e.g., "sbc-82")
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Location = z.infer<typeof LocationSchema>;
