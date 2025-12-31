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
} from "~/server/db/repositories";
import type { OAuthProvider, User } from "~/lib/schemas/db";
import { CreateUserInput } from "~/lib/schemas/input";

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
	provider?: OAuthProvider,
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

	// Create new User entity with fields expected by the user repository
	const userInput: CreateUserInput = {
		displayName: name || normalizedEmail.split("@")[0],
		userType: "MEMBER",
		isAdmin: false,
		email: normalizedEmail,
		image: imageUrl || undefined,
	};

	const user = await createUser(userInput);

	// Create EmailIdentity mapping for future lookups
	await createEmailIdentity({
		email: normalizedEmail,
		userId: user.userId,
		provider: provider,
	});

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
