import { leadsDataSource } from "../data-sources/instances";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { CreateLeadInput } from "~/server/db/repositories/lead.repository";

/**
 * Leads Service
 * Read queries are location-scoped via queryLeadsByLocation().
 */

export async function createLead(
  input: CreateLeadInput
): Promise<ApiResult<Lead>> {
  if (!leadsDataSource.create) {
    return { success: false, error: "create not supported" };
  }
  return leadsDataSource.create(input);
}

export async function getLeadById(id: string): Promise<ApiResult<Lead | null>> {
  if (!leadsDataSource.getById) {
    return { success: false, error: "getById not supported" };
  }
  return leadsDataSource.getById(id);
}

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
