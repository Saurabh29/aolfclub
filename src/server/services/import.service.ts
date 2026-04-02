/**
 * Import Service
 *
 * Bulk-imports Leads, Members, or Team (User) records from parsed CSV rows.
 *
 * Rules:
 *   - All records are stamped with the caller's activeLocationId.
 *   - Duplicates are skipped (not overwritten) and returned in the error list.
 *   - Leads   → unique by phone (LEAD_MOBILE# sentinel)
 *   - Members → unique by phone (MEMBER_MOBILE# sentinel)
 *   - Team    → unique by email (EMAIL# sentinel); creates full User + EMAIL# sentinel
 */

import { normalizePhone } from "~/server/db/client";
import {
  leadsDataSource,
  membersDataSource,
  usersDataSource,
} from "~/server/data-sources/instances";
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
 * Each phone is normalized to E.164 before the duplicate check.
 */
export async function importLeads(
  rows: LeadImportRow[],
  activeLocationId: string
): Promise<ImportResult> {
  let imported = 0;
  const skipped: ImportSkip[] = [];

  for (const row of rows) {
    const phone = normalizePhone(row.phone);

    // Duplicate check via DataSource lookup
    const existingResult = await leadsDataSource.getByUniqueField!("phone", phone);
    if (existingResult.success && existingResult.data) {
      skipped.push({ row: row.row, value: phone, reason: "Phone already exists as a Lead" });
      continue;
    }

    const input: CreateLeadInput = {
      displayName: row.displayName,
      phone,
      email: row.email,
      activeLocationId,
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
 */
export async function importMembers(
  rows: MemberImportRow[],
  activeLocationId: string
): Promise<ImportResult> {
  let imported = 0;
  const skipped: ImportSkip[] = [];

  for (const row of rows) {
    const phone = normalizePhone(row.phone);

    // Duplicate check via DataSource lookup
    const existingResult = await membersDataSource.getByUniqueField!("phone", phone);
    if (existingResult.success && existingResult.data) {
      skipped.push({ row: row.row, value: phone, reason: "Phone already exists as a Member" });
      continue;
    }

    const input: CreateMemberInput = {
      displayName: row.displayName,
      phone,
      email: row.email,
      activeLocationId,
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
 * Creates full User + EMAIL# sentinel. No whitelist entry needed — the EMAIL#
 * sentinel grants OAuth access directly.
 */
export async function importTeam(
  rows: TeamImportRow[],
  activeLocationId: string
): Promise<ImportResult> {
  let imported = 0;
  const skipped: ImportSkip[] = [];

  for (const row of rows) {
    const email = row.email.toLowerCase().trim();

    // Duplicate check via DataSource lookup
    const existingResult = await usersDataSource.getByUniqueField!("email", email);
    if (existingResult.success && existingResult.data) {
      skipped.push({ row: row.row, value: email, reason: "Email already exists as a Team member" });
      continue;
    }

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
    imported++;
  }

  return { imported, skipped };
}
