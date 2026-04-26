import { Show } from "solid-js";
import { useNavigate, useAction, createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { ArrowLeft } from "lucide-solid";
import { TaskWizard } from "~/components/tasks/TaskWizard";
import { getTaskByIdQuery, updateTaskMutation } from "~/server/api";
import type { TaskStatus } from "~/lib/schemas/domain";

export const route = {
  preload: (args: { params: Record<string, string | undefined> }) =>
    getTaskByIdQuery(args.params.id!),
} satisfies RouteDefinition;

export default function EditTaskPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doUpdateTask = useAction(updateTaskMutation);

  const task = createAsync(() => getTaskByIdQuery(params.id));

  return (
    <main class="container mx-auto p-8 max-w-4xl">
      <div class="mb-6">
        <a href="/tasks" class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft class="w-3.5 h-3.5" /> Back to Tasks
        </a>
        <h1 class="text-3xl font-bold mt-2 mb-1">Edit Task</h1>
        <Show when={task()}>
          {(t) => (
            <p class="text-muted-foreground text-sm">
              {t().targetUserType === "LEAD" ? "Leads" : "Members"} task &middot;{" "}
              created {new Date(t().createdAt).toLocaleDateString()}
            </p>
          )}
        </Show>
      </div>

      <Show
        when={task()}
        fallback={<div class="text-muted-foreground text-sm p-8">Loading task...</div>}
      >
        {(t) => (
          <TaskWizard
            title="Edit Task"
            submitLabel="Save Changes"
            showStatus
            initialData={{
              name: t().name,
              objective: t().objective ?? "",
              deadline: t().deadline,
              targetCallsPerAgent: t().targetCallsPerAgent,
              targetUserType: t().targetUserType,
              selectedAgentIds: [...t().selectedAgentIds],
              matchedContactIds: [...t().matchedContactIds],
              contactFilterSpec: t().contactFilterSpec,
              assignments: [...t().assignments],
              contactPoolIds: [...t().contactPoolIds],
              assignmentMode: t().assignmentMode,
              status: t().status as TaskStatus,
            }}
            onSubmit={async (data) => {
              await doUpdateTask(params.id, data);
              navigate("/tasks");
            }}
            onCancel={() => navigate("/tasks")}
          />
        )}
      </Show>
    </main>
  );
}
