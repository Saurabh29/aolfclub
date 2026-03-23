import { leadsDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Lead, LeadField } from "~/lib/schemas/domain";

/**
 * Leads Service - Uses generic collection service factory
 */
const service = createCollectionService<Lead, LeadField>(leadsDataSource);

export const queryLeads = service.query;
export const getLeadById = service.getById;
export const getLeadCount = service.getCount;
