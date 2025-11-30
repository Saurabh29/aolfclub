import { createResource, createSignal, For, Show, createMemo } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { tasksApi, usersApi } from "~/lib/user-api";
import { TaskStatus, TaskPriority } from "~/schemas/task.schema";
import type { Task } from "~/schemas/task.schema";
import type { User } from "~/schemas/user.schema";
import { UserRole } from "~/schemas/user.schema";

/**
 * Task List Page - Table View
 * 
 * Features:
 * - Table with columns: Title, Assigned To, Leads/Participants Count, Priority, Due Date, Status
 * - Search by title/description
 * - Filters: By Teacher/Volunteer, By Status, By Priority
 * - Actions: View / Edit / Delete
 */

export default function TaskListPage() {
  const navigate = useNavigate();

  // ============================================================================
  // STATE
  // ============================================================================

  // Use createResource for proper async data handling
  const [tasks, { refetch: refetchTasks }] = createResource(() => tasksApi.getAll());
  const [users] = createResource(() => usersApi.getAll());
  
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filterStatus, setFilterStatus] = createSignal<string>("all");
  const [filterPriority, setFilterPriority] = createSignal<string>("all");
  const [filterAssignee, setFilterAssignee] = createSignal<string>("all");

  // ============================================================================
  // FILTERING
  // ============================================================================

  const teachersAndVolunteers = createMemo(() => {
    const userList = users() || [];
    return userList.filter((u) => u.role === UserRole.TEACHER || u.role === UserRole.VOLUNTEER);
  });

  const filteredTasks = createMemo(() => {
    let filtered = tasks() || [];

    // Search
    const query = searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus() !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus());
    }

    // Filter by priority
    if (filterPriority() !== "all") {
      filtered = filtered.filter((t) => t.priority === filterPriority());
    }

    // Filter by assignee
    if (filterAssignee() !== "all") {
      filtered = filtered.filter((t) => t.assignedTo.includes(filterAssignee()));
    }

    return filtered;
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await tasksApi.delete(taskId);
      refetchTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "bg-red-100 text-red-800";
      case TaskPriority.MEDIUM:
        return "bg-yellow-100 text-yellow-800";
      case TaskPriority.LOW:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case TaskStatus.TO_DO:
        return "bg-blue-100 text-blue-800";
      case TaskStatus.IN_PROGRESS:
        return "bg-yellow-100 text-yellow-800";
      case TaskStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case TaskStatus.DRAFT:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isOverdue = (dateStr: string, status: string): boolean => {
    return status !== TaskStatus.COMPLETED && new Date(dateStr) < new Date();
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
              <h1 class="text-2xl font-bold text-gray-900">All Tasks</h1>
              <p class="text-sm text-gray-600 mt-1">
                View and manage all tasks
              </p>
            </div>
            <div class="flex items-center gap-3">
              <A href="/tasks">
                <Button variant="outline" size="sm">
                  Board View
                </Button>
              </A>
              <A href="/tasks/create">
                <Button size="sm" class="flex items-center gap-2">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
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
        {/* Filters */}
        <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div class="md:col-span-1">
            <Input
              type="search"
              placeholder="Search tasks..."
              value={searchQuery()}
              onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setSearchQuery(e.currentTarget.value)}
              class="w-full"
            />
          </div>

          {/* Filter by Assignee */}
          <Select
            value={filterAssignee()}
            onChange={(value) => value && setFilterAssignee(value)}
            options={["all", ...teachersAndVolunteers().map(u => u.id)]}
            placeholder="All Assignees"
            itemComponent={(itemProps) => {
              const user = teachersAndVolunteers().find(u => u.id === itemProps.item.rawValue);
              return (
                <SelectItem item={itemProps.item}>
                  {itemProps.item.rawValue === "all" ? "All Assignees" : (user?.fullName || "Unknown")}
                </SelectItem>
              );
            }}
          >
            <SelectTrigger class="bg-white">
              <SelectValue<string>>{(state) => {
                const val = state.selectedOption();
                if (val === "all") return "All Assignees";
                const user = teachersAndVolunteers().find(u => u.id === val);
                return user?.fullName || "All Assignees";
              }}</SelectValue>
            </SelectTrigger>
            <SelectContent class="bg-white border border-gray-200" />
          </Select>

          {/* Filter by Status */}
          <Select
            value={filterStatus()}
            onChange={(value) => value && setFilterStatus(value)}
            options={["all", TaskStatus.TO_DO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.DRAFT]}
            placeholder="All Statuses"
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>
                {itemProps.item.rawValue === "all" ? "All Statuses" : itemProps.item.rawValue}
              </SelectItem>
            )}
          >
            <SelectTrigger class="bg-white">
              <SelectValue<string>>{(state) => state.selectedOption() === "all" ? "All Statuses" : state.selectedOption()}</SelectValue>
            </SelectTrigger>
            <SelectContent class="bg-white border border-gray-200" />
          </Select>

          {/* Filter by Priority */}
          <Select
            value={filterPriority()}
            onChange={(value) => value && setFilterPriority(value)}
            options={["all", TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]}
            placeholder="All Priorities"
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>
                {itemProps.item.rawValue === "all" ? "All Priorities" : itemProps.item.rawValue}
              </SelectItem>
            )}
          >
            <SelectTrigger class="bg-white">
              <SelectValue<string>>{(state) => state.selectedOption() === "all" ? "All Priorities" : state.selectedOption()}</SelectValue>
            </SelectTrigger>
            <SelectContent class="bg-white border border-gray-200" />
          </Select>
        </div>

        {/* Task Table */}
        <Card>
          <CardContent class="p-0">
            <Show
              when={!tasks.loading}
              fallback={
                <div class="text-center py-12">
                  <p class="text-gray-500">Loading tasks...</p>
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <For each={filteredTasks()}>
                      {(task) => (
                        <tr class="hover:bg-gray-50">
                          <td class="px-6 py-4">
                            <div>
                              <p class="text-sm font-medium text-gray-900">{task.title}</p>
                              <p class="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <p class="text-sm text-gray-900">{getUserNames(task.assignedTo)}</p>
                          </td>
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-2 text-xs text-gray-600">
                              <Show when={task.assignedLeads.length > 0}>
                                <span>{task.assignedLeads.length} leads</span>
                              </Show>
                              <Show when={task.assignedParticipants.length > 0}>
                                <span>{task.assignedParticipants.length} members</span>
                              </Show>
                              <Show when={task.assignedLeads.length === 0 && task.assignedParticipants.length === 0}>
                                <span class="text-gray-400">None</span>
                              </Show>
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <Badge class={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </td>
                          <td class="px-6 py-4">
                            <p class={cn(
                              "text-sm",
                              isOverdue(task.dueDate, task.status)
                                ? "text-red-600 font-medium"
                                : "text-gray-900"
                            )}>
                              {formatDate(task.dueDate)}
                            </p>
                          </td>
                          <td class="px-6 py-4">
                            <Badge class={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </td>
                          <td class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/tasks/edit/${task.id}`)}
                                class="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                class="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <Show when={filteredTasks().length === 0}>
                <div class="text-center py-12">
                  <p class="text-gray-500">No tasks found</p>
                </div>
              </Show>
            </Show>
          </CardContent>
        </Card>

        {/* Summary */}
        <div class="mt-4 text-sm text-gray-600">
          Showing {filteredTasks().length} of {tasks()?.length || 0} tasks
        </div>
      </main>
    </div>
  );
}
