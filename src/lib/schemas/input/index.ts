import z from "zod";
import { OAuthProviderEnum, UlidSchema, UserTypeEnum } from "../db";

export const CreateEmailIdentityInputSchema = z.object({
	email: z.email(),
	userId: UlidSchema,
	provider: OAuthProviderEnum.optional(),
});
export type CreateEmailIdentityInput = z.infer<
	typeof CreateEmailIdentityInputSchema
>;

export const CreateUserInputSchema = z.object({
	displayName: z.string().min(1).max(255),
	userType: UserTypeEnum.default("MEMBER"),
	isAdmin: z.boolean().default(false),
	email: z.email().optional(),
	image: z.url().optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
