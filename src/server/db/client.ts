/**
 * DynamoDB Client
 *
 * Single source of truth for the DynamoDB DocumentClient and key helpers.
 *
 * Environment Variables:
 *   DYNAMODB_TABLE_NAME  — table name (e.g. "aolfclub-entities")
 *   AWS_REGION           — AWS region (e.g. "us-east-1")
 *   DYNAMODB_ENDPOINT    — set for DynamoDB Local (e.g. "http://localhost:8000")
 *
 * When DYNAMODB_ENDPOINT is set the client uses static local credentials.
 * Otherwise it falls back to the default AWS credential chain (IAM roles, env vars, etc.).
 *
 * PK / SK patterns (single-table design):
 *   Location item:   PK = "LOCATION#<id>",  SK = "META"
 *   Slug lookup:     PK = "SLUG#<slug>",    SK = "META"
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "~/server/config";

export const TABLE_NAME = env.DYNAMODB_TABLE_NAME;

function createDynamoDBClient(): DynamoDBClient {
  if (env.DYNAMODB_ENDPOINT) {
    console.log(`[DynamoDB] Using local endpoint: ${env.DYNAMODB_ENDPOINT}`);
    return new DynamoDBClient({
      region: env.AWS_REGION,
      endpoint: env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: "local",
        secretAccessKey: "local",
      },
    });
  }

  // Production: use default credential chain (IAM role, env vars, ~/.aws/credentials)
  return new DynamoDBClient({ region: env.AWS_REGION });
}

export const docClient = DynamoDBDocumentClient.from(createDynamoDBClient(), {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Key helpers — centralise PK/SK generation so all operations stay consistent.
 */
export const Keys = {
  locationPK: (id: string): string => `LOCATION#${id}`,
  slugPK: (slug: string): string => `SLUG#${slug}`,
  metaSK: (): "META" => "META" as const,
};

/** Current ISO-8601 timestamp — used for createdAt / updatedAt. */
export const now = (): string => new Date().toISOString();
