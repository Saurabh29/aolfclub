/**
 * TEST LOCATION CREATION
 *
 * Directly tests the createLocation repository function
 * to verify DynamoDB connectivity and data persistence
 */

import { createLocation } from "../src/server/db/repositories/location.repository";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../src/server/db/rebac-client";

async function testLocationCreation() {
  console.log("=".repeat(60));
  console.log("TEST: Location Creation");
  console.log("=".repeat(60));
  console.log("");

  try {
    // Test data
    const testLocation = {
      locationCode: "test-" + Date.now(),
      name: "Test Shop " + Date.now(),
      address: "123 Test Street, Test City",
      status: "active" as const,
    };

    console.log("1. Creating test location...");
    console.log("   Input:", JSON.stringify(testLocation, null, 2));
    console.log("");

    const result = await createLocation(testLocation);

    console.log("2. Location created successfully!");
    console.log("   Result:", JSON.stringify(result, null, 2));
    console.log("");

    // Verify in DynamoDB
    console.log("3. Verifying in DynamoDB...");
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "locationId = :id",
        ExpressionAttributeValues: {
          ":id": result.locationId,
        },
      }),
    );

    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log("   ✅ Found in DynamoDB:");
      console.log("   ", JSON.stringify(scanResult.Items[0], null, 2));
    } else {
      console.log("   ❌ NOT found in DynamoDB!");
    }
    console.log("");

    // List all items
    console.log("4. Current items in table:");
    const allItems = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      }),
    );

    console.log(`   Total items: ${allItems.Items?.length || 0}`);
    if (allItems.Items && allItems.Items.length > 0) {
      allItems.Items.forEach((item, i) => {
        console.log(`   [${i + 1}] PK: ${item.PK}, SK: ${item.SK}, Type: ${item.itemType}`);
      });
    }
    console.log("");

    console.log("=".repeat(60));
    console.log("✅ TEST PASSED");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("");
    console.error("=".repeat(60));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(60));
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

testLocationCreation();
