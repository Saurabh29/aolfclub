import { z } from "zod";

/**
 * Lead  -  a prospect being followed up for program enrollment.
 *
 * Uniqueness is enforced by phone (E.164 format) via a LEAD_MOBILE# sentinel.
 * Leads do not log in  -  no email sentinel.
 *
 * DB keys:
 *   LEAD#<id>                 / META   -  Lead entity
 *   LEAD_MOBILE#<phone>       / META   -  Mobile uniqueness sentinel
 */

export const InterestLevelEnum = z.enum(["High", "Medium", "Low", "Not_Interested"]);
export type InterestLevel = z.infer<typeof InterestLevelEnum>;

export const LeadTagEnum = z.enum([
  "Wrong Number",
  "No WhatsApp",
  "DND",
  "Callback Requested",
  "Gatekeeper",
  "Language Barrier",
]);
export type LeadTag = z.infer<typeof LeadTagEnum>;

/** Ordered list of all predefined lead tags */
export const LEAD_TAGS: readonly LeadTag[] = [
  "Wrong Number",
  "No WhatsApp",
  "DND",
  "Callback Requested",
  "Gatekeeper",
  "Language Barrier",
];

export const LeadSchema = z.object({
  id: z.ulid(),
  /** Location this lead belongs to. Required — leads are scoped per-location. */
  locationId: z.ulid(),
  displayName: z.string().min(1),
  phone: z.string().min(1),         // E.164 (normalized at write time)
  email: z.email().optional(),
  image: z.url().optional(),

  // Program interest
  interestedPrograms: z.array(z.string()).default([]),

  // Call history
  lastCallDate: z.iso.datetime().optional(),
  lastInterestLevel: InterestLevelEnum.optional(),
  nextFollowUpDate: z.iso.datetime().optional(),
  lastNotes: z.string().optional(),
  totalCallCount: z.number().int().default(0),

  // Volunteer-assigned contact labels
  tags: z.array(LeadTagEnum).default([]),

  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Lead = z.infer<typeof LeadSchema>;

/** Type-safe field names for QuerySpec<LeadField> */
export type LeadField = keyof Lead;
