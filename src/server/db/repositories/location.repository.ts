/**
 * LOCATION REPOSITORY (ReBAC Design)
 *
 * Manages shop locations
 */

import { PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "../rebac-client";
import {
  LocationSchema,
  type Location,
} from "~/lib/schemas/db/location.schema";
import type { CreateInput } from "~/lib/schemas/db/schema-helpers";

/**
 * Location creation input type - derived from schema
 * Ensures compile-time safety: if schema changes, this type changes
 * EXPORTED for use in server actions - UI cannot import DB schemas directly
 */
/**
 * CreateLocationInput type for creating locations
 * locationId (ULID) is auto-generated, locationCode is required from user
 */
export type CreateLocationInput = CreateInput<typeof LocationSchema, "locationId">;

/**
 * Create a new location
 */
export async function createLocation(
  input: CreateLocationInput,
): Promise<Location> {
  const locationId = ulid(); // Generate ULID for database ID
  const timestamp = now();

  const location: Location = {
    PK: Keys.locationPK(locationId),
    SK: Keys.locationSK(),
    itemType: "Location",
    locationId,
    locationCode: input.locationCode,
    name: input.name,
    address: input.address,
    city: input.city,
    state: input.state,
    zipCode: input.zipCode,
    phone: input.phone,
    status: input.status || "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate with Zod
  const validated = LocationSchema.parse(location);

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: validated,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  } catch (error) {
    console.error("[LocationRepo] DynamoDB PutCommand failed:", error);
    throw error;
  }

  return validated;
}

/**
 * Get location by ID
 */
export async function getLocationById(
  locationId: string,
): Promise<Location | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.locationPK(locationId),
        SK: Keys.locationSK(),
      },
    }),
  );

  if (!result.Item) {
    return null;
  }

  return LocationSchema.parse(result.Item);
}

/**
 * List all locations
 * Uses scan with filter to get all Location items
 */
export async function listAllLocations(): Promise<Location[]> {
  const locations: Location[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    // Scan table and filter for Location items
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "itemType = :type",
        ExpressionAttributeValues: {
          ":type": "Location",
        },
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    if (result.Items) {
      for (const item of result.Items) {
        try {
          const location = LocationSchema.parse(item);
          locations.push(location);
        } catch (error) {
          console.error("[LocationRepo] Failed to parse location:", error);
        }
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return locations;
}
