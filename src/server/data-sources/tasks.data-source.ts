/**
 * Tasks Data Source (DynamoDB-backed)
 *
 * Implements DataSource<Task, TaskField> for Task entities.
 *
 * Table design (single-table, PK + SK, no GSI):
 *   Task item:        PK = "TASK#<id>",          SK = "META"
 *   Location index:   PK = "LOCATION#<locId>",   SK = "TASK#<id>"
 *
 * query() is NOT location-scoped — use queryTasksByLocation() in the service layer
 * for authenticated, location-scoped reads.
 */

import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { fromItem } from "./dynamo-helpers";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { executeQuery } from "./query-executor";
import {
  createTask as repoCreateTask,
  getTaskById as repoGetTaskById,
  updateTask as repoUpdateTask,
  deleteTask as repoDeleteTask,
  getTasksByLocation as repoGetTasksByLocation,
} from "~/server/db/repositories/task.repository";

export class TasksDataSource implements DataSource<Task, TaskField> {

  // --- Location-scoped read (primary read path) ----------------------------

  /**
   * Query tasks scoped to a specific location.
   * Uses the LOCATION#<locId>/TASK#* index — no full table scan.
   */
  async queryByLocation(
    locationId: string,
    spec: QuerySpec<TaskField>
  ): Promise<ApiResult<QueryResult<Task>>> {
    try {
      const tasks = await repoGetTasksByLocation(locationId);
      return { success: true, data: executeQuery(tasks, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "queryByLocation failed",
      };
    }
  }

  // --- Interface: query() (unscoped — not used in production read path) ----

  async query(_spec: QuerySpec<TaskField>): Promise<ApiResult<QueryResult<Task>>> {
    return { success: false, error: "Use queryByLocation() for location-scoped reads." };
  }

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

  async getCount(
    _filters?: QuerySpec<TaskField>["filters"]
  ): Promise<ApiResult<number>> {
    return { success: false, error: "Use queryByLocation() for count." };
  }

  // --- Write operations ----------------------------------------------------

  async create(
    data: CreateTaskRequest & { createdBy: string }
  ): Promise<ApiResult<Task>> {
    try {
      const { createdBy, ...request } = data;
      const task = await repoCreateTask(request, createdBy);
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
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "delete failed",
      };
    }
  }
}
