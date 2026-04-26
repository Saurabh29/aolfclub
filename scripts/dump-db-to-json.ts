/**
 * Dump DB to JSON Script
 *
 * Exports the entire DynamoDB table to a timestamped JSON file.
 * Useful for debugging, backup, and data inspection.
 *
 * Run with: pnpm db:dump
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { writeFileSync } from "node:fs";
import { env } from "~/server/config";

const TABLE_NAME = env.DYNAMODB_TABLE_NAME;
const ENDPOINT = env.DYNAMODB_ENDPOINT;
const REGION = env.AWS_REGION;

const rawClient = new DynamoDBClient({
  region: REGION,
  ...(ENDPOINT && {
    endpoint: ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  }),
});

const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

async function dumpDb(): Promise<void> {
  console.log(`Table    : ${TABLE_NAME}`);
  console.log(`Endpoint : ${ENDPOINT ?? "AWS (default credential chain)"}`);
  console.log("");
  console.log("Scanning table...");

  const allItems: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of result.Items ?? []) {
      allItems.push(item as Record<string, unknown>);
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  console.log(`Found ${allItems.length} item(s).`);

  // Sort items by PK then SK for readability
  allItems.sort((a, b) => {
    const pkCmp = String(a.PK ?? "").localeCompare(String(b.PK ?? ""));
    if (pkCmp !== 0) return pkCmp;
    return String(a.SK ?? "").localeCompare(String(b.SK ?? ""));
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `db-dump-${timestamp}.json`;

  const payload = {
    table: TABLE_NAME,
    exportedAt: new Date().toISOString(),
    itemCount: allItems.length,
    items: allItems,
  };

  const json = JSON.stringify(payload, null, 2);
  writeFileSync(filename, json, "utf-8");

  const sizeKB = (Buffer.byteLength(json, "utf-8") / 1024).toFixed(1);
  console.log(`\n✅ Exported to ${filename} (${sizeKB} KB)`);
}

dumpDb().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
