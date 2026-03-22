import { createMemo, For, Show, type Component } from "solid-js";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { CreateTaskRequest, AssignmentMode } from "~/lib/schemas/domain";

export interface ReviewLaunchStepProps {
  /** Complete task data to review */
  taskData: Partial<CreateTaskRequest>;
  /** Number of matched contacts */
  matchedContactCount: number;
  /** Selected agent count */
  selectedAgentCount: number;
  /** Callback to navigate to specific step */
  onEditStep: (stepIndex: number) => void;
}

/**
 * Step 4: Review & Launch
 * Final review before creating the task
 */
export const ReviewLaunchStep: Component<ReviewLaunchStepProps> = (props) => {
  const hasRequiredFields = createMemo(() => {
    const data = props.taskData;
    return !!(
      data.name &&
      data.contactFilterSpec &&
      data.selectedAgentIds &&
      data.selectedAgentIds.length > 0
    );
  });

  const warnings = createMemo(() => {
    const issues: string[] = [];
    const data = props.taskData;

    if (!data.name) {
      issues.push("Task name is required");
    }
    if (!data.selectedAgentIds || data.selectedAgentIds.length === 0) {
      issues.push("At least one agent must be selected");
    }
    if (props.matchedContactCount === 0) {
      issues.push("No contacts match your filters");
    }
    if (!data.deadline) {
      issues.push("No deadline set (optional but recommended)");
    }
    if (!data.objective) {
      issues.push("No objective/script provided (optional but recommended)");
    }

    return issues;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Not set";
    const date = new Date(isoString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getAssignmentModeLabel = (mode?: AssignmentMode) => {
    switch (mode) {
      case "PreAssigned":
        return "Pre-Assigned (Manager distributes)";
      case "LeadPool":
        return "Lead Pool (Agents self-select)";
      case "Hybrid":
        return "Hybrid (Mixed approach)";
      default:
        return "Not set";
    }
  };

  return (
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold mb-1">Review & Launch</h3>
        <p class="text-sm text-muted-foreground">
          Review your task configuration before creating
        </p>
      </div>

      {/* Warnings/Errors */}
      <Show when={warnings().length > 0}>
        <Card class="p-4 space-y-2" classList={{
          "bg-destructive/10 border-destructive/20": !hasRequiredFields(),
          "bg-yellow-500/10 border-yellow-500/20": hasRequiredFields(),
        }}>
          <div class="font-medium text-sm">
            {hasRequiredFields() ? "⚠️ Recommendations" : "❌ Missing Required Fields"}
          </div>
          <ul class="text-sm space-y-1 ml-4">
            <For each={warnings()}>
              {(warning) => <li class="list-disc">{warning}</li>}
            </For>
          </ul>
        </Card>
      </Show>

      {/* Task Summary */}
      <div class="space-y-4">
        {/* Basic Info */}
        <Card class="p-4">
          <div class="flex items-start justify-between mb-3">
            <h4 class="font-medium">Task Details</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => props.onEditStep(0)}
            >
              Edit
            </Button>
          </div>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Name:</dt>
              <dd class="font-medium">{props.taskData.name || "—"}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Deadline:</dt>
              <dd class="font-medium">{formatDate(props.taskData.deadline)}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Target Calls/Agent:</dt>
              <dd class="font-medium">{props.taskData.targetCallsPerAgent || "—"}</dd>
            </div>
            <Show when={props.taskData.objective}>
              <div class="pt-2 border-t">
                <dt class="text-muted-foreground mb-1">Objective:</dt>
                <dd class="text-xs bg-muted p-2 rounded">
                  {props.taskData.objective}
                </dd>
              </div>
            </Show>
          </dl>
        </Card>

        {/* Lead Criteria */}
        <Card class="p-4">
          <div class="flex items-start justify-between mb-3">
            <h4 class="font-medium">Target Audience</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => props.onEditStep(1)}
            >
              Edit
            </Button>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex-1">
              <div class="text-2xl font-bold text-primary">
                {props.matchedContactCount}
              </div>
              <div class="text-xs text-muted-foreground">Matched Contacts</div>
            </div>
            <Show when={props.taskData.contactFilterSpec}>
              <details class="flex-1 text-xs">
                <summary class="cursor-pointer text-muted-foreground">
                  View Filters
                </summary>
                <pre class="mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                  {JSON.stringify(JSON.parse(props.taskData.contactFilterSpec || "{}"), null, 2)}
                </pre>
              </details>
            </Show>
          </div>
        </Card>

        {/* Team */}
        <Card class="p-4">
          <div class="flex items-start justify-between mb-3">
            <h4 class="font-medium">Team Members</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => props.onEditStep(2)}
            >
              Edit
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-2xl font-bold text-primary">
              {props.selectedAgentCount}
            </div>
            <div class="text-xs text-muted-foreground">Selected Agents</div>
          </div>
        </Card>

        {/* Assignment Strategy */}
        <Card class="p-4">
          <div class="flex items-start justify-between mb-3">
            <h4 class="font-medium">Assignment Strategy</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => props.onEditStep(3)}
            >
              Edit
            </Button>
          </div>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted-foreground">Mode:</dt>
              <dd class="font-medium">
                {getAssignmentModeLabel(props.taskData.assignmentMode)}
              </dd>
            </div>
            <Show when={props.taskData.assignmentMode === "PreAssigned" || props.taskData.assignmentMode === "Hybrid"}>
              <div class="flex justify-between">
                <dt class="text-muted-foreground">Distribution:</dt>
                <dd class="font-medium">
                  {props.selectedAgentCount > 0
                    ? `~${Math.floor(props.matchedContactCount / props.selectedAgentCount)} contacts/agent`
                    : "—"}
                </dd>
              </div>
            </Show>
            <Show when={props.taskData.assignmentMode === "LeadPool"}>
              <div class="pt-2 border-t">
                <Badge variant="outline" class="text-xs">
                  All leads available for self-selection
                </Badge>
              </div>
            </Show>
          </dl>
        </Card>
      </div>

      {/* Summary Stats Card */}
      <Card class="p-6 bg-primary/5 border-primary/20">
        <h4 class="font-medium mb-4 text-center">Launch Summary</h4>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-3xl font-bold text-primary">{props.matchedContactCount}</div>
            <div class="text-xs text-muted-foreground mt-1">Total Contacts</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary">{props.selectedAgentCount}</div>
            <div class="text-xs text-muted-foreground mt-1">Team Members</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary">
              {props.selectedAgentCount > 0
                ? Math.floor(props.matchedContactCount / props.selectedAgentCount)
                : 0}
            </div>
            <div class="text-xs text-muted-foreground mt-1">Avg Contacts/Agent</div>
          </div>
        </div>
      </Card>

      {/* Next Steps Info */}
      <Card class="p-4 bg-muted/50">
        <h4 class="font-medium text-sm mb-2">What happens next?</h4>
        <ul class="text-sm space-y-1 ml-4 text-muted-foreground">
          <li class="list-disc">Task will be created with status "Draft"</li>
          <li class="list-disc">Leads will be assigned based on your strategy</li>
          <li class="list-disc">You can activate the task to notify team members</li>
          <li class="list-disc">Agents can start making calls once activated</li>
        </ul>
      </Card>
    </div>
  );
};
