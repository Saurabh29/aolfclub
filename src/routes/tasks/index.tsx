import { createResource, createSignal, For, Show, createMemo } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { tasksApi, usersApi } from "~/lib/user-api";
import { TaskStatus, TaskPriority } from "~/lib/schemas/ui/task.schema";
import type { Task } from "~/lib/schemas/ui/task.schema";

/**
 * Task Board - Kanban View
 *
 * Features:
 * - Three columns: To Do, In Progress, Completed
 * - Drag & drop to change status
 * - Task cards showing title, assigned users, participants count, due date, priority
 * - Click card to view/edit
 */

export default function TaskBoardPage() {
  const navigate = useNavigate();

  // ============================================================================
  // STATE
  // ============================================================================

  // Use createResource for proper async data handling
  const [tasks, { refetch: refetchTasks }] = createResource(() =>
    tasksApi.getAll(),
  );
  const [users] = createResource(() => usersApi.getAll());

  const [draggedTaskId, setDraggedTaskId] = createSignal<string | null>(null);

  // ============================================================================
  // TASK FILTERING
  // ============================================================================

  const todoTasks = createMemo(() =>
    (tasks() || []).filter((t) => t.status === TaskStatus.TO_DO),
  );
  const inProgressTasks = createMemo(() =>
    (tasks() || []).filter((t) => t.status === TaskStatus.IN_PROGRESS),
  );
  const completedTasks = createMemo(() =>
    (tasks() || []).filter((t) => t.status === TaskStatus.COMPLETED),
  );

  // ============================================================================
  // DRAG & DROP
  // ============================================================================

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = draggedTaskId();
    if (!taskId) return;

    try {
      await tasksApi.updateStatus(taskId, newStatus);
      refetchTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
      alert("Failed to update task status");
    } finally {
      setDraggedTaskId(null);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getUserNames = (userIds: string[]): string => {
    const userList = users() || [];
    const names = userIds.map((id) => {
      const user = userList.find((u) => u.id === id);
      return user?.fullName || "Unknown";
    });
    return names.join(", ");
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "bg-red-500";
      case TaskPriority.MEDIUM:
        return "bg-yellow-500";
      case TaskPriority.LOW:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const isOverdue = (dateStr: string): boolean => {
    return new Date(dateStr) < new Date();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Task Board</h1>
              <p class="text-sm text-gray-600 mt-1">
                Manage and track all tasks
              </p>
            </div>
            <div class="flex items-center gap-3">
              <A href="/tasks/list">
                <Button variant="outline" size="sm">
                  List View
                </Button>
              </A>
              <A href="/tasks/create">
                <Button size="sm" class="flex items-center gap-2">
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Task
                </Button>
              </A>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Show
          when={!tasks.loading}
          fallback={
            <div class="text-center py-12">
              <p class="text-gray-500">Loading tasks...</p>
            </div>
          }
        >
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* To Do Column */}
            <div
              class="bg-gray-100 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, TaskStatus.TO_DO)}
            >
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  To Do
                </h2>
                <Badge variant="secondary">{todoTasks().length}</Badge>
              </div>
              <div class="space-y-3">
                <For each={todoTasks()}>
                  {(task) => (
                    <TaskCard
                      task={task}
                      getUserNames={getUserNames}
                      formatDate={formatDate}
                      getPriorityColor={getPriorityColor}
                      isOverdue={isOverdue}
                      onDragStart={handleDragStart}
                      onClick={() => navigate(`/tasks/edit/${task.id}`)}
                    />
                  )}
                </For>
                <Show when={todoTasks().length === 0}>
                  <p class="text-sm text-gray-500 text-center py-8">No tasks</p>
                </Show>
              </div>
            </div>

            {/* In Progress Column */}
            <div
              class="bg-gray-100 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, TaskStatus.IN_PROGRESS)}
            >
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                  In Progress
                </h2>
                <Badge variant="secondary">{inProgressTasks().length}</Badge>
              </div>
              <div class="space-y-3">
                <For each={inProgressTasks()}>
                  {(task) => (
                    <TaskCard
                      task={task}
                      getUserNames={getUserNames}
                      formatDate={formatDate}
                      getPriorityColor={getPriorityColor}
                      isOverdue={isOverdue}
                      onDragStart={handleDragStart}
                      onClick={() => navigate(`/tasks/edit/${task.id}`)}
                    />
                  )}
                </For>
                <Show when={inProgressTasks().length === 0}>
                  <p class="text-sm text-gray-500 text-center py-8">No tasks</p>
                </Show>
              </div>
            </div>

            {/* Completed Column */}
            <div
              class="bg-gray-100 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, TaskStatus.COMPLETED)}
            >
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span>
                  Completed
                </h2>
                <Badge variant="secondary">{completedTasks().length}</Badge>
              </div>
              <div class="space-y-3">
                <For each={completedTasks()}>
                  {(task) => (
                    <TaskCard
                      task={task}
                      getUserNames={getUserNames}
                      formatDate={formatDate}
                      getPriorityColor={getPriorityColor}
                      isOverdue={isOverdue}
                      onDragStart={handleDragStart}
                      onClick={() => navigate(`/tasks/edit/${task.id}`)}
                    />
                  )}
                </For>
                <Show when={completedTasks().length === 0}>
                  <p class="text-sm text-gray-500 text-center py-8">No tasks</p>
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================

type TaskCardProps = {
  task: Task;
  getUserNames: (ids: string[]) => string;
  formatDate: (date: string) => string;
  getPriorityColor: (priority: string) => string;
  isOverdue: (date: string) => boolean;
  onDragStart: (id: string) => void;
  onClick: () => void;
};

function TaskCard(props: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={() => props.onDragStart(props.task.id)}
      onClick={props.onClick}
      class="bg-white rounded-md p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow"
    >
      {/* Priority Badge */}
      <div class="flex items-start justify-between mb-2">
        <h3 class="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
          {props.task.title}
        </h3>
        <span
          class={cn(
            "w-2 h-2 rounded-full ml-2 mt-1",
            props.getPriorityColor(props.task.priority),
          )}
        />
      </div>

      {/* Assigned To */}
      <div class="flex items-center gap-1 text-xs text-gray-600 mb-2">
        <svg
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span class="truncate">
          {props.getUserNames(props.task.assignedTo)}
        </span>
      </div>

      {/* Participants Count */}
      <div class="flex items-center gap-3 text-xs text-gray-600 mb-3">
        <Show when={props.task.assignedLeads.length > 0}>
          <span class="flex items-center gap-1">
            <svg
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {props.task.assignedLeads.length} leads
          </span>
        </Show>
        <Show when={props.task.assignedParticipants.length > 0}>
          <span class="flex items-center gap-1">
            <svg
              class="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            {props.task.assignedParticipants.length} members
          </span>
        </Show>
      </div>

      {/* Due Date */}
      <div
        class={cn(
          "text-xs flex items-center gap-1",
          props.isOverdue(props.task.dueDate)
            ? "text-red-600"
            : "text-gray-600",
        )}
      >
        <svg
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {props.formatDate(props.task.dueDate)}
      </div>
    </div>
  );
}
