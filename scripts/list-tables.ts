/**
 * List DynamoDB Tables
 *
 * Quick script to list all tables in DynamoDB (local or AWS)
 */

import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

async function listTables() {
  try {
    console.log(
      "Connecting to DynamoDB:",
      process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    );

    const command = new ListTablesCommand({});
    const response = await client.send(command);

    console.log("\n✅ DynamoDB Tables:");
    if (response.TableNames && response.TableNames.length > 0) {
      response.TableNames.forEach((tableName) => {
        console.log(`  - ${tableName}`);
      });
    } else {
      console.log("  (No tables found)");
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Error listing tables:", error);
    process.exit(1);
  }
}

listTables();
