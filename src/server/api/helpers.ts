import { QuerySpecSchema } from "~/lib/schemas/query";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Validate a QuerySpec and execute a service query, unwrapping the ApiResult.
 * Call from inside a "use server" function — NOT as a wrapper around query().
 */
export async function execQuery<T, TField extends string>(
  spec: QuerySpec<TField>,
  serviceFn: (spec: QuerySpec<TField>) => Promise<ApiResult<QueryResult<T>>>,
): Promise<QueryResult<T>> {
  const validated = QuerySpecSchema.parse(spec);
  const result = await serviceFn(validated as QuerySpec<TField>);
  if (!result.success) throw new Error(result.error);
  return result.data!;
}

/**
 * Unwrap an ApiResult, throwing on failure.
 */
export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.success) throw new Error(result.error);
  return result.data!;
}
