/**
 * Test DB Connection Script
 *
 * Verifies DynamoDB connectivity and checks that the configured table exists.
 * Useful for onboarding, CI checks, and debugging connection issues.
 *
 * Run with: pnpm db:test
 */

import { DynamoDBClient, ListTablesCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { env } from "~/server/config";

const TABLE_NAME = env.DYNAMODB_TABLE_NAME;
const ENDPOINT = env.DYNAMODB_ENDPOINT;
const REGION = env.AWS_REGION;

async function testConnection(): Promise<void> {
  console.log(`Table    : ${TABLE_NAME}`);
  console.log(`Endpoint : ${ENDPOINT ?? "AWS (default credential chain)"}`);
  console.log(`Region   : ${REGION}`);
  console.log("");

  const client = new DynamoDBClient({
    region: REGION,
    ...(ENDPOINT && {
      endpoint: ENDPOINT,
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    }),
  });

  // Step 1: List tables to verify connection
  console.log("1. Testing connection...");
  try {
    const listResult = await client.send(new ListTablesCommand({}));
    const tables = listResult.TableNames ?? [];
    console.log(`   ✅ Connected. Found ${tables.length} table(s): ${tables.join(", ") || "(none)"}`);
  } catch (error) {
    console.error("   ❌ Connection failed:", (error as Error).message);
    console.error("");
    if (ENDPOINT) {
      console.error("   Is DynamoDB Local running?");
      console.error(`   Start with: docker run -p 8000:8000 amazon/dynamodb-local`);
    } else {
      console.error("   Check your AWS credentials and region configuration.");
    }
    process.exit(1);
  }

  // Step 2: Check if configured table exists
  console.log(`\n2. Checking table "${TABLE_NAME}"...`);
  try {
    const descResult = await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );
    const table = descResult.Table;
    console.log(`   ✅ Table exists.`);
    console.log(`   Status     : ${table?.TableStatus}`);
    console.log(`   Item count : ${table?.ItemCount ?? "N/A"}`);
    console.log(`   Size (bytes): ${table?.TableSizeBytes ?? "N/A"}`);

    const keys = table?.KeySchema?.map(
      (k) => `${k.AttributeName} (${k.KeyType})`
    ).join(", ");
    console.log(`   Key schema : ${keys ?? "N/A"}`);
  } catch (error) {
    if ((error as Error).name === "ResourceNotFoundException") {
      console.error(`   ❌ Table "${TABLE_NAME}" does not exist.`);
      console.error(`   Create it with: pnpm db:create-table`);
    } else {
      console.error(`   ❌ Failed to describe table:`, (error as Error).message);
    }
    process.exit(1);
  }

  console.log("\n✅ All checks passed.");
}

testConnection().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
