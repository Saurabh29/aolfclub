import { z } from "zod";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { GroupType } from "~/lib/schemas/domain";

// -- Session helpers ----------------------------------------------------------

export interface SessionScope {
  userId: string;
  activeLocationId: string;
  activeRole: GroupType | null;
  isAdmin: boolean;
}

export interface AuthScope {
  userId: string;
  isAdmin: boolean;
  activeRole: GroupType | null;
  activeLocationId?: string;
}

/**
 * Require an authenticated user with an active location selected.
 * Throws if not authenticated or no active location.
 */
export async function requireLocationScope(): Promise<SessionScope> {
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.userId) throw new Error("Not authenticated");
  if (!session.activeLocationId) throw new Error("No active location selected.");
  return {
    userId: session.userId,
    activeLocationId: session.activeLocationId,
    activeRole: session.activeRole ?? null,
    isAdmin: session.isAdmin ?? false,
  };
}

/**
 * Require an authenticated user (no location needed).
 */
export async function requireAuth(): Promise<AuthScope> {
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.userId) throw new Error("Not authenticated");
  return {
    userId: session.userId,
    isAdmin: session.isAdmin ?? false,
    activeRole: session.activeRole ?? null,
    activeLocationId: session.activeLocationId ?? undefined,
  };
}

/**
 * Require ADMIN role. Throws if the user is not a super-admin or location ADMIN.
 */
export function requireAdminRole(session: { isAdmin: boolean; activeRole: GroupType | null }): void {
  if (!session.isAdmin && session.activeRole !== "ADMIN") {
    throw new Error("Unauthorized: only Admins can perform this action.");
  }
}

/**
 * Require that the current user can access the given page at their active location.
 * Checks the full RBAC chain: User → Groups (at location) → Roles → Page permissions.
 * Super-admins and isAdmin users bypass the check.
 *
 * Returns the SessionScope on success (so callers can reuse it).
 */
export async function requirePageAccess(pageName: string): Promise<SessionScope> {
  const scope = await requireLocationScope();
  if (scope.isAdmin) return scope;

  const { canUserAccessPage } = await import(
    "~/server/db/repositories/access.repository"
  );
  const allowed = await canUserAccessPage(
    scope.userId,
    scope.activeLocationId,
    pageName,
  );
  if (!allowed) {
    throw new Error(`Access denied: no permission for "${pageName}".`);
  }
  return scope;
}

// -- Query helpers ------------------------------------------------------------

/**
 * Validate a QuerySpec and execute a service query, unwrapping the ApiResult.
 * Call from inside a "use server" function  -  NOT as a wrapper around query().
 */
export async function execQuery<T, TField extends string>(
  spec: QuerySpec<TField>,
  serviceFn: (spec: QuerySpec<TField>) => Promise<ApiResult<QueryResult<T>>>,
): Promise<QueryResult<T>> {
  let validated: ReturnType<typeof QuerySpecSchema.parse>;
  try {
    validated = QuerySpecSchema.parse(spec);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error(`Invalid query: ${e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`);
    }
    throw e;
  }
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
