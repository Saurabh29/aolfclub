/**
 * EMAIL ENTITY SCHEMA
 * 
 * FIRST-CLASS ENTITY for identity management
 * Supports OAuth + CSV import flows
 * 
 * CRITICAL CONSTRAINTS:
 * - Email does NOT own permissions
 * - Email does NOT participate in access checks
 * - Email exists ONLY to resolve identity → User
 * - Multiple emails per user supported
 * - Email lifecycle management (verification, removal)
 */

import { z } from "zod";
import { BaseEntitySchema } from "./base.schema";

/**
 * Email Status Enum
 */
export const EmailStatusSchema = z.enum(["active", "removed", "unverified"]);

export type EmailStatus = z.infer<typeof EmailStatusSchema>;

/**
 * EMAIL ENTITY
 * 
 * Lifecycle Management:
 * - OAuth-created: has provider, auto-verified
 * - CSV-imported: no provider, may need verification
 * - User can have multiple emails
 * - One email can be primary
 * - Emails can be removed (soft delete via status)
 */
export const EmailSchema = BaseEntitySchema.extend({
  entityType: z.literal("Email"),
  email: z.string().email(),
  
  /**
   * OAuth provider (e.g., "google", "github")
   * Present for OAuth-created users
   * Absent for CSV-imported users
   */
  provider: z.string().optional(),
  
  /**
   * Verification timestamp
   * OAuth emails are typically verified immediately
   * CSV emails may require verification
   */
  verifiedAt: z.string().datetime().optional(),
  
  /**
   * Primary email flag
   * Only one email per user should be primary
   * Used for communications and login
   */
  isPrimary: z.boolean().default(false),
  
  /**
   * Email status
   * - active: Currently in use
   * - removed: User removed this email
   * - unverified: Awaiting verification
   */
  status: EmailStatusSchema.default("unverified"),
}).strip();

export type Email = z.infer<typeof EmailSchema>;

/**
 * EMAIL RESOLUTION NOTES:
 * 
 * To resolve Email → User:
 * 1. Query Relationship table with:
 *    sourceId = email.id
 *    sourceType = "Email"
 *    relation = "IDENTIFIES"
 * 2. Get targetId (User ID)
 * 
 * Email does NOT embed User data
 * Email does NOT participate in access control
 */
