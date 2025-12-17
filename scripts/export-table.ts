/**
 * Export DynamoDB Table to JSON
 *
 * Scans the entire table and exports all items to a JSON file
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { writeFileSync } from "fs";
import { join } from "path";

// Use the same local credentials and endpoint logic as list-tables.ts
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "aolfclub-entities";

async function exportTableToJson() {
  try {
    console.log(`Scanning table: ${TABLE_NAME}`);
    console.log(
      `Endpoint: ${process.env.DYNAMODB_ENDPOINT || "http://localhost:8000"}\n`,
    );

    const allItems: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;
    let pageCount = 0;

    // Scan all items (paginated)
    do {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await docClient.send(command);

      if (response.Items) {
        allItems.push(...response.Items);
        pageCount++;
        console.log(`  Page ${pageCount}: ${response.Items.length} items`);
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n✅ Total items scanned: ${allItems.length}`);

    // Write to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `dynamodb-export-${timestamp}.json`;
    const filepath = join(process.cwd(), filename);

    writeFileSync(filepath, JSON.stringify(allItems, null, 2), "utf-8");

    console.log(`\n📄 Exported to: ${filename}\n`);

    // Summary by entity type
    const entityCounts = allItems.reduce(
      (acc, item) => {
        const entityType = item.entityType || "Unknown";
        acc[entityType] = (acc[entityType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("Entity Breakdown:");
    Object.entries(entityCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
  } catch (error) {
    console.error("❌ Error exporting table:", error);
    process.exit(1);
  }
}

exportTableToJson();
