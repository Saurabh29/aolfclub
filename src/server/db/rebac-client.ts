/**
 * DynamoDB Client Configuration (ReBAC Design)
 *
 * Shared client and key helpers for single-table design
 */

import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TranslateConfig } from "@aws-sdk/lib-dynamodb";

/**
 * Table Configuration
 */
export const TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || "aolfclub-entities";
export const AWS_REGION = process.env.AWS_REGION || "us-east-1";

/**
 * Key Helper Functions
 */
export const Keys = {
  // User keys
  userPK: (userId: string) => `USER#${userId}`,
  userSK: () => "META" as const,

  // Location keys
  locationPK: (locationId: string) => `LOCATION#${locationId}`,
  locationSK: () => "META" as const,

  // Role keys
  rolePK: (roleName: string) => `ROLE#${roleName}`,
  roleSK: () => "META" as const,

  // Page keys
  pagePK: (pageName: string) => `PAGE#${pageName}`,
  pageSK: () => "META" as const,

  // User-Location-Role keys
  userLocationRolePK: (locationId: string) => `LOCATION#${locationId}`,
  userLocationRoleSK: (userId: string) => `USER#${userId}`,

  // Role-Page-Access keys
  rolePageAccessPK: (roleName: string) => `ROLE#${roleName}`,
  rolePageAccessSK: (pageName: string) => `PAGE#${pageName}`,

  // Email Identity keys
  emailIdentityPK: (email: string) => `EMAIL#${email}`,
  emailIdentitySK: (userId: string) => `USER#${userId}`,
};

/**
 * Create DynamoDB Client
 */
function createDynamoDBClient(): DynamoDBClient {
  const config: DynamoDBClientConfig = {
    region: AWS_REGION,
    maxAttempts: 3,
  };

  // Local development
  const isLocalDev =
    process.env.NODE_ENV === "development" || !process.env.AWS_ACCESS_KEY_ID;

  if (isLocalDev) {
    const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
    config.endpoint = endpoint;
    config.credentials = {
      accessKeyId: "local",
      secretAccessKey: "local",
    };
  } else {
    // Production AWS credentials are automatically loaded from environment
  }

  return new DynamoDBClient(config);
}

/**
 * Marshalling Options
 */
const marshallOptions: TranslateConfig["marshallOptions"] = {
  removeUndefinedValues: true,
  convertEmptyValues: false,
};

const unmarshallOptions: TranslateConfig["unmarshallOptions"] = {
  wrapNumbers: false,
};

/**
 * Document Client (with marshalling)
 */
export const docClient = DynamoDBDocumentClient.from(createDynamoDBClient(), {
  marshallOptions,
  unmarshallOptions,
});

/**
 * Current timestamp helper
 */
export const now = () => new Date().toISOString();
