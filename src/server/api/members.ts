import { query } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import { queryMembers, getMemberById } from "../services/members.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { MemberField } from "~/lib/schemas/domain";

export const queryMembersQuery = query(async (spec: QuerySpec<MemberField>) => {
  "use server";
  return execQuery(spec, queryMembers);
}, "query-members");

export const getMemberByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getMemberById(id));
}, "member-by-id");
