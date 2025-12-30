/**
 * Common types and enums for DynamoDB schema
 */

import { z } from "zod";

/**
 * User types within the system
 */
export const UserTypeEnum = z.enum(["MEMBER", "LEAD"]);
export type UserType = z.infer<typeof UserTypeEnum>;

/**
 * Group types (ReBAC core - determines base permissions)
 */
export const GroupTypeEnum = z.enum(["ADMIN", "TEACHER", "VOLUNTEER"]);
export type GroupType = z.infer<typeof GroupTypeEnum>;

/**
 * Permission values (binary access control)
 */
export const PermissionEnum = z.enum(["ALLOW", "DENY"]);
export type Permission = z.infer<typeof PermissionEnum>;

/**
 * OAuth provider types
 */
export const OAuthProviderEnum = z.enum(["google", "github", "microsoft"]);
export type OAuthProvider = z.infer<typeof OAuthProviderEnum>;

/**
 * ULID
 * - Lexicographically sortable
 * - URL-safe
 * - Ideal for DynamoDB PK/SK
 */
export const UlidSchema = z
	.string()
	.regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "Invalid ULID");

/**
 * ISO timestamp (UTC)
 * Example: 2025-01-15T10:45:30.123Z
 */
export const TimestampSchema = z.iso.datetime({ offset: true });
