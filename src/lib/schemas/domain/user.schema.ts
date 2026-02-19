import { z } from "zod";

/**
 * User types within the system
 */
export const UserTypeEnum = z.enum(["MEMBER", "LEAD"]);
export type UserType = z.infer<typeof UserTypeEnum>;

export const UserSchema = z.object({
	id: z.ulid(),
	email: z.email(),
	image: z.url().optional(),
	phone: z.string().optional(),
	displayName: z.string().min(1),
	userType: UserTypeEnum,
	isAdmin: z.boolean().default(false),
	activeLocationId: z.ulid().optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * UserField - Type-safe field names for User entity
 * Used in QuerySpec<UserField> for compile-time safety
 */
export type UserField = keyof User;
