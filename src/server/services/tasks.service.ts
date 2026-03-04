import { tasksDataSource } from "../data-sources/instances";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Task Service - Manages call tasks/campaigns
 */

/**
 * Query tasks using QuerySpec
 */
export async function queryTasks(
  spec: QuerySpec<TaskField>
): Promise<QueryResult<Task>> {
  const result = await tasksDataSource.query(spec);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const result = await tasksDataSource.getById(id);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Get task count
 */
export async function getTaskCount(): Promise<number> {
  const result = await tasksDataSource.getCount();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Create a new task
 */
export async function createTask(
  request: CreateTaskRequest,
  createdBy: string
): Promise<Task> {
  const result = await tasksDataSource.create({ ...request, createdBy });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const result = await tasksDataSource.update(id, updates);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const result = await tasksDataSource.delete?.(id);
  if (result && !result.success) {
    throw new Error(result.error);
  }
}
