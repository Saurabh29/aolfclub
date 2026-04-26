import { action } from "@solidjs/router";
import { z } from "zod";
import { getSessionInfo } from "~/lib/auth";
import { requirePageAccess } from "./helpers";
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

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${e.issues.map((i) => `row ${i.path[0] ?? "?"}: ${i.message}`).join("; ")}`,
      );
    }
    throw e;
  }
}

export const importLeadsAction = action(async (rows: LeadImportRow[]) => {
  "use server";
  await requirePageAccess("community");
  const validated = parseOrThrow(z.array(LeadImportRowSchema), rows);
  const locationId = await resolveActiveLocationId();
  return importLeads(validated as LeadImportRow[], locationId);
}, "import-leads");

export const importMembersAction = action(async (rows: MemberImportRow[]) => {
  "use server";
  await requirePageAccess("community");
  const validated = parseOrThrow(z.array(MemberImportRowSchema), rows);
  const locationId = await resolveActiveLocationId();
  return importMembers(validated as MemberImportRow[], locationId);
}, "import-members");

export const importTeamAction = action(async (rows: TeamImportRow[]) => {
  "use server";
  await requirePageAccess("community");
  const validated = parseOrThrow(z.array(TeamImportRowSchema), rows);
  const locationId = await resolveActiveLocationId();
  return importTeam(validated as TeamImportRow[], locationId);
}, "import-team");
