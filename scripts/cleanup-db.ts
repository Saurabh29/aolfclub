/**
 * CLEANUP DATABASE SCRIPT
 *
 * Deletes all items from the DynamoDB table
 * USE WITH CAUTION - This will delete ALL data!
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-db.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "aolfclub-entities";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Create DynamoDB client
const client = new DynamoDBClient({
  region: AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  }  
});

const docClient = DynamoDBDocumentClient.from(client);

/**
 * Delete all items from the table
 */
async function cleanupDatabase() {
  console.log(`🔍 Scanning table: ${TABLE_NAME}`);

  try {
    let totalDeleted = 0;
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      // Scan for all items
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      const items = scanResult.Items || [];
      console.log(`📦 Found ${items.length} items in this batch`);

      if (items.length > 0) {
        // DynamoDB BatchWrite supports max 25 items at a time
        const chunks = [];
        for (let i = 0; i < items.length; i += 25) {
          chunks.push(items.slice(i, i + 25));
        }

        // Delete in batches of 25
        for (const chunk of chunks) {
          const deleteRequests = chunk.map((item) => ({
            DeleteRequest: {
              Key: {
                PK: item.PK,
                SK: item.SK,
              },
            },
          }));

          await docClient.send(
            new BatchWriteCommand({
              RequestItems: {
                [TABLE_NAME]: deleteRequests,
              },
            }),
          );

          totalDeleted += chunk.length;
          console.log(`🗑️  Deleted ${chunk.length} items (total: ${totalDeleted})`);
        }
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} items from ${TABLE_NAME}`);
  } catch (error) {
    console.error("❌ Error cleaning up database:", error);
    throw error;
  }
}

/**
 * Confirm before deletion
 */
async function confirmAndCleanup() {
  console.log("⚠️  WARNING: This will DELETE ALL DATA from the table!");
  console.log(`📊 Table: ${TABLE_NAME}`);
  console.log(`🌍 Region: ${AWS_REGION}`);
  console.log(`🔗 Endpoint: ${process.env.DYNAMODB_ENDPOINT || "AWS Production"}`);
  console.log("");

  // In a script environment, we'll just proceed
  // For production, you might want to add a CLI prompt
  console.log("🚀 Starting cleanup in 3 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await cleanupDatabase();
}

// Run the script
confirmAndCleanup().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
