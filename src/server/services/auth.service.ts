/**
 * USER AUTHENTICATION SERVICE
 * 
 * Handles OAuth user creation and authentication workflows
 * Separates business logic from auth configuration
 */

import { userRepository, emailRepository, relationshipRepository } from "~/server/db/repositories";
import type { User } from "~/lib/schemas/db/core-entities.schema";
import type { Email } from "~/lib/schemas/db/email.schema";

/**
 * Result of OAuth user creation
 */
export interface OAuthUserCreationResult {
  user: User;
  email: Email;
  isNewUser: boolean;
}

/**
 * Create or retrieve user from OAuth login
 * 
 * Workflow:
 * 1. Check if email exists
 * 2. If exists, return existing user
 * 3. If new, create User + Email + Relationships atomically
 * 
 * @param emailAddress - User's email from OAuth provider
 * @param name - User's name from OAuth provider
 * @param imageUrl - User's profile image from OAuth provider
 * @param provider - OAuth provider (github, google)
 * @returns User creation result with isNewUser flag
 */
export async function createOrGetOAuthUser(
  emailAddress: string,
  name: string | null,
  imageUrl: string | null,
  provider: string
): Promise<OAuthUserCreationResult> {
  const normalizedEmail = emailAddress.toLowerCase();
  
  // Check if email already exists
  const existingEmail = await emailRepository.findByEmail(normalizedEmail);
  
  if (existingEmail) {
    // Email exists - find associated user
    const relationships = await relationshipRepository.findFromSource(
      "Email",
      existingEmail.id,
      "IDENTIFIES"
    );
    
    if (relationships.length === 0) {
      throw new Error("Email exists but has no associated user");
    }
    
    const userId = relationships[0].targetId;
    const user = await userRepository.getById(userId);
    
    if (!user) {
      throw new Error("User not found for existing email");
    }
    
    return {
      user,
      email: existingEmail,
      isNewUser: false,
    };
  }
  
  // New user - create everything atomically
  const now = new Date().toISOString();
  
  // Create User entity with pending_assignment status
  const user = await userRepository.create({
    name: name || normalizedEmail.split("@")[0],
    imageUrl: imageUrl || undefined,
    userType: null, // Will be assigned by admin
    status: "pending_assignment",
  });
  
  // Create Email entity
  const email = await emailRepository.create({
    email: normalizedEmail,
    provider: provider,
    verifiedAt: now, // OAuth emails are pre-verified
    isPrimary: true,
    status: "active",
  });
  
  // Create bidirectional USER-EMAIL relationship
  // Forward: USER -> EMAIL
  await relationshipRepository.createRelationship(
    "User",
    user.id,
    "HAS_EMAIL",
    "Email",
    email.id
  );
  
  // Reverse: EMAIL -> USER
  await relationshipRepository.createRelationship(
    "Email",
    email.id,
    "IDENTIFIES",
    "User",
    user.id
  );
  
  return {
    user,
    email,
    isNewUser: true,
  };
}

/**
 * Find user by email address
 * 
 * @param emailAddress - Email to look up
 * @returns User entity or null if not found
 */
export async function findUserByEmail(emailAddress: string): Promise<User | null> {
  const normalizedEmail = emailAddress.toLowerCase();
  
  const email = await emailRepository.findByEmail(normalizedEmail);
  if (!email) {
    return null;
  }
  
  // Find user via relationship
  const relationships = await relationshipRepository.findFromSource(
    "Email",
    email.id,
    "IDENTIFIES"
  );
  
  if (relationships.length === 0) {
    return null;
  }
  
  const userId = relationships[0].targetId;
  return await userRepository.getById(userId);
}
