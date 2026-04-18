/**
 * Task Repository
 *
 * Data access layer for Task entities.
 * Tasks have no uniqueness sentinel  -  they are identified by ULID only.
 *
 * Item shape:
 *   TASK#<id> / META   -  Task entity
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import type { Task, CreateTaskRequest } from "~/lib/schemas/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTask(item: Record<string, unknown>): Task {
  const { PK, SK, itemType, ...rest } = item;
  return rest as unknown as Task;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new task.
 * Writes a single TASK#<id>/META item.
 */
export async function createTask(
  input: CreateTaskRequest,
  createdBy: string
): Promise<Task> {
  const id = ulid();
  const timestamp = now();

  const taskItem = {
    PK: Keys.taskPK(id),
    SK: Keys.metaSK(),
    itemType: "Task",
    id,
    ...input,
    assignments: input.assignments ?? [],
    contactPoolIds: input.contactPoolIds ?? [],
    status: "Draft" as const,
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: taskItem,
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return toTask(taskItem);
}

/**
 * Get a task by ULID.
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.taskPK(id), SK: Keys.metaSK() },
    })
  );
  return result.Item ? toTask(result.Item as Record<string, unknown>) : null;
}

/**
 * Update task fields.
 * Builds a dynamic UpdateExpression from the supplied partial object.
 */
export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy">>
): Promise<Task> {
  const timestamp = now();
  const payload = { ...updates, updatedAt: timestamp };

  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const parts: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    const nameKey = `#f_${key}`;
    const valueKey = `:v_${key}`;
    names[nameKey] = key;
    values[valueKey] = value;
    parts.push(`${nameKey} = ${valueKey}`);
  }

  if (parts.length === 0) {
    const existing = await getTaskById(id);
    if (!existing) throw new Error(`Task "${id}" not found`);
    return existing;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.taskPK(id), SK: Keys.metaSK() },
      UpdateExpression: `SET ${parts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(PK)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toTask(result.Attributes as Record<string, unknown>);
}

/**
 * Delete a task by ULID.
 */
export async function deleteTask(id: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: Keys.taskPK(id), SK: Keys.metaSK() },
    })
  );
}
