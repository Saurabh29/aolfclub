import { query } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import { queryTasks, getTaskById, createTask, updateTask } from "../services";
import type { QuerySpec } from "~/lib/schemas/query";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";

export const queryTasksQuery = query(async (spec: QuerySpec<TaskField>) => {
  "use server";
  return execQuery(spec, queryTasks);
}, "query-tasks");

export const getTaskByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getTaskById(id));
}, "task-by-id");

/**
 * Create new task — userId comes from the authenticated session.
 */
export const createTaskMutation = query(async (request: CreateTaskRequest): Promise<Task> => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.userId) throw new Error("Not authenticated");
  return await createTask(request, session.userId);
}, "createTask");

/**
 * Update task
 */
export const updateTaskMutation = query(async (id: string, updates: Partial<Task>): Promise<Task> => {
  "use server";
  return await updateTask(id, updates);
}, "updateTask");
