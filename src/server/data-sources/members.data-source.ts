/**
 * Members Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Member, MemberField> for enrolled Member entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Member item:            PK = "MEMBER#<id>",                      SK = "META"
 *   Location index:         PK = "LOCATION#<locId>",                 SK = "MEMBER#<id>"
 *   Per-location sentinel:  PK = "MEMBER_MOBILE#<locId>#<phone>",    SK = "META"
 *
 * query() is NOT location-scoped — use queryMembersByLocation() in the service layer
 * for authenticated, location-scoped reads.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { fromItem } from "./dynamo-helpers";
import type { Member, MemberField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { executeQuery } from "./query-executor";
import {
  createMember as repoCreateMember,
  getMemberByPhoneInLocation as repoGetMemberByPhoneInLocation,
  updateMember as repoUpdateMember,
  deleteMember as repoDeleteMember,
  getMembersByLocation as repoGetMembersByLocation,
} from "~/server/db/repositories/member.repository";
import type { CreateMemberInput } from "~/server/db/repositories/member.repository";

export class MembersDataSource implements DataSource<Member, MemberField> {

  // --- Location-scoped read (primary read path) ----------------------------

  /**
   * Query members scoped to a specific location.
   * Uses the LOCATION#<locId>/MEMBER#* index — no full table scan.
   */
  async queryByLocation(
    locationId: string,
    spec: QuerySpec<MemberField>
  ): Promise<ApiResult<QueryResult<Member>>> {
    try {
      const members = await repoGetMembersByLocation(locationId);
      return { success: true, data: executeQuery(members, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "queryByLocation failed",
      };
    }
  }

  // --- Interface: query() (unscoped — not used in production read path) ----

  async query(_spec: QuerySpec<MemberField>): Promise<ApiResult<QueryResult<Member>>> {
    return { success: false, error: "Use queryByLocation() for location-scoped reads." };
  }

  // --- Read operations ------------------------------------------------------

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

  async getCount(
    _filters?: QuerySpec<MemberField>["filters"]
  ): Promise<ApiResult<number>> {
    return { success: false, error: "Use queryByLocation() for count." };
  }

  // --- Write operations ---------------------------------------------------

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

  // -- Lookup helpers -------------------------------------------------------

  /**
   * Look up a member by phone within a specific location.
   * field must be "phone", value must be a JSON string: '{"locationId":"...","phone":"..."}'
   */
  async getByUniqueField(field: string, value: string): Promise<ApiResult<Member | null>> {
    if (field !== "phone") {
      return { success: false, error: `Unsupported lookup field: ${field}` };
    }
    try {
      const { locationId, phone } = JSON.parse(value) as { locationId: string; phone: string };
      const member = await repoGetMemberByPhoneInLocation(locationId, phone);
      return { success: true, data: member };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByUniqueField failed",
      };
    }
  }
}
