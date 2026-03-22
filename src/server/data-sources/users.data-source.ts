/**
 * Unified Users Data Source (DynamoDB-backed)
 *
 * Implements DataSource<User, UserField> for both MEMBER and LEAD user types.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   User item:     PK = "USER#<id>",     SK = "META",  itemType = "User"
 *   Email lookup:  PK = "EMAIL#<email>", SK = "META",  itemType = "EmailLookup"
 *
 * query() drains a full Scan filtered by itemType = "User", optionally also
 * filtered by userType at the DynamoDB level, then applies remaining
 * QuerySpec predicates (filters, sorting, pagination) in-memory.
 *
 * To query only leads: instantiate with new UsersDataSource("LEAD")
 * To query only members: instantiate with new UsersDataSource("MEMBER")
 * To query all users: instantiate with new UsersDataSource()
 */

import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import type { User, UserField, UserType } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";

export class UsersDataSource implements DataSource<User, UserField> {
  /**
   * Optional userType pre-filter applied at the DynamoDB Scan level.
   * Undefined = return all users (members + leads).
   */
  private readonly userType?: UserType;

  constructor(userType?: UserType) {
    this.userType = userType;
  }

  // ─── Read operations ──────────────────────────────────────────────────────

  async getById(id: string): Promise<ApiResult<User | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.userPK(id), SK: Keys.metaSK() },
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

  /**
   * Execute a QuerySpec against the full (or pre-filtered) user set.
   *
   * DynamoDB execution steps:
   *   1. Scan with FilterExpression constraining itemType (and optionally userType)
   *   2. Apply remaining QuerySpec filters in-memory
   *   3. Sort in-memory
   *   4. Paginate in-memory (offset = pageIndex × pageSize)
   */
  async query(spec: QuerySpec<UserField>): Promise<ApiResult<QueryResult<User>>> {
    try {
      const allUsers = await this.scanAll();

      // Apply in-memory filters from QuerySpec
      let results = this.applyFilters(allUsers, spec.filters);

      // Apply sorting
      if (spec.sorting.length > 0) {
        results = this.applySort(results, spec.sorting);
      }

      // Paginate
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
    filters?: QuerySpec<UserField>["filters"]
  ): Promise<ApiResult<number>> {
    try {
      const allUsers = await this.scanAll();
      const filtered = filters ? this.applyFilters(allUsers, filters) : allUsers;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /** Drain the full Scan, pushing down itemType and optional userType filters. */
  private async scanAll(): Promise<User[]> {
    const users: User[] = [];
    let lastKey: Record<string, unknown> | undefined;

    // Build FilterExpression for DynamoDB-level pre-filtering
    let filterExpr = "itemType = :itemType";
    const exprValues: Record<string, unknown> = { ":itemType": "User" };

    if (this.userType) {
      filterExpr += " AND userType = :userType";
      exprValues[":userType"] = this.userType;
    }

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: filterExpr,
          ExpressionAttributeValues: exprValues,
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items ?? []) {
        users.push(this.fromItem(item as Record<string, unknown>));
      }

      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return users;
  }

  /** Strip DynamoDB key fields and return a domain User. */
  private fromItem(item: Record<string, unknown>): User {
    const { PK, SK, itemType, ...rest } = item;
    return rest as unknown as User;
  }

  private applyFilters(
    users: User[],
    filters: QuerySpec<UserField>["filters"]
  ): User[] {
    let results = [...users];
    for (const filter of filters) {
      results = results.filter((user) => {
        const value = (user as Record<string, unknown>)[filter.field];
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
    users: User[],
    sorting: QuerySpec<UserField>["sorting"]
  ): User[] {
    return [...users].sort((a, b) => {
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
