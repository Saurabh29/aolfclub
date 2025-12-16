/**
 * LOCATION REPOSITORY (ReBAC Design)
 *
 * Manages shop locations
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
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
export type CreateLocationInput = CreateInput<typeof LocationSchema, "locationId">;

/**
 * Create a new location
 */
export async function createLocation(
  input: CreateLocationInput,
): Promise<Location> {
  const locationId = ulid();
  const timestamp = now();

  const location: Location = {
    PK: Keys.locationPK(locationId),
    SK: Keys.locationSK(),
    itemType: "Location",
    locationId,
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

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: validated,
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );

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
