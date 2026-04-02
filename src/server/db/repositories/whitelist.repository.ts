/**
 * Whitelist Repository
 *
 * Manages WHITELIST#<email> / META items used to pre-authorize emails
 * before their first OAuth sign-in.
 *
 * Item shape:
 *   PK = "WHITELIST#<email>"  SK = "META"
 *   { email, canBootstrap: boolean, createdAt }
 */

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import type { WhitelistEntry } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Get the whitelist entry for an email, or null if not whitelisted.
 */
export async function getWhitelistEntry(
  email: string
): Promise<WhitelistEntry | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.whitelistPK(email),
        SK: Keys.metaSK(),
      },
    })
  );
  if (!result.Item) return null;
  const { PK, SK, itemType, ...rest } = result.Item;
  return rest as WhitelistEntry;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Add an email to the whitelist.
 * Idempotent — re-adding an existing email does nothing (condition check).
 * Set canBootstrap=true for the first system administrator.
 */
export async function addToWhitelist(
  email: string,
  canBootstrap = false
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: Keys.whitelistPK(email),
        SK: Keys.metaSK(),
        itemType: "Whitelist",
        email: email.toLowerCase(),
        canBootstrap,
        createdAt: now(),
      },
      // Do not overwrite an existing entry (idempotent add)
      ConditionExpression: "attribute_not_exists(PK)",
    })
  ).catch((err) => {
    if (err?.name === "ConditionalCheckFailedException") return; // already exists
    throw err;
  });
}

/**
 * Consume the canBootstrap flag after the first location is created.
 * Sets canBootstrap = false so the privilege cannot be used again.
 */
export async function consumeBootstrapFlag(email: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: Keys.whitelistPK(email),
        SK: Keys.metaSK(),
      },
      UpdateExpression: "SET canBootstrap = :f",
      ExpressionAttributeValues: { ":f": false },
    })
  );
}
