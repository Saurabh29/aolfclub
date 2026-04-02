/**
 * Auth Service — user lookup and creation on OAuth sign-in.
 *
 * Flow:
 *   1. Check WHITELIST#<email> — deny if absent.
 *   2. If User already exists (email lookup via DataSource) → return existing user.
 *   3. Otherwise create User via DataSource.
 *   4. Surface canBootstrap from the whitelist entry in the returned result.
 */
import type { User } from "~/lib/schemas/domain";
import { usersDataSource } from "~/server/data-sources/instances";
import { getWhitelistEntry } from "~/server/db/repositories/whitelist.repository";

export interface OAuthUserResult {
  user: User;
  isNewUser: boolean;
  canBootstrap: boolean;
}

/**
 * Find a user by email via the DataSource lookup.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await usersDataSource.getByUniqueField!("email", email.toLowerCase().trim());
  return result.success ? result.data : null;
}

/**
 * Gate OAuth sign-in against the whitelist, then create or return the User.
 * Throws if the email is not whitelisted (caller maps this to signIn → false).
 */
export async function createOrGetOAuthUser(
  email: string,
  name: string | null,
  imageUrl: string | null,
  _provider?: string,
): Promise<OAuthUserResult> {
  const normalised = email.toLowerCase().trim();

  // 1. Whitelist check
  const whitelist = await getWhitelistEntry(normalised);
  if (!whitelist) {
    throw new Error(`Email "${normalised}" is not whitelisted.`);
  }

  // 2. Existing User?
  const existing = await findUserByEmail(normalised);
  if (existing) {
    return { user: existing, isNewUser: false, canBootstrap: whitelist.canBootstrap };
  }

  // 3. Create new User via DataSource
  const createResult = await usersDataSource.create!({
    email: normalised,
    displayName: name || normalised.split("@")[0],
    image: imageUrl ?? undefined,
  });

  if (!createResult.success) {
    throw new Error(createResult.error);
  }

  return { user: createResult.data, isNewUser: true, canBootstrap: whitelist.canBootstrap };
}

