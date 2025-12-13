/**
 * CORE ENTITY REPOSITORIES
 * 
 * Basic CRUD repositories for core entities
 * Server-side only
 */

import { BaseRepository } from "../base.repository";
import {
  TeacherSchema,
  VolunteerSchema,
  MemberSchema,
  LeadSchema,
  LocationSchema,
  type Teacher,
  type Volunteer,
  type Member,
  type Lead,
  type Location,
} from "~/lib/schemas/db/core-entities.schema";

/**
 * Teacher Repository
 */
export class TeacherRepository extends BaseRepository<typeof TeacherSchema> {
  constructor() {
    super(TeacherSchema, "Teacher");
  }
}

/**
 * Volunteer Repository
 */
export class VolunteerRepository extends BaseRepository<typeof VolunteerSchema> {
  constructor() {
    super(VolunteerSchema, "Volunteer");
  }
}

/**
 * Member Repository
 */
export class MemberRepository extends BaseRepository<typeof MemberSchema> {
  constructor() {
    super(MemberSchema, "Member");
  }
}

/**
 * Lead Repository
 */
export class LeadRepository extends BaseRepository<typeof LeadSchema> {
  constructor() {
    super(LeadSchema, "Lead");
  }
}

/**
 * Location Repository
 */
export class LocationRepository extends BaseRepository<typeof LocationSchema> {
  constructor() {
    super(LocationSchema, "Location");
  }
}

// Singleton instances
export const teacherRepository = new TeacherRepository();
export const volunteerRepository = new VolunteerRepository();
export const memberRepository = new MemberRepository();
export const leadRepository = new LeadRepository();
export const locationRepository = new LocationRepository();
