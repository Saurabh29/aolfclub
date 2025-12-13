/**
 * BASE REPOSITORY
 * 
 * Simple CRUD operations for all entities
 * Server-side only - NO UI concerns
 */

import { z } from "zod";
import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import {
  docClient,
  TABLE_CONFIG,
  KeyUtils,
  EntityNotFoundError,
  ValidationError,
  handleDynamoDBError,
} from "../client";
import type { AllEntityTypes } from "~/lib/schemas/db/base.schema";

/**
 * Base Repository Class
 * Provides CRUD operations for all entities
 */
export class BaseRepository<TSchema extends z.ZodType> {
  constructor(
    protected readonly schema: TSchema,
    protected readonly entityType: AllEntityTypes
  ) {}

  /**
   * Generate entity ID
   * Uses ULID for time-ordered, sortable IDs
   */
  protected generateId(): string {
    return ulid();
  }

  /**
   * Get current timestamp
   */
  protected now(): string {
    return new Date().toISOString();
  }

  /**
   * Validate entity data
   */
  protected validate(data: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(
        `Validation failed for ${this.entityType}`,
        result.error.issues
      );
    }
    return result.data;
  }

  /**
   * Create entity
   */
  async create(
    data: Omit<z.infer<TSchema>, "id" | "createdAt" | "updatedAt" | "entityType">
  ): Promise<z.infer<TSchema>> {
    const id = this.generateId();
    const now = this.now();
    
    const entity = this.validate({
      ...data,
      id,
      entityType: this.entityType,
      createdAt: now,
      updatedAt: now,
    });
    
    const item = {
      ...(entity as Record<string, unknown>),
      [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
      [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
    };
    
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK)",
        })
      );
      
      return entity;
    } catch (error) {
      handleDynamoDBError(error, "create");
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<z.infer<TSchema> | null> {
    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Key: {
            [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
            [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
          },
        })
      );
      
      if (!response.Item) {
        return null;
      }
      
      const { PK, SK, ...entity } = response.Item;
      return this.validate(entity);
    } catch (error) {
      handleDynamoDBError(error, "getById");
    }
  }

  /**
   * Get entity by ID (throws if not found)
   */
  async getByIdOrThrow(id: string): Promise<z.infer<TSchema>> {
    const entity = await this.getById(id);
    if (!entity) {
      throw new EntityNotFoundError(this.entityType, id);
    }
    return entity;
  }

  /**
   * Update entity
   */
  async update(
    id: string,
    updates: Partial<Omit<z.infer<TSchema>, "id" | "createdAt" | "updatedAt" | "entityType">>
  ): Promise<z.infer<TSchema>> {
    const current = await this.getByIdOrThrow(id);
    
    const updated = this.validate({
      ...(current as Record<string, unknown>),
      ...updates,
      updatedAt: this.now(),
    });
    
    const item = {
      ...(updated as Record<string, unknown>),
      [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
      [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
    };
    
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Item: item,
        })
      );
      
      return updated;
    } catch (error) {
      handleDynamoDBError(error, "update");
    }
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Key: {
            [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
            [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
          },
        })
      );
    } catch (error) {
      handleDynamoDBError(error, "delete");
    }
  }

  /**
   * List all entities of this type
   */
  async list(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: z.infer<TSchema>[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          KeyConditionExpression: "begins_with(PK, :pk)",
          ExpressionAttributeValues: {
            ":pk": `${this.entityType}#`,
          },
          Limit: options?.limit,
          ExclusiveStartKey: options?.lastEvaluatedKey as Record<string, any>,
        })
      );
      
      const items = (response.Items || []).map(item => {
        const { PK, SK, ...entity } = item;
        return this.validate(entity);
      });
      
      return {
        items,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      handleDynamoDBError(error, "list");
    }
  }
}
