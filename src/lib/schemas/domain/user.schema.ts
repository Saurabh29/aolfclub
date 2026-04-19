import { z } from "zod";

/** Role a team member holds at a location. */
export const GroupTypeEnum = z.enum(["ADMIN", "TEACHER", "VOLUNTEER"]);
export type GroupType = z.infer<typeof GroupTypeEnum>;

/**
 * User  -  a volunteer or admin who logs into the system and makes calls.
 *
 * Uniqueness is enforced by email via an EMAIL# sentinel.
 *
 * DB keys:
 *   USER#<id>       / META   -  User entity
 *   EMAIL#<email>  / META   -  Email uniqueness sentinel (used for auth lookup)
 */
export const UserSchema = z.object({
	id: z.ulid(),
	email: z.email(),
	displayName: z.string().min(1),
	phone: z.string().optional(),
	image: z.url().optional(),
	activeLocationId: z.ulid().optional(),
	/** Cached role at activeLocationId — updated whenever activeLocationId changes. */
	activeRole: GroupTypeEnum.nullable().optional(),
	/** Super-admin flag — bypasses all role-based page checks when true. */
	isAdmin: z.boolean().default(false),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof UserSchema>;

/** Type-safe field names for QuerySpec<UserField> */
export type UserField = keyof User;
