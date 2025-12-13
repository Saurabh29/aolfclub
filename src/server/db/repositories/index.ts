/**
 * REPOSITORY INDEX
 * 
 * Barrel exports for all repositories
 * Provides convenient access to repository instances
 */

// ========== BASE REPOSITORY ==========
export { BaseRepository } from "./base.repository";

// ========== EMAIL REPOSITORY ==========
export { EmailRepository } from "./email.repository";
import { emailRepository } from "./email.repository";

// ========== RELATIONSHIP REPOSITORY ==========
export { RelationshipRepository } from "./relationship.repository";
import { relationshipRepository } from "./relationship.repository";

// ========== CORE ENTITY REPOSITORIES ==========
export {
  TeacherRepository,
  VolunteerRepository,
  MemberRepository,
  LeadRepository,
  LocationRepository,
} from "./core-entities.repository";
import {
  teacherRepository,
  volunteerRepository,
  memberRepository,
  leadRepository,
  locationRepository,
} from "./core-entities.repository";

// ========== ACCESS POLICY REPOSITORIES ==========
export {
  RoleRepository,
  PermissionRepository,
  UserGroupRepository,
} from "./access-policy.repository";
import {
  roleRepository,
  permissionRepository,
  userGroupRepository,
} from "./access-policy.repository";

// ========== REPOSITORY COLLECTION ==========
/**
 * Collection of all repository instances
 * Convenient for dependency injection or testing
 */
export const repositories = {
  // Core Entities
  teacher: teacherRepository,
  volunteer: volunteerRepository,
  member: memberRepository,
  lead: leadRepository,
  location: locationRepository,
  
  // Email & Relationships
  email: emailRepository,
  relationship: relationshipRepository,
  
  // Access Policy
  role: roleRepository,
  permission: permissionRepository,
  userGroup: userGroupRepository,
} as const;

/**
 * Type-safe repository accessor
 */
export type RepositoryType = keyof typeof repositories;

/**
 * Get repository by name
 * 
 * @param name - Repository name
 * @returns Repository instance
 */
export function getRepository<T extends RepositoryType>(
  name: T
): (typeof repositories)[T] {
  return repositories[name];
}

// ========== RE-EXPORT CLIENT UTILITIES ==========
export {
  docClient,
  dynamoDBClient,
  TABLE_CONFIG,
  KeyUtils,
  DatabaseError,
  EntityNotFoundError,
  ValidationError,
  DuplicateEntityError,
  handleDynamoDBError,
} from "../client";
