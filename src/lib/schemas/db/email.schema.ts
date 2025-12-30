import { z } from "zod";
import { OAuthProviderEnum, TimestampSchema, UlidSchema } from "./types";

export const EmailIdentitySchema = z.object({
	PK: z.string().regex(/^EMAIL#.+$/),
	SK: z.literal("META"),
	email: z.email(),
	userId: UlidSchema,
	provider: OAuthProviderEnum.optional(),
	createdAt: TimestampSchema,
	updatedAt: TimestampSchema.optional(),
});
export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;
