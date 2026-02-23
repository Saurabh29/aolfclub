import { query } from "@solidjs/router";
import { queryUsers, getUserById } from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { UserField } from "~/lib/schemas/domain";

/**
 * Query users with filters, sorting, and pagination
 * 
 * Usage in routes:
 * ```tsx
 * const users = createAsync(() => queryUsersQuery({
 *   filters: [{ field: "userType", op: "eq", value: "MEMBER" }],
 *   sorting: [{ field: "displayName", direction: "asc" }],
 *   pagination: { pageSize: 20, pageIndex: 0 }
 * }));
 * ```
 */
export const queryUsersQuery = query(async (spec: QuerySpec<UserField>) => {
  "use server";
  // Validate input spec
  const validatedSpec = QuerySpecSchema.parse(spec);
  const result = await queryUsers(validatedSpec as QuerySpec<UserField>);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-users");

/**
 * Get user by ID
 * 
 * Usage in routes:
 * ```tsx
 * const user = createAsync(() => getUserByIdQuery(userId));
 * ```
 */
export const getUserByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getUserById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "user-by-id");
