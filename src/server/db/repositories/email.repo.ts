/**
 * Email Identity Repository
 *
 * Handles email → userId lookup for OAuth authentication.
 * Provides O(1) resolution without GSI.
 */

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, now } from "~/server/db/client";
import {
	EmailIdentitySchema as EmailIdentitySchema,
	type EmailIdentity as EmailIdentity,
} from "~/lib/schemas/db";
import { Keys } from "../keys";
import { CreateEmailIdentityInput } from "~/lib/schemas/input";

/**
 * Get userId by email address.
 *
 * @param email - User's email address
 * @returns userId (ULID) or null if email not found
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
	try {
		const result = await docClient.send(
			new GetCommand({
				TableName: TABLE_NAME,
				Key: {
					PK: Keys.emailPK(email),
					SK: Keys.metaSK(),
				},
			}),
		);

		if (!result.Item) {
			return null;
		}

		const identity = EmailIdentitySchema.parse(result.Item);
		return identity.userId;
	} catch (error) {
		console.error("[getUserIdByEmail] Failed:", error);
		throw new Error(
			`Failed to lookup email: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Create an email identity mapping.
 *
 * Links an email address to a userId. Used during user creation or
 * when adding additional OAuth providers to existing users.
 *
 * @param input - Email identity data
 * @returns Created EmailIdentity
 * @throws Error if email already exists or validation fails
 */
export async function createEmailIdentity(
	input: CreateEmailIdentityInput,
): Promise<EmailIdentity> {
	const timestamp = now();

	if (!input.provider) {
		throw new Error("provider is required when creating an email identity");
	}

	const identity: EmailIdentity = {
		PK: Keys.emailPK(input.email),
		SK: Keys.metaSK(),
		email: input.email.toLowerCase(),
		userId: input.userId,
		provider: input.provider,
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	const validated = EmailIdentitySchema.parse(identity);

	try {
		await docClient.send(
			new PutCommand({
				TableName: TABLE_NAME,
				Item: validated,
				// Fail if email already exists
				ConditionExpression: "attribute_not_exists(PK)",
			}),
		);

		return validated;
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			error.name === "ConditionalCheckFailedException"
		) {
			throw new Error(`Email "${input.email}" is already registered.`);
		}
		console.error("[createEmailIdentity] Failed:", error);
		throw new Error(
			`Failed to create email identity: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Get email identity by email address.
 *
 * @param email - User's email address
 * @returns EmailIdentity or null if not found
 */
export async function getEmailIdentity(
	email: string,
): Promise<EmailIdentity | null> {
	try {
		const result = await docClient.send(
			new GetCommand({
				TableName: TABLE_NAME,
				Key: {
					PK: Keys.emailPK(email),
					SK: Keys.metaSK(),
				},
			}),
		);

		if (!result.Item) {
			return null;
		}

		return EmailIdentitySchema.parse(result.Item);
	} catch (error) {
		console.error("[getEmailIdentity] Failed:", error);
		throw new Error(
			`Failed to get email identity: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
