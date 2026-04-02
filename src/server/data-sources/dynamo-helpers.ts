/**
 * DynamoDB Helpers — Shared utilities for scan operations and data transformation.
 *
 * Extracted from duplicated code across leads/members/users data sources.
 */

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "~/server/db/client";

/**
 * Scan the full table and filter by itemType.
 * Handles pagination automatically.
 *
 * @param itemType - The itemType value to filter on (e.g., "Lead", "Member", "User")
 * @returns Array of raw DynamoDB items (not yet transformed to typed entities)
 */
export async function scanByItemType<T extends Record<string, unknown>>(
  itemType: string
): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "itemType = :itemType",
        ExpressionAttributeValues: { ":itemType": itemType },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of result.Items ?? []) {
      items.push(item as T);
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

/**
 * Convert a raw DynamoDB item to a typed entity by stripping metadata fields.
 *
 * Removes: PK, SK, itemType (DynamoDB-specific metadata).
 * Returns the rest as the entity.
 */
export function fromItem<T>(item: Record<string, unknown>): T {
  const { PK, SK, itemType, ...rest } = item;
  return rest as unknown as T;
}
