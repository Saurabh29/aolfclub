/**
 * User Repository
 *
 * Data access layer for User entities.
 * Users are identified by ULID and looked up via email through EmailIdentity.
 */

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { User, UserSchema } from "~/lib/schemas/db";
import { CreateUserInput } from "~/lib/schemas/input";
import { docClient, TABLE_NAME, now } from "~/server/db/client";
import { Keys } from "../keys";

/**
 * Create a new user.
 *
 * Generates a ULID for the user. The caller is responsible for creating
 * the EmailIdentity mapping separately.
 *
 * @param input - User data
 * @returns Created User with generated userId
 */
export async function createUser(input: CreateUserInput): Promise<User> {
	const userId = ulid();
	const timestamp = now();

	const user: User = {
		PK: Keys.userPK(userId),
		SK: Keys.metaSK(),
		userId,
		displayName: input.displayName,
		email: input.email,
		image: input.image,
		userType: input.userType,
		isAdmin: input.isAdmin,
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	const validated = UserSchema.parse(user);

	try {
		await docClient.send(
			new PutCommand({
				TableName: TABLE_NAME,
				Item: validated,
				ConditionExpression: "attribute_not_exists(PK)",
			}),
		);

		// Add backward-compatible alias `userId` for callers still expecting it
		(validated as any).userId = validated.userId;
		return validated;
	} catch (error) {
		console.error("[createUser] Failed:", error);
		throw new Error(
			`Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Get user by userId.
 *
 * @param userId - ULID of the user
 * @returns User or null if not found
 */
export async function getUserById(userId: string): Promise<User | null> {
	try {
		const result = await docClient.send(
			new GetCommand({
				TableName: TABLE_NAME,
				Key: {
					PK: Keys.userPK(userId),
					SK: Keys.metaSK(),
				},
			}),
		);

		if (!result.Item) {
			return null;
		}

		const parsed = UserSchema.parse(result.Item);
		(parsed as any).userId = parsed.userId;
		return parsed;
	} catch (error) {
		console.error("[getUserById] Failed:", error);
		throw new Error(
			`Failed to get user: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Update user properties.
 *
 * @param userId - ULID of the user
 * @param updates - Fields to update (partial)
 * @returns Updated User
 */
export async function updateUser(
	userId: string,
	updates: Partial<
		Pick<
			User,
			| "displayName"
			| "userType"
			| "isAdmin"
			| "image"
			| "email"
			| "activeLocationId"
		>
	>,
): Promise<User> {
	const timestamp = now();

	// Build update expression dynamically
	const updateParts: string[] = [];
	const expressionAttributeNames: Record<string, string> = {};
	const expressionAttributeValues: Record<string, unknown> = {};

	if (updates.displayName !== undefined) {
		updateParts.push("#displayName = :displayName");
		expressionAttributeNames["#displayName"] = "displayName";
		expressionAttributeValues[":displayName"] = updates.displayName;
	}

	if (updates.email !== undefined) {
		updateParts.push("#email = :email");
		expressionAttributeNames["#email"] = "email";
		expressionAttributeValues[":email"] = updates.email;
	}

	if (updates.activeLocationId !== undefined) {
		updateParts.push("#activeLocationId = :activeLocationId");
		expressionAttributeNames["#activeLocationId"] = "activeLocationId";
		expressionAttributeValues[":activeLocationId"] = updates.activeLocationId;
	}

	if (updates.image !== undefined) {
		updateParts.push("#image = :image");
		expressionAttributeNames["#image"] = "image";
		expressionAttributeValues[":image"] = updates.image;
	}

	if (updates.userType !== undefined) {
		updateParts.push("#userType = :userType");
		expressionAttributeNames["#userType"] = "userType";
		expressionAttributeValues[":userType"] = updates.userType;
	}

	if (updates.isAdmin !== undefined) {
		updateParts.push("#isAdmin = :isAdmin");
		expressionAttributeNames["#isAdmin"] = "isAdmin";
		expressionAttributeValues[":isAdmin"] = updates.isAdmin;
	}

	// Always update timestamp
	updateParts.push("#updatedAt = :updatedAt");
	expressionAttributeNames["#updatedAt"] = "updatedAt";
	expressionAttributeValues[":updatedAt"] = timestamp;

	if (updateParts.length === 1) {
		// Only timestamp, no actual updates
		const existing = await getUserById(userId);
		if (!existing) {
			throw new Error(`User ${userId} not found`);
		}
		return existing;
	}

	try {
		const result = await docClient.send(
			new UpdateCommand({
				TableName: TABLE_NAME,
				Key: {
					PK: Keys.userPK(userId),
					SK: Keys.metaSK(),
				},
				UpdateExpression: `SET ${updateParts.join(", ")}`,
				ExpressionAttributeNames: expressionAttributeNames,
				ExpressionAttributeValues: expressionAttributeValues,
				ConditionExpression: "attribute_exists(PK)",
				ReturnValues: "ALL_NEW",
			}),
		);

		if (!result.Attributes) {
			throw new Error("Update did not return attributes");
		}

		const parsed = UserSchema.parse(result.Attributes);
		(parsed as any).userId = parsed.userId;
		return parsed;
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			error.name === "ConditionalCheckFailedException"
		) {
			throw new Error(`User ${userId} not found`);
		}
		console.error("[updateUser] Failed:", error);
		throw new Error(
			`Failed to update user: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
