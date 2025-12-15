/**
 * EMAIL REPOSITORY
 *
 * Manages email entities for identity resolution
 * Supports OAuth and CSV import workflows
 */

import {
  QueryCommand,
  PutCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./base.repository";
import { EmailSchema, type Email } from "~/lib/schemas/db/email.schema";
import { docClient, TABLE_CONFIG, KeyUtils } from "../client";
import { ulid } from "ulid";

/**
 * Email Repository
 *
 * Handles email entity operations for identity management
 * Creates TWO items per email:
 * 1. PK: Email#id, SK: METADATA (entity data)
 * 2. PK: EMAIL#address, SK: METADATA (lookup by address)
 */
export class EmailRepository extends BaseRepository<typeof EmailSchema> {
  constructor() {
    super(EmailSchema, "Email");
  }

  /**
   * Create email entity with lookup item
   * Creates two items atomically:
   * 1. Entity item: PK: Email#<id>, SK: METADATA
   * 2. Lookup item: PK: EMAIL#<address>, SK: METADATA
   *
   * @param data - Email data
   * @returns Created email entity
   */
  async create(
    data: Omit<Email, "id" | "createdAt" | "updatedAt" | "entityType">,
  ): Promise<Email> {
    const id = ulid();
    const now = new Date().toISOString();

    const entity: Email = {
      ...data,
      id,
      entityType: "Email",
      createdAt: now,
      updatedAt: now,
    };

    // Validate
    const validated = EmailSchema.parse(entity);

    // Create both entity and lookup items atomically
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          // Entity item: Email#<id>
          {
            Put: {
              TableName: TABLE_CONFIG.TABLE_NAME,
              Item: {
                ...(validated as Record<string, unknown>),
                PK: KeyUtils.entityPK("Email", id),
                SK: KeyUtils.entitySK(),
              },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          // Lookup item: EMAIL#<address>
          {
            Put: {
              TableName: TABLE_CONFIG.TABLE_NAME,
              Item: {
                ...(validated as Record<string, unknown>),
                PK: `EMAIL#${data.email.toLowerCase()}`,
                SK: KeyUtils.entitySK(),
              },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      }),
    );

    return validated;
  }

  /**
   * Find email by email address
   * Uses PK: EMAIL#address pattern for direct lookup
   *
   * @param email - Email address to look up
   * @returns Email entity if found, null otherwise
   */
  async findByEmail(email: string): Promise<Email | null> {
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND SK = :sk",
          ExpressionAttributeValues: {
            ":pk": `EMAIL#${email.toLowerCase()}`,
            ":sk": "METADATA",
          },
          Limit: 1,
        }),
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const { PK, SK, ...entity } = result.Items[0];
      return EmailSchema.parse(entity);
    } catch (error) {
      console.error("Error finding email:", error);
      return null;
    }
  }

  /**
   * Find emails by user ID
   * Queries relationships to find all emails for a user
   *
   * @param userId - User ID
   * @returns Array of email entities
   */
  async findByUserId(userId: string): Promise<Email[]> {
    try {
      // Query relationships: PK: USER#id, SK begins_with EMAIL#
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${userId}`,
            ":sk": "EMAIL#",
          },
        }),
      );

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      // Extract email IDs from relationships
      const emailIds = result.Items.map((item) => {
        const sk = item.SK as string;
        return sk.replace("EMAIL#", "");
      });

      // Batch get email entities
      if (emailIds.length === 0) {
        return [];
      }

      const emails: Email[] = [];
      for (const emailId of emailIds) {
        const email = await this.getById(emailId);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error("Error finding emails by user ID:", error);
      return [];
    }
  }

  /**
   * Find primary email for a user
   *
   * @param userId - User ID
   * @returns Primary email entity if found, null otherwise
   */
  async findPrimaryByUserId(userId: string): Promise<Email | null> {
    const emails = await this.findByUserId(userId);
    return emails.find((email) => email.isPrimary) || null;
  }

  /**
   * Set primary email for a user
   * Ensures only one email is primary
   *
   * @param userId - User ID
   * @param emailId - Email ID to set as primary
   */
  async setPrimary(userId: string, emailId: string): Promise<void> {
    // Get all user emails
    const emails = await this.findByUserId(userId);

    // Update all emails - only the specified one should be primary
    for (const email of emails) {
      await this.update(email.id, {
        isPrimary: email.id === emailId,
      });
    }
  }

  /**
   * Verify email
   *
   * @param emailId - Email ID
   * @returns Updated email
   */
  async verify(emailId: string): Promise<Email> {
    return this.update(emailId, {
      verifiedAt: new Date().toISOString(),
      status: "active" as const,
    });
  }

  /**
   * Remove email (soft delete)
   *
   * @param emailId - Email ID
   * @returns Updated email
   */
  async remove(emailId: string): Promise<Email> {
    return this.update(emailId, {
      status: "removed" as const,
    });
  }
}

// Singleton instance
export const emailRepository = new EmailRepository();
