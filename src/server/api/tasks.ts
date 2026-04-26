import { query, action } from "@solidjs/router";
import { execQuery, unwrap, requirePageAccess } from "./helpers";
import { queryTasksByLocation, getTaskById, createTask, updateTask } from "../services";
import type { QuerySpec } from "~/lib/schemas/query";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import { CreateTaskRequestSchema } from "~/lib/schemas/domain";

export const queryTasksQuery = query(async (spec: QuerySpec<TaskField>) => {
  "use server";
  const session = await requirePageAccess("tasks");
  return execQuery(spec, (s) => queryTasksByLocation(session.activeLocationId, s));
}, "query-tasks");

export const getTaskByIdQuery = query(async (id: string) => {
  "use server";
  await requirePageAccess("tasks");
  return unwrap(await getTaskById(id));
}, "task-by-id");

/**
 * Create new task  -  locationId resolved from session, never trusted from client.
 */
export const createTaskMutation = action(
  async (request: Omit<CreateTaskRequest, "locationId">) => {
    "use server";
    const session = await requirePageAccess("tasks");
    const fullRequest = { ...request, locationId: session.activeLocationId };
    CreateTaskRequestSchema.parse(fullRequest);
    return unwrap(await createTask(fullRequest as CreateTaskRequest, session.userId));
  },
  "createTask"
);

/**
 * Update task  -  requires auth + ADMIN or TEACHER role.
 */
export const updateTaskMutation = action(
  async (id: string, updates: Partial<Task>) => {
    "use server";
    const session = await requirePageAccess("tasks");
    if (!session.isAdmin && session.activeRole !== "ADMIN" && session.activeRole !== "TEACHER") {
      throw new Error("Unauthorized: only Admins or Teachers can update tasks.");
    }
    return unwrap(await updateTask(id, updates));
  },
  "updateTask"
);
