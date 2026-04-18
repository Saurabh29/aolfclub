import { membersDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Member, MemberField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Members Service - Uses generic collection service factory for getById.
 * Read queries are location-scoped via queryMembersByLocation().
 */
const service = createCollectionService<Member, MemberField>(membersDataSource);

export const getMemberById = service.getById;

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
