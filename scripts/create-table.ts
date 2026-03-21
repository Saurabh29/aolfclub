/**
 * Create DynamoDB Table Script
 *
 * Creates the single-table for all entities.
 * Run with: pnpm db:create-table
 *
 * Requires DynamoDB Local running at http://localhost:8000
 * Start with: docker run -p 8000:8000 amazon/dynamodb-local
 */

import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import { env } from "~/server/config";

const TABLE_NAME = env.DYNAMODB_TABLE_NAME;
const ENDPOINT = env.DYNAMODB_ENDPOINT;
const REGION = env.AWS_REGION;

async function createTable() {
  console.log(`Creating table : ${TABLE_NAME}`);
  console.log(`Endpoint       : ${ENDPOINT ?? "AWS (default credential chain)"}`);
  console.log(`Region         : ${REGION}`);
  console.log("");

  const client = new DynamoDBClient({
    region: REGION,
    ...(ENDPOINT && {
      endpoint: ENDPOINT,
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    }),
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
      })
    );

    console.log(`✅ Table "${TABLE_NAME}" created successfully!`);
    console.log("");
    console.log("Key patterns:");
    console.log("  Location:   PK=LOCATION#<id>,  SK=META");
    console.log("  SlugLookup: PK=SLUG#<slug>,     SK=META");
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`ℹ️  Table "${TABLE_NAME}" already exists — nothing to do.`);
    } else {
      console.error("❌ Failed to create table:", error);
      process.exit(1);
    }
  }
}

createTable();
