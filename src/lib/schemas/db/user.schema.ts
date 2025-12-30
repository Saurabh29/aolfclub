import { z } from "zod";
import { TimestampSchema, UlidSchema, UserTypeEnum } from "./types";

export const UserSchema = z.object({
	PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
	SK: z.literal("META"),
	userId: UlidSchema,
	displayName: z.string().min(1).max(255),
	email: z.email().optional(),
	image: z.url().optional(),
	phone: z.string().optional(),
	locationId: UlidSchema.optional(),
	activeLocationId: UlidSchema.optional(),
	userType: UserTypeEnum,
	isAdmin: z.boolean().default(false),
	createdAt: TimestampSchema,
	updatedAt: TimestampSchema.optional(),
});
export type User = z.infer<typeof UserSchema>;
