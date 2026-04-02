/**
 * DynamoDB Location Data Source
 *
 * Implements DataSource<Location, LocationField> backed by DynamoDB.
 * Drop-in replacement for DummyLocationDataSource — swap in instances.ts only.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Location item:  PK = "LOCATION#<id>",  SK = "META",  itemType = "Location"
 *   Slug lookup:    PK = "SLUG#<slug>",    SK = "META",  itemType = "SlugLookup"
 *
 * Slug uniqueness is enforced atomically via TransactWriteCommand.
 * List/query operations drain a full Scan filtered by itemType = "Location"
 * then apply filter / sort / paginate in-memory — suitable for small tables.
 */

import {
  GetCommand,
  ScanCommand,
  UpdateCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import type {
  Location,
  LocationField,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { ScanCache } from "./scan-cache";
import { executeQuery, applyFilters } from "./query-executor";

export class DynamoDBLocationDataSource
  implements DataSource<Location, LocationField>
{
  private cache = new ScanCache<Location>({ label: "Locations" });
  // ─── Read operations ──────────────────────────────────────────────────────

  async getById(id: string): Promise<ApiResult<Location | null>> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.locationPK(id), SK: Keys.metaSK() },
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

  async getBySlug(slug: string): Promise<ApiResult<Location | null>> {
    try {
      // Step 1: resolve locationId from the slug lookup item
      const lookup = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.slugPK(slug), SK: Keys.metaSK() },
        })
      );
      if (!lookup.Item) return { success: true, data: null };
      const locationId = lookup.Item.locationId as string;

      // Step 2: fetch the actual Location item
      return this.getById(locationId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getBySlug failed",
      };
    }
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: Keys.slugPK(slug), SK: Keys.metaSK() },
        })
      );
      if (!result.Item) return false;
      if (excludeId && (result.Item.locationId as string) === excludeId) return false;
      return true;
    } catch {
      return false;
    }
  }

  async query(
    spec: QuerySpec<LocationField>
  ): Promise<ApiResult<QueryResult<Location>>> {
    try {
      const allLocations = await this.cache.getOrScan(() => this.scanAllLocations());
      return { success: true, data: executeQuery(allLocations, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Query failed",
      };
    }
  }

  async getCount(
    filters?: QuerySpec<LocationField>["filters"]
  ): Promise<ApiResult<number>> {
    try {
      const allLocations = await this.cache.getOrScan(() => this.scanAllLocations());
      const filtered = filters ? applyFilters(allLocations, filters) : allLocations;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // ─── Write operations ─────────────────────────────────────────────────────

  async create(data: CreateLocationRequest): Promise<ApiResult<Location>> {
    try {
      const id = ulid();
      const timestamp = now();
      const location: Location = {
        id,
        ...data,
        isActive: data.isActive ?? true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              // Location item
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  PK: Keys.locationPK(id),
                  SK: Keys.metaSK(),
                  itemType: "Location",
                  ...location,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              // Slug lookup — enforces uniqueness
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  PK: Keys.slugPK(data.slug),
                  SK: Keys.metaSK(),
                  itemType: "SlugLookup",
                  locationId: id,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
          ],
        })
      );

      this.cache.invalidate();
      return { success: true, data: location };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException"
      ) {
        return {
          success: false,
          error: `Slug "${data.slug}" is already in use`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Create failed",
      };
    }
  }

  async update(
    id: string,
    data: UpdateLocationRequest
  ): Promise<ApiResult<Location>> {
    try {
      const current = await this.getById(id);
      if (!current.success || !current.data) {
        return { success: false, error: "Location not found" };
      }

      const slugChanging =
        data.slug !== undefined && data.slug !== current.data.slug;

      // Build SET expression dynamically — use #f placeholders to avoid reserved words
      const updates: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};

      Object.entries(data).forEach(([field, value], i) => {
        updates.push(`#f${i} = :v${i}`);
        names[`#f${i}`] = field;
        values[`:v${i}`] = value;
      });
      // Always bump updatedAt
      updates.push("#upd = :upd");
      names["#upd"] = "updatedAt";
      values[":upd"] = now();

      if (slugChanging) {
        // Atomic swap: update location + delete old slug lookup + create new slug lookup
        await docClient.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Update: {
                  TableName: TABLE_NAME,
                  Key: { PK: Keys.locationPK(id), SK: Keys.metaSK() },
                  UpdateExpression: `SET ${updates.join(", ")}`,
                  ExpressionAttributeNames: names,
                  ExpressionAttributeValues: values,
                  ConditionExpression: "attribute_exists(PK)",
                },
              },
              {
                Delete: {
                  TableName: TABLE_NAME,
                  Key: {
                    PK: Keys.slugPK(current.data.slug),
                    SK: Keys.metaSK(),
                  },
                },
              },
              {
                Put: {
                  TableName: TABLE_NAME,
                  Item: {
                    PK: Keys.slugPK(data.slug!),
                    SK: Keys.metaSK(),
                    itemType: "SlugLookup",
                    locationId: id,
                  },
                  ConditionExpression: "attribute_not_exists(PK)",
                },
              },
            ],
          })
        );
      } else {
        // Simple update — no slug change
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: Keys.locationPK(id), SK: Keys.metaSK() },
            UpdateExpression: `SET ${updates.join(", ")}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ConditionExpression: "attribute_exists(PK)",
          })
        );
      }

      const updated: Location = {
        ...current.data,
        ...data,
        updatedAt: now(),
      };
      this.cache.invalidate();
      return { success: true, data: updated };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException"
      ) {
        return {
          success: false,
          error: `Slug "${data.slug}" is already in use`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const current = await this.getById(id);
      if (!current.success || !current.data) {
        return { success: false, error: "Location not found" };
      }

      // Atomically remove both the location item and its slug lookup
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: { PK: Keys.locationPK(id), SK: Keys.metaSK() },
                ConditionExpression: "attribute_exists(PK)",
              },
            },
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: {
                  PK: Keys.slugPK(current.data.slug),
                  SK: Keys.metaSK(),
                },
              },
            },
          ],
        })
      );

      this.cache.invalidate();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Drain the full table scan, returning only Location items. */
  private async scanAllLocations(): Promise<Location[]> {
    const locations: Location[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "itemType = :type",
          ExpressionAttributeValues: { ":type": "Location" },
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items ?? []) {
        locations.push(this.fromItem(item));
      }

      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return locations;
  }

  /** Strip DynamoDB internal keys before returning the domain object. */
  private fromItem(item: Record<string, unknown>): Location {
    const { PK: _pk, SK: _sk, itemType: _type, ...rest } = item as any;
    return rest as Location;
  }
}
