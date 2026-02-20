import { usersDataSource } from "../data-sources/instances";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { User, UserField } from "~/lib/schemas/domain";

/**
 * Query users
 * Directly uses usersDataSource instance
 */
export async function queryUsers(spec: QuerySpec<UserField>): Promise<ApiResult<QueryResult<User>>> {
  return await usersDataSource.query(spec);
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<ApiResult<User | null>> {
  if (!usersDataSource.getById) {
    return { success: false, error: "getById not supported" };
  }
  return await usersDataSource.getById(id);
}

/**
 * Get user count
 */
export async function getUserCount(filters?: QuerySpec<UserField>["filters"]): Promise<ApiResult<number>> {
  if (!usersDataSource.getCount) {
    return { success: false, error: "getCount not supported" };
  }
  return await usersDataSource.getCount(filters);
}
