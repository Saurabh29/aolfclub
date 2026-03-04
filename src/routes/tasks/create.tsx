import { createSignal, createMemo, Show, type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Stepper, type Step } from "~/components/ui/stepper";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { FilterLeadsStep } from "~/components/tasks/FilterLeadsStep";
import { SelectTeamStep } from "~/components/tasks/SelectTeamStep";
import { AssignmentStrategyStep, type AssignStrategy } from "~/components/tasks/AssignmentStrategyStep";
import { ReviewLaunchStep } from "~/components/tasks/ReviewLaunchStep";
import type { CreateTaskRequest } from "~/lib/schemas/domain";
import { createTaskMutation } from "~/server/api";

const STEPS: Step[] = [
  { id: "definition", label: "Task Definition", description: "Name, objective, deadline" },
  { id: "filter", label: "Filter Leads", description: "Define target audience" },
  { id: "team", label: "Select Team", description: "Choose agents" },
  { id: "assign", label: "Assign Leads", description: "Distribution strategy" },
  { id: "review", label: "Review & Launch", description: "Confirm and create" },
];

/**
 * Task Creation Wizard
 * Multi-step form for creating call tasks
 */
export default function CreateTaskPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = createSignal(0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Wizard state (accumulates data from each step)
  const [taskData, setTaskData] = createSignal<Partial<CreateTaskRequest>>({
    name: "",
    objective: "",
    selectedAgentIds: [],
    matchedLeadIds: [],
    leadFilterSpec: "",
    assignments: [],
    leadPoolIds: [],
    assignmentMode: "PreAssigned",
  });

  const isLastStep = () => currentStep() === STEPS.length - 1;
  const isFirstStep = () => currentStep() === 0;

  const handleNext = () => {
    if (!isLastStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep()) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow going back to previous steps
    if (stepIndex < currentStep()) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = taskData();
      // Validate required fields
      if (!data.name || !data.leadFilterSpec || !data.selectedAgentIds || data.selectedAgentIds.length === 0) {
        throw new Error("Missing required fields");
      }

      const result = await createTaskMutation(data as CreateTaskRequest);
      console.log("Task created:", result);
      
      // Navigate to tasks list or task detail
      navigate("/tasks");
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskData = (updates: Partial<CreateTaskRequest>) => {
    setTaskData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <main class="container mx-auto p-8 max-w-6xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Create Call Task</h1>
        <p class="text-muted-foreground">
          Set up a new call campaign for your team
        </p>
      </div>

      {/* Stepper */}
      <div class="mb-8">
        <Stepper
          steps={STEPS}
          currentStep={currentStep()}
          onStepClick={handleStepClick}
          allowSkip={false}
        />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent class="pt-6">
          {/* Step 0: Task Definition */}
          <Show when={currentStep() === 0}>
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Task Definition</h3>
              <p class="text-sm text-muted-foreground">
                Basic information about this call task
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium">Task Name *</label>
                  <input
                    type="text"
                    value={taskData().name || ""}
                    onInput={(e) => updateTaskData({ name: e.target.value })}
                    placeholder="e.g., February Follow-ups - Delhi Region"
                    class="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                
                <div>
                  <label class="text-sm font-medium">Objective / Call Script</label>
                  <textarea
                    value={taskData().objective || ""}
                    onInput={(e) => updateTaskData({ objective: e.target.value })}
                    placeholder="What should agents discuss in these calls?"
                    rows={4}
                    class="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium">Deadline</label>
                    <input
                      type="datetime-local"
                      value={taskData().deadline || ""}
                      onInput={(e) => updateTaskData({ deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      class="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label class="text-sm font-medium">Target Calls per Agent</label>
                    <input
                      type="number"
                      value={taskData().targetCallsPerAgent || ""}
                      onInput={(e) => updateTaskData({ targetCallsPerAgent: parseInt(e.target.value) || undefined })}
                      placeholder="40"
                      min="1"
                      class="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* Step 1: Filter Leads */}
          <Show when={currentStep() === 1}>
            <FilterLeadsStep
              leadFilterSpec={taskData().leadFilterSpec || ""}
              onFilterChange={(spec) => updateTaskData({ leadFilterSpec: spec })}
              matchedCount={0}
            />
          </Show>

          {/* Step 2: Select Team */}
          <Show when={currentStep() === 2}>
            <SelectTeamStep
              selectedAgentIds={taskData().selectedAgentIds || []}
              onSelectionChange={(ids) => updateTaskData({ selectedAgentIds: ids })}
            />
          </Show>

          {/* Step 3: Assignment Strategy */}
          <Show when={currentStep() === 3}>
            <AssignmentStrategyStep
              assignmentMode={taskData().assignmentMode || "PreAssigned"}
              matchedLeadCount={0}
              selectedAgentCount={taskData().selectedAgentIds?.length || 0}
              selectedAgentIds={taskData().selectedAgentIds || []}
              onStrategyChange={(strategy: AssignStrategy) => {
                updateTaskData({
                  assignmentMode: strategy.mode,
                  assignments: strategy.assignments,
                  leadPoolIds: strategy.leadPoolIds,
                });
              }}
            />
          </Show>

          {/* Step 4: Review & Launch */}
          <Show when={currentStep() === 4}>
            <ReviewLaunchStep
              taskData={taskData()}
              matchedLeadCount={0}
              selectedAgentCount={taskData().selectedAgentIds?.length || 0}
              onEditStep={(stepIndex) => setCurrentStep(stepIndex)}
            />
          </Show>
        </CardContent>

        <CardFooter class="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep()}
          >
            Back
          </Button>

          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/tasks")}
            >
              Cancel
            </Button>

            <Show
              when={isLastStep()}
              fallback={
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStep() === 0 && !taskData().name}
                >
                  Next
                </Button>
              }
            >
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting()}
              >
                {isSubmitting() ? "Creating..." : "Create Task"}
              </Button>
            </Show>
          </div>
        </CardFooter>
      </Card>

      {/* Debug info */}
      <Show when={import.meta.env.DEV}>
        <div class="mt-4 p-4 bg-muted rounded-md text-xs">
          <strong>Debug:</strong> Step {currentStep() + 1} of {STEPS.length}
        </div>
      </Show>
    </main>
  );
}
