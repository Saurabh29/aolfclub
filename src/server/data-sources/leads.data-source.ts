/**
 * Leads Data Source (DynamoDB-backed)
 *
 * Extends LocationScopedDataSource for prospect Lead entities.
 * All shared CRUD logic lives in the base class.
 */

import { Keys } from "~/server/db/client";
import { LocationScopedDataSource } from "./location-scoped.data-source";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import {
  createLead,
  getLeadById,
  getLeadByPhoneInLocation,
  updateLead,
  deleteLead,
  getLeadsByLocation,
} from "~/server/db/repositories/lead.repository";
import type { CreateLeadInput } from "~/server/db/repositories/lead.repository";

export class LeadsDataSource extends LocationScopedDataSource<Lead, LeadField, CreateLeadInput> {
  constructor() {
    super(
      {
        create: createLead,
        getById: getLeadById,
        getByLocation: getLeadsByLocation,
        update: updateLead,
        delete: deleteLead,
        getByPhoneInLocation: getLeadByPhoneInLocation,
      },
      Keys.leadPK,
      Keys.metaSK()
    );
  }
}
