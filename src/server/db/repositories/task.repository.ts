/**
 * Task Repository
 *
 * Data access layer for Task entities.
 * Tasks are identified by ULID and scoped to a location via an index item.
 *
 * Item shapes:
 *   TASK#<id>             / META          -  Task entity
 *   LOCATION#<locId>      / TASK#<id>     -  Location-scoped index item
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand,
  BatchGetCommand,
  QueryCommand,
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
 * Atomically writes:
 *   - TASK#<id>/META
 *   - LOCATION#<locId>/TASK#<id>  (location-scoped index item)
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
    // Use status from input if provided (e.g. "Draft" for future save-as-draft);
    // default to "Active" since tasks created via the wizard are being launched.
    status: (input as any).status ?? "Active",
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const locationIndexItem = {
    PK: Keys.locationPK(input.locationId),
    SK: Keys.taskSK(id),
    itemType: "LocationTaskIndex",
    locationId: input.locationId,
    taskId: id,
    createdAt: timestamp,
  };

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: taskItem,
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: locationIndexItem,
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
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
    // Skip undefined values — DynamoDB rejects attribute values that are present
    // in the expression but not defined (happens when optional fields are unset).
    if (value === undefined) continue;
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
 * Also removes the LOCATION#<locId>/TASK#<id> index item.
 */
export async function deleteTask(id: string): Promise<void> {
  const existing = await getTaskById(id);
  if (!existing) return;

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: Keys.taskPK(id), SK: Keys.metaSK() },
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: Keys.locationPK(existing.locationId),
              SK: Keys.taskSK(id),
            },
          },
        },
      ],
    })
  );
}

/**
 * Get all tasks for a location.
 * Step 1: Query LOCATION#<locId> / TASK#* index items to get task IDs.
 * Step 2: BatchGetItem to fetch each task entity.
 */
export async function getTasksByLocation(locationId: string): Promise<Task[]> {
  const taskIds: string[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.locationPK(locationId),
          ":skPrefix": Keys.TASK_PREFIX,
        },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of result.Items ?? []) {
      taskIds.push(item.taskId as string);
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  if (taskIds.length === 0) return [];

  const tasks: Task[] = [];
  for (let i = 0; i < taskIds.length; i += 100) {
    const chunk = taskIds.slice(i, i + 100);
    const keys = chunk.map((tid) => ({ PK: Keys.taskPK(tid), SK: Keys.metaSK() }));

    const response = await docClient.send(
      new BatchGetCommand({
        RequestItems: { [TABLE_NAME]: { Keys: keys } },
      })
    );

    for (const item of response.Responses?.[TABLE_NAME] ?? []) {
      tasks.push(toTask(item as Record<string, unknown>));
    }
  }

  return tasks;
}
