#!/usr/bin/env tsx
/*
 * Clean and initialize DynamoDB (local or remote)
 * - Deletes all existing tables (careful in non-local environments)
 * - Creates the single-table used by this app with PK/SK keys
 *
 * Usage:
 *  pnpm tsx scripts/clean-and-init-db.ts
 *
 * The script reads environment variables from .env (if present):
 * - DYNAMODB_ENDPOINT (if set, script will use local endpoint and static creds)
 * - DYNAMODB_TABLE_NAME (default: aolfclub-entities)
 * - AWS_REGION (default: us-east-1)
 *
 * IMPORTANT: This script will delete ALL tables visible to the configured DynamoDB
 * client. Only run against DynamoDB Local or when you are certain.
 */

import dotenv from "dotenv";
import {
	DynamoDBClient,
	ListTablesCommand,
	DeleteTableCommand,
	CreateTableCommand,
	ScalarAttributeType,
	KeySchemaElement,
	AttributeDefinition,
} from "@aws-sdk/client-dynamodb";
// Use an async IIFE so we can load dotenv before importing app env
dotenv.config();

(async () => {
	const { env } = await import("~/server/config");

	const TABLE_NAME = env.DYNAMODB_TABLE_NAME ?? "aolfclub-entities";
	const AWS_REGION = env.AWS_REGION ?? "us-east-1";
	const DYNAMODB_ENDPOINT = env.DYNAMODB_ENDPOINT;

	function createClient() {
		const isLocal = !!DYNAMODB_ENDPOINT;
		if (isLocal) {
			console.log(`Using local DynamoDB endpoint: ${DYNAMODB_ENDPOINT}`);
			return new DynamoDBClient({
				region: AWS_REGION,
				endpoint: DYNAMODB_ENDPOINT,
				credentials: { accessKeyId: "local", secretAccessKey: "local" },
			});
		}
		console.log(`Using AWS region: ${AWS_REGION}`);
		return new DynamoDBClient({ region: AWS_REGION });
	}

	async function run() {
		const client = createClient();

		try {
			console.log("Listing tables...");
			const listResp = await client.send(new ListTablesCommand({}));
			const tables = listResp.TableNames ?? [];

			if (tables.length === 0) {
				console.log("No tables found.");
			} else {
				console.log(`Found ${tables.length} table(s):`, tables.join(", "));

				// Safety: If not running against local endpoint, prompt the user
				if (!DYNAMODB_ENDPOINT) {
					console.error(
						"DYNAMODB_ENDPOINT is not set. Aborting to avoid deleting remote tables.",
					);
					process.exit(1);
				}

				// Delete all tables
				for (const t of tables) {
					try {
						console.log(`Deleting table: ${t}`);
						await client.send(new DeleteTableCommand({ TableName: t }));
						console.log(`Requested deletion for table ${t}`);
					} catch (err) {
						console.error(`Failed to delete table ${t}:`, err);
					}
				}

				// Wait briefly for deletions to propagate in local environment
				await new Promise((r) => setTimeout(r, 1200));
			}

			// Create the single-table
			console.log(`Creating table: ${TABLE_NAME}`);

			const attributeDefinitions: AttributeDefinition[] = [
				{ AttributeName: "PK", AttributeType: ScalarAttributeType.S },
				{ AttributeName: "SK", AttributeType: ScalarAttributeType.S },
			];

			const keySchema: KeySchemaElement[] = [
				{ AttributeName: "PK", KeyType: "HASH" },
				{ AttributeName: "SK", KeyType: "RANGE" },
			];

			const createParams = {
				TableName: TABLE_NAME,
				AttributeDefinitions: attributeDefinitions,
				KeySchema: keySchema,
				BillingMode: "PAY_PER_REQUEST" as const,
			};

			try {
				await client.send(new CreateTableCommand(createParams));
				console.log(`CreateTable requested for ${TABLE_NAME}`);
			} catch (err: any) {
				if (err?.name === "ResourceInUseException") {
					console.log(`Table ${TABLE_NAME} already exists.`);
				} else {
					console.error("Failed to create table:", err);
					process.exit(1);
				}
			}

			console.log("Done.");
		} catch (err: any) {
			try {
				console.error("Unexpected error:", err?.message ?? String(err));
				if (err?.stack) console.error(err.stack);
			} catch (e) {
				console.error("Unexpected error: <unknown>");
			}
			process.exit(1);
		}
	}

	await run();
})();
