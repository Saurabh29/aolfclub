import { action } from "@solidjs/router";
import { getSessionInfo } from "~/lib/auth";
import { importLeads, importMembers, importTeam } from "../services/import.service";
import type {
  LeadImportRow,
  MemberImportRow,
  TeamImportRow,
  ImportResult,
} from "../services/import.service";

function requireActiveLocation(activeLocationId: string | null): string {
  if (!activeLocationId) throw new Error("No active location selected. Please set an active location before importing.");
  return activeLocationId;
}

export const importLeadsAction = action(async (rows: LeadImportRow[]): Promise<ImportResult> => {
  "use server";
  const session = await getSessionInfo();
  const locationId = requireActiveLocation(session.activeLocationId);
  return importLeads(rows, locationId);
}, "import-leads");

export const importMembersAction = action(async (rows: MemberImportRow[]): Promise<ImportResult> => {
  "use server";
  const session = await getSessionInfo();
  const locationId = requireActiveLocation(session.activeLocationId);
  return importMembers(rows, locationId);
}, "import-members");

export const importTeamAction = action(async (rows: TeamImportRow[]): Promise<ImportResult> => {
  "use server";
  const session = await getSessionInfo();
  const locationId = requireActiveLocation(session.activeLocationId);
  return importTeam(rows, locationId);
}, "import-team");
