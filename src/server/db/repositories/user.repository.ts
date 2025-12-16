/**
 * USER REPOSITORY (ReBAC Design)
 *
 * Manages global user identities
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "../rebac-client";
import { UserSchema, type User } from "~/lib/schemas/db/user.schema";
import type { CreateInput } from "~/lib/schemas/db/schema-helpers";

/**
 * User creation input type - derived from schema
 * Ensures compile-time safety: if schema changes, this type changes
 * EXPORTED for use in server actions/services - UI cannot import DB schemas directly
 */
export type CreateUserInput = CreateInput<typeof UserSchema, "userId">;

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const userId = ulid();
  const timestamp = now();

  const user: User = {
    PK: Keys.userPK(userId),
    SK: Keys.userSK(),
    itemType: "User",
    userId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    imageUrl: input.imageUrl,
    status: input.status || "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate with Zod
  const validated = UserSchema.parse(user);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: validated,
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );

  return validated;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.userPK(userId),
        SK: Keys.userSK(),
      },
    }),
  );

  if (!result.Item) {
    return null;
  }

  return UserSchema.parse(result.Item);
}
