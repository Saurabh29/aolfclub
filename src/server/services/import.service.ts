/**
 * Import Service
 *
 * Bulk-imports Leads, Members, or Team (User) records from parsed CSV rows.
 *
 * Rules:
 *   - All records are stamped with the caller's locationId (resolved from session).
 *   - Duplicates are skipped (not overwritten) and returned in the error list.
 *   - Leads   > unique by phone per location (LEAD_MOBILE#<locId>#<phone> sentinel)
 *   - Members > unique by phone per location (MEMBER_MOBILE#<locId>#<phone> sentinel)
 *   - Team    > unique by email (EMAIL# sentinel); creates full User + EMAIL# sentinel
 */

import { normalizePhone } from "~/server/db/client";
import {
  leadsDataSource,
  membersDataSource,
  usersDataSource,
} from "~/server/data-sources/instances";
import { getLeadsByLocation } from "~/server/db/repositories/lead.repository";
import { getMembersByLocation } from "~/server/db/repositories/member.repository";
import type { CreateLeadInput } from "~/server/db/repositories/lead.repository";
import type { CreateMemberInput } from "~/server/db/repositories/member.repository";
import type { CreateUserInput } from "~/server/db/repositories/user.repository";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ImportRow {
  /** 1-based row number from the CSV (for error reporting) */
  row: number;
  [key: string]: unknown;
}

export interface ImportSkip {
  row: number;
  /** The unique value that caused the collision (phone or email) */
  value: string;
  reason: string;
}

export interface ImportResult {
  imported: number;
  skipped: ImportSkip[];
}

// ---------------------------------------------------------------------------
// Leads import
// ---------------------------------------------------------------------------

export interface LeadImportRow extends ImportRow {
  displayName: string;
  phone: string;
  email?: string;
  interestedPrograms?: string;
}

/**
 * Import a batch of Lead rows.
 * Pre-fetches existing leads for this location to check for duplicates.
 * Phone uniqueness is per-location (Option B).
 */
export async function importLeads(
  rows: LeadImportRow[],
  locationId: string
): Promise<ImportResult> {
  let imported = 0;
  const skipped: ImportSkip[] = [];

  // Pre-fetch phones for this location only (location-scoped query, no full scan)
  const existingPhones = new Set<string>();
  const existingLeads = await getLeadsByLocation(locationId);
  for (const lead of existingLeads) existingPhones.add(lead.phone);

  for (const row of rows) {
    const phone = normalizePhone(row.phone);

    if (existingPhones.has(phone)) {
      skipped.push({ row: row.row, value: phone, reason: "Phone already exists as a Lead in this location" });
      continue;
    }
    // Prevent intra-batch duplicates
    existingPhones.add(phone);

    const input: CreateLeadInput = {
      locationId,
      displayName: row.displayName,
      phone,
      email: row.email,
      interestedPrograms: row.interestedPrograms
        ? row.interestedPrograms.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    const createResult = await leadsDataSource.create!(input);
    if (!createResult.success) {
      skipped.push({ row: row.row, value: phone, reason: createResult.error });
      continue;
    }
    imported++;
  }

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Members import
// ---------------------------------------------------------------------------

export interface MemberImportRow extends ImportRow {
  displayName: string;
  phone: string;
  email?: string;
  memberSince?: string;
  programsDone?: string;
  interestedPrograms?: string;
}

/**
 * Import a batch of Member rows.
 * Pre-fetches existing members for this location to check for duplicates.
 * Phone uniqueness is per-location (Option B).
 */
export async function importMembers(
  rows: MemberImportRow[],
  locationId: string
): Promise<ImportResult> {
  let imported = 0;
  const skipped: ImportSkip[] = [];

  // Pre-fetch phones for this location only (location-scoped query, no full scan)
  const existingPhones = new Set<string>();
  const existingMembers = await getMembersByLocation(locationId);
  for (const member of existingMembers) existingPhones.add(member.phone);

  for (const row of rows) {
    const phone = normalizePhone(row.phone);

    if (existingPhones.has(phone)) {
      skipped.push({ row: row.row, value: phone, reason: "Phone already exists as a Member in this location" });
      continue;
    }
    existingPhones.add(phone);

    const input: CreateMemberInput = {
      locationId,
      displayName: row.displayName,
      phone,
      email: row.email,
      memberSince: row.memberSince,
      programsDone: row.programsDone
        ? row.programsDone.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      interestedPrograms: row.interestedPrograms
        ? row.interestedPrograms.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    const createResult = await membersDataSource.create!(input);
    if (!createResult.success) {
      skipped.push({ row: row.row, value: phone, reason: createResult.error });
      continue;
    }
    imported++;
  }

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Team (User) import
// ---------------------------------------------------------------------------

export interface TeamImportRow extends ImportRow {
  displayName: string;
  email: string;
  phone?: string;
}

/**
 * Import a batch of Team (User) rows.
 * Pre-scans existing users once (via ScanCache) to avoid N+1 duplicate checks.
 */
export async function importTeam(
  rows: TeamImportRow[],
  activeLocationId: string
): Promise<ImportResult> {  let imported = 0;
  const skipped: ImportSkip[] = [];

  // Pre-fetch all existing users in one scan (uses ScanCache)
  const existingEmails = new Set<string>();
  const allResult = await usersDataSource.query({
    filters: [],
    sorting: [],
    pagination: { pageSize: 100_000, pageIndex: 0 },
  });
  if (allResult.success) {
    for (const user of allResult.data.items) {
      if (user.email) existingEmails.add(user.email.toLowerCase());
    }
  }

  for (const row of rows) {
    const email = row.email.toLowerCase().trim();

    if (existingEmails.has(email)) {
      skipped.push({ row: row.row, value: email, reason: "Email already exists as a Team member" });
      continue;
    }
    existingEmails.add(email);

    const input: CreateUserInput = {
      email,
      displayName: row.displayName,
      phone: row.phone,
      activeLocationId,
    };

    const createResult = await usersDataSource.create!(input);
    if (!createResult.success) {
      skipped.push({ row: row.row, value: email, reason: createResult.error });
      continue;
    }

    // Add the newly-created user to the VOLUNTEER group at this location
    try {
      const { getGroupsForLocation, addUserToGroup } = await import(
        "~/server/db/repositories/user-group.repository"
      );
      const groups = await getGroupsForLocation(activeLocationId, "VOLUNTEER");
      if (groups.length > 0) {
        await addUserToGroup(createResult.data.id, groups[0].groupId, {
          locationId: activeLocationId,
          groupType: "VOLUNTEER",
          groupName: groups[0].name,
          userDisplayName: row.displayName,
        });
      }
    } catch {
      // Group assignment failed but user was created — don't fail the whole row
    }

    imported++;
  }

  return { imported, skipped };
}
