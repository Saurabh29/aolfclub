/**
 * Auth Service  -  user lookup and creation on OAuth sign-in.
 *
 * Flow (Option A — DB-first):
 *   1. If User already exists (email lookup via DataSource) → allow.
 *      They were pre-added by an admin via team import or the UI.
 *   2. If not in DB, check WHITELIST#<email> (bootstrap path only).
 *      If whitelisted → create User, surface canBootstrap.
 *   3. Otherwise → deny with AuthDeniedError (caller redirects to landing).
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
 * Thrown when an OAuth email is neither a known User nor on the whitelist.
 * Caught by the signIn callback to redirect rather than trigger AccessDenied.
 */
export class AuthDeniedError extends Error {
  constructor(email: string) {
    super(`Email "${email}" is not authorised to access this system.`);
    this.name = "AuthDeniedError";
  }
}

/**
 * Find a user by email via the DataSource lookup.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await usersDataSource.getByUniqueField!("email", email.toLowerCase().trim());
  return result.success ? result.data : null;
}

/**
 * DB-first OAuth sign-in gate.
 * Allows existing users (pre-added by admin) without any whitelist entry.
 * Falls back to the whitelist bootstrap path for brand-new installations.
 * Throws AuthDeniedError when neither condition is met.
 */
export async function createOrGetOAuthUser(
  email: string,
  name: string | null,
  imageUrl: string | null,
  _provider?: string,
): Promise<OAuthUserResult> {
  const normalised = email.toLowerCase().trim();

  // 1. Existing User? → allow immediately (pre-added via team import / UI)
  const existing = await findUserByEmail(normalised);
  if (existing) {
    return { user: existing, isNewUser: false, canBootstrap: false };
  }

  // 2. Not in DB — check whitelist (bootstrap path for first-time system setup)
  const whitelist = await getWhitelistEntry(normalised);
  if (!whitelist) {
    throw new AuthDeniedError(normalised);
  }

  // 3. Create new User via DataSource (bootstrap admin path)
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

