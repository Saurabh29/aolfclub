import { query } from "@solidjs/router";
import { execQuery, unwrap, requireLocationScope } from "./helpers";
import { queryMembersByLocation, getMemberById } from "../services/members.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { MemberField } from "~/lib/schemas/domain";

export const queryMembersQuery = query(async (spec: QuerySpec<MemberField>) => {
  "use server";
  const session = await requireLocationScope();
  return execQuery(spec, (s) => queryMembersByLocation(session.activeLocationId, s));
}, "query-members");

export const getMemberByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getMemberById(id));
}, "member-by-id");
