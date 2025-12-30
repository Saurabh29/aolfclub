/**
 * DynamoDB Table Creation Script
 *
 * Creates the single-table for the application in DynamoDB Local.
 * Run with: pnpm db:create-table
 *
 * Requires DynamoDB Local running at http://localhost:8000
 */

import {
	CreateTableCommand,
	DynamoDBClient,
	ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import { config } from "dotenv";
import { env } from "~/server/config";

// Load environment variables from .env (dotenv still supports overrides)
config();

const TABLE_NAME = env.DYNAMODB_TABLE_NAME ?? "aolfclub-entities";
const ENDPOINT = env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const REGION = env.AWS_REGION ?? "us-east-1";

async function createTable() {
	console.log(`Creating table: ${TABLE_NAME}`);
	console.log(`Endpoint: ${ENDPOINT}`);
	console.log(`Region: ${REGION}`);
	console.log("");

	const client = new DynamoDBClient({
		region: REGION,
		endpoint: ENDPOINT,
		credentials: {
			accessKeyId: "local",
			secretAccessKey: "local",
		},
	});

	try {
		await client.send(
			new CreateTableCommand({
				TableName: TABLE_NAME,
				KeySchema: [
					{ AttributeName: "PK", KeyType: "HASH" },
					{ AttributeName: "SK", KeyType: "RANGE" },
				],
				AttributeDefinitions: [
					{ AttributeName: "PK", AttributeType: "S" },
					{ AttributeName: "SK", AttributeType: "S" },
				],
				BillingMode: "PAY_PER_REQUEST",
			}),
		);

		console.log(`✅ Table "${TABLE_NAME}" created successfully!`);
		console.log("");
		console.log("Single-table design with PK/SK:");
		console.log("  - Location: PK=LOCATION#<id>, SK=META");
		console.log("  - LocationCodeLookup: PK=LOCATION_CODE#<code>, SK=META");
	} catch (error) {
		if (error instanceof ResourceInUseException) {
			console.log(`ℹ️  Table "${TABLE_NAME}" already exists.`);
		} else {
			console.error("❌ Failed to create table:", error);
			process.exit(1);
		}
	}
}

createTable();
