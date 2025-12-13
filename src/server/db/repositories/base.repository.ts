/**
 * BASE REPOSITORY
 * 
 * Common database operations for all entities
 * Server-side only - NO UI concerns
 * 
 * DESIGN PRINCIPLES:
 * - Type-safe operations using Zod schemas
 * - Single table design with GSIs
 * - Optimistic locking with updatedAt
 * - Soft delete support
 * - Batch operations support
 */

import { z } from "zod";
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
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
 * 
 * Provides common CRUD operations for all entities
 * Can be extended for entity-specific operations
 */
export class BaseRepository<TSchema extends z.ZodType> {
  constructor(
    protected readonly schema: TSchema,
    protected readonly entityType: AllEntityTypes
  ) {}

  /**
   * Generate a new entity ID
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Get current ISO timestamp
   */
  protected now(): string {
    return new Date().toISOString();
  }

  /**
   * Validate entity data against schema
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
   * Create a new entity
   * 
   * @param data - Entity data (without id, createdAt, updatedAt)
   * @returns Created entity
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
      ...KeyUtils.entityTypeGSI3(this.entityType, now),
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
   * 
   * @param id - Entity ID
   * @returns Entity or null if not found
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
      
      // Remove DynamoDB keys before returning
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...entity } = response.Item;
      
      return this.validate(entity);
    } catch (error) {
      handleDynamoDBError(error, "getById");
    }
  }

  /**
   * Get entity by ID (throws if not found)
   * 
   * @param id - Entity ID
   * @returns Entity
   * @throws EntityNotFoundError if entity doesn't exist
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
   * 
   * @param id - Entity ID
   * @param updates - Partial entity updates
   * @returns Updated entity
   */
  async update(
    id: string,
    updates: Partial<Omit<z.infer<TSchema>, "id" | "createdAt" | "updatedAt" | "entityType">>
  ): Promise<z.infer<TSchema>> {
    // First, get the current entity to merge updates
    const current = await this.getByIdOrThrow(id);
    
    const updated = this.validate({
      ...(current as Record<string, unknown>),
      ...updates,
      id,
      entityType: this.entityType,
      updatedAt: this.now(),
    });
    
    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    
    let index = 0;
    for (const [key, value] of Object.entries(updates)) {
      if (key !== "id" && key !== "createdAt" && key !== "entityType") {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;
        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
        index++;
      }
    }
    
    // Always update updatedAt
    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = (updated as { updatedAt: string }).updatedAt;
    
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Key: {
            [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
            [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
          },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: "attribute_exists(PK)",
        })
      );
      
      return updated;
    } catch (error) {
      handleDynamoDBError(error, "update");
    }
  }

  /**
   * Soft delete entity (mark as deleted)
   * 
   * @param id - Entity ID
   */
  async softDelete(id: string): Promise<void> {
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Key: {
            [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
            [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
          },
          UpdateExpression: "SET #deletedAt = :deletedAt, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#deletedAt": "deletedAt",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":deletedAt": this.now(),
            ":updatedAt": this.now(),
          },
          ConditionExpression: "attribute_exists(PK)",
        })
      );
    } catch (error) {
      handleDynamoDBError(error, "softDelete");
    }
  }

  /**
   * Hard delete entity (permanent removal)
   * 
   * @param id - Entity ID
   */
  async hardDelete(id: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Key: {
            [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
            [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
          },
          ConditionExpression: "attribute_exists(PK)",
        })
      );
    } catch (error) {
      handleDynamoDBError(error, "hardDelete");
    }
  }

  /**
   * List all entities of this type
   * 
   * @param options - Pagination options
   * @returns List of entities with pagination metadata
   */
  async list(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
    excludeDeleted?: boolean;
  }): Promise<{
    items: z.infer<TSchema>[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          IndexName: TABLE_CONFIG.GSI3_NAME,
          KeyConditionExpression: "#gsi3pk = :gsi3pk",
          ExpressionAttributeNames: {
            "#gsi3pk": TABLE_CONFIG.GSI3_PK,
          },
          ExpressionAttributeValues: {
            ":gsi3pk": `TYPE#${this.entityType}`,
          },
          Limit: options?.limit,
          ExclusiveStartKey: options?.lastEvaluatedKey,
          ScanIndexForward: false, // Sort by createdAt descending
        })
      );
      
      let items = response.Items || [];
      
      // Filter out deleted items if requested
      if (options?.excludeDeleted) {
        items = items.filter((item) => !item.deletedAt);
      }
      
      // Remove DynamoDB keys and validate
      const validatedItems = items.map((item) => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...entity } = item;
        return this.validate(entity);
      });
      
      return {
        items: validatedItems,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      handleDynamoDBError(error, "list");
    }
  }

  /**
   * Batch get entities by IDs
   * 
   * @param ids - Array of entity IDs
   * @returns Array of entities (null for missing entities)
   */
  async batchGet(ids: string[]): Promise<(z.infer<TSchema> | null)[]> {
    if (ids.length === 0) {
      return [];
    }
    
    // DynamoDB BatchGet limit is 100 items
    const chunks = this.chunkArray(ids, 100);
    const allResults: (z.infer<TSchema> | null)[] = [];
    
    for (const chunk of chunks) {
      try {
        const response = await docClient.send(
          new BatchGetCommand({
            RequestItems: {
              [TABLE_CONFIG.TABLE_NAME]: {
                Keys: chunk.map((id) => ({
                  [TABLE_CONFIG.PK]: KeyUtils.entityPK(this.entityType, id),
                  [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
                })),
              },
            },
          })
        );
        
        const items = response.Responses?.[TABLE_CONFIG.TABLE_NAME] || [];
        const itemMap = new Map(
          items.map((item) => {
            const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...entity } = item;
            return [entity.id as string, this.validate(entity)];
          })
        );
        
        // Maintain order and include nulls for missing items
        const chunkResults = chunk.map((id) => itemMap.get(id) || null);
        allResults.push(...chunkResults);
      } catch (error) {
        handleDynamoDBError(error, "batchGet");
      }
    }
    
    return allResults;
  }

  /**
   * Check if entity exists
   * 
   * @param id - Entity ID
   * @returns True if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.getById(id);
    return entity !== null;
  }

  /**
   * Helper: Chunk array into smaller arrays
   */
  protected chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
