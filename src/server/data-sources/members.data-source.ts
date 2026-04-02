/**
 * Members Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Member, MemberField> for enrolled Member entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Member item:         PK = "MEMBER#<id>",          SK = "META", itemType = "Member"
 *   Mobile sentinel:     PK = "MEMBER_MOBILE#<phone>", SK = "META", itemType = "MemberMobileLookup"
 *
 * query() drains a full Scan filtered by itemType = "Member", then applies
 * remaining QuerySpec predicates (filters, sorting, pagination) in-memory.
 */

import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import type { Member, MemberField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import {
  createMember as repoCreateMember,
  getMemberByPhone as repoGetMemberByPhone,
  updateMember as repoUpdateMember,
  deleteMember as repoDeleteMember,
} from "~/server/db/repositories/member.repository";
import type { CreateMemberInput } from "~/server/db/repositories/member.repository";

export class MembersDataSource implements DataSource<Member, MemberField> {
  // ─── Read operations ──────────────────────────────────────────────────────

  async getById(id: string): Promise<ApiResult<Member | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.memberPK(id), SK: Keys.metaSK() },
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

  async query(spec: QuerySpec<MemberField>): Promise<ApiResult<QueryResult<Member>>> {
    try {
      const allMembers = await this.scanAll();

      let results = this.applyFilters(allMembers, spec.filters);

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
    filters?: QuerySpec<MemberField>["filters"]
  ): Promise<ApiResult<number>> {
    try {
      const allMembers = await this.scanAll();
      const filtered = filters ? this.applyFilters(allMembers, filters) : allMembers;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // ─── Write operations ──────────────────────────────────────────────────

  async create(data: CreateMemberInput): Promise<ApiResult<Member>> {
    try {
      const member = await repoCreateMember(data);
      return { success: true, data: member };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "create failed",
      };
    }
  }

  async update(id: string, data: Partial<Omit<Member, "id" | "createdAt">>): Promise<ApiResult<Member>> {
    try {
      const member = await repoUpdateMember(id, data);
      return { success: true, data: member };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      await repoDeleteMember(id);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }

  // ── Lookup helpers ──────────────────────────────────────────────────────

  /**
   * Look up member by phone (sentinel-based).
   * Usage: getByUniqueField("phone", "+15551234567")
   */
  async getByUniqueField(field: string, value: string): Promise<ApiResult<Member | null>> {
    if (field !== "phone") {
      return { success: false, error: `Unsupported lookup field: ${field}` };
    }
    try {
      const member = await repoGetMemberByPhone(value);
      return { success: true, data: member };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByUniqueField failed",
      };
    }
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /** Drain the full Scan, filtering by itemType = "Member". */
  private async scanAll(): Promise<Member[]> {
    const members: Member[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "itemType = :itemType",
          ExpressionAttributeValues: { ":itemType": "Member" },
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items ?? []) {
        members.push(this.fromItem(item as Record<string, unknown>));
      }

      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return members;
  }

  private fromItem(item: Record<string, unknown>): Member {
    const { PK, SK, itemType, ...rest } = item;
    return rest as unknown as Member;
  }

  private applyFilters(
    members: Member[],
    filters: QuerySpec<MemberField>["filters"]
  ): Member[] {
    let results = [...members];
    for (const filter of filters) {
      results = results.filter((member) => {
        const value = (member as Record<string, unknown>)[filter.field];
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
    members: Member[],
    sorting: QuerySpec<MemberField>["sorting"]
  ): Member[] {
    return [...members].sort((a, b) => {
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
