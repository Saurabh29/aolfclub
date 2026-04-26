import { createSignal, Show, type Component } from "solid-js";
import { Pencil, ArrowRight } from "lucide-solid";
import { Stepper, type Step } from "~/components/ui/stepper";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { SelectTeamStep } from "~/components/tasks/SelectTeamStep";
import { AssignmentStrategyStep, type AssignStrategy } from "~/components/tasks/AssignmentStrategyStep";
import { ReviewLaunchStep } from "~/components/tasks/ReviewLaunchStep";
import { ContactPickerDrawer, type ContactPickerResult } from "~/components/tasks/ContactPickerDrawer";
import type { CreateTaskRequest, LeadAssignment, TaskStatus } from "~/lib/schemas/domain";

export type TaskWizardData = Omit<CreateTaskRequest, "locationId"> & { status?: TaskStatus };

export interface TaskWizardProps {
  /** Page heading */
  title: string;
  /** Subtitle / description below the heading */
  subtitle?: string;
  /** Pre-populate fields (for edit mode). Pass once; wizard will not re-init on changes. */
  initialData?: Partial<TaskWizardData>;
  /** Label on the final submit button */
  submitLabel: string;
  /** When true, shows a Status selector in Step 0 (edit mode) */
  showStatus?: boolean;
  /** Called with the collected form data when the user confirms */
  onSubmit: (data: TaskWizardData) => Promise<void>;
  /** Called when the user clicks Cancel */
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "Draft",     label: "Draft" },
  { value: "Active",    label: "Active" },
  { value: "Paused",    label: "Paused" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const STEPS: Step[] = [
  { id: "definition", label: "Task Definition", description: "Name, objective, deadline" },
  { id: "team",       label: "Select Team",     description: "Choose agents" },
  { id: "contacts",   label: "Select Contacts", description: "Filter & assign leads or members" },
  { id: "assign",     label: "Assign Strategy", description: "Distribution for unassigned contacts" },
  { id: "review",     label: "Review & Launch", description: "Confirm and submit" },
];

export const TaskWizard: Component<TaskWizardProps> = (props) => {
  const [currentStep, setCurrentStep] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [pickerOpen, setPickerOpen] = createSignal(false);

  const [taskData, setTaskData] = createSignal<Partial<TaskWizardData>>({
    name: "",
    objective: "",
    selectedAgentIds: [],
    matchedContactIds: [],
    contactFilterSpec: "",
    assignments: [],
    contactPoolIds: [],
    assignmentMode: "PreAssigned",
    targetUserType: "LEAD",
    status: "Active",
    // Spread caller's initial data last so it wins
    ...props.initialData,
  });

  const updateData = (updates: Partial<TaskWizardData>) =>
    setTaskData((prev) => ({ ...prev, ...updates }));

  const isLastStep  = () => currentStep() === STEPS.length - 1;
  const isFirstStep = () => currentStep() === 0;

  const handleNext      = () => { if (!isLastStep())  setCurrentStep((p) => p + 1); };
  const handleBack      = () => { if (!isFirstStep()) setCurrentStep((p) => p - 1); };
  const handleStepClick = (i: number) => { if (i < currentStep()) setCurrentStep(i); };

  const handlePickerDone = (result: ContactPickerResult) => {
    const now = new Date().toISOString();
    const assignments: LeadAssignment[] = result.inlineAssignments
      .filter((a) => a.contactIds.length > 0)
      .map((a) => ({ agentId: a.agentId, contactIds: a.contactIds, assignedAt: now }));
    const assignedSet = new Set(result.inlineAssignments.flatMap((a) => a.contactIds));
    const poolIds = result.selectedIds.filter((id) => !assignedSet.has(id));
    updateData({
      matchedContactIds: result.selectedIds,
      contactFilterSpec: result.filterSpec,
      assignments,
      contactPoolIds: poolIds,
      assignmentMode:
        assignments.length > 0 && poolIds.length === 0 ? "PreAssigned"
        : assignments.length > 0 ? "Hybrid"
        : "LeadPool",
    });
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = taskData();
      if (!data.name || !data.selectedAgentIds?.length) {
        throw new Error("Task name and at least one agent are required.");
      }
      await props.onSubmit(data as TaskWizardData);
    } catch (error) {
      console.error("Task wizard submit failed:", error);
      alert(error instanceof Error ? error.message : "Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactCount = () => taskData().matchedContactIds?.length ?? 0;
  const targetLabel  = () => taskData().targetUserType === "MEMBER" ? "Members" : "Leads";

  return (
    <>
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

          {/* Step 0 — Task Definition */}
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
                  onInput={(e) => updateData({ name: e.currentTarget.value })}
                  placeholder="e.g., April Follow-ups — Delhi Region"
                  class="w-full mt-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label class="text-sm font-medium">Objective / Call Script</label>
                <textarea
                  value={taskData().objective || ""}
                  onInput={(e) => updateData({ objective: e.currentTarget.value })}
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
                    value={taskData().deadline ? toDatetimeLocal(taskData().deadline!) : ""}
                    onInput={(e) =>
                      updateData({
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
                      updateData({ targetCallsPerAgent: parseInt(e.currentTarget.value) || undefined })
                    }
                    placeholder="40"
                    min="1"
                    class="w-full mt-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="text-sm font-medium block mb-2">Who will be called?</label>
                <div class="flex gap-3">
                  {(["LEAD", "MEMBER"] as const).map((type) => (
                    <button
                      type="button"
                      onClick={() => updateData({ targetUserType: type, matchedContactIds: [], contactFilterSpec: "" })}
                      class={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                        taskData().targetUserType === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {type === "LEAD" ? "🎯 Leads" : "👥 Members"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status — only shown in edit mode */}
              <Show when={props.showStatus}>
                <div>
                  <label class="text-sm font-medium block mb-2">Status</label>
                  <div class="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        onClick={() => updateData({ status: opt.value })}
                        class={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          taskData().status === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* Step 1 — Select Team */}
          <Show when={currentStep() === 1}>
            <SelectTeamStep
              selectedAgentIds={taskData().selectedAgentIds || []}
              onSelectionChange={(ids) => updateData({ selectedAgentIds: ids })}
            />
          </Show>

          {/* Step 2 — Select Contacts */}
          <Show when={currentStep() === 2}>
            <div class="space-y-5">
              <div>
                <h3 class="text-lg font-semibold">Select Contacts</h3>
                <p class="text-sm text-muted-foreground">
                  Filter and pick the {targetLabel()} to include. You can also pre-assign contacts
                  to agents directly from the picker.
                </p>
              </div>
              <div class="rounded-lg border border-border p-5 flex items-center justify-between">
                <div>
                  <Show
                    when={contactCount() > 0}
                    fallback={<p class="text-sm text-muted-foreground">No contacts selected yet.</p>}
                  >
                    <div class="flex items-center gap-3">
                      <Badge variant="default" class="text-base px-3 py-1">{contactCount()}</Badge>
                      <span class="text-sm font-medium">{targetLabel()} selected</span>
                      <Show when={(taskData().assignments?.length ?? 0) > 0}>
                        <span class="text-xs text-primary">
                          {taskData().assignments!.reduce((s, a) => s + a.contactIds.length, 0)} pre-assigned
                        </span>
                      </Show>
                    </div>
                  </Show>
                </div>
                <Button onClick={() => setPickerOpen(true)}>
                  {contactCount() > 0
                    ? <><Pencil class="w-3.5 h-3.5 mr-1" /> Edit Selection</>
                    : <>{`Browse ${targetLabel()}`} <ArrowRight class="w-3.5 h-3.5 ml-1" /></>
                  }
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

          {/* Step 3 — Assignment Strategy */}
          <Show when={currentStep() === 3}>
            <AssignmentStrategyStep
              assignmentMode={taskData().assignmentMode || "PreAssigned"}
              matchedContactCount={contactCount()}
              selectedAgentCount={taskData().selectedAgentIds?.length || 0}
              selectedAgentIds={taskData().selectedAgentIds || []}
              onStrategyChange={(strategy: AssignStrategy) =>
                updateData({
                  assignmentMode: strategy.mode,
                  assignments: strategy.assignments,
                  contactPoolIds: strategy.contactPoolIds,
                })
              }
            />
          </Show>

          {/* Step 4 — Review */}
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
            <Button variant="outline" onClick={props.onCancel}>
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
                {isSubmitting() ? "Saving..." : props.submitLabel}
              </Button>
            </Show>
          </div>
        </CardFooter>
      </Card>

      <Show when={pickerOpen()}>
        <ContactPickerDrawer
          targetType={taskData().targetUserType ?? "LEAD"}
          initialSelectedIds={taskData().matchedContactIds}
          selectedAgentIds={taskData().selectedAgentIds}
          onDone={handlePickerDone}
          onCancel={() => setPickerOpen(false)}
        />
      </Show>
    </>
  );
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
