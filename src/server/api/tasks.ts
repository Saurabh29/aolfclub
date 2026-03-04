import { query } from "@solidjs/router";
import { queryTasks, getTaskById, createTask, updateTask } from "../services";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";

/**
 * Query tasks
 */
export const queryTasksQuery = query(async (spec: QuerySpec<TaskField>): Promise<QueryResult<Task>> => {
  "use server";
  return await queryTasks(spec);
}, "queryTasks");

/**
 * Get task by ID
 */
export const getTaskByIdQuery = query(async (id: string): Promise<Task | null> => {
  "use server";
  return await getTaskById(id);
}, "getTaskById");

/**
 * Create new task
 * Note: In real app, createdBy would come from authenticated session
 */
export const createTaskMutation = query(async (request: CreateTaskRequest): Promise<Task> => {
  "use server";
  // TODO: Get actual user ID from session
  const createdBy = "admin_user_id"; // Placeholder
  return await createTask(request, createdBy);
}, "createTask");

/**
 * Update task
 */
export const updateTaskMutation = query(async (id: string, updates: Partial<Task>): Promise<Task> => {
  "use server";
  return await updateTask(id, updates);
}, "updateTask");
