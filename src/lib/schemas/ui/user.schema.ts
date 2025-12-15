import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Fixed user roles - not editable
 */
export const UserRole = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  VOLUNTEER: "Volunteer",
  MEMBER: "Member",
  LEAD: "Lead",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Available programs
 */
export const PROGRAMS = ["HP", "MY", "UY", "Sahaj", "VTP", "AMP"] as const;

export type ProgramType = (typeof PROGRAMS)[number];

/**
 * Lead source options
 */
export const LeadSource = {
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  CAMPAIGN: "Campaign",
  UNKNOWN: "Unknown",
} as const;

export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * User schema - for Admin, Teacher, Volunteer, Member
 */
export const UserSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.VOLUNTEER,
    UserRole.MEMBER,
  ]),

  // For Members: Programs they have completed
  programsDone: z.array(z.enum(PROGRAMS)).default([]),

  // For Members/Teachers/Volunteers: Programs they want to do or are assigned to
  programsWant: z.array(z.enum(PROGRAMS)).default([]),

  enableLogin: z.boolean().default(false),
  profilePhoto: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Lead schema - potential members without login
 */
export const LeadSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  leadSource: z.enum([
    LeadSource.WALK_IN,
    LeadSource.REFERRAL,
    LeadSource.CAMPAIGN,
    LeadSource.UNKNOWN,
  ]),

  // Rating (0-5 stars)
  rating: z.number().min(0).max(5).default(0),

  // Contact tracking
  lastContact: z.string(), // ISO date string
  nextFollowUp: z.string().optional(), // Optional ISO date string

  // Leads only have Programs Want To Do (no programs done)
  programsWant: z.array(z.enum(PROGRAMS)).default([]),

  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Lead = z.infer<typeof LeadSchema>;

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Add/Edit User form schema (Mode A)
 */
export const UserFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.VOLUNTEER,
    UserRole.MEMBER,
  ]),
  programsDone: z.array(z.enum(PROGRAMS)).default([]),
  programsWant: z.array(z.enum(PROGRAMS)).default([]),
  enableLogin: z.boolean().default(false),
  profilePhoto: z.string().optional(),
});

export type UserFormData = z.infer<typeof UserFormSchema>;

/**
 * Add/Edit Lead form schema (Mode B)
 */
export const LeadFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  leadSource: z.enum([
    LeadSource.WALK_IN,
    LeadSource.REFERRAL,
    LeadSource.CAMPAIGN,
    LeadSource.UNKNOWN,
  ]),
  programsWant: z.array(z.enum(PROGRAMS)).default([]),
  notes: z.string().optional(),
});

export type LeadFormData = z.infer<typeof LeadFormSchema>;
