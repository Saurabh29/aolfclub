/**
 * Tasks Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Task, TaskField> for Task entities.
 *
 * Table design (single-table, PK + SK, no uniqueness sentinel):
 *   Task item:  PK = "TASK#<id>",  SK = "META",  itemType = "Task"
 *
 * query() uses a server-side ScanCache to avoid redundant full scans on
 * sort/page/filter changes within the same request lifecycle.
 * All write operations invalidate the cache.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { scanByItemType, fromItem } from "./dynamo-helpers";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { ScanCache } from "./scan-cache";
import { executeQuery, applyFilters } from "./query-executor";
import {
  createTask as repoCreateTask,
  getTaskById as repoGetTaskById,
  updateTask as repoUpdateTask,
  deleteTask as repoDeleteTask,
} from "~/server/db/repositories/task.repository";

export class TasksDataSource implements DataSource<Task, TaskField> {
  private cache = new ScanCache<Task>({ label: "Tasks" });

  // --- Read operations ------------------------------------------------------

  async getById(id: string): Promise<ApiResult<Task | null>> {
    try {
      const task = await repoGetTaskById(id);
      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getById failed",
      };
    }
  }

  async query(spec: QuerySpec<TaskField>): Promise<ApiResult<QueryResult<Task>>> {
    try {
      const allTasks = await this.cache.getOrScan(() => this.scanAll());
      return { success: true, data: executeQuery(allTasks, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "query failed",
      };
    }
  }

  async getCount(
    filters?: QuerySpec<TaskField>["filters"]
  ): Promise<ApiResult<number>> {
    try {
      const allTasks = await this.cache.getOrScan(() => this.scanAll());
      const filtered = filters ? applyFilters(allTasks, filters) : allTasks;
      return { success: true, data: filtered.length };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "getCount failed",
      };
    }
  }

  // --- Write operations (invalidate cache) ----------------------------------

  async create(
    data: CreateTaskRequest & { createdBy: string }
  ): Promise<ApiResult<Task>> {
    try {
      const { createdBy, ...request } = data;
      const task = await repoCreateTask(request, createdBy);
      this.cache.invalidate();
      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "create failed",
      };
    }
  }

  async update(
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy">>
  ): Promise<ApiResult<Task>> {
    try {
      const task = await repoUpdateTask(id, updates);
      this.cache.invalidate();
      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "update failed",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      await repoDeleteTask(id);
      this.cache.invalidate();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }

  // --- Internals ------------------------------------------------------------

  private async scanAll(): Promise<Task[]> {
    const items = await scanByItemType<Record<string, unknown>>("Task");
    return items.map((item) => fromItem<Task>(item));
  }
}
