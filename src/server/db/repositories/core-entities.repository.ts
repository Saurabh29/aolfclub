/**
 * ENTITY-SPECIFIC REPOSITORIES
 * 
 * Repositories for core entity types
 * Server-side only - NO UI concerns
 * 
 * Entities: Teacher, Volunteer, Member, Lead, Location
 */

import { BaseRepository } from "./base.repository";
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
 * 
 * Handles teacher entity operations
 */
export class TeacherRepository extends BaseRepository<typeof TeacherSchema> {
  constructor() {
    super(TeacherSchema, "Teacher");
  }

  /**
   * Find teachers by subject
   * 
   * @param subject - Subject to filter by
   * @param options - Pagination options
   * @returns List of teachers
   */
  async findBySubject(
    subject: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Teacher[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((teacher) =>
      teacher.subject?.toLowerCase().includes(subject.toLowerCase())
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find teachers by qualification
   * 
   * @param qualification - Qualification to filter by
   * @param options - Pagination options
   * @returns List of teachers
   */
  async findByQualification(
    qualification: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Teacher[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((teacher) =>
      teacher.qualification?.toLowerCase().includes(qualification.toLowerCase())
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find active teachers
   * 
   * @param options - Pagination options
   * @returns List of active teachers
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Teacher[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((teacher) => teacher.status === "active");

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }
}

/**
 * Volunteer Repository
 * 
 * Handles volunteer entity operations
 */
export class VolunteerRepository extends BaseRepository<typeof VolunteerSchema> {
  constructor() {
    super(VolunteerSchema, "Volunteer");
  }

  /**
   * Find volunteers by skills
   * 
   * @param skill - Skill to filter by
   * @param options - Pagination options
   * @returns List of volunteers
   */
  async findBySkill(
    skill: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Volunteer[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((volunteer) =>
      volunteer.skills?.some((s) =>
        s.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find active volunteers
   * 
   * @param options - Pagination options
   * @returns List of active volunteers
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Volunteer[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((volunteer) => volunteer.status === "active");

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Update volunteer hours
   * 
   * @param volunteerId - Volunteer ID
   * @param additionalHours - Hours to add
   * @returns Updated volunteer
   */
  async addHours(volunteerId: string, additionalHours: number): Promise<Volunteer> {
    const volunteer = await this.getByIdOrThrow(volunteerId);
    const currentHours = volunteer.hoursContributed || 0;

    return await this.update(volunteerId, {
      hoursContributed: currentHours + additionalHours,
    });
  }
}

/**
 * Member Repository
 * 
 * Handles member entity operations
 */
export class MemberRepository extends BaseRepository<typeof MemberSchema> {
  constructor() {
    super(MemberSchema, "Member");
  }

  /**
   * Find members by membership type
   * 
   * @param membershipType - Membership type
   * @param options - Pagination options
   * @returns List of members
   */
  async findByMembershipType(
    membershipType: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Member[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (member) =>
        member.membershipType?.toLowerCase() === membershipType.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find active members
   * 
   * @param options - Pagination options
   * @returns List of active members
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Member[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (member) =>
        member.status === "active" && member.membershipStatus === "active"
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Update membership status
   * 
   * @param memberId - Member ID
   * @param status - New membership status
   * @returns Updated member
   */
  async updateMembershipStatus(
    memberId: string,
    status: "active" | "expired" | "suspended"
  ): Promise<Member> {
    return await this.update(memberId, {
      membershipStatus: status,
    });
  }
}

/**
 * Lead Repository
 * 
 * Handles lead entity operations
 */
export class LeadRepository extends BaseRepository<typeof LeadSchema> {
  constructor() {
    super(LeadSchema, "Lead");
  }

  /**
   * Find leads by source
   * 
   * @param source - Lead source
   * @param options - Pagination options
   * @returns List of leads
   */
  async findBySource(
    source: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Lead[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (lead) => lead.source?.toLowerCase() === source.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find leads by status
   * 
   * @param status - Lead status
   * @param options - Pagination options
   * @returns List of leads
   */
  async findByLeadStatus(
    status: "new" | "contacted" | "qualified" | "converted",
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Lead[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter((lead) => lead.status === status);

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Mark lead as contacted
   * 
   * @param leadId - Lead ID
   * @returns Updated lead
   */
  async markAsContacted(leadId: string): Promise<Lead> {
    return await this.update(leadId, {
      status: "contacted",
      contactedAt: this.now(),
    });
  }

  /**
   * Convert lead (mark as converted)
   * 
   * @param leadId - Lead ID
   * @returns Updated lead
   */
  async convertLead(leadId: string): Promise<Lead> {
    return await this.update(leadId, {
      status: "converted",
    });
  }
}

/**
 * Location Repository
 * 
 * Handles location entity operations
 */
export class LocationRepository extends BaseRepository<typeof LocationSchema> {
  constructor() {
    super(LocationSchema, "Location");
  }

  /**
   * Find locations by city
   * 
   * @param city - City name
   * @param options - Pagination options
   * @returns List of locations
   */
  async findByCity(
    city: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (location) => location.city?.toLowerCase() === city.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find locations by state
   * 
   * @param state - State name
   * @param options - Pagination options
   * @returns List of locations
   */
  async findByState(
    state: string,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (location) => location.state?.toLowerCase() === state.toLowerCase()
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find active locations
   * 
   * @param options - Pagination options
   * @returns List of active locations
   */
  async findActive(options?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, unknown>;
  }): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    // Location schema doesn't have status field, return all
    const items = result.items;

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }

  /**
   * Find locations with capacity
   * 
   * @param minCapacity - Minimum capacity
   * @param options - Pagination options
   * @returns List of locations
   */
  async findByMinCapacity(
    minCapacity: number,
    options?: { limit?: number; lastEvaluatedKey?: Record<string, unknown> }
  ): Promise<{
    items: Location[];
    lastEvaluatedKey?: Record<string, unknown>;
  }> {
    const result = await this.list(options);

    const items = result.items.filter(
      (location) => (location.capacity || 0) >= minCapacity
    );

    return {
      items,
      lastEvaluatedKey: result.lastEvaluatedKey,
    };
  }
}

// Singleton instances
export const teacherRepository = new TeacherRepository();
export const volunteerRepository = new VolunteerRepository();
export const memberRepository = new MemberRepository();
export const leadRepository = new LeadRepository();
export const locationRepository = new LocationRepository();
