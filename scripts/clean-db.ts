/**
 * Clean DB Script
 *
 * Deletes all items from the DynamoDB table (truncate).
 * Run with: pnpm db:clean
 *
 * Requires DynamoDB Local running at http://localhost:8000
 * WARNING: This will permanently delete all data in the table.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "~/server/config";

const TABLE_NAME = env.DYNAMODB_TABLE_NAME;
const ENDPOINT = env.DYNAMODB_ENDPOINT;
const REGION = env.AWS_REGION;

const client = new DynamoDBClient({
  region: REGION,
  ...(ENDPOINT && {
    endpoint: ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  }),
});

const docClient = DynamoDBDocumentClient.from(client);

/** DynamoDB BatchWrite limit is 25 items per request. */
const BATCH_SIZE = 25;

async function cleanDb() {
  console.log(`Cleaning table : ${TABLE_NAME}`);
  console.log(`Endpoint       : ${ENDPOINT ?? "AWS (default credential chain)"}`);
  console.log("");

  let totalDeleted = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    // Scan a page of items — only need PK and SK to build delete requests
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastKey,
      })
    );

    const items = scanResult.Items ?? [];
    lastKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;

    if (items.length === 0) continue;

    // Delete in batches of 25 (DynamoDB BatchWrite limit)
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
            })),
          },
        })
      );

      totalDeleted += batch.length;
    }
  } while (lastKey);

  if (totalDeleted === 0) {
    console.log("ℹ️  Table is already empty — nothing to delete.");
  } else {
    console.log(`✅ Deleted ${totalDeleted} item(s) from "${TABLE_NAME}".`);
  }
}

cleanDb().catch((error) => {
  console.error("❌ Clean failed:", error);
  process.exit(1);
});
