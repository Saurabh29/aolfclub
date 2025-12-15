/**
 * DYNAMODB CLIENT CONFIGURATION
 *
 * AWS SDK v3 DynamoDB client setup
 * Server-side only - NO UI concerns
 */

import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TranslateConfig } from "@aws-sdk/lib-dynamodb";

/**
 * DynamoDB Table Configuration
 *
 * Single table design:
 * - PK: Entity type + ID (e.g., "Teacher#uuid")
 * - SK: "METADATA" for primary record
 */
export const TABLE_CONFIG = {
  TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || "aolfclub-entities",
  REGION: process.env.AWS_REGION || "us-east-1",

  // Primary Key
  PK: "PK",
  SK: "SK",
} as const;

/**
 * Key Construction Utilities
 */
export const KeyUtils = {
  /**
   * Primary key: "EntityType#id"
   */
  entityPK: (entityType: string, id: string) => `${entityType}#${id}`,

  /**
   * Sort key: "METADATA"
   */
  entitySK: () => "METADATA",
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
  // Always use local DynamoDB in development
  const isLocalDev =
    process.env.NODE_ENV === "development" || !process.env.AWS_ACCESS_KEY_ID;

  if (isLocalDev) {
    const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
    console.log(`[DynamoDB] Using local endpoint: ${endpoint}`);

    config.endpoint = endpoint;
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
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class EntityNotFoundError extends DatabaseError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`, "ENTITY_NOT_FOUND");
    this.name = "EntityNotFoundError";
  }
}

export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    public errors?: unknown,
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class DuplicateEntityError extends DatabaseError {
  constructor(entityType: string, identifier: string) {
    super(
      `${entityType} with identifier ${identifier} already exists`,
      "DUPLICATE_ENTITY",
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
      error,
    );
  }

  if (err.name === "ResourceNotFoundException") {
    throw new DatabaseError(
      `Table not found for ${operation}`,
      "TABLE_NOT_FOUND",
      error,
    );
  }

  throw new DatabaseError(
    `Database operation failed: ${err.message || "Unknown error"}`,
    "DATABASE_ERROR",
    error,
  );
}
