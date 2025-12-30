/**
 * DynamoDB Client Configuration
 *
 * This module provides the DynamoDB DocumentClient and helper utilities
 * for the single-table design pattern used in this application.
 *
 * Environment Variables:
 * - DYNAMODB_TABLE_NAME: Table name (default: "aolfclub-entities")
 * - AWS_REGION: AWS region (default: "us-east-1")
 * - DYNAMODB_ENDPOINT: Local endpoint for DynamoDB Local (e.g., "http://localhost:8000")
 *
 * When DYNAMODB_ENDPOINT is set, the client uses static local credentials.
 * Otherwise, it uses the default AWS credential chain (IAM roles, env vars, etc.).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "~/server/config/env";

// Configuration from validated env
export const TABLE_NAME = env.DYNAMODB_TABLE_NAME ?? "aolfclub-entities";
export const AWS_REGION = env.AWS_REGION ?? "us-east-1";
const DYNAMODB_ENDPOINT = env.DYNAMODB_ENDPOINT;

/**
 * Creates the DynamoDB client with appropriate configuration.
 * Uses local endpoint and credentials when DYNAMODB_ENDPOINT is set.
 */
function createDynamoDBClient(): DynamoDBClient {
	const isLocal = !!DYNAMODB_ENDPOINT;

	if (isLocal) {
		console.log(`[DynamoDB] Using local endpoint: ${DYNAMODB_ENDPOINT}`);
		return new DynamoDBClient({
			region: AWS_REGION,
			endpoint: DYNAMODB_ENDPOINT,
			credentials: {
				accessKeyId: "local",
				secretAccessKey: "local",
			},
		});
	}

	// Production: use default credential chain
	return new DynamoDBClient({
		region: AWS_REGION,
	});
}

// Create the low-level client
const ddbClient = createDynamoDBClient();

// Create the DocumentClient for simplified operations
export const docClient = DynamoDBDocumentClient.from(ddbClient, {
	marshallOptions: {
		removeUndefinedValues: true,
		convertEmptyValues: false,
	},
	unmarshallOptions: {
		wrapNumbers: false,
	},
});

/**
 * Returns the current timestamp as an ISO 8601 string.
 * Used for createdAt and updatedAt fields.
 */
export function now(): string {
	return new Date().toISOString();
}

/**
 * Extracts the ID from a PK string.
 * @param pk - PK string (e.g., "LOCATION#01ARZ3NDEKTSV4RRFFQ69G5FAV")
 * @param prefix - Expected prefix (e.g., "LOCATION#")
 * @returns The ID portion, or null if format doesn't match
 */
export function extractIdFromPK(pk: string, prefix: string): string | null {
	if (!pk.startsWith(prefix)) {
		return null;
	}
	return pk.slice(prefix.length);
}
