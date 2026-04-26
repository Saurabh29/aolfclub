import { query, action } from "@solidjs/router";
import { z } from "zod";
import { execQuery, unwrap, requirePageAccess } from "./helpers";
import { queryLeadsByLocation, getLeadById, createLead } from "../services/leads.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LeadField } from "~/lib/schemas/domain";

export const queryLeadsQuery = query(async (spec: QuerySpec<LeadField>) => {
  "use server";
  const session = await requirePageAccess("leads");
  return execQuery(spec, (s) => queryLeadsByLocation(session.activeLocationId, s));
}, "query-leads");

export const getLeadByIdQuery = query(async (id: string) => {
  "use server";
  await requirePageAccess("leads");
  return unwrap(await getLeadById(id));
}, "lead-by-id");

const CreateLeadInputSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  interestedPrograms: z.array(z.string()).optional(),
});

export const createLeadAction = action(async (input: z.infer<typeof CreateLeadInputSchema>) => {
  "use server";
  const session = await requirePageAccess("community");
  const validated = CreateLeadInputSchema.parse(input);
  const result = await createLead({
    locationId: session.activeLocationId,
    displayName: validated.displayName,
    phone: validated.phone,
    email: validated.email || undefined,
    interestedPrograms: validated.interestedPrograms ?? [],
  });
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "create-lead");
