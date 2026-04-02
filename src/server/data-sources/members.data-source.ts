/**
 * Members Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Member, MemberField> for enrolled Member entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Member item:         PK = "MEMBER#<id>",          SK = "META", itemType = "Member"
 *   Mobile sentinel:     PK = "MEMBER_MOBILE#<phone>", SK = "META", itemType = "MemberMobileLookup"
 *
 * query() uses a server-side ScanCache to avoid redundant DynamoDB scans
 * on sort/page/filter changes. Writes invalidate the cache.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { scanByItemType, fromItem } from "./dynamo-helpers";
import type { Member, MemberField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { ScanCache } from "./scan-cache";
import { executeQuery, applyFilters } from "./query-executor";
import {
  createMember as repoCreateMember,
  getMemberByPhone as repoGetMemberByPhone,
  updateMember as repoUpdateMember,
  deleteMember as repoDeleteMember,
} from "~/server/db/repositories/member.repository";
import type { CreateMemberInput } from "~/server/db/repositories/member.repository";

export class MembersDataSource implements DataSource<Member, MemberField> {
  private cache = new ScanCache<Member>({ label: "Members" });

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
      return { success: true, data: fromItem<Member>(result.Item) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getById failed",
      };
    }
  }

  async query(spec: QuerySpec<MemberField>): Promise<ApiResult<QueryResult<Member>>> {
    try {
      const allMembers = await this.cache.getOrScan(() => this.scanAll());
      return { success: true, data: executeQuery(allMembers, spec) };
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
      const allMembers = await this.cache.getOrScan(() => this.scanAll());
      const filtered = filters ? applyFilters(allMembers, filters) : allMembers;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // ─── Write operations (invalidate cache) ──────────────────────────────

  async create(data: CreateMemberInput): Promise<ApiResult<Member>> {
    try {
      const member = await repoCreateMember(data);
      this.cache.invalidate();
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
      this.cache.invalidate();
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

  private async scanAll(): Promise<Member[]> {
    const items = await scanByItemType<Record<string, unknown>>("Member");
    return items.map((item) => fromItem<Member>(item));
  }
}
