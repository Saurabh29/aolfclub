/**
 * Leads Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Lead, LeadField> for prospect Lead entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Lead item:       PK = "LEAD#<id>",          SK = "META", itemType = "Lead"
 *   Mobile sentinel: PK = "LEAD_MOBILE#<phone>", SK = "META", itemType = "LeadMobileLookup"
 *
 * query() uses a server-side ScanCache to avoid redundant DynamoDB scans
 * on sort/page/filter changes. Writes invalidate the cache.
 */

import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { ScanCache } from "./scan-cache";
import { executeQuery, applyFilters } from "./query-executor";
import {
  createLead as repoCreateLead,
  getLeadByPhone as repoGetLeadByPhone,
  updateLead as repoUpdateLead,
  deleteLead as repoDeleteLead,
} from "~/server/db/repositories/lead.repository";
import type { CreateLeadInput } from "~/server/db/repositories/lead.repository";

export class LeadsDataSource implements DataSource<Lead, LeadField> {
  private cache = new ScanCache<Lead>({ label: "Leads" });

  // ─── Read operations ──────────────────────────────────────────────────────

  async getById(id: string): Promise<ApiResult<Lead | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.leadPK(id), SK: Keys.metaSK() },
        })
      );
      if (!result.Item) return { success: true, data: null };
      return { success: true, data: this.fromItem(result.Item) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getById failed",
      };
    }
  }

  async query(spec: QuerySpec<LeadField>): Promise<ApiResult<QueryResult<Lead>>> {
    try {
      const allLeads = await this.cache.getOrScan(() => this.scanAll());
      return { success: true, data: executeQuery(allLeads, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "query failed",
      };
    }
  }

  async getCount(
    filters?: QuerySpec<LeadField>["filters"]
  ): Promise<ApiResult<number>> {
    try {
      const allLeads = await this.cache.getOrScan(() => this.scanAll());
      const filtered = filters ? applyFilters(allLeads, filters) : allLeads;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // ─── Write operations (invalidate cache) ──────────────────────────────

  async create(data: CreateLeadInput): Promise<ApiResult<Lead>> {
    try {
      const lead = await repoCreateLead(data);
      this.cache.invalidate();
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
      this.cache.invalidate();
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
      this.cache.invalidate();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }

  // ── Lookup helpers ──────────────────────────────────────────────────────

  async getByUniqueField(field: string, value: string): Promise<ApiResult<Lead | null>> {
    if (field !== "phone") {
      return { success: false, error: `Unsupported lookup field: ${field}` };
    }
    try {
      const lead = await repoGetLeadByPhone(value);
      return { success: true, data: lead };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByUniqueField failed",
      };
    }
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async scanAll(): Promise<Lead[]> {
    const leads: Lead[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "itemType = :itemType",
          ExpressionAttributeValues: { ":itemType": "Lead" },
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items ?? []) {
        leads.push(this.fromItem(item as Record<string, unknown>));
      }

      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return leads;
  }

  private fromItem(item: Record<string, unknown>): Lead {
    const { PK, SK, itemType, ...rest } = item;
    return rest as unknown as Lead;
  }
}
