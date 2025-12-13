/**
 * DYNAMODB CLIENT CONFIGURATION
 * 
 * AWS SDK v3 DynamoDB client setup
 * Server-side only - NO UI concerns
 * 
 * DESIGN PRINCIPLES:
 * - Single table design with GSIs
 * - Type-safe operations using Zod schemas
 * - Environment-based configuration
 * - Connection pooling and retry logic
 */

import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TranslateConfig,
} from "@aws-sdk/lib-dynamodb";

/**
 * DynamoDB Table Configuration
 * 
 * Single table design with the following structure:
 * - PK: Entity type + ID (e.g., "Teacher#uuid")
 * - SK: "METADATA" for primary record
 * - GSI1PK/GSI1SK: For email lookups
 * - GSI2PK/GSI2SK: For relationship queries
 * - GSI3PK/GSI3SK: For entity type queries
 */
export const TABLE_CONFIG = {
  TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || "aolfclub-entities",
  REGION: process.env.AWS_REGION || "us-east-1",
  
  // Primary Key
  PK: "PK",
  SK: "SK",
  
  // GSI1 - Email Lookup Index
  GSI1_NAME: "GSI1",
  GSI1_PK: "GSI1PK",
  GSI1_SK: "GSI1SK",
  
  // GSI2 - Relationship Index
  GSI2_NAME: "GSI2",
  GSI2_PK: "GSI2PK",
  GSI2_SK: "GSI2SK",
  
  // GSI3 - Entity Type Index
  GSI3_NAME: "GSI3",
  GSI3_PK: "GSI3PK",
  GSI3_SK: "GSI3SK",
} as const;

/**
 * Key Construction Utilities
 * 
 * Consistent key formatting across all repositories
 */
export const KeyUtils = {
  /**
   * Primary key for entity
   * Format: "EntityType#id"
   */
  entityPK: (entityType: string, id: string) => `${entityType}#${id}`,
  
  /**
   * Sort key for entity metadata
   */
  entitySK: () => "METADATA",
  
  /**
   * GSI1 keys for email lookup
   * Format: "EMAIL#email" / "USER#id"
   */
  emailGSI1: (email: string, userId?: string) => ({
    GSI1PK: `EMAIL#${email.toLowerCase()}`,
    GSI1SK: userId ? `USER#${userId}` : "UNVERIFIED",
  }),
  
  /**
   * GSI2 keys for relationship queries
   * Format: "REL#sourceType#sourceId" / "relation#targetType#targetId"
   */
  relationshipGSI2: (
    sourceType: string,
    sourceId: string,
    relation: string,
    targetType: string,
    targetId: string
  ) => ({
    GSI2PK: `REL#${sourceType}#${sourceId}`,
    GSI2SK: `${relation}#${targetType}#${targetId}`,
  }),
  
  /**
   * GSI3 keys for entity type queries
   * Format: "TYPE#entityType" / "createdAt"
   */
  entityTypeGSI3: (entityType: string, createdAt: string) => ({
    GSI3PK: `TYPE#${entityType}`,
    GSI3SK: createdAt,
  }),
} as const;

/**
 * Create DynamoDB Client
 * 
 * Configured with retry logic and connection pooling
 */
function createDynamoDBClient(): DynamoDBClient {
  const config: DynamoDBClientConfig = {
    region: TABLE_CONFIG.REGION,
    maxAttempts: 3,
  };
  
  // Local development configuration
  if (process.env.NODE_ENV === "development" && process.env.DYNAMODB_ENDPOINT) {
    config.endpoint = process.env.DYNAMODB_ENDPOINT;
    config.credentials = {
      accessKeyId: "local",
      secretAccessKey: "local",
    };
  }
  
  return new DynamoDBClient(config);
}

/**
 * Document Client Configuration
 * 
 * Marshalling options for cleaner data handling
 */
const marshallOptions: TranslateConfig["marshallOptions"] = {
  // Remove undefined values
  removeUndefinedValues: true,
  // Convert empty strings to null
  convertEmptyValues: false,
  // Convert class instances to maps
  convertClassInstanceToMap: false,
};

const unmarshallOptions: TranslateConfig["unmarshallOptions"] = {
  // Return numbers as numbers (not Decimal objects)
  wrapNumbers: false,
};

/**
 * Singleton DynamoDB Document Client
 * 
 * Use this for all database operations
 */
export const dynamoDBClient = createDynamoDBClient();
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions,
  unmarshallOptions,
});

/**
 * Error Types for Database Operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class EntityNotFoundError extends DatabaseError {
  constructor(entityType: string, id: string) {
    super(
      `${entityType} with id ${id} not found`,
      "ENTITY_NOT_FOUND"
    );
    this.name = "EntityNotFoundError";
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, public errors?: unknown) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class DuplicateEntityError extends DatabaseError {
  constructor(entityType: string, identifier: string) {
    super(
      `${entityType} with identifier ${identifier} already exists`,
      "DUPLICATE_ENTITY"
    );
    this.name = "DuplicateEntityError";
  }
}

/**
 * Utility function to handle DynamoDB errors
 */
export function handleDynamoDBError(error: unknown, operation: string): never {
  if (error instanceof DatabaseError) {
    throw error;
  }
  
  const err = error as { name?: string; message?: string };
  
  if (err.name === "ConditionalCheckFailedException") {
    throw new DatabaseError(
      `Conditional check failed for ${operation}`,
      "CONDITIONAL_CHECK_FAILED",
      error
    );
  }
  
  if (err.name === "ResourceNotFoundException") {
    throw new DatabaseError(
      `Table not found for ${operation}`,
      "TABLE_NOT_FOUND",
      error
    );
  }
  
  throw new DatabaseError(
    `Database operation failed: ${err.message || "Unknown error"}`,
    "DATABASE_ERROR",
    error
  );
}
