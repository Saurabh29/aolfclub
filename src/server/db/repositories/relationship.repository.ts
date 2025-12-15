/**
 * RELATIONSHIP REPOSITORY
 *
 * Repository for managing entity relationships (edges in the graph)
 * Server-side only - NO UI concerns
 *
 * Handles:
 * - Creating relationships between entities
 * - Finding relationships by source, target, or relation type
 * - Traversing the entity graph
 * - Validating relationship rules
 */

import { BaseRepository } from "./base.repository";
import { docClient, TABLE_CONFIG } from "../client";
import {
  RelationshipSchema,
  type Relationship,
  isRelationshipValid,
} from "~/lib/schemas/db/relationship.schema";

/**
 * Relationship Repository
 *
 * Manages entity-to-entity relationships with graph traversal capabilities
 */
export class RelationshipRepository extends BaseRepository<
  typeof RelationshipSchema
> {
  constructor() {
    super(RelationshipSchema, "Relationship");
  }

  /**
   * Create a relationship between two entities
   *
   * Validates the relationship is allowed before creating
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Relationship type
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @param metadata - Optional metadata
   * @returns Created relationship
   */
  async createRelationship(
    sourceType: string,
    sourceId: string,
    relation: string,
    targetType: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ): Promise<Relationship> {
    // Validate relationship is allowed
    if (!isRelationshipValid(relation, sourceType, targetType)) {
      throw new Error(
        `Invalid relationship: ${sourceType} cannot have ${relation} relationship with ${targetType}`,
      );
    }

    return await this.create({
      sourceType: sourceType as any,
      sourceId,
      relation: relation as any,
      targetType: targetType as any,
      targetId,
      metadata,
    });
  }

  /**
   * Find all relationships from a source entity
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Optional: filter by relation type
   * @returns List of relationships
   */
  async findFromSource(
    sourceType: string,
    sourceId: string,
    relation?: string,
  ): Promise<Relationship[]> {
    const result = await this.list();

    return result.items.filter((rel) => {
      const matchesSource =
        rel.sourceType === sourceType && rel.sourceId === sourceId;
      const matchesRelation = !relation || rel.relation === relation;
      return matchesSource && matchesRelation;
    });
  }

  /**
   * Find all relationships to a target entity
   *
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @param relation - Optional: filter by relation type
   * @returns List of relationships
   */
  async findToTarget(
    targetType: string,
    targetId: string,
    relation?: string,
  ): Promise<Relationship[]> {
    const result = await this.list();

    return result.items.filter((rel) => {
      const matchesTarget =
        rel.targetType === targetType && rel.targetId === targetId;
      const matchesRelation = !relation || rel.relation === relation;
      return matchesTarget && matchesRelation;
    });
  }

  /**
   * Find all relationships by relation type
   *
   * @param relation - Relationship type
   * @returns List of relationships
   */
  async findByRelation(relation: string): Promise<Relationship[]> {
    const result = await this.list();

    return result.items.filter((rel) => rel.relation === relation);
  }

  /**
   * Find a specific relationship between two entities
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Relationship type
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @returns Relationship if exists, null otherwise
   */
  async findRelationship(
    sourceType: string,
    sourceId: string,
    relation: string,
    targetType: string,
    targetId: string,
  ): Promise<Relationship | null> {
    const result = await this.list();

    const found = result.items.find(
      (rel) =>
        rel.sourceType === sourceType &&
        rel.sourceId === sourceId &&
        rel.relation === relation &&
        rel.targetType === targetType &&
        rel.targetId === targetId,
    );

    return found || null;
  }

  /**
   * Check if a relationship exists
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Relationship type
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @returns True if relationship exists
   */
  async relationshipExists(
    sourceType: string,
    sourceId: string,
    relation: string,
    targetType: string,
    targetId: string,
  ): Promise<boolean> {
    const rel = await this.findRelationship(
      sourceType,
      sourceId,
      relation,
      targetType,
      targetId,
    );
    return rel !== null;
  }

  /**
   * Delete a specific relationship
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Relationship type
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @returns True if deleted, false if not found
   */
  async deleteRelationship(
    sourceType: string,
    sourceId: string,
    relation: string,
    targetType: string,
    targetId: string,
  ): Promise<boolean> {
    const rel = await this.findRelationship(
      sourceType,
      sourceId,
      relation,
      targetType,
      targetId,
    );

    if (!rel) return false;

    await this.delete(rel.id);
    return true;
  }

  /**
   * Delete all relationships for an entity (both as source and target)
   *
   * Useful when deleting an entity to clean up its relationships
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Number of relationships deleted
   */
  async deleteAllForEntity(
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const result = await this.list();

    const toDelete = result.items.filter(
      (rel) =>
        (rel.sourceType === entityType && rel.sourceId === entityId) ||
        (rel.targetType === entityType && rel.targetId === entityId),
    );

    for (const rel of toDelete) {
      await this.delete(rel.id);
    }

    return toDelete.length;
  }

  /**
   * Get target entities for a source entity
   *
   * Returns the IDs and types of all entities that the source is related to
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param relation - Optional: filter by relation type
   * @returns List of target entity references
   */
  async getTargets(
    sourceType: string,
    sourceId: string,
    relation?: string,
  ): Promise<Array<{ type: string; id: string; relation: string }>> {
    const relationships = await this.findFromSource(
      sourceType,
      sourceId,
      relation,
    );

    return relationships.map((rel) => ({
      type: rel.targetType,
      id: rel.targetId,
      relation: rel.relation,
    }));
  }

  /**
   * Get source entities for a target entity
   *
   * Returns the IDs and types of all entities related to the target
   *
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @param relation - Optional: filter by relation type
   * @returns List of source entity references
   */
  async getSources(
    targetType: string,
    targetId: string,
    relation?: string,
  ): Promise<Array<{ type: string; id: string; relation: string }>> {
    const relationships = await this.findToTarget(
      targetType,
      targetId,
      relation,
    );

    return relationships.map((rel) => ({
      type: rel.sourceType,
      id: rel.sourceId,
      relation: rel.relation,
    }));
  }
}

// Singleton instance
export const relationshipRepository = new RelationshipRepository();
