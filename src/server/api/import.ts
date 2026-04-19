import { action } from "@solidjs/router";
import { z } from "zod";
import { getSessionInfo } from "~/lib/auth";
import { importLeads, importMembers, importTeam } from "../services/import.service";
import { getActiveLocationId } from "../services/users.service";
import type {
  LeadImportRow,
  MemberImportRow,
  TeamImportRow,
  ImportResult,
} from "../services/import.service";

// -- Validation schemas -------------------------------------------------------

const LeadImportRowSchema = z.object({
  row: z.number().int().positive(),
  displayName: z.string().min(1, "displayName is required"),
  phone: z.string().min(1, "phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  interestedPrograms: z.string().optional(),
});

const MemberImportRowSchema = z.object({
  row: z.number().int().positive(),
  displayName: z.string().min(1, "displayName is required"),
  phone: z.string().min(1, "phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  memberSince: z.string().optional(),
  programsDone: z.string().optional(),
  interestedPrograms: z.string().optional(),
});

const TeamImportRowSchema = z.object({
  row: z.number().int().positive(),
  displayName: z.string().min(1, "displayName is required"),
  email: z.string().email("valid email is required"),
  phone: z.string().optional(),
});

async function resolveActiveLocationId(): Promise<string> {
  const session = await getSessionInfo();
  if (!session.userId) throw new Error("Not authenticated.");
  // Read from DB so we always get the current value, not the stale JWT snapshot.
  const result = await getActiveLocationId(session.userId);
  const locationId = result.success ? result.data : null;
  if (!locationId) throw new Error("No active location selected. Please set an active location before importing.");
  return locationId;
}

export const importLeadsAction = action(async (rows: LeadImportRow[]): Promise<ImportResult> => {
  "use server";
  const validated = z.array(LeadImportRowSchema).parse(rows);
  const locationId = await resolveActiveLocationId();
  return importLeads(validated as LeadImportRow[], locationId);
}, "import-leads");

export const importMembersAction = action(async (rows: MemberImportRow[]): Promise<ImportResult> => {
  "use server";
  const validated = z.array(MemberImportRowSchema).parse(rows);
  const locationId = await resolveActiveLocationId();
  return importMembers(validated as MemberImportRow[], locationId);
}, "import-members");

export const importTeamAction = action(async (rows: TeamImportRow[]): Promise<ImportResult> => {
  "use server";
  const validated = z.array(TeamImportRowSchema).parse(rows);
  const locationId = await resolveActiveLocationId();
  return importTeam(validated as TeamImportRow[], locationId);
}, "import-team");
