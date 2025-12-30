/**
 * Dump DynamoDB table contents to JSON file
 *
 * Scans the entire table and exports all items to a timestamped JSON file.
 * Useful for debugging, backups, and inspecting data during development.
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { ScanCommand, type ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../src/server/db/client";

async function dumpTableToJson() {
	console.log(`Scanning table: ${TABLE_NAME}`);

	const allItems: any[] = [];
	let lastEvaluatedKey: Record<string, any> | undefined = undefined;
	let pageCount = 0;

	try {
		// Paginate through all items using Scan
		do {
			pageCount++;
			console.log(`Fetching page ${pageCount}...`);

			const command: ScanCommand = new ScanCommand({
				TableName: TABLE_NAME,
				ExclusiveStartKey: lastEvaluatedKey,
			});
			const response: ScanCommandOutput = (await docClient.send(
				command,
			)) as ScanCommandOutput;

			if (response.Items && response.Items.length > 0) {
				allItems.push(...response.Items);
				console.log(
					`  Retrieved ${response.Items.length} items (total: ${allItems.length})`,
				);
			}

			lastEvaluatedKey = response.LastEvaluatedKey as
				| Record<string, any>
				| undefined;
		} while (lastEvaluatedKey);

		console.log(`\nTotal items retrieved: ${allItems.length}`);

		// Generate filename with timestamp
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, -5);
		const filename = `db-dump-${timestamp}.json`;

		// Write to JSON file with pretty formatting
		const jsonContent = JSON.stringify(
			{
				tableName: TABLE_NAME,
				timestamp: new Date().toISOString(),
				itemCount: allItems.length,
				items: allItems,
			},
			null,
			2,
		);

		writeFileSync(filename, jsonContent, "utf8");

		console.log(`\n✓ Database dump saved to: ${filename}`);
		console.log(`  Items exported: ${allItems.length}`);
		console.log(`  File size: ${(jsonContent.length / 1024).toFixed(2)} KB`);
	} catch (error) {
		console.error("Error dumping table:", error);
		throw error;
	}
}

// Run the dump
dumpTableToJson()
	.then(() => {
		console.log("\nDump complete.");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Failed to dump table:", error);
		process.exit(1);
	});
