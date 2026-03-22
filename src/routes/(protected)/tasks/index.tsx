import { createSignal, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { createResource } from "solid-js";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { queryTasksQuery } from "~/server/api";
import type { QuerySpec } from "~/lib/schemas/query";
import type { TaskField } from "~/lib/schemas/domain";

/**
 * Tasks List Page
 * Shows all call tasks with filters and actions
 */
export default function TasksPage() {
  const [tasksData] = createResource(async () => {
    const spec: QuerySpec<TaskField> = {
      filters: [],
      sorting: [{ field: "createdAt", direction: "desc" }],
      pagination: { pageSize: 50, pageIndex: 0 },
    };
    return await queryTasksQuery(spec);
  });

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Draft":
        return "secondary";
      case "Paused":
        return "warning";
      case "Completed":
        return "default";
      case "Cancelled":
        return "error";
      default:
        return "outline";
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "PreAssigned":
        return "Pre-Assigned";
      case "LeadPool":
        return "Lead Pool";
      case "Hybrid":
        return "Hybrid";
      default:
        return mode;
    }
  };

  return (
    <main class="container mx-auto p-8">
      {/* Header */}
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold mb-2">Call Tasks</h1>
          <p class="text-muted-foreground">
            Manage call campaigns and track agent progress
          </p>
        </div>
        <A href="/tasks/create">
          <Button>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Task
          </Button>
        </A>
      </div>

      {/* Loading State */}
      <Show when={tasksData.loading}>
        <div class="text-center py-12 text-muted-foreground">
          Loading tasks...
        </div>
      </Show>

      {/* Tasks Grid */}
      <Show when={!tasksData.loading && tasksData()}>
        <div class="grid gap-4">
          <For
            each={tasksData()?.items || []}
            fallback={
              <Card class="p-12 text-center">
                <div class="text-muted-foreground mb-4">
                  <svg class="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p class="text-lg font-medium">No tasks yet</p>
                  <p class="text-sm">Create your first call task to get started</p>
                </div>
                <A href="/tasks/create">
                  <Button>Create Task</Button>
                </A>
              </Card>
            }
          >
            {(task) => (
              <Card>
                <CardHeader>
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <CardTitle class="mb-1">{task.name}</CardTitle>
                      <CardDescription class="line-clamp-2">
                        {task.objective || "No objective specified"}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div class="text-muted-foreground text-xs">Agents</div>
                      <div class="font-medium">
                        {task.selectedAgentIds.length}
                      </div>
                    </div>
                    <div>
                      <div class="text-muted-foreground text-xs">Leads</div>
                      <div class="font-medium">
                        {task.matchedLeadIds.length}
                      </div>
                    </div>
                    <div>
                      <div class="text-muted-foreground text-xs">Mode</div>
                      <div class="font-medium text-xs">
                        {getModeLabel(task.assignmentMode)}
                      </div>
                    </div>
                    <div>
                      <div class="text-muted-foreground text-xs">
                        {task.deadline ? "Deadline" : "Created"}
                      </div>
                      <div class="font-medium text-xs">
                        {task.deadline ? formatDate(task.deadline) : formatDate(task.createdAt)}
                      </div>
                    </div>
                  </div>
                  <Show when={task.targetCallsPerAgent}>
                    <div class="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Target: {task.targetCallsPerAgent} calls per agent
                    </div>
                  </Show>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </Show>
    </main>
  );
}
