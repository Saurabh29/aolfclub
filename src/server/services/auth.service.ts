/**
 * Auth Service — user lookup and creation on OAuth sign-in.
 *
 * In-memory implementation for the dummy-data phase.
 * When DynamoDB is wired, replace the Maps with repository calls
 * (same pattern as aolf-club's auth.service.ts + db/repositories).
 *
 * Searches pre-seeded dummy users first, then falls back to the
 * in-memory OAuth user store so tests / seed data works out-of-the-box.
 */
import { ulid } from "ulid";
import type { User } from "~/lib/schemas/domain";
import { usersDataSource } from "~/server/data-sources/instances";

// In-memory stores — keyed by normalised email / userId
const _emailIndex = new Map<string, string>(); // email → userId
const _oauthUsers = new Map<string, User>(); // userId → User

export interface OAuthUserResult {
  user: User;
  isNewUser: boolean;
}

/**
 * Find a user by email.
 * Checks OAuth users first, then the pre-seeded DummyDataSource.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalised = email.toLowerCase().trim();

  // 1. OAuth user created during this process lifetime
  const userId = _emailIndex.get(normalised);
  if (userId) return _oauthUsers.get(userId) ?? null;

  // 2. Pre-seeded dummy data
  const result = await usersDataSource.query({
    filters: [{ field: "email" as any, op: "eq", value: normalised }],
    sorting: [],
    pagination: { pageSize: 1, pageIndex: 0 },
  });
  if (result.success && result.data.items.length > 0) {
    return result.data.items[0];
  }

  return null;
}

/**
 * Create or retrieve a user on OAuth sign-in.
 * Idempotent — calling multiple times with the same email returns the same user.
 */
export async function createOrGetOAuthUser(
  email: string,
  name: string | null,
  imageUrl: string | null,
  provider?: string,
): Promise<OAuthUserResult> {
  const normalised = email.toLowerCase().trim();

  const existing = await findUserByEmail(normalised);
  if (existing) return { user: existing, isNewUser: false };

  const now = new Date().toISOString();
  const newUser: User = {
    id: ulid(),
    email: normalised,
    displayName: name || normalised.split("@")[0],
    image: imageUrl ?? undefined,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
  };

  _oauthUsers.set(newUser.id, newUser);
  _emailIndex.set(normalised, newUser.id);

  return { user: newUser, isNewUser: true };
}
