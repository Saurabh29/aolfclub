/**
 * Users Data Source (DynamoDB-backed)
 *
 * Implements DataSource<User, UserField> for volunteer/agent User entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   User item:     PK = "USER#<id>",     SK = "META",  itemType = "User"
 *   Email lookup:  PK = "EMAIL#<email>", SK = "META",  itemType = "EmailLookup"
 *
 * query() uses a server-side ScanCache to avoid redundant DynamoDB scans
 * on sort/page/filter changes. Writes invalidate the cache.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { scanByItemType, fromItem } from "./dynamo-helpers";
import type { User, UserField } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { ScanCache } from "./scan-cache";
import { executeQuery, applyFilters } from "./query-executor";
import { assertValidQuery, USER_QUERY_CONFIG } from "./query-validation";
import {
  createUser as repoCreateUser,
  getUserByEmail as repoGetUserByEmail,
  updateUser as repoUpdateUser,
  deleteUser as repoDeleteUser,
} from "~/server/db/repositories/user.repository";
import type { CreateUserInput } from "~/server/db/repositories/user.repository";

export class UsersDataSource implements DataSource<User, UserField> {
  private cache = new ScanCache<User>({ label: "Users" });

  async getById(id: string): Promise<ApiResult<User | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.userPK(id), SK: Keys.metaSK() },
        })
      );
      if (!result.Item) return { success: true, data: null };
      return { success: true, data: fromItem<User>(result.Item) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getById failed",
      };
    }
  }

  async query(spec: QuerySpec<UserField>): Promise<ApiResult<QueryResult<User>>> {
    try {
      assertValidQuery(spec, USER_QUERY_CONFIG);
      const allUsers = await this.cache.getOrScan(() => this.scanAll());
      return { success: true, data: executeQuery(allUsers, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "query failed",
      };
    }
  }

  async getCount(
    filters?: QuerySpec<UserField>["filters"]
  ): Promise<ApiResult<number>> {
    try {
      const allUsers = await this.cache.getOrScan(() => this.scanAll());
      const filtered = filters ? applyFilters(allUsers, filters) : allUsers;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // --- Write operations (invalidate cache) ------------------------------

  async create(data: CreateUserInput): Promise<ApiResult<User>> {
    try {
      const user = await repoCreateUser(data);
      this.cache.invalidate();
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "create failed",
      };
    }
  }

  async update(
    id: string,
    data: Partial<Pick<User, "displayName" | "image" | "phone" | "email" | "activeLocationId" | "activeRole" | "isAdmin">>
  ): Promise<ApiResult<User>> {
    try {
      const user = await repoUpdateUser(id, data);
      this.cache.invalidate();
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      await repoDeleteUser(id);
      this.cache.invalidate();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }

  // -- Lookup helpers ------------------------------------------------------

  async getByUniqueField(field: string, value: string): Promise<ApiResult<User | null>> {
    if (field !== "email") {
      return { success: false, error: `Unsupported lookup field: ${field}` };
    }
    try {
      const user = await repoGetUserByEmail(value);
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByUniqueField failed",
      };
    }
  }

  /**
   * Batch-get users by IDs. Handles DynamoDB's 100-key limit automatically.
   * Uses the same fromItem mapping as getById.
   */
  async getByIds(userIds: string[]): Promise<ApiResult<User[]>> {
    if (userIds.length === 0) return { success: true, data: [] };
    try {
      const { BatchGetCommand } = await import("@aws-sdk/lib-dynamodb");
      const allUsers: User[] = [];

      for (let i = 0; i < userIds.length; i += 100) {
        const chunk = userIds.slice(i, i + 100);
        let keys = chunk.map((uid) => ({
          PK: Keys.userPK(uid),
          SK: Keys.metaSK(),
        }));

        while (keys.length > 0) {
          const batchResult = await docClient.send(
            new BatchGetCommand({
              RequestItems: {
                [TABLE_NAME]: { Keys: keys },
              },
            })
          );
          const items = batchResult.Responses?.[TABLE_NAME] ?? [];
          for (const item of items) {
            allUsers.push(fromItem<User>(item));
          }
          const unprocessed = batchResult.UnprocessedKeys?.[TABLE_NAME]?.Keys;
          keys = (unprocessed as typeof keys) ?? [];
        }
      }

      return { success: true, data: allUsers };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getByIds failed",
      };
    }
  }

  // --- Internals ------------------------------------------------------------

  private async scanAll(): Promise<User[]> {
    const items = await scanByItemType<Record<string, unknown>>("User");
    return items.map((item) => fromItem<User>(item));
  }
}
