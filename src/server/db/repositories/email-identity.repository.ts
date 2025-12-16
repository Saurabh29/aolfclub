/**
 * EMAIL IDENTITY REPOSITORY (ReBAC Design)
 *
 * Manages email → userId mappings for OAuth login
 * Provides O(1) lookup without GSI using direct GetItem
 */

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "../rebac-client";
import {
  EmailIdentitySchema,
  type EmailIdentity,
} from "~/lib/schemas/db/email-identity.schema";

/**
 * Normalize email address for consistent lookups
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Create email identity mapping
 * Enforces email uniqueness via conditional write
 *
 * @throws Error if email already exists
 */
export async function createEmailIdentity(
  email: string,
  userId: string,
  provider?: string,
): Promise<EmailIdentity> {
  const normalizedEmail = normalizeEmail(email);
  const timestamp = now();

  const emailIdentity: EmailIdentity = {
    PK: Keys.emailIdentityPK(normalizedEmail),
    SK: Keys.emailIdentitySK(userId),
    itemType: "EmailIdentity",
    email: normalizedEmail,
    userId,
    provider,
    createdAt: timestamp,
  };

  // Validate with Zod
  const validated = EmailIdentitySchema.parse(emailIdentity);

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: validated,
    // Enforce uniqueness: fail if email already exists
    ConditionExpression: "attribute_not_exists(PK)",
  });

  try {
    await docClient.send(command);
    return validated;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error(`Email already exists: ${normalizedEmail}`);
    }
    throw error;
  }
}

/**
 * Get user ID by email address
 * Uses Query with PK only (SK begins_with "USER#")
 *
 * @returns userId or null if not found
 */
export async function getUserIdByEmail(
  email: string,
): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email);

  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
    ExpressionAttributeValues: {
      ":pk": Keys.emailIdentityPK(normalizedEmail),
      ":sk_prefix": "USER#",
    },
    Limit: 1,
  });

  const result = await docClient.send(command);

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const emailIdentity = EmailIdentitySchema.parse(result.Items[0]);
  return emailIdentity.userId;
}
