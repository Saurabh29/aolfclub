/**
 * DynamoDB Connection Test Script
 *
 * Tests the connection to DynamoDB Local.
 * Run with: pnpm db:test
 */

import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { config } from "dotenv";
import { env } from "~/server/config";

// Load environment variables from files if present
config();

const ENDPOINT = env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const REGION = env.AWS_REGION ?? "us-east-1";

async function testConnection() {
	console.log("Testing DynamoDB connection...");
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
		const result = await client.send(new ListTablesCommand({}));
		console.log("✅ Connection successful!");
		console.log("");
		console.log("Existing tables:", result.TableNames?.join(", ") || "(none)");

		const tableName = env.DYNAMODB_TABLE_NAME ?? "aolfclub-entities";
		if (result.TableNames?.includes(tableName)) {
			console.log(`✅ Table "${tableName}" exists.`);
		} else {
			console.log(
				`⚠️  Table "${tableName}" does not exist. Run: pnpm db:create-table`,
			);
		}
	} catch (error) {
		console.error("❌ Connection failed:", error);
		console.log("");
		console.log("Make sure DynamoDB Local is running:");
		console.log("  docker run -p 8000:8000 amazon/dynamodb-local");
		process.exit(1);
	}
}

testConnection();
