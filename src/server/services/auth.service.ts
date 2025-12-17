/**
 * USER AUTHENTICATION SERVICE (ReBAC Design)
 *
 * Simplified OAuth workflow for ReBAC single-table design
 * Users are created globally, roles assigned per location later
 */

import {
  createUser,
  getUserById,
  getUserIdByEmail,
  createEmailIdentity,
  type CreateUserInput,
} from "~/server/db/repositories";
import type { User } from "~/lib/schemas/db/user.schema";

/**
 * Result of OAuth user creation
 */
export interface OAuthUserCreationResult {
  user: User;
  isNewUser: boolean;
}

/**
 * Create or retrieve user from OAuth login
 *
 * Simplified workflow:
 * 1. Check if user exists by email (in User entity)
 * 2. If exists, return existing user
 * 3. If new, create User with email
 *
 * @param emailAddress - User's email from OAuth provider
 * @param name - User's name from OAuth provider
 * @param imageUrl - User's profile image from OAuth provider
 * @returns User creation result with isNewUser flag
 */
export async function createOrGetOAuthUser(
  emailAddress: string,
  name: string | null,
  imageUrl: string | null,
  provider?: string,
): Promise<OAuthUserCreationResult> {
  const normalizedEmail = emailAddress.toLowerCase().trim();

  // Check if email already exists via EmailIdentity
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    return {
      user: existingUser,
      isNewUser: false,
    };
  }

  // Create new User entity - TypeScript will error if types don't match
  const userInput: CreateUserInput = {
    name: name || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    imageUrl: imageUrl || undefined,
    status: "active",
  };

  const user = await createUser(userInput);

  // Create EmailIdentity mapping for future lookups
  await createEmailIdentity(normalizedEmail, user.userId, provider);

  return {
    user,
    isNewUser: true,
  };
}

/**
 * Find user by email address
 * Uses EmailIdentity mapping for O(1) lookup
 *
 * @param emailAddress - Email to look up
 * @returns User entity or null if not found
 */
export async function findUserByEmail(
  emailAddress: string,
): Promise<User | null> {
  const normalizedEmail = emailAddress.toLowerCase().trim();

  // Look up userId via EmailIdentity
  const userId = await getUserIdByEmail(normalizedEmail);

  if (!userId) {
    return null;
  }

  // Fetch user by userId
  const user = await getUserById(userId);
  return user || null;
}
