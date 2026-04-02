/**
 * User Repository
 *
 * Data access layer for User entities.
 * Users are identified by ULID and looked up via email through an email sentinel item.
 *
 * Item shapes:
 *   USER#<id>     / META   — User entity
 *   EMAIL#<email> / META   — Email→userId lookup (uniqueness sentinel)
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import type { User } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  email: string;
  displayName: string;
  image?: string;
  phone?: string;
  activeLocationId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip DynamoDB key fields before returning a domain User object. */
function toUser(item: Record<string, unknown>): User {
  const { PK, SK, itemType, ...rest } = item;
  return rest as unknown as User;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new user.
 *
 * Atomically writes:
 *   - USER#<id>/META  — the user entity
 *   - EMAIL#<email>/META — uniqueness sentinel
 *
 * Throws if the email is already taken.
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const id = ulid();
  const timestamp = now();

  const userItem = {
    PK: Keys.userPK(id),
    SK: Keys.metaSK(),
    itemType: "User",
    id,
    email: input.email,
    displayName: input.displayName,
    image: input.image,
    phone: input.phone,
    activeLocationId: input.activeLocationId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const emailSentinel = {
    PK: Keys.emailPK(input.email),
    SK: Keys.metaSK(),
    itemType: "EmailLookup",
    userId: id,
    email: input.email,
    createdAt: timestamp,
  };

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: userItem,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: emailSentinel,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      })
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new Error(`Email "${input.email}" is already registered.`);
    }
    throw error;
  }

  return toUser(userItem);
}

/**
 * Get user by ULID.
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.userPK(id), SK: Keys.metaSK() },
    })
  );
  return result.Item ? toUser(result.Item as Record<string, unknown>) : null;
}

/**
 * Get user by email (two-step: sentinel → user item).
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const sentinel = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.emailPK(email), SK: Keys.metaSK() },
    })
  );
  if (!sentinel.Item) return null;

  const userId = sentinel.Item.userId as string;
  return getUserById(userId);
}

/**
 * Update user fields.
 *
 * If the email changes, atomically replaces the old email sentinel with the new one.
 */
export async function updateUser(
  id: string,
  updates: Partial<
    Pick<
      User,
      | "displayName"
      | "image"
      | "phone"
      | "email"
      | "activeLocationId"
    >
  >
): Promise<User> {
  const timestamp = now();

  // If email is changing, handle sentinel swap atomically
  if (updates.email !== undefined) {
    const existing = await getUserById(id);
    if (!existing) throw new Error(`User "${id}" not found`);

    if (existing.email !== updates.email) {
      const ts = now();
      const newUserItem = {
        ...existing,
        ...updates,
        updatedAt: ts,
        PK: Keys.userPK(id),
        SK: Keys.metaSK(),
        itemType: "User",
      };
      const newSentinel = {
        PK: Keys.emailPK(updates.email),
        SK: Keys.metaSK(),
        itemType: "EmailLookup",
        userId: id,
        email: updates.email,
        createdAt: ts,
      };

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: { TableName: TABLE_NAME, Item: newUserItem } },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: newSentinel,
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: { PK: Keys.emailPK(existing.email), SK: Keys.metaSK() },
              },
            },
          ],
        })
      );

      return toUser(newUserItem as Record<string, unknown>);
    }
  }

  // Simple field update (no email change)
  const updateParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  const fields = [
    "displayName", "image", "phone", "activeLocationId",
  ] as const;

  for (const field of fields) {
    if (updates[field] !== undefined) {
      updateParts.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = updates[field];
    }
  }

  updateParts.push("#updatedAt = :updatedAt");
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = timestamp;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.userPK(id), SK: Keys.metaSK() },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return toUser(result.Attributes as Record<string, unknown>);
}

/**
 * Delete a user and their email sentinel atomically.
 */
export async function deleteUser(id: string): Promise<void> {
  const existing = await getUserById(id);
  if (!existing) return;

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.userPK(id), SK: Keys.metaSK() },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.emailPK(existing.email), SK: Keys.metaSK() },
          },
        },
      ],
    })
  );
}
