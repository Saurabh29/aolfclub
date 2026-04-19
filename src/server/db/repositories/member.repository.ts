/**
 * Member Repository
 *
 * Data access layer for Member entities.
 * Per-location uniqueness: phone is unique within a location (Option B).
 * Members do not log in  -  no email sentinel.
 *
 * Item shapes:
 *   MEMBER#<id>                        / META  -  Member entity
 *   LOCATION#<locId>                   / MEMBER#<id>  -  Location-scoped index item
 *   MEMBER_MOBILE#<locId>#<phone>      / META  -  Per-location mobile uniqueness sentinel
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
import type { Member } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateMemberInput {
  locationId: string;
  displayName: string;
  phone: string;
  email?: string;
  image?: string;
  memberSince?: string;
  programsDone?: string[];
  interestedPrograms?: string[];
}

// Helpers removed — using shared fromItem<Member> from dynamo-helpers

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new member.
 *
 * Atomically writes:
 *   - MEMBER#<id>/META                        -  the member entity
 *   - LOCATION#<locId>/MEMBER#<id>            -  location-scoped index item
 *   - MEMBER_MOBILE#<locId>#<phone>/META      -  per-location uniqueness sentinel
 *
 * Throws if the phone number is already registered as a member in this location.
 */
export async function createMember(input: CreateMemberInput): Promise<Member> {
  const id = ulid();
  const timestamp = now();
  const phone = normalizePhone(input.phone);
  const { locationId } = input;

  const memberItem = {
    PK: Keys.memberPK(id),
    SK: Keys.metaSK(),
    itemType: "Member",
    id,
    locationId,
    displayName: input.displayName,
    phone,
    email: input.email,
    image: input.image,
    memberSince: input.memberSince,
    programsDone: input.programsDone ?? [],
    interestedPrograms: input.interestedPrograms ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Location→Member index item (PK=LOCATION#<locId>, SK=MEMBER#<id>)
  const locationIndexItem = {
    PK: Keys.locationPK(locationId),
    SK: Keys.memberSK(id),
    itemType: "LocationMemberIndex",
    locationId,
    memberId: id,
    createdAt: timestamp,
  };

  // Per-location mobile sentinel
  const mobileSentinel = {
    PK: Keys.memberMobilePerLocationPK(locationId, phone),
    SK: Keys.metaSK(),
    itemType: "MemberMobileLookup",
    memberId: id,
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
              Item: memberItem,
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
      throw new Error(`Phone "${phone}" is already registered as a member in this location.`);
    }
    throw error;
  }

  return fromItem<Member>(memberItem);
}

/**
 * Get member by ULID.
 */
export async function getMemberById(id: string): Promise<Member | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.memberPK(id), SK: Keys.metaSK() },
    })
  );
  return result.Item ? fromItem<Member>(result.Item as Record<string, unknown>) : null;
}

/**
 * Get member by phone within a specific location (per-location uniqueness).
 * Two-step: per-location sentinel → member entity.
 */
export async function getMemberByPhoneInLocation(
  locationId: string,
  rawPhone: string
): Promise<Member | null> {
  const phone = normalizePhone(rawPhone);
  const sentinel = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.memberMobilePerLocationPK(locationId, phone), SK: Keys.metaSK() },
    })
  );
  if (!sentinel.Item) return null;
  return getMemberById(sentinel.Item.memberId as string);
}

/**
 * Get all members for a location.
 * Step 1: Query LOCATION#<locId> / MEMBER#* index items to get member IDs.
 * Step 2: BatchGetItem to fetch each member entity.
 */
export async function getMembersByLocation(locationId: string): Promise<Member[]> {
  const memberIds: string[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.locationPK(locationId),
          ":skPrefix": Keys.MEMBER_PREFIX,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of result.Items ?? []) {
      memberIds.push(item.memberId as string);
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  if (memberIds.length === 0) return [];

  const members: Member[] = [];
  for (let i = 0; i < memberIds.length; i += 100) {
    const chunk = memberIds.slice(i, i + 100);
    let keys = chunk.map((id) => ({ PK: Keys.memberPK(id), SK: Keys.metaSK() }));

    while (keys.length > 0) {
      const response = await docClient.send(
        new BatchGetCommand({
          RequestItems: { [TABLE_NAME]: { Keys: keys } },
        })
      );

      for (const item of response.Responses?.[TABLE_NAME] ?? []) {
        members.push(fromItem<Member>(item as Record<string, unknown>));
      }

      // Retry any unprocessed keys
      const unprocessed = response.UnprocessedKeys?.[TABLE_NAME]?.Keys;
      keys = (unprocessed as typeof keys) ?? [];
    }
  }

  return members;
}

/**
 * Update member fields.
 * If phone changes, atomically replaces old per-location sentinel with new one.
 */
export async function updateMember(
  id: string,
  updates: Partial<Omit<Member, "id" | "createdAt">>
): Promise<Member> {
  const timestamp = now();

  if (updates.phone !== undefined) {
    const existing = await getMemberById(id);
    if (!existing) throw new Error(`Member "${id}" not found`);

    const newPhone = normalizePhone(updates.phone);
    if (existing.phone !== newPhone) {
      const newItem = {
        ...existing,
        ...updates,
        phone: newPhone,
        updatedAt: timestamp,
        PK: Keys.memberPK(id),
        SK: Keys.metaSK(),
        itemType: "Member",
      };
      const newSentinel = {
        PK: Keys.memberMobilePerLocationPK(existing.locationId, newPhone),
        SK: Keys.metaSK(),
        itemType: "MemberMobileLookup",
        memberId: id,
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
                  PK: Keys.memberMobilePerLocationPK(existing.locationId, existing.phone),
                  SK: Keys.metaSK(),
                },
              },
            },
          ],
        })
      );

      return fromItem<Member>(newItem as Record<string, unknown>);
    }
  }

  const updateParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  const fields = [
    "displayName", "phone", "email", "image", "locationId",
    "memberSince", "programsDone", "interestedPrograms",
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
      Key: { PK: Keys.memberPK(id), SK: Keys.metaSK() },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return fromItem<Member>(result.Attributes as Record<string, unknown>);
}

/**
 * Delete a member and all associated items atomically:
 *   - MEMBER#<id>/META
 *   - LOCATION#<locId>/MEMBER#<id>  (location index)
 *   - MEMBER_MOBILE#<locId>#<phone>/META  (per-location sentinel)
 */
export async function deleteMember(id: string): Promise<void> {
  const existing = await getMemberById(id);
  if (!existing) return;

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.memberPK(id), SK: Keys.metaSK() },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: Keys.locationPK(existing.locationId),
              SK: Keys.memberSK(id),
            },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: Keys.memberMobilePerLocationPK(existing.locationId, existing.phone),
              SK: Keys.metaSK(),
            },
          },
        },
      ],
    })
  );
}
