import { createSignal, Show } from "solid-js";
import { useNavigate, useAction } from "@solidjs/router";
import { Stepper, type Step } from "~/components/ui/stepper";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { SelectTeamStep } from "~/components/tasks/SelectTeamStep";
import { AssignmentStrategyStep, type AssignStrategy } from "~/components/tasks/AssignmentStrategyStep";
import { ReviewLaunchStep } from "~/components/tasks/ReviewLaunchStep";
import { ContactPickerDrawer, type ContactPickerResult } from "~/components/tasks/ContactPickerDrawer";
import type { CreateTaskRequest, LeadAssignment } from "~/lib/schemas/domain";
import { createTaskMutation } from "~/server/api";

// The client never provides locationId â€” resolved server-side from the active location.
type TaskFormData = Omit<CreateTaskRequest, "locationId">;

const STEPS: Step[] = [
  { id: "definition", label: "Task Definition", description: "Name, objective, deadline" },
  { id: "team", label: "Select Team", description: "Choose agents first" },
  { id: "contacts", label: "Select Contacts", description: "Filter & assign leads or members" },
  { id: "assign", label: "Assign Strategy", description: "Distribution for unassigned contacts" },
  { id: "review", label: "Review & Launch", description: "Confirm and create" },
];

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const doCreateTask = useAction(createTaskMutation);
  const [currentStep, setCurrentStep] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [pickerOpen, setPickerOpen] = createSignal(false);

  const [taskData, setTaskData] = createSignal<Partial<TaskFormData>>({
    name: "",
    objective: "",
    selectedAgentIds: [],
    matchedContactIds: [],
    contactFilterSpec: "",
    assignments: [],
    contactPoolIds: [],
    assignmentMode: "PreAssigned",
    targetUserType: "LEAD",
  });

  const isLastStep = () => currentStep() === STEPS.length - 1;
  const isFirstStep = () => currentStep() === 0;

  const handleNext = () => { if (!isLastStep()) setCurrentStep((p) => p + 1); };
  const handleBack = () => { if (!isFirstStep()) setCurrentStep((p) => p - 1); };
  const handleStepClick = (i: number) => { if (i < currentStep()) setCurrentStep(i); };

  const updateTaskData = (updates: Partial<TaskFormData>) => {
    setTaskData((prev) => ({ ...prev, ...updates }));
  };

  // Called when the drawer "Confirm" button is clicked
  const handlePickerDone = (result: ContactPickerResult) => {
    const now = new Date().toISOString();
    const assignments: LeadAssignment[] = result.inlineAssignments
      .filter((a) => a.contactIds.length > 0)
      .map((a) => ({ agentId: a.agentId, contactIds: a.contactIds, assignedAt: now }));
    const assignedSet = new Set(result.inlineAssignments.flatMap((a) => a.contactIds));
    const poolIds = result.selectedIds.filter((id) => !assignedSet.has(id));
    updateTaskData({
      matchedContactIds: result.selectedIds,
      contactFilterSpec: result.filterSpec,
      assignments,
      contactPoolIds: poolIds,
      // Auto-pick mode based on what the user did in the drawer
      assignmentMode:
        assignments.length > 0 && poolIds.length === 0
          ? "PreAssigned"
          : assignments.length > 0
          ? "Hybrid"
          : "LeadPool",
    });
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = taskData();
      if (!data.name || !data.selectedAgentIds?.length) {
        throw new Error("Missing required fields");
      }
      await doCreateTask(data as TaskFormData);
      navigate("/tasks");
    } catch (error) {
      console.error("Failed to create task:", error);
      alert(error instanceof Error ? error.message : "Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactCount = () => taskData().matchedContactIds?.length ?? 0;
  const targetLabel = () => taskData().targetUserType === "MEMBER" ? "Members" : "Leads";

  return (
    <main class="container mx-auto p-8 max-w-4xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Create Call Task</h1>
        <p class="text-muted-foreground">Set up a new call campaign for your team</p>
      </div>

      <div class="mb-8">
        <Stepper
          steps={STEPS}
          currentStep={currentStep()}
          onStepClick={handleStepClick}
          allowSkip={false}
        />
      </div>

      <Card>
        <CardContent class="pt-6">

          {/* â”€â”€ Step 0: Task Definition â”€â”€ */}
          <Show when={currentStep() === 0}>
            <div class="space-y-5">
              <div>
                <h3 class="text-lg font-semibold">Task Definition</h3>
                <p class="text-sm text-muted-foreground">Basic information about this call task</p>
              </div>

              <div>
                <label class="text-sm font-medium">Task Name *</label>
                <input
                  type="text"
                  value={taskData().name || ""}
                  onInput={(e) => updateTaskData({ name: e.currentTarget.value })}
                  placeholder="e.g., April Follow-ups â€” Delhi Region"
                  class="w-full mt-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label class="text-sm font-medium">Objective / Call Script</label>
                <textarea
                  value={taskData().objective || ""}
                  onInput={(e) => updateTaskData({ objective: e.currentTarget.value })}
                  placeholder="What should agents discuss in these calls?"
                  rows={4}
                  class="w-full mt-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-medium">Deadline</label>
                  <input
                    type="datetime-local"
                    value={taskData().deadline || ""}
                    onInput={(e) =>
                      updateTaskData({
                        deadline: e.currentTarget.value
                          ? new Date(e.currentTarget.value).toISOString()
                          : undefined,
                      })
                    }
                    class="w-full mt-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label class="text-sm font-medium">Target Calls per Agent</label>
                  <input
                    type="number"
                    value={taskData().targetCallsPerAgent || ""}
                    onInput={(e) =>
                      updateTaskData({
                        targetCallsPerAgent: parseInt(e.currentTarget.value) || undefined,
                      })
                    }
                    placeholder="40"
                    min="1"
                    class="w-full mt-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Target type selector */}
              <div>
                <label class="text-sm font-medium block mb-2">Who will be called?</label>
                <div class="flex gap-3">
                  {(["LEAD", "MEMBER"] as const).map((type) => (
                    <button
                      type="button"
                      onClick={() => updateTaskData({ targetUserType: type, matchedContactIds: [], contactFilterSpec: "" })}
                      class={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                        taskData().targetUserType === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {type === "LEAD" ? "ðŸŽ¯ Leads" : "ðŸŽ“ Members"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Show>

                    {/* ── Step 1: Select Team ── */}
          <Show when={currentStep() === 1}>
            <SelectTeamStep
              selectedAgentIds={taskData().selectedAgentIds || []}
              onSelectionChange={(ids) => updateTaskData({ selectedAgentIds: ids })}
            />
          </Show>

          {/* ── Step 2: Select Contacts ── */}
          <Show when={currentStep() === 2}>
            <div class="space-y-5">
              <div>
                <h3 class="text-lg font-semibold">Select Contacts</h3>
                <p class="text-sm text-muted-foreground">
                  Filter and pick the {targetLabel()} to include. You can also pre-assign contacts
                  to agents directly from the picker.
                </p>
              </div>
              {/* Summary card */}
              <div class="rounded-lg border border-border p-5 flex items-center justify-between">
                <div>
                  <Show
                    when={contactCount() > 0}
                    fallback={
                      <p class="text-sm text-muted-foreground">No contacts selected yet.</p>
                    }
                  >
                    <div class="flex items-center gap-3">
                      <Badge variant="default" class="text-base px-3 py-1">
                        {contactCount()}
                      </Badge>
                      <span class="text-sm font-medium">{targetLabel()} selected</span>
                      <Show when={(taskData().assignments?.length ?? 0) > 0}>
                        <span class="text-xs text-primary">
                          {" · "}{taskData().assignments!.reduce((s, a) => s + a.contactIds.length, 0)} pre-assigned
                        </span>
                      </Show>
                    </div>
                  </Show>
                </div>
                <Button onClick={() => setPickerOpen(true)}>
                  {contactCount() > 0 ? "✏ Edit Selection" : `Browse ${targetLabel()} →`}
                </Button>
              </div>
              <Show when={contactCount() === 0}>
                <p class="text-xs text-muted-foreground">
                  Click "Browse {targetLabel()}" to open the contact picker. Use filters to narrow
                  the list, check contacts to include them, and optionally assign batches to agents.
                </p>
              </Show>
            </div>
          </Show>
{/* â”€â”€ Step 3: Assignment Strategy â”€â”€ */}
          <Show when={currentStep() === 3}>
            <AssignmentStrategyStep
              assignmentMode={taskData().assignmentMode || "PreAssigned"}
              matchedContactCount={contactCount()}
              selectedAgentCount={taskData().selectedAgentIds?.length || 0}
              selectedAgentIds={taskData().selectedAgentIds || []}
              onStrategyChange={(strategy: AssignStrategy) => {
                updateTaskData({
                  assignmentMode: strategy.mode,
                  assignments: strategy.assignments,
                  contactPoolIds: strategy.contactPoolIds,
                });
              }}
            />
          </Show>

          {/* â”€â”€ Step 4: Review & Launch â”€â”€ */}
          <Show when={currentStep() === 4}>
            <ReviewLaunchStep
              taskData={taskData()}
              matchedContactCount={contactCount()}
              selectedAgentCount={taskData().selectedAgentIds?.length || 0}
              onEditStep={(i) => setCurrentStep(i)}
            />
          </Show>
        </CardContent>

        <CardFooter class="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={isFirstStep()}>
            Back
          </Button>
          <div class="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/tasks")}>
              Cancel
            </Button>
            <Show
              when={isLastStep()}
              fallback={
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep() === 0 && !taskData().name) ||
                    (currentStep() === 1 && !taskData().selectedAgentIds?.length)
                  }
                >
                  Next
                </Button>
              }
            >
              <Button onClick={handleSubmit} disabled={isSubmitting()}>
                {isSubmitting() ? "Creatingâ€¦" : "Create Task"}
              </Button>
            </Show>
          </div>
        </CardFooter>
      </Card>

      {/* Contact picker drawer â€” rendered at root level so it overlays correctly */}
      <Show when={pickerOpen()}>
        <ContactPickerDrawer
          targetType={taskData().targetUserType ?? "LEAD"}
          initialSelectedIds={taskData().matchedContactIds}
          selectedAgentIds={taskData().selectedAgentIds}
          onDone={handlePickerDone}
          onCancel={() => setPickerOpen(false)}
        />
      </Show>
    </main>
  );
}
