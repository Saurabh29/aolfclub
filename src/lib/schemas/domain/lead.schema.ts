import { z } from "zod";

/**
 * Lead — a prospect being followed up for program enrollment.
 *
 * Uniqueness is enforced by phone (E.164 format) via a LEAD_MOBILE# sentinel.
 * Leads do not log in — no email sentinel.
 *
 * DB keys:
 *   LEAD#<id>                 / META  — Lead entity
 *   LEAD_MOBILE#<phone>       / META  — Mobile uniqueness sentinel
 */

export const InterestLevelEnum = z.enum(["High", "Medium", "Low", "Not_Interested"]);
export type InterestLevel = z.infer<typeof InterestLevelEnum>;

export const LeadSchema = z.object({
  id: z.ulid(),
  displayName: z.string().min(1),
  phone: z.string().min(1),         // E.164 (normalized at write time)
  email: z.email().optional(),
  image: z.url().optional(),
  activeLocationId: z.ulid().optional(),

  // Program interest
  interestedPrograms: z.array(z.string()).default([]),

  // Call history
  lastCallDate: z.iso.datetime().optional(),
  lastInterestLevel: InterestLevelEnum.optional(),
  nextFollowUpDate: z.iso.datetime().optional(),
  lastNotes: z.string().optional(),
  totalCallCount: z.number().int().default(0),

  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Lead = z.infer<typeof LeadSchema>;

/** Type-safe field names for QuerySpec<LeadField> */
export type LeadField = keyof Lead;
