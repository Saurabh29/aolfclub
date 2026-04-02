/**
 * Clean and Init DB Script
 *
 * Wipes all data from the table then seeds it with baseline operational data.
 * Run with: pnpm db:init
 *
 * Seed data:
 *   - Whitelist entry for jsaurabh@gmail.com with canBootstrap = true
 *     (no User entity — created on first OAuth login)
 *   - Roles:  ADMIN, VOLUNTEER
 *   - Pages:  /leads, /community, /tasks, /locations
 *   - Role→Page permissions: ADMIN gets all pages; VOLUNTEER gets /leads and /tasks
 *
 * No seed locations — the bootstrap user creates the first location via the UI.
 *
 * WARNING: Deletes ALL existing data before seeding.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { env } from "~/server/config";

// ─── Client setup ─────────────────────────────────────────────────────────────

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

const BATCH_SIZE = 25;

// ─── Key helpers (mirrors client.ts) ──────────────────────────────────────────

const Keys = {
  whitelistPK: (email: string) => `WHITELIST#${email.toLowerCase()}`,
  rolePK:   (name: string) => `ROLE#${name}`,
  pagePK:   (name: string) => `PAGE#${name}`,
  metaSK:   () => "META" as const,
  pageSK:   (name: string) => `PAGE#${name}`,
};

const now = () => new Date().toISOString();

// ─── Step 1: Clean ────────────────────────────────────────────────────────────

async function cleanDb(): Promise<void> {
  console.log("🗑️  Cleaning table...");
  let totalDeleted = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
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

  console.log(`   Deleted ${totalDeleted} item(s).`);
}

// ─── Step 2: Seed ─────────────────────────────────────────────────────────────

async function seedDb(): Promise<void> {
  const timestamp = now();

  // ── Bootstrap whitelist entry ─────────────────────────────────────────────
  console.log("🔑 Seeding bootstrap whitelist entry...");
  const bootstrapEmail = "jsaurabh@gmail.com";

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: Keys.whitelistPK(bootstrapEmail),
        SK: Keys.metaSK(),
        itemType: "Whitelist",
        email: bootstrapEmail,
        canBootstrap: true,
        createdAt: timestamp,
      },
    })
  );
  console.log(`   Whitelist: ${bootstrapEmail} (canBootstrap: true)`);
  console.log("   User entity will be created on first OAuth login.");

  // ── Roles ──────────────────────────────────────────────────────────────────
  console.log("🔑 Seeding roles...");
  const roles = [
    { roleName: "ADMIN",     description: "Full access to all pages" },
    { roleName: "VOLUNTEER", description: "Access to leads and tasks" },
  ];

  for (const role of roles) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: Keys.rolePK(role.roleName),
          SK: Keys.metaSK(),
          itemType: "Role",
          roleName: role.roleName,
          description: role.description,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );
    console.log(`   Role: ${role.roleName}`);
  }

  // ── Pages ──────────────────────────────────────────────────────────────────
  console.log("📄 Seeding pages...");
  const pages = [
    { pageName: "/leads",     description: "Leads management" },
    { pageName: "/community", description: "Community (Leads, Members, Team)" },
    { pageName: "/tasks",     description: "Call task management" },
    { pageName: "/locations", description: "Location management" },
  ];

  for (const page of pages) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: Keys.pagePK(page.pageName),
          SK: Keys.metaSK(),
          itemType: "Page",
          pageName: page.pageName,
          description: page.description,
          createdAt: timestamp,
        },
      })
    );
    console.log(`   Page: ${page.pageName}`);
  }

  // ── Role→Page permissions ──────────────────────────────────────────────────
  console.log("🔒 Seeding role→page permissions...");

  const adminPages = ["/leads", "/community", "/tasks", "/locations"];
  const volunteerPages = ["/leads", "/tasks"];

  const permissionItems = [
    ...adminPages.map((p) => ({ role: "ADMIN",     page: p })),
    ...volunteerPages.map((p) => ({ role: "VOLUNTEER", page: p })),
  ];

  // Batch the permission edges (no transact needed — these are idempotent)
  for (let i = 0; i < permissionItems.length; i += BATCH_SIZE) {
    const batch = permissionItems.slice(i, i + BATCH_SIZE);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map(({ role, page }) => ({
            PutRequest: {
              Item: {
                PK: Keys.rolePK(role),
                SK: Keys.pageSK(page),
                itemType: "RolePagePermission",
                roleName: role,
                pageName: page,
                permission: "ALLOW",
                updatedAt: timestamp,
              },
            },
          })),
        },
      })
    );
  }

  for (const { role, page } of permissionItems) {
    console.log(`   ${role} → ${page}: ALLOW`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTable    : ${TABLE_NAME}`);
  console.log(`Endpoint : ${ENDPOINT ?? "AWS (default credential chain)"}\n`);

  await cleanDb();
  console.log("");
  await seedDb();

  console.log("\n✅ Done.");
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
