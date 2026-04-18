import { leadsDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Leads Service - Uses generic collection service factory for getById.
 * Read queries are location-scoped via queryLeadsByLocation().
 */
const service = createCollectionService<Lead, LeadField>(leadsDataSource);

export const getLeadById = service.getById;

/**
 * Query leads scoped to a location.
 * locationId is always resolved server-side from the authenticated session.
 */
export async function queryLeadsByLocation(
  locationId: string,
  spec: QuerySpec<LeadField>
): Promise<ApiResult<QueryResult<Lead>>> {
  return leadsDataSource.queryByLocation(locationId, spec);
}
