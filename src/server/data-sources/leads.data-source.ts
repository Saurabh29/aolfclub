/**
 * Leads Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Lead, LeadField> for prospect Lead entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Lead item:              PK = "LEAD#<id>",                       SK = "META"
 *   Location index:         PK = "LOCATION#<locId>",                SK = "LEAD#<id>"
 *   Per-location sentinel:  PK = "LEAD_MOBILE#<locId>#<phone>",     SK = "META"
 *
 * query() is NOT location-scoped — use queryLeadsByLocation() in the service layer
 * for authenticated, location-scoped reads.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { fromItem } from "./dynamo-helpers";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { executeQuery } from "./query-executor";
import {
  createLead as repoCreateLead,
  getLeadByPhoneInLocation as repoGetLeadByPhoneInLocation,
  updateLead as repoUpdateLead,
  deleteLead as repoDeleteLead,
  getLeadsByLocation as repoGetLeadsByLocation,
} from "~/server/db/repositories/lead.repository";
import type { CreateLeadInput } from "~/server/db/repositories/lead.repository";

export class LeadsDataSource implements DataSource<Lead, LeadField> {

  // --- Location-scoped read (primary read path) ----------------------------

  /**
   * Query leads scoped to a specific location.
   * Uses the LOCATION#<locId>/LEAD#* index — no full table scan.
   */
  async queryByLocation(
    locationId: string,
    spec: QuerySpec<LeadField>
  ): Promise<ApiResult<QueryResult<Lead>>> {
    try {
      const leads = await repoGetLeadsByLocation(locationId);
      return { success: true, data: executeQuery(leads, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "queryByLocation failed",
      };
    }
  }

  // --- Interface: query() (unscoped — not used in production read path) ----

  async query(_spec: QuerySpec<LeadField>): Promise<ApiResult<QueryResult<Lead>>> {
    return { success: false, error: "Use queryByLocation() for location-scoped reads." };
  }

  // --- Read operations ------------------------------------------------------

  async getById(id: string): Promise<ApiResult<Lead | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.leadPK(id), SK: Keys.metaSK() },
        })
      );
      if (!result.Item) return { success: true, data: null };
      return { success: true, data: fromItem<Lead>(result.Item) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getById failed",
      };
    }
  }

  async getCount(
    _filters?: QuerySpec<LeadField>["filters"]
  ): Promise<ApiResult<number>> {
    return { success: false, error: "Use queryByLocation() for count." };
  }

  // --- Write operations (invalidate cache) ----------------------------------

  async create(data: CreateLeadInput): Promise<ApiResult<Lead>> {
    try {
      const lead = await repoCreateLead(data);
      return { success: true, data: lead };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "create failed",
      };
    }
  }

  async update(id: string, data: Partial<Omit<Lead, "id" | "createdAt">>): Promise<ApiResult<Lead>> {
    try {
      const lead = await repoUpdateLead(id, data);
      return { success: true, data: lead };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      await repoDeleteLead(id);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }

  // -- Lookup helpers -------------------------------------------------------

  /**
   * Look up a lead by phone within a specific location.
   * field must be "phone", value must be a JSON string: '{"locationId":"...","phone":"..."}'
   */
  async getByUniqueField(field: string, value: string): Promise<ApiResult<Lead | null>> {
    if (field !== "phone") {
      return { success: false, error: `Unsupported lookup field: ${field}` };
    }
    try {
      const { locationId, phone } = JSON.parse(value) as { locationId: string; phone: string };
      const lead = await repoGetLeadByPhoneInLocation(locationId, phone);
      return { success: true, data: lead };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByUniqueField failed",
      };
    }
  }
}
