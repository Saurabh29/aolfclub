import { useNavigate, useAction } from "@solidjs/router";
import { TaskWizard } from "~/components/tasks/TaskWizard";
import { createTaskMutation } from "~/server/api";

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const doCreateTask = useAction(createTaskMutation);

  return (
    <main class="container mx-auto p-8 max-w-4xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Create Call Task</h1>
        <p class="text-muted-foreground">Set up a new call campaign for your team</p>
      </div>
      <TaskWizard
        title="Create Call Task"
        submitLabel="Create Task"
        onSubmit={async (data) => {
          await doCreateTask(data);
          navigate("/tasks");
        }}
        onCancel={() => navigate("/tasks")}
      />
    </main>
  );
}
