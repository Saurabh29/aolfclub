import { query, action } from "@solidjs/router";
import { z } from "zod";
import { execQuery, unwrap, requireCapability } from "./helpers";
import { queryMembersByLocation, getMemberById, createMember } from "../services/members.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { MemberField } from "~/lib/schemas/domain";

export const queryMembersQuery = query(async (spec: QuerySpec<MemberField>) => {
  "use server";
  const session = await requireCapability("members:read");
  return execQuery(spec, (s) => queryMembersByLocation(session.activeLocationId, s));
}, "query-members");

export const getMemberByIdQuery = query(async (id: string) => {
  "use server";
  await requireCapability("members:read");
  return unwrap(await getMemberById(id));
}, "member-by-id");

const CreateMemberInputSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  memberSince: z.string().optional(),
  programsDone: z.array(z.string()).optional(),
  interestedPrograms: z.array(z.string()).optional(),
});

export const createMemberAction = action(async (input: z.infer<typeof CreateMemberInputSchema>) => {
  "use server";
  const session = await requireCapability("members:write");
  const validated = CreateMemberInputSchema.parse(input);
  const result = await createMember({
    locationId: session.activeLocationId,
    displayName: validated.displayName,
    phone: validated.phone,
    email: validated.email || undefined,
    memberSince: validated.memberSince,
    programsDone: validated.programsDone ?? [],
    interestedPrograms: validated.interestedPrograms ?? [],
  });
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "create-member");
