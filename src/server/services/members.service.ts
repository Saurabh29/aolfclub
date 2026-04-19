import { membersDataSource } from "../data-sources/instances";
import type { Member, MemberField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Members Service
 * Read queries are location-scoped via queryMembersByLocation().
 */

export async function getMemberById(id: string): Promise<ApiResult<Member | null>> {
  if (!membersDataSource.getById) {
    return { success: false, error: "getById not supported" };
  }
  return membersDataSource.getById(id);
}

/**
 * Query members scoped to a location.
 * locationId is always resolved server-side from the authenticated session.
 */
export async function queryMembersByLocation(
  locationId: string,
  spec: QuerySpec<MemberField>
): Promise<ApiResult<QueryResult<Member>>> {
  return membersDataSource.queryByLocation(locationId, spec);
}
