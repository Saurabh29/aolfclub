import { query, action } from "@solidjs/router";
import { execQuery, unwrap, requireCapability } from "./helpers";
import { queryTasksByLocation, getTaskById, createTask, updateTask } from "../services";
import type { QuerySpec } from "~/lib/schemas/query";
import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import { CreateTaskRequestSchema } from "~/lib/schemas/domain";

export const queryTasksQuery = query(async (spec: QuerySpec<TaskField>) => {
  "use server";
  const session = await requireCapability("tasks:read");
  return execQuery(spec, (s) => queryTasksByLocation(session.activeLocationId, s));
}, "query-tasks");

export const getTaskByIdQuery = query(async (id: string) => {
  "use server";
  await requireCapability("tasks:read");
  return unwrap(await getTaskById(id));
}, "task-by-id");

/**
 * Create new task  -  locationId resolved from session, never trusted from client.
 */
export const createTaskMutation = action(
  async (request: Omit<CreateTaskRequest, "locationId">) => {
    "use server";
    const session = await requireCapability("tasks:write");
    const fullRequest = { ...request, locationId: session.activeLocationId };
    CreateTaskRequestSchema.parse(fullRequest);
    return unwrap(await createTask(fullRequest as CreateTaskRequest, session.userId));
  },
  "createTask"
);

/**
 * Update task  -  requires tasks:write capability.
 */
export const updateTaskMutation = action(
  async (id: string, updates: Partial<Task>) => {
    "use server";
    await requireCapability("tasks:write");
    return unwrap(await updateTask(id, updates));
  },
  "updateTask"
);
