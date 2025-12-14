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
 * USER ENTITY (Base for user-like entities)
 * 
 * Represents a user in the system
 * Supports OAuth-created AND CSV-imported users
 * Access control is per User, NOT per Email
 * 
 * NOT EXPORTED - used as base for Teacher, Volunteer, Member, Lead
 */
const UserSchema = BaseEntitySchema.extend({
  entityType: z.literal("User"),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
}).strip();

export type User = z.infer<typeof UserSchema>;

/**
 * TEACHER ENTITY
 * 
 * Extends User with teacher-specific attributes
 * NO role/group/permission data
 */
export const TeacherSchema = UserSchema.extend({
  entityType: z.literal("Teacher"),
  subject: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.number().int().nonnegative().optional(),
  bio: z.string().optional(),
}).strip();

export type Teacher = z.infer<typeof TeacherSchema>;

/**
 * VOLUNTEER ENTITY
 * 
 * Extends User with volunteer-specific attributes
 */
export const VolunteerSchema = UserSchema.extend({
  entityType: z.literal("Volunteer"),
  skills: z.array(z.string()).optional(),
  availability: z.string().optional(),
  hoursContributed: z.number().nonnegative().default(0),
}).strip();

export type Volunteer = z.infer<typeof VolunteerSchema>;

/**
 * MEMBER ENTITY
 * 
 * Extends User with member-specific attributes
 */
export const MemberSchema = UserSchema.extend({
  entityType: z.literal("Member"),
  membershipType: z.string().optional(),
  joinedAt: z.string().datetime().optional(),
  membershipStatus: z.enum(["active", "expired", "suspended"]).default("active"),
}).strip();

export type Member = z.infer<typeof MemberSchema>;

/**
 * LEAD ENTITY
 * 
 * Extends User with lead-specific attributes
 */
export const LeadSchema = UserSchema.extend({
  entityType: z.literal("Lead"),
  source: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).default("new"),
  notes: z.string().optional(),
  contactedAt: z.string().datetime().optional(),
}).strip();

export type Lead = z.infer<typeof LeadSchema>;

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
