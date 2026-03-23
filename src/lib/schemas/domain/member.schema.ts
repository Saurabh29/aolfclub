import { z } from "zod";

/**
 * Member — an enrolled participant of the organization.
 *
 * Uniqueness is enforced by phone (E.164 format) via a MEMBER_MOBILE# sentinel.
 * Members do not log in — no email sentinel.
 *
 * DB keys:
 *   MEMBER#<id>               / META  — Member entity
 *   MEMBER_MOBILE#<phone>     / META  — Mobile uniqueness sentinel
 */
export const MemberSchema = z.object({
  id: z.ulid(),
  displayName: z.string().min(1),
  phone: z.string().min(1),         // E.164 (normalized at write time)
  email: z.email().optional(),
  image: z.url().optional(),
  activeLocationId: z.ulid().optional(),

  // Program tracking
  memberSince: z.iso.datetime().optional(),
  programsDone: z.array(z.string()).default([]),
  interestedPrograms: z.array(z.string()).default([]),

  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Member = z.infer<typeof MemberSchema>;

/** Type-safe field names for QuerySpec<MemberField> */
export type MemberField = keyof Member;
