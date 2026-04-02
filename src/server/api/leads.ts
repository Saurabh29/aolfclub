import { query } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import { queryLeads, getLeadById } from "../services/leads.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LeadField } from "~/lib/schemas/domain";

export const queryLeadsQuery = query(async (spec: QuerySpec<LeadField>) => {
  "use server";
  return execQuery(spec, queryLeads);
}, "query-leads");

export const getLeadByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getLeadById(id));
}, "lead-by-id");
