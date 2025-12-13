/**
 * RELATIONSHIP REPOSITORY
 * 
 * Relationship entity operations with graph queries
 * Server-side only - NO UI concerns
 * 
 * DESIGN PRINCIPLES:
 * - Generic edge entity for all relationships
 * - Validates allowed source/target combinations
 * - GSI2 for efficient relationship queries
 * - Supports bidirectional lookups
 * - Cascade delete support
 */

import { PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./base.repository";
import {
  RelationshipSchema,
  type Relationship,
  isRelationshipValid,
} from "~/lib/schemas/db/relationship.schema";
import {
  docClient,
  TABLE_CONFIG,
  KeyUtils,
  ValidationError,
  handleDynamoDBError,
} from "../client";
import type { AllEntityTypes } from "~/lib/schemas/db/base.schema";

/**
 * Relationship Repository
 * 
 * Handles entity-to-entity relationships
 */
export class RelationshipRepository extends BaseRepository<typeof RelationshipSchema> {
  constructor() {
    super(RelationshipSchema, "Relationship");
  }

  /**
   * Save a relationship
   * Validates source/target combination before saving
   * 
   * @param data - Relationship data
   * @returns Created relationship
   */
  async saveRelationship(data: {
    sourceId: string;
    sourceType: AllEntityTypes;
    targetId: string;
    targetType: AllEntityTypes;
    relation: string;
    metadata?: Record<string, unknown>;
  }): Promise<Relationship> {
    // Validate relationship is allowed
    if (!isRelationshipValid(data.relation, data.sourceType, data.targetType)) {
      throw new ValidationError(
        `Invalid relationship: ${data.relation} cannot connect ${data.sourceType} → ${data.targetType}`
      );
    }

    const id = this.generateId();
    const now = this.now();

    const relationship = this.validate({
      id,
      entityType: "Relationship",
      sourceId: data.sourceId,
      sourceType: data.sourceType,
      targetId: data.targetId,
      targetType: data.targetType,
      relation: data.relation,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    });

    const item = {
      ...relationship,
      [TABLE_CONFIG.PK]: KeyUtils.entityPK("Relationship", id),
      [TABLE_CONFIG.SK]: KeyUtils.entitySK(),
      ...KeyUtils.relationshipGSI2(
        data.sourceType,
        data.sourceId,
        data.relation,
        data.targetType,
        data.targetId
      ),
      ...KeyUtils.entityTypeGSI3("Relationship", now),
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK)",
        })
      );

      return relationship;
    } catch (error) {
      handleDynamoDBError(error, "saveRelationship");
    }
  }

  /**
   * Delete a relationship
   * 
   * @param relationshipId - Relationship ID
   */
  async deleteRelationship(relationshipId: string): Promise<void> {
    await this.hardDelete(relationshipId);
  }

  /**
   * Get relationships by source entity
   * 
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param options - Filter and pagination options
   * @returns List of relationships
   */
  async getRelationshipsBySource(
    sourceType: AllEntityTypes,
    sourceId: string,
    options?: {
      relation?: string;
      targetType?: AllEntityTypes;
      limit?: number;
      lastEvaluatedKey?: Record<string, unknown>;
    }
  ): Promise<{
    items: Relationship[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    try {
      let keyConditionExpression = "#gsi2pk = :gsi2pk";
      const expressionAttributeNames: Record<string, string> = {
        "#gsi2pk": TABLE_CONFIG.GSI2_PK,
      };
      const expressionAttributeValues: Record<string, string> = {
        ":gsi2pk": `REL#${sourceType}#${sourceId}`,
      };

      // Add relation and targetType filter if provided
      if (options?.relation && options?.targetType) {
        keyConditionExpression += " AND begins_with(#gsi2sk, :gsi2sk)";
        expressionAttributeNames["#gsi2sk"] = TABLE_CONFIG.GSI2_SK;
        expressionAttributeValues[":gsi2sk"] = `${options.relation}#${options.targetType}`;
      } else if (options?.relation) {
        keyConditionExpression += " AND begins_with(#gsi2sk, :gsi2sk)";
        expressionAttributeNames["#gsi2sk"] = TABLE_CONFIG.GSI2_SK;
        expressionAttributeValues[":gsi2sk"] = `${options.relation}#`;
      }

      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLE_CONFIG.TABLE_NAME,
          IndexName: TABLE_CONFIG.GSI2_NAME,
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          Limit: options?.limit,
          ExclusiveStartKey: options?.lastEvaluatedKey,
        })
      );

      const items = (response.Items || []).map((item) => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...entity } = item;
        return this.validate(entity);
      });

      return {
        items,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      handleDynamoDBError(error, "getRelationshipsBySource");
    }
  }

  /**
   * Get relationships by target entity
   * Performs a scan on GSI2SK (less efficient than source queries)
   * 
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @param options - Filter and pagination options
   * @returns List of relationships
   */
  async getRelationshipsByTarget(
    targetType: AllEntityTypes,
    targetId: string,
    options?: {
      relation?: string;
      sourceType?: AllEntityTypes;
      limit?: number;
      lastEvaluatedKey?: Record<string, unknown>;
    }
  ): Promise<{
    items: Relationship[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    // For target queries, we need to query all relationships and filter
    // This is less efficient but necessary for bidirectional lookups
    const result = await this.list({
      limit: options?.limit || 100,
      lastEvaluatedKey: options?.lastEvaluatedKey,
    });

    // Filter by target
    let items = result.items.filter(
      (rel) => rel.targetType === targetType && rel.targetId === targetId
    );

    // Apply additional filters
    if (options?.relation) {
      items = items.filter((rel) => rel.relation === options.relation);
    }
    if (options?.sourceType) {
      items = items.filter((rel) => rel.sourceType === options.sourceType);
    }

    return {
      items: items.slice(0, options?.limit || items.length),
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Get related entities of a specific type
   * 
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Relationship type
   * @param targetType - Target entity type
   * @returns Array of target entity IDs
   */
  async getRelatedEntityIds(
    sourceType: AllEntityTypes,
    sourceId: string,
    relation: string,
    targetType: AllEntityTypes
  ): Promise<string[]> {
    const result = await this.getRelationshipsBySource(sourceType, sourceId, {
      relation,
      targetType,
    });

    return result.items.map((rel) => rel.targetId);
  }

  /**
   * Check if relationship exists
   * 
   * @param sourceId - Source entity ID
   * @param sourceType - Source entity type
   * @param targetId - Target entity ID
   * @param targetType - Target entity type
   * @param relation - Relationship type
   * @returns True if relationship exists
   */
  async relationshipExists(
    sourceId: string,
    sourceType: AllEntityTypes,
    targetId: string,
    targetType: AllEntityTypes,
    relation: string
  ): Promise<boolean> {
    const result = await this.getRelationshipsBySource(sourceType, sourceId, {
      relation,
      targetType,
      limit: 1,
    });

    return result.items.some(
      (rel) => rel.targetId === targetId && rel.relation === relation
    );
  }

  /**
   * Delete all relationships for an entity
   * Used for cascade deletes
   * 
   * @param entityType - Entity type
   * @param entityId - Entity ID
   */
  async deleteAllRelationshipsForEntity(
    entityType: AllEntityTypes,
    entityId: string
  ): Promise<void> {
    // Delete as source
    const asSource = await this.getRelationshipsBySource(entityType, entityId);
    for (const rel of asSource.items) {
      await this.deleteRelationship(rel.id);
    }

    // Delete as target
    const asTarget = await this.getRelationshipsByTarget(entityType, entityId);
    for (const rel of asTarget.items) {
      await this.deleteRelationship(rel.id);
    }
  }

  /**
   * Update relationship metadata
   * 
   * @param relationshipId - Relationship ID
   * @param metadata - New metadata
   * @returns Updated relationship
   */
  async updateMetadata(
    relationshipId: string,
    metadata: Record<string, unknown>
  ): Promise<Relationship> {
    return await this.update(relationshipId, { metadata });
  }

  /**
   * Find relationship by exact match
   * 
   * @param sourceId - Source entity ID
   * @param sourceType - Source entity type
   * @param targetId - Target entity ID
   * @param targetType - Target entity type
   * @param relation - Relationship type
   * @returns Relationship or null
   */
  async findExact(
    sourceId: string,
    sourceType: AllEntityTypes,
    targetId: string,
    targetType: AllEntityTypes,
    relation: string
  ): Promise<Relationship | null> {
    const result = await this.getRelationshipsBySource(sourceType, sourceId, {
      relation,
      targetType,
    });

    return (
      result.items.find(
        (rel) => rel.targetId === targetId && rel.relation === relation
      ) || null
    );
  }
}

// Singleton instance
export const relationshipRepository = new RelationshipRepository();
