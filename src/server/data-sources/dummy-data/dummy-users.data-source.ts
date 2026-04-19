/**
 * DummyUsersDataSource — in-memory User data source with identity fallback.
 *
 * Extends DummyDataSource with an overridden getById that falls back to
 * the first admin user when the requested ID isn't found in the seed data.
 * This handles real OAuth users (e.g. GitHub logins) whose IDs won't match
 * the fixed dummy IDs, so the session always gets a valid location/role.
 */

import { DummyDataSource } from "../dummy.data-source";
import type { User, UserField } from "~/lib/schemas/domain";
import type { ApiResult } from "~/lib/types";

export class DummyUsersDataSource extends DummyDataSource<User, UserField> {
  override async getById(id: string): Promise<ApiResult<User | null>> {
    const result = await super.getById(id);
    if (result.success && result.data !== null) return result;

    // Real OAuth user ID not in seed — fall back to the first admin so that
    // session fields (activeLocationId, activeRole, isAdmin) are populated.
    const fallback = this.data.find((u) => u.isAdmin) ?? this.data[0] ?? null;
    return { success: true, data: fallback };
  }
}
