/**
 * Lead Repository
 *
 * Data access layer for Lead entities.
 * Per-location uniqueness: phone is unique within a location (Option B).
 * Leads do not log in  -  no email sentinel.
 *
 * Item shapes:
 *   LEAD#<id>                          / META  -  Lead entity
 *   LOCATION#<locId>                   / LEAD#<id>  -  Location-scoped index item
 *   LEAD_MOBILE#<locId>#<phone>        / META  -  Per-location mobile uniqueness sentinel
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand,
  BatchGetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, normalizePhone, now } from "~/server/db/client";
import { fromItem } from "~/server/data-sources/dynamo-helpers";
import type { Lead } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  locationId: string;
  displayName: string;
  phone: string;
  email?: string;
  image?: string;
  interestedPrograms?: string[];
}

// Helpers removed — using shared fromItem<Lead> from dynamo-helpers

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new lead.
 *
 * Atomically writes:
 *   - LEAD#<id>/META                          -  the lead entity
 *   - LOCATION#<locId>/LEAD#<id>              -  location-scoped index item
 *   - LEAD_MOBILE#<locId>#<phone>/META        -  per-location uniqueness sentinel
 *
 * Throws if the phone number is already registered as a lead in this location.
 */
export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const id = ulid();
  const timestamp = now();
  const phone = normalizePhone(input.phone);
  const { locationId } = input;

  const leadItem = {
    PK: Keys.leadPK(id),
    SK: Keys.metaSK(),
    itemType: "Lead",
    id,
    locationId,
    displayName: input.displayName,
    phone,
    email: input.email,
    image: input.image,
    interestedPrograms: input.interestedPrograms ?? [],
    totalCallCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Location→Lead index item (PK=LOCATION#<locId>, SK=LEAD#<id>)
  const locationIndexItem = {
    PK: Keys.locationPK(locationId),
    SK: Keys.leadSK(id),
    itemType: "LocationLeadIndex",
    locationId,
    leadId: id,
    createdAt: timestamp,
  };

  // Per-location mobile sentinel
  const mobileSentinel = {
    PK: Keys.leadMobilePerLocationPK(locationId, phone),
    SK: Keys.metaSK(),
    itemType: "LeadMobileLookup",
    leadId: id,
    locationId,
    phone,
    createdAt: timestamp,
  };

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: leadItem,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: locationIndexItem,
              ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: mobileSentinel,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      })
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new Error(`Phone "${phone}" is already registered as a lead in this location.`);
    }
    throw error;
  }

  return fromItem<Lead>(leadItem);
}

/**
 * Get lead by ULID.
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.leadPK(id), SK: Keys.metaSK() },
    })
  );
  return result.Item ? fromItem<Lead>(result.Item as Record<string, unknown>) : null;
}

/**
 * Get lead by phone within a specific location (per-location uniqueness).
 * Two-step: per-location sentinel → lead entity.
 */
export async function getLeadByPhoneInLocation(
  locationId: string,
  rawPhone: string
): Promise<Lead | null> {
  const phone = normalizePhone(rawPhone);
  const sentinel = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.leadMobilePerLocationPK(locationId, phone), SK: Keys.metaSK() },
    })
  );
  if (!sentinel.Item) return null;
  return getLeadById(sentinel.Item.leadId as string);
}

/**
 * Get all leads for a location.
 * Step 1: Query LOCATION#<locId> / LEAD#* index items to get lead IDs.
 * Step 2: BatchGetItem to fetch each lead entity.
 */
export async function getLeadsByLocation(locationId: string): Promise<Lead[]> {
  // Step 1: collect lead IDs from the location partition
  const leadIds: string[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.locationPK(locationId),
          ":skPrefix": Keys.LEAD_PREFIX,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of result.Items ?? []) {
      leadIds.push(item.leadId as string);
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  if (leadIds.length === 0) return [];

  // Step 2: BatchGetItem in chunks of 100 (DynamoDB limit)
  const leads: Lead[] = [];
  for (let i = 0; i < leadIds.length; i += 100) {
    const chunk = leadIds.slice(i, i + 100);
    let keys = chunk.map((id) => ({ PK: Keys.leadPK(id), SK: Keys.metaSK() }));

    while (keys.length > 0) {
      const response = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE_NAME]: { Keys: keys },
          },
        })
      );

      for (const item of response.Responses?.[TABLE_NAME] ?? []) {
        leads.push(fromItem<Lead>(item as Record<string, unknown>));
      }

      // Retry any unprocessed keys
      const unprocessed = response.UnprocessedKeys?.[TABLE_NAME]?.Keys;
      keys = (unprocessed as typeof keys) ?? [];
    }
  }

  return leads;
}

/**
 * Update lead fields.
 * If phone changes, atomically replaces old per-location sentinel with new one.
 */
export async function updateLead(
  id: string,
  updates: Partial<Omit<Lead, "id" | "createdAt">>
): Promise<Lead> {
  const timestamp = now();

  if (updates.phone !== undefined) {
    const existing = await getLeadById(id);
    if (!existing) throw new Error(`Lead "${id}" not found`);

    const newPhone = normalizePhone(updates.phone);
    if (existing.phone !== newPhone) {
      const newItem = {
        ...existing,
        ...updates,
        phone: newPhone,
        updatedAt: timestamp,
        PK: Keys.leadPK(id),
        SK: Keys.metaSK(),
        itemType: "Lead",
      };
      const newSentinel = {
        PK: Keys.leadMobilePerLocationPK(existing.locationId, newPhone),
        SK: Keys.metaSK(),
        itemType: "LeadMobileLookup",
        leadId: id,
        locationId: existing.locationId,
        phone: newPhone,
        createdAt: timestamp,
      };

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: { TableName: TABLE_NAME, Item: newItem } },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: newSentinel,
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: {
                  PK: Keys.leadMobilePerLocationPK(existing.locationId, existing.phone),
                  SK: Keys.metaSK(),
                },
              },
            },
          ],
        })
      );

      return fromItem<Lead>(newItem as Record<string, unknown>);
    }
  }

  const updateParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  const fields = [
    "displayName", "phone", "email", "image", "locationId",
    "interestedPrograms", "lastCallDate", "lastInterestLevel",
    "nextFollowUpDate", "lastNotes", "totalCallCount",
  ] as const;

  for (const field of fields) {
    if (updates[field] !== undefined) {
      updateParts.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = updates[field];
    }
  }

  updateParts.push("#updatedAt = :updatedAt");
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = timestamp;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.leadPK(id), SK: Keys.metaSK() },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return fromItem<Lead>(result.Attributes as Record<string, unknown>);
}

/**
 * Delete a lead and all associated items atomically:
 *   - LEAD#<id>/META
 *   - LOCATION#<locId>/LEAD#<id>  (location index)
 *   - LEAD_MOBILE#<locId>#<phone>/META  (per-location sentinel)
 */
export async function deleteLead(id: string): Promise<void> {
  const existing = await getLeadById(id);
  if (!existing) return;

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.leadPK(id), SK: Keys.metaSK() },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: Keys.locationPK(existing.locationId),
              SK: Keys.leadSK(id),
            },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: Keys.leadMobilePerLocationPK(existing.locationId, existing.phone),
              SK: Keys.metaSK(),
            },
          },
        },
      ],
    })
  );
}
