/**
 * Member Repository
 *
 * Data access layer for Member entities.
 * Uniqueness enforced by phone (E.164) via a MEMBER_MOBILE# sentinel.
 * Members do not log in — no email sentinel.
 *
 * Item shapes:
 *   MEMBER#<id>              / META  — Member entity
 *   MEMBER_MOBILE#<phone>    / META  — Mobile uniqueness sentinel
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, normalizePhone, now } from "~/server/db/client";
import type { Member } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateMemberInput {
  displayName: string;
  phone: string;
  email?: string;
  image?: string;
  activeLocationId?: string;
  memberSince?: string;
  programsDone?: string[];
  interestedPrograms?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMember(item: Record<string, unknown>): Member {
  const { PK, SK, itemType, ...rest } = item;
  return rest as unknown as Member;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new member.
 *
 * Atomically writes:
 *   - MEMBER#<id>/META              — the member entity
 *   - MEMBER_MOBILE#<phone>/META    — uniqueness sentinel
 *
 * Throws if the phone number is already registered as a member.
 */
export async function createMember(input: CreateMemberInput): Promise<Member> {
  const id = ulid();
  const timestamp = now();
  const phone = normalizePhone(input.phone);

  const memberItem = {
    PK: Keys.memberPK(id),
    SK: Keys.metaSK(),
    itemType: "Member",
    id,
    displayName: input.displayName,
    phone,
    email: input.email,
    image: input.image,
    activeLocationId: input.activeLocationId,
    memberSince: input.memberSince,
    programsDone: input.programsDone ?? [],
    interestedPrograms: input.interestedPrograms ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const mobileSentinel = {
    PK: Keys.memberMobilePK(phone),
    SK: Keys.metaSK(),
    itemType: "MemberMobileLookup",
    memberId: id,
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
              Item: mobileSentinel,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      })
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new Error(`Phone "${phone}" is already registered as a member.`);
    }
    throw error;
  }

  return toMember(memberItem);
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
  return result.Item ? toMember(result.Item as Record<string, unknown>) : null;
}

/**
 * Get member by phone (two-step: sentinel → member item).
 */
export async function getMemberByPhone(rawPhone: string): Promise<Member | null> {
  const phone = normalizePhone(rawPhone);
  const sentinel = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.memberMobilePK(phone), SK: Keys.metaSK() },
    })
  );
  if (!sentinel.Item) return null;
  return getMemberById(sentinel.Item.memberId as string);
}

/**
 * Update member fields.
 * If phone changes, atomically replaces old sentinel with new one.
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
        PK: Keys.memberMobilePK(newPhone),
        SK: Keys.metaSK(),
        itemType: "MemberMobileLookup",
        memberId: id,
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
                Key: { PK: Keys.memberMobilePK(existing.phone), SK: Keys.metaSK() },
              },
            },
          ],
        })
      );

      return toMember(newItem as Record<string, unknown>);
    }
  }

  const updateParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  const fields = [
    "displayName", "phone", "email", "image", "activeLocationId",
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

  return toMember(result.Attributes as Record<string, unknown>);
}

/**
 * Delete a member and their mobile sentinel atomically.
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
            Key: { PK: Keys.memberMobilePK(existing.phone), SK: Keys.metaSK() },
          },
        },
      ],
    })
  );
}
