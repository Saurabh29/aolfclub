/**
 * REPOSITORY INDEX
 * 
 * Exports for all repositories
 */

// Base Repository
export { BaseRepository } from "./base.repository";

// Core Entity Repositories
export {
  TeacherRepository,
  VolunteerRepository,
  MemberRepository,
  LeadRepository,
  LocationRepository,
  teacherRepository,
  volunteerRepository,
  memberRepository,
  leadRepository,
  locationRepository,
} from "./core-entities.repository";

// Relationship Repository
export {
  RelationshipRepository,
  relationshipRepository,
} from "./relationship.repository";

// Re-export client utilities
export {
  docClient,
  TABLE_CONFIG,
  KeyUtils,
  EntityNotFoundError,
  ValidationError,
  DatabaseError,
} from "../client";
