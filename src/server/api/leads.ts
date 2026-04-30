import { query, action } from "@solidjs/router";
import { z } from "zod";
import { execQuery, unwrap, requireCapability } from "./helpers";
import { queryLeadsByLocation, getLeadById, createLead } from "../services/leads.service";
import { queryTasksByLocation } from "../services/tasks.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LeadField, Lead, Task } from "~/lib/schemas/domain";

/**
 * Single-shot query: fetches the current user's assigned tasks + leads in one
 * server roundtrip. Eliminates the two-stage reactive chain (tasks → IDs → leads)
 * that broke on SSR because createResource refetches on hydration, momentarily
 * producing an empty ID set which triggers a leads fetch returning 0 items.
 */
export const getMyAssignedLeadsQuery = query(async (): Promise<{ tasks: Task[]; leads: Lead[] }> => {
  "use server";
  const session = await requireCapability("leads:read");
  const { userId, activeLocationId } = session;

  // Fetch all tasks for this location
  const tasksResult = await queryTasksByLocation(activeLocationId, {
    filters: [],
    sorting: [{ field: "createdAt", direction: "desc" }],
    pagination: { pageSize: 50, pageIndex: 0 },
  });
  if (!tasksResult.success) throw new Error(tasksResult.error);
  const tasks: Task[] = [...tasksResult.data!.items];

  // Collect lead IDs assigned to this user
  const assignedLeadIds = new Set<string>();
  for (const task of tasks) {
    if (!task.selectedAgentIds.includes(userId)) continue;
    for (const assignment of task.assignments) {
      if (assignment.agentId === userId) {
        for (const contactId of assignment.contactIds) assignedLeadIds.add(contactId);
      }
    }
  }

  let leads: Lead[] = [];
  if (assignedLeadIds.size > 0) {
    const leadsResult = await queryLeadsByLocation(activeLocationId, {
      filters: [{ field: "id", op: "in", value: [...assignedLeadIds] }],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 100, pageIndex: 0 },
    });
    if (!leadsResult.success) throw new Error(leadsResult.error);
    leads = [...leadsResult.data!.items];
  }

  return { tasks, leads };
}, "my-assigned-leads");

export const queryLeadsQuery = query(async (spec: QuerySpec<LeadField>) => {
  "use server";
  const session = await requireCapability("leads:read");
  return execQuery(spec, (s) => queryLeadsByLocation(session.activeLocationId, s));
}, "query-leads");

export const getLeadByIdQuery = query(async (id: string) => {
  "use server";
  await requireCapability("leads:read");
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
  const session = await requireCapability("leads:write");
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
