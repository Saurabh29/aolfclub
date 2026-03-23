/**
 * Lead Repository
 *
 * Data access layer for Lead entities.
 * Uniqueness enforced by phone (E.164) via a LEAD_MOBILE# sentinel.
 * Leads do not log in — no email sentinel.
 *
 * Item shapes:
 *   LEAD#<id>                / META  — Lead entity
 *   LEAD_MOBILE#<phone>      / META  — Mobile uniqueness sentinel
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
import type { Lead } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  displayName: string;
  phone: string;
  email?: string;
  image?: string;
  activeLocationId?: string;
  interestedPrograms?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLead(item: Record<string, unknown>): Lead {
  const { PK, SK, itemType, ...rest } = item;
  return rest as unknown as Lead;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new lead.
 *
 * Atomically writes:
 *   - LEAD#<id>/META             — the lead entity
 *   - LEAD_MOBILE#<phone>/META   — uniqueness sentinel
 *
 * Throws if the phone number is already registered as a lead.
 */
export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const id = ulid();
  const timestamp = now();
  const phone = normalizePhone(input.phone);

  const leadItem = {
    PK: Keys.leadPK(id),
    SK: Keys.metaSK(),
    itemType: "Lead",
    id,
    displayName: input.displayName,
    phone,
    email: input.email,
    image: input.image,
    activeLocationId: input.activeLocationId,
    interestedPrograms: input.interestedPrograms ?? [],
    totalCallCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const mobileSentinel = {
    PK: Keys.leadMobilePK(phone),
    SK: Keys.metaSK(),
    itemType: "LeadMobileLookup",
    leadId: id,
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
              Item: mobileSentinel,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      })
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new Error(`Phone "${phone}" is already registered as a lead.`);
    }
    throw error;
  }

  return toLead(leadItem);
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
  return result.Item ? toLead(result.Item as Record<string, unknown>) : null;
}

/**
 * Get lead by phone (two-step: sentinel → lead item).
 */
export async function getLeadByPhone(rawPhone: string): Promise<Lead | null> {
  const phone = normalizePhone(rawPhone);
  const sentinel = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.leadMobilePK(phone), SK: Keys.metaSK() },
    })
  );
  if (!sentinel.Item) return null;
  return getLeadById(sentinel.Item.leadId as string);
}

/**
 * Update lead fields.
 * If phone changes, atomically replaces old sentinel with new one.
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
        PK: Keys.leadMobilePK(newPhone),
        SK: Keys.metaSK(),
        itemType: "LeadMobileLookup",
        leadId: id,
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
                Key: { PK: Keys.leadMobilePK(existing.phone), SK: Keys.metaSK() },
              },
            },
          ],
        })
      );

      return toLead(newItem as Record<string, unknown>);
    }
  }

  const updateParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  const fields = [
    "displayName", "phone", "email", "image", "activeLocationId",
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

  return toLead(result.Attributes as Record<string, unknown>);
}

/**
 * Delete a lead and their mobile sentinel atomically.
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
            Key: { PK: Keys.leadMobilePK(existing.phone), SK: Keys.metaSK() },
          },
        },
      ],
    })
  );
}
