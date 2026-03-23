/**
 * DynamoDB Client
 *
 * Single source of truth for the DynamoDB DocumentClient and key helpers.
 *
 * Environment Variables:
 *   DYNAMODB_TABLE_NAME  — table name (e.g. "aolfclub-entities")
 *   AWS_REGION           — AWS region (e.g. "us-east-1")
 *   DYNAMODB_ENDPOINT    — set for DynamoDB Local (e.g. "http://localhost:8000")
 *
 * When DYNAMODB_ENDPOINT is set the client uses static local credentials.
 * Otherwise it falls back to the default AWS credential chain (IAM roles, env vars, etc.).
 *
 * PK / SK patterns (single-table design):
 *   Location item:          PK = "LOCATION#<id>",          SK = "META"
 *   Slug lookup:            PK = "SLUG#<slug>",             SK = "META"
 *   User item:              PK = "USER#<id>",              SK = "META"
 *   Email lookup:           PK = "EMAIL#<email>",          SK = "META"  (Users only)
 *   Member item:            PK = "MEMBER#<id>",            SK = "META"
 *   Member mobile lookup:   PK = "MEMBER_MOBILE#<phone>",  SK = "META"
 *   Lead item:              PK = "LEAD#<id>",              SK = "META"
 *   Lead mobile lookup:     PK = "LEAD_MOBILE#<phone>",    SK = "META"
 *   Group item:             PK = "GROUP#<id>",             SK = "META"
 *   Location→Group:         PK = "LOCATION#<id>",          SK = "GROUP#<groupId>"
 *   User→Group:             PK = "USER#<userId>",          SK = "GROUP#<groupId>"
 *   Group→User:             PK = "GROUP#<groupId>",        SK = "USER#<userId>"
 *   User→Location:          PK = "USER#<userId>",          SK = "LOCATION#<locationId>"
 *   Location→User:          PK = "LOCATION#<id>",          SK = "USER#<userId>"
 *   Role item:              PK = "ROLE#<roleName>",        SK = "META"
 *   Page item:              PK = "PAGE#<pageName>",        SK = "META"
 *   Group→Role:             PK = "GROUP#<groupId>",        SK = "ROLE#<roleName>"
 *   Role→Page:              PK = "ROLE#<roleName>",        SK = "PAGE#<pageName>"
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "~/server/config";

export const TABLE_NAME = env.DYNAMODB_TABLE_NAME;

function createDynamoDBClient(): DynamoDBClient {
  if (env.DYNAMODB_ENDPOINT) {
    console.log(`[DynamoDB] Using local endpoint: ${env.DYNAMODB_ENDPOINT}`);
    return new DynamoDBClient({
      region: env.AWS_REGION,
      endpoint: env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: "local",
        secretAccessKey: "local",
      },
    });
  }

  // Production: use default credential chain (IAM role, env vars, ~/.aws/credentials)
  return new DynamoDBClient({ region: env.AWS_REGION });
}

export const docClient = DynamoDBDocumentClient.from(createDynamoDBClient(), {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Key helpers — centralise PK/SK generation so all operations stay consistent.
 */
export const Keys = {
  // Entity PK helpers
  locationPK:      (id: string): string => `LOCATION#${id}`,
  slugPK:          (slug: string): string => `SLUG#${slug}`,
  userPK:          (id: string): string => `USER#${id}`,
  emailPK:         (email: string): string => `EMAIL#${email.toLowerCase()}`,
  memberPK:        (id: string): string => `MEMBER#${id}`,
  memberMobilePK:  (phone: string): string => `MEMBER_MOBILE#${phone}`,
  leadPK:          (id: string): string => `LEAD#${id}`,
  leadMobilePK:    (phone: string): string => `LEAD_MOBILE#${phone}`,
  groupPK:         (id: string): string => `GROUP#${id}`,
  rolePK:          (name: string): string => `ROLE#${name}`,
  pagePK:          (name: string): string => `PAGE#${name}`,

  // SK helpers (for edge items and begins_with queries)
  metaSK:       (): "META" => "META" as const,
  locationSK:   (id: string): string => `LOCATION#${id}`,
  userSK:       (id: string): string => `USER#${id}`,
  groupSK:      (id: string): string => `GROUP#${id}`,
  roleSK:       (name: string): string => `ROLE#${name}`,
  pageSK:       (name: string): string => `PAGE#${name}`,

  // Prefix constants for begins_with KeyConditionExpressions
  LOCATION_PREFIX: "LOCATION#",
  USER_PREFIX:     "USER#",
  MEMBER_PREFIX:   "MEMBER#",
  LEAD_PREFIX:     "LEAD#",
  GROUP_PREFIX:    "GROUP#",
  ROLE_PREFIX:     "ROLE#",
  PAGE_PREFIX:     "PAGE#",
};

/**
 * Normalize a phone number to E.164 format (+<country_code><digits>).
 *
 * Strips all non-digit characters then prepends "+" if not present.
 * The caller is responsible for providing a valid number with country code
 * (e.g. "919876543210", "+919876543210", "+1 (555) 000-0000").
 *
 * For 10-digit inputs WITHOUT a country code prefix the caller should
 * explicitly pass the country code (e.g. normalizePhone("91" + localNumber)).
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `+${digits}`;
}

/** Current ISO-8601 timestamp — used for createdAt / updatedAt. */
export const now = (): string => new Date().toISOString();
