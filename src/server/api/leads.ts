import { query } from "@solidjs/router";
import { queryLeads, getLeadById } from "../services/leads.service";
import type { QuerySpec } from "~/lib/schemas/query";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { LeadField } from "~/lib/schemas/domain";

export const queryLeadsQuery = query(async (spec: QuerySpec<LeadField>) => {
  "use server";
  const validatedSpec = QuerySpecSchema.parse(spec);
  const result = await queryLeads(validatedSpec as QuerySpec<LeadField>);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-leads");

export const getLeadByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getLeadById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "lead-by-id");
