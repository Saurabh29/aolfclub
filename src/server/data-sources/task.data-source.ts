import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { generateDummyTasks } from "./dummy-data";
import { executeQuery } from "./query-executor";
import { ulid } from "ulid";

/**
 * In-memory task data source with create/update support
 */
export class DummyTaskDataSource implements DataSource<Task, TaskField> {
  private tasks: Task[];

  constructor() {
    this.tasks = generateDummyTasks(20);
  }

  async query(spec: QuerySpec<TaskField>): Promise<ApiResult<QueryResult<Task>>> {
    try {
      return { success: true, data: executeQuery(this.tasks, spec) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getById(id: string): Promise<ApiResult<Task | null>> {
    try {
      const task = this.tasks.find((t) => t.id === id);
      return { success: true, data: task ?? null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getCount(): Promise<ApiResult<number>> {
    return { success: true, data: this.tasks.length };
  }

  async create(request: CreateTaskRequest & { createdBy: string }): Promise<ApiResult<Task>> {
    try {
      const now = new Date().toISOString();
      const newTask: Task = {
        id: ulid(),
        ...request,
        status: "Draft",
        createdAt: now,
        updatedAt: now,
      };

      this.tasks.push(newTask);

      return { success: true, data: newTask };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async update(id: string, updates: Partial<Task>): Promise<ApiResult<Task>> {
    try {
      const index = this.tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return { success: false, error: "Task not found" };
      }

      const updatedTask: Task = {
        ...this.tasks[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      this.tasks[index] = updatedTask;

      return { success: true, data: updatedTask };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const index = this.tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return { success: false, error: "Task not found" };
      }

      this.tasks.splice(index, 1);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
