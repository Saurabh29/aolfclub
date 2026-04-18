import { tasksDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * Task Service - Uses generic collection service factory for getById.
 * Read queries are location-scoped via queryTasksByLocation().
 */
const service = createCollectionService<Task, TaskField>(tasksDataSource);

export const getTaskById = service.getById;
export const getTaskCount = service.getCount;

/**
 * Query tasks scoped to a location.
 * locationId is always resolved server-side from the authenticated session.
 */
export async function queryTasksByLocation(
  locationId: string,
  spec: QuerySpec<TaskField>
): Promise<ApiResult<QueryResult<Task>>> {
  return tasksDataSource.queryByLocation(locationId, spec);
}

/**
 * Create a new task
 */
export async function createTask(
  request: CreateTaskRequest,
  createdBy: string
): Promise<Task> {
  const result = await tasksDataSource.create!({ ...request, createdBy });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const result = await tasksDataSource.update!(id, updates);
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
