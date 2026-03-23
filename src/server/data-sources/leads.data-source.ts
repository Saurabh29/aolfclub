/**
 * Leads Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Lead, LeadField> for prospect Lead entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Lead item:       PK = "LEAD#<id>",          SK = "META", itemType = "Lead"
 *   Mobile sentinel: PK = "LEAD_MOBILE#<phone>", SK = "META", itemType = "LeadMobileLookup"
 *
 * query() drains a full Scan filtered by itemType = "Lead", then applies
 * remaining QuerySpec predicates (filters, sorting, pagination) in-memory.
 */

import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";

export class LeadsDataSource implements DataSource<Lead, LeadField> {
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
      const allLeads = await this.scanAll();

      let results = this.applyFilters(allLeads, spec.filters);

      if (spec.sorting.length > 0) {
        results = this.applySort(results, spec.sorting);
      }

      const { pageSize, pageIndex = 0 } = spec.pagination;
      const offset = pageIndex * pageSize;
      const items = results.slice(offset, offset + pageSize);
      const total = results.length;

      return {
        success: true,
        data: {
          items,
          pageInfo: {
            hasNextPage: offset + pageSize < total,
            totalCount: total,
          },
        },
      };
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
      const allLeads = await this.scanAll();
      const filtered = filters ? this.applyFilters(allLeads, filters) : allLeads;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /** Drain the full Scan, filtering by itemType = "Lead". */
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

  private applyFilters(
    leads: Lead[],
    filters: QuerySpec<LeadField>["filters"]
  ): Lead[] {
    let results = [...leads];
    for (const filter of filters) {
      results = results.filter((lead) => {
        const value = (lead as Record<string, unknown>)[filter.field];
        switch (filter.op) {
          case "eq":   return value === filter.value;
          case "neq":  return value !== filter.value;
          case "contains":
            return typeof value === "string" && value.includes(String(filter.value));
          case "startsWith":
            return typeof value === "string" && value.startsWith(String(filter.value));
          case "endsWith":
            return typeof value === "string" && value.endsWith(String(filter.value));
          case "gt":   return (value as number) > (filter.value as number);
          case "lt":   return (value as number) < (filter.value as number);
          case "gte":  return (value as number) >= (filter.value as number);
          case "lte":  return (value as number) <= (filter.value as number);
          case "in":
            return Array.isArray(filter.value) && filter.value.includes(value);
          default:     return true;
        }
      });
    }
    return results;
  }

  private applySort(
    leads: Lead[],
    sorting: QuerySpec<LeadField>["sorting"]
  ): Lead[] {
    return [...leads].sort((a, b) => {
      for (const sort of sorting) {
        const aVal = (a as Record<string, unknown>)[sort.field];
        const bVal = (b as Record<string, unknown>)[sort.field];
        if (aVal === bVal) continue;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        if (aVal < (bVal as typeof aVal)) return sort.direction === "asc" ? -1 : 1;
        if (aVal > (bVal as typeof aVal)) return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
}
