import { z } from "zod";

/**
 * Server-side environment variables.
 * Validated at startup — app crashes immediately if any required var is missing.
 * Matches the pattern from the reference aolf-club project.
 */
export const EnvSchema = z.object({
  DYNAMODB_TABLE_NAME: z.string().min(1),
  AWS_REGION: z.string().min(1),
  DYNAMODB_ENDPOINT: z.string().url().optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL"),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  const raw = {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
    AWS_REGION: process.env.AWS_REGION,
    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  };

  const result = EnvSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[env] Invalid server configuration:\n${issues}`);
  }

  return result.data;
}

export const env = validateEnv();
