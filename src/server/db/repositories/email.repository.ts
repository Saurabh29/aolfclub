/**
 * EMAIL REPOSITORY
 * 
 * Email entity operations with identity resolution
 * Server-side only - NO UI concerns
 * 
 * DESIGN PRINCIPLES:
 * - First-class email entity
 * - Supports OAuth and CSV import flows
 * - Email → User resolution via relationships
 * - Primary email management
 * - Email verification lifecycle
 * - GSI1 for fast email lookups
 */

import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./base.repository";
import { EmailSchema, type Email, type EmailStatus } from "~/lib/schemas/db/email.schema";
import {
  docClient,
  TABLE_CONFIG,
  KeyUtils,
  DuplicateEntityError,
  handleDynamoDBError,
} from "../client";
import type { AllEntityTypes } from "~/lib/schemas/db/base.schema";

/**
 * Email Repository
 * 
 * Handles email management and identity resolution
 */
export class EmailRepository extends BaseRepository<typeof EmailSchema> {
  constructor() {
    super(EmailSchema, "Email");
  }

  /**
   * Add a new email
   * 
   * @param data - Email data
   * @param userId - Optional user ID to link (for OAuth flow)
   * @returns Created email
   */
  async addEmail(
    data: {
      email: string;
      provider?: string | null;
      verifiedAt?: string | null;
      isPrimary?: boolean;
    },
    userId?: string
  ): Promise<Email> {
    // Check if email already exists
    const existing = await this.getByEmail(data.email);
    if (existing) {
      throw new DuplicateEntityError("Email", data.email);
    }

    const id = this.generateId();
    const now = this.now();

    const email = this.validate({
      id,
      entityType: "Email",
      email: data.email.toLowerCase(),
      provider: data.provider || null,
      verifiedAt: data.verifiedAt || null,
      isPrimary: data.isPrimary ?? false,
      status: data.verifiedAt ? "active" : "unverified",
      createdAt: now,
      updatedAt: now,
    });

    const item = {
      ...email,
      [TABLE_CONFIG.PK]: KeyUtils.entityPK("Email", id),
      [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
      ...KeyUtils.emailGSI1(email.email, userId),
      ...KeyUtils.entityTypeGSI3("Email", now),
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK)",
        })
      );

      return email;
    } catch (error) {
      handleDynamoDBError(error, "addEmail");
    }
  }

  /**
   * Get email by email address
   * 
   * @param email - Email address
   * @returns Email or null if not found
   */
  async getByEmail(email: string): Promise<Email | null> {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          IndexName: TABLE_CONFIG.GSI1_NAME,
          KeyConditionExpression: "#gsi1pk = :gsi1pk",
          ExpressionAttributeNames: {
            "#gsi1pk": TABLE_CONFIG.GSI1_PK,
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `EMAIL#${email.toLowerCase()}`,
          },
          Limit: 1,
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...entity } = item;

      return this.validate(entity);
    } catch (error) {
      handleDynamoDBError(error, "getByEmail");
    }
  }

  /**
   * Get user entity type and ID by email
   * Requires a IDENTIFIES relationship to exist
   * 
   * @param email - Email address
   * @returns User info or null if not linked
   */
  async getUserByEmail(email: string): Promise<{
    userId: string;
    userType: AllEntityTypes;
  } | null> {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          IndexName: TABLE_CONFIG.GSI1_NAME,
          KeyConditionExpression: "#gsi1pk = :gsi1pk",
          ExpressionAttributeNames: {
            "#gsi1pk": TABLE_CONFIG.GSI1_PK,
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `EMAIL#${email.toLowerCase()}`,
          },
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      // Look for the item with GSI1SK starting with "USER#"
      const linkedItem = response.Items.find((item) =>
        item.GSI1SK?.startsWith("USER#")
      );

      if (!linkedItem || !linkedItem.GSI1SK) {
        return null;
      }

      // Parse user ID from GSI1SK (format: "USER#id")
      const userId = linkedItem.GSI1SK.split("#")[1];
      
      // The user type is stored in the relationship entity
      // For now, we return a placeholder that requires relationship lookup
      return {
        userId,
        userType: "Teacher", // This would be determined by relationship lookup
      };
    } catch (error) {
      handleDynamoDBError(error, "getUserByEmail");
    }
  }

  /**
   * Verify an email
   * 
   * @param emailId - Email ID
   * @returns Updated email
   */
  async verifyEmail(emailId: string): Promise<Email> {
    const now = this.now();
    
    return await this.update(emailId, {
      verifiedAt: now,
      status: "active" as EmailStatus,
    });
  }

  /**
   * Mark email as removed
   * 
   * @param emailId - Email ID
   * @returns Updated email
   */
  async removeEmail(emailId: string): Promise<Email> {
    return await this.update(emailId, {
      status: "removed" as EmailStatus,
    });
  }

  /**
   * Set email as primary
   * 
   * @param emailId - Email ID
   * @param userId - User ID to update other emails
   * @returns Updated email
   */
  async setPrimaryEmail(emailId: string, userId: string): Promise<Email> {
    // First, unset any existing primary email for this user
    // This would require querying relationships to find all user emails
    // For now, just set this email as primary
    
    return await this.update(emailId, {
      isPrimary: true,
    });
  }

  /**
   * List all emails for a user
   * Requires querying relationships
   * 
   * @param userId - User ID
   * @returns List of emails
   */
  async listEmailsForUser(userId: string): Promise<Email[]> {
    // This would require:
    // 1. Query relationships where sourceId = userId and relation = "HAS_EMAIL"
    // 2. Extract email IDs from relationships
    // 3. Batch get emails by IDs
    
    // For now, return empty array (will be implemented with RelationshipRepository)
    return [];
  }

  /**
   * Check if email is verified
   * 
   * @param email - Email address
   * @returns True if verified
   */
  async isVerified(email: string): Promise<boolean> {
    const emailEntity = await this.getByEmail(email);
    return emailEntity?.status === "active" && emailEntity.verifiedAt !== null;
  }

  /**
   * Find emails by provider (OAuth)
   * 
   * @param provider - OAuth provider (google, microsoft, etc.)
   * @param options - Pagination options
   * @returns List of emails
   */
  async findByProvider(
    provider: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Email[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);
    
    // Filter by provider
    const items = result.items.filter(
      (email) => email.provider?.toLowerCase() === provider.toLowerCase()
    );
    
    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find unverified emails
   * 
   * @param options - Pagination options
   * @returns List of unverified emails
   */
  async findUnverified(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Email[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);
    
    // Filter by status
    const items = result.items.filter((email) => email.status === "unverified");
    
    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }
}

// Singleton instance
export const emailRepository = new EmailRepository();
