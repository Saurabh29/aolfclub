import { action } from "@solidjs/router";
import { getSessionInfo } from "~/lib/auth";
import { importLeads, importMembers, importTeam } from "../services/import.service";
import { getActiveLocationId } from "../services/users.service";
import type {
  LeadImportRow,
  MemberImportRow,
  TeamImportRow,
  ImportResult,
} from "../services/import.service";

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
  const locationId = await resolveActiveLocationId();
  return importLeads(rows, locationId);
}, "import-leads");

export const importMembersAction = action(async (rows: MemberImportRow[]): Promise<ImportResult> => {
  "use server";
  const locationId = await resolveActiveLocationId();
  return importMembers(rows, locationId);
}, "import-members");

export const importTeamAction = action(async (rows: TeamImportRow[]): Promise<ImportResult> => {
  "use server";
  const locationId = await resolveActiveLocationId();
  return importTeam(rows, locationId);
}, "import-team");
