import { z } from "zod";

/**
 * Client-side environment variables (VITE_ prefix — exposed to the browser).
 *
 * Add new variables here as the app grows.
 * Validation runs once at module load; a missing required variable throws
 * immediately with a clear message instead of a cryptic runtime crash.
 */
const ClientEnvSchema = z.object({
  /** Google Maps / Places API key */
  VITE_GOOGLE_MAPS_API_KEY: z.string().min(1, "VITE_GOOGLE_MAPS_API_KEY is required"),
});

/**
 * Server-side / build-time environment variables (no VITE_ prefix — never sent to the browser).
 * Extend this as you add DB credentials, secrets, etc.
 *
 * Example:
 *   DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
 *   SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
 */
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function parseClientEnv() {
  const result = ClientEnvSchema.safeParse({
    VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  if (!result.success) {
    const messages = result.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`\n[env] Missing or invalid environment variables:\n${messages}\n`);
  }

  return result.data;
}

function parseServerEnv() {
  const result = ServerEnvSchema.safeParse({
    NODE_ENV: import.meta.env.MODE ?? process.env.NODE_ENV,
  });

  if (!result.success) {
    const messages = result.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`\n[env] Invalid server environment variables:\n${messages}\n`);
  }

  return result.data;
}

/** Validated, typed client env — use this instead of raw import.meta.env */
export const clientEnv = parseClientEnv();

/** Validated, typed server env — use this instead of raw process.env */
export const serverEnv = parseServerEnv();
