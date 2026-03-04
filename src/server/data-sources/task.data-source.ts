import type { Task, TaskField, CreateTaskRequest } from "~/lib/schemas/domain";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { DataSource } from "./data-source.interface";
import { generateDummyTasks } from "./dummy-data";
import { ulid } from "ulid";

/**
 * Extended DataSource interface for entities that support create/update
 */
export interface WritableDataSource<T, TField extends string = string>
  extends DataSource<T, TField> {
  create(data: Partial<T>): Promise<ApiResult<T>>;
  update(id: string, data: Partial<T>): Promise<ApiResult<T>>;
  delete?(id: string): Promise<ApiResult<void>>;
}

/**
 * In-memory task data source with create/update support
 */
export class DummyTaskDataSource implements WritableDataSource<Task, TaskField> {
  private tasks: Task[];

  constructor() {
    this.tasks = generateDummyTasks(20);
  }

  async query(spec: QuerySpec<TaskField>): Promise<ApiResult<QueryResult<Task>>> {
    try {
      let results = [...this.tasks];

      // Apply filters
      for (const filter of spec.filters) {
        results = results.filter((task) => {
          const value = (task as any)[filter.field];

          switch (filter.op) {
            case "eq":
              return value === filter.value;
            case "neq":
              return value !== filter.value;
            case "contains":
              return typeof value === "string" && value.includes(String(filter.value));
            case "startsWith":
              return typeof value === "string" && value.startsWith(String(filter.value));
            case "endsWith":
              return typeof value === "string" && value.endsWith(String(filter.value));
            case "gt":
              return (value as any) > (filter.value as any);
            case "lt":
              return (value as any) < (filter.value as any);
            case "gte":
              return (value as any) >= (filter.value as any);
            case "lte":
              return (value as any) <= (filter.value as any);
            case "in":
              return Array.isArray(filter.value) && filter.value.includes(value);
            default:
              return true;
          }
        });
      }

      // Apply sorting
      if (spec.sorting.length > 0) {
        results.sort((a, b) => {
          for (const sort of spec.sorting) {
            const aVal = (a as any)[sort.field];
            const bVal = (b as any)[sort.field];

            if (aVal === bVal) continue;
            if (aVal === undefined) return 1;
            if (bVal === undefined) return -1;

            const comparison = aVal < bVal ? -1 : 1;
            return sort.direction === "asc" ? comparison : -comparison;
          }
          return 0;
        });
      }

      const totalCount = results.length;

      // Apply pagination
      const pageIndex = spec.pagination.pageIndex ?? 0;
      const offset = pageIndex * spec.pagination.pageSize;
      const items = results.slice(offset, offset + spec.pagination.pageSize);

      const hasNextPage = offset + spec.pagination.pageSize < totalCount;

      return {
        success: true,
        data: {
          items,
          pageInfo: {
            totalCount,
            hasNextPage,
            nextCursor: hasNextPage ? btoa(String(offset + spec.pagination.pageSize)) : undefined,
          },
        },
      };
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
