/**
 * CORE ENTITY SCHEMAS
 *
 * Server-side database schemas for core domain entities
 * NO UI concerns, NO embedded relationships
 * Intrinsic attributes only
 */

import { z } from "zod";
import { BaseEntitySchema } from "./base.schema";

/**
 * USER ENTITY
 *
 * Represents a user in the system
 * Supports OAuth-created AND CSV-imported users
 * Access control is per User, NOT per Email
 *
 * WORKFLOW:
 * 1. OAuth Login: Create User with userType="pending" or null
 * 2. Admin assigns userType later (teacher|volunteer|member|guest|admin)
 * 3. CSV Import: Create User with userType already specified
 *
 * This is the PRIMARY user entity - Teacher/Volunteer/Member/Lead schemas
 * are OPTIONAL extended versions for CSV imports or strict typing
 */
export const UserSchema = BaseEntitySchema.extend({
  entityType: z.literal("User"),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  imageUrl: z.string().url().optional(),

  /**
   * User Type - assigned by admin or from CSV
   * - OAuth users: starts as "pending" or null, assigned later
   * - CSV users: specified immediately
   */
  userType: z
    .enum(["teacher", "volunteer", "member", "guest", "admin", "pending"])
    .nullable()
    .default(null),

  /**
   * Status lifecycle:
   * - active: Normal user with access
   * - pending_assignment: OAuth user waiting for admin to assign userType
   * - inactive: Deactivated but can be reactivated
   * - suspended: Temporarily blocked
   */
  status: z
    .enum(["active", "pending_assignment", "inactive", "suspended"])
    .default("pending_assignment"),

  /**
   * Type-specific attributes (optional, populated based on userType)
   * These allow storing specialized data without separate entity types
   */
  teacherData: z
    .object({
      subject: z.string().optional(),
      qualification: z.string().optional(),
      experience: z.number().int().nonnegative().optional(),
      bio: z.string().optional(),
    })
    .optional(),

  volunteerData: z
    .object({
      skills: z.array(z.string()).optional(),
      availability: z.string().optional(),
      hoursContributed: z.number().nonnegative().default(0),
    })
    .optional(),

  memberData: z
    .object({
      membershipType: z.string().optional(),
      joinedAt: z.string().datetime().optional(),
      membershipStatus: z
        .enum(["active", "expired", "suspended"])
        .default("active"),
    })
    .optional(),

  leadData: z
    .object({
      source: z.string().optional(),
      leadStatus: z
        .enum(["new", "contacted", "qualified", "converted", "lost"])
        .default("new"),
      notes: z.string().optional(),
      contactedAt: z.string().datetime().optional(),
    })
    .optional(),
}).strip();

export type User = z.infer<typeof UserSchema>;

/**
 * LOCATION ENTITY
 *
 * Intrinsic location attributes only
 */
export const LocationSchema = BaseEntitySchema.extend({
  entityType: z.literal("Location"),
  locationId: z.string().min(1), // URL-friendly identifier
  name: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  // Google Places API data
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Legacy fields (kept for backward compatibility)
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  capacity: z.number().int().positive().optional(),
}).strip();

export type Location = z.infer<typeof LocationSchema>;
