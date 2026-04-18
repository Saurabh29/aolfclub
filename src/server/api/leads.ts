import { query } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import { queryLeadsByLocation, getLeadById } from "../services/leads.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LeadField } from "~/lib/schemas/domain";

export const queryLeadsQuery = query(async (spec: QuerySpec<LeadField>) => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.activeLocationId) throw new Error("No active location selected.");
  return execQuery(spec, (s) => queryLeadsByLocation(session.activeLocationId!, s));
}, "query-leads");

export const getLeadByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getLeadById(id));
}, "lead-by-id");
