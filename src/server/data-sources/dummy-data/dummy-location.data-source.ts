/**
 * DummyLocationDataSource — in-memory Location data source with slug support.
 *
 * Extends DummyDataSource with the Location-specific methods that
 * DynamoDBLocationDataSource exposes (getBySlug, isSlugTaken).
 */

import { DummyDataSource } from "../dummy.data-source";
import type { Location, LocationField } from "~/lib/schemas/domain";
import type { ApiResult } from "~/lib/types";

export class DummyLocationDataSource extends DummyDataSource<Location, LocationField> {
  async getBySlug(slug: string): Promise<ApiResult<Location | null>> {
    return this.getByUniqueField("slug", slug);
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const result = await this.getByUniqueField("slug", slug);
    if (!result.success || !result.data) return false;
    if (excludeId && result.data.id === excludeId) return false;
    return true;
  }
}
