import { query } from "@solidjs/router";
import { queryMembers, getMemberById } from "../services/members.service";
import type { QuerySpec } from "~/lib/schemas/query";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { MemberField } from "~/lib/schemas/domain";

export const queryMembersQuery = query(async (spec: QuerySpec<MemberField>) => {
  "use server";
  const validatedSpec = QuerySpecSchema.parse(spec);
  const result = await queryMembers(validatedSpec as QuerySpec<MemberField>);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-members");

export const getMemberByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getMemberById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "member-by-id");
