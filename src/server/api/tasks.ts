import { query, action } from "@solidjs/router";
import { execQuery, unwrap } from "./helpers";
import { queryTasksByLocation, getTaskById, createTask, updateTask } from "../services";
import { getActiveLocationId } from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";

export const queryTasksQuery = query(async (spec: QuerySpec<TaskField>) => {
  "use server";
  const { getSessionInfo } = await import("~/lib/auth");
  const session = await getSessionInfo();
  if (!session.activeLocationId) throw new Error("No active location selected.");
  return execQuery(spec, (s) => queryTasksByLocation(session.activeLocationId!, s));
}, "query-tasks");

export const getTaskByIdQuery = query(async (id: string) => {
  "use server";
  return unwrap(await getTaskById(id));
}, "task-by-id");

/**
 * Create new task  -  locationId resolved from DB, never trusted from client.
 */
export const createTaskMutation = action(
  async (request: Omit<CreateTaskRequest, "locationId">): Promise<Task> => {
    "use server";
    const { getSessionInfo } = await import("~/lib/auth");
    const session = await getSessionInfo();
    if (!session.userId) throw new Error("Not authenticated");
    const locResult = await getActiveLocationId(session.userId);
    const locationId = locResult.success ? locResult.data : null;
    if (!locationId) throw new Error("No active location selected. Please set an active location before creating a task.");
    return await createTask({ ...request, locationId } as CreateTaskRequest, session.userId);
  },
  "createTask"
);

/**
 * Update task
 */
export const updateTaskMutation = action(
  async (id: string, updates: Partial<Task>): Promise<Task> => {
    "use server";
    return await updateTask(id, updates);
  },
  "updateTask"
);
