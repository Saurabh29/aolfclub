import { createSignal, createMemo, For, Show, type Component } from "solid-js";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { AssignmentMode, LeadAssignment } from "~/lib/schemas/domain";

export interface AssignStrategy {
  mode: AssignmentMode;
  maxLeadsPerAgent?: number;
  evenDistribution: boolean;
  assignments?: LeadAssignment[];
  contactPoolIds?: string[];
}

export interface AssignmentStrategyStepProps {
  /** Assignment mode */
  assignmentMode: AssignmentMode;
  /** Number of matched contacts (leads or members) */
  matchedContactCount: number;
  /** Number of selected agents */
  selectedAgentCount: number;
  /** Selected agent IDs for assignment preview */
  selectedAgentIds: string[];
  /** Callback when strategy changes */
  onStrategyChange: (strategy: AssignStrategy) => void;
}

/**
 * Step 3: Assignment Strategy
 * Choose how leads will be distributed to agents
 */
export const AssignmentStrategyStep: Component<AssignmentStrategyStepProps> = (props) => {
  const [mode, setMode] = createSignal<AssignmentMode>(props.assignmentMode || "PreAssigned");
  const [evenDistribution, setEvenDistribution] = createSignal(true);
  const [maxLeadsPerAgent, setMaxLeadsPerAgent] = createSignal<number | undefined>(undefined);

  // Calculate distribution preview
  const distributionPreview = createMemo(() => {
    if (props.selectedAgentCount === 0) return null;
    
    const total = props.matchedContactCount;
    const agents = props.selectedAgentCount;
    
    if (evenDistribution()) {
      const perAgent = Math.floor(total / agents);
      const remainder = total % agents;
      return {
        perAgent,
        remainder,
        distribution: `${perAgent} leads per agent${remainder > 0 ? `, ${remainder} extra to distribute` : ""}`,
      };
    } else if (maxLeadsPerAgent()) {
      const max = maxLeadsPerAgent()!;
      const totalAssignable = Math.min(total, max * agents);
      return {
        perAgent: max,
        remainder: 0,
        distribution: `Up to ${max} leads per agent (${totalAssignable} of ${total} leads will be assigned)`,
      };
    }
    
    return null;
  });

  const handleModeChange = (newMode: AssignmentMode) => {
    setMode(newMode);
    notifyChange(newMode);
  };

  const handleEvenDistributionChange = (value: boolean) => {
    setEvenDistribution(value);
    notifyChange(mode());
  };

  const handleMaxLeadsChange = (value: number | undefined) => {
    setMaxLeadsPerAgent(value);
    notifyChange(mode());
  };

  const notifyChange = (currentMode: AssignmentMode) => {
    const strategy: AssignStrategy = {
      mode: currentMode,
      evenDistribution: evenDistribution(),
      maxLeadsPerAgent: maxLeadsPerAgent(),
    };

    // For LeadPool mode, all matched contacts go to pool
    if (currentMode === "LeadPool") {
      strategy.contactPoolIds = []; // Will be filled with actual contact IDs by parent
      strategy.assignments = [];
    }
    // For PreAssigned and Hybrid, we'll compute assignments
    else {
      strategy.assignments = []; // Will be computed by parent with actual contact IDs
      if (currentMode === "Hybrid") {
        strategy.contactPoolIds = [];
      }
    }

    props.onStrategyChange(strategy);
  };

  return (
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold mb-1">Assignment Strategy</h3>
        <p class="text-sm text-muted-foreground">
          Choose how leads will be distributed to your team
        </p>
      </div>

      {/* Summary Stats */}
      <div class="grid grid-cols-3 gap-4">
        <Card class="p-4 text-center">
          <div class="text-2xl font-bold text-primary">{props.matchedContactCount}</div>
          <div class="text-xs text-muted-foreground mt-1">Matched Contacts</div>
        </Card>
        <Card class="p-4 text-center">
          <div class="text-2xl font-bold text-primary">{props.selectedAgentCount}</div>
          <div class="text-xs text-muted-foreground mt-1">Selected Agents</div>
        </Card>
        <Card class="p-4 text-center">
          <div class="text-2xl font-bold text-primary">
            {distributionPreview()?.perAgent || 0}
          </div>
          <div class="text-xs text-muted-foreground mt-1">Leads/Agent (avg)</div>
        </Card>
      </div>

      {/* Assignment Mode Selection */}
      <div class="space-y-4">
        <label class="text-sm font-medium">Assignment Mode</label>
        
        {/* PreAssigned */}
        <label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="radio"
            name="assignmentMode"
            value="PreAssigned"
            checked={mode() === "PreAssigned"}
            onChange={() => handleModeChange("PreAssigned")}
            class="mt-1"
          />
          <div class="flex-1">
            <div class="font-medium mb-1">Pre-Assigned</div>
            <p class="text-sm text-muted-foreground">
              You distribute all leads to agents now. Agents see only their assigned leads.
            </p>
            <Show when={mode() === "PreAssigned"}>
              <div class="mt-3 pt-3 border-t space-y-3">
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={evenDistribution()}
                    onChange={(e) => handleEvenDistributionChange(e.target.checked)}
                    class="rounded"
                  />
                  <span class="text-sm">Even distribution across all agents</span>
                </label>
                
                <Show when={!evenDistribution()}>
                  <div>
                    <label class="text-sm">Max leads per agent</label>
                    <input
                      type="number"
                      value={maxLeadsPerAgent() || ""}
                      onInput={(e) => handleMaxLeadsChange(parseInt(e.target.value) || undefined)}
                      placeholder="e.g., 50"
                      min="1"
                      class="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </label>

        {/* Lead Pool */}
        <label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="radio"
            name="assignmentMode"
            value="LeadPool"
            checked={mode() === "LeadPool"}
            onChange={() => handleModeChange("LeadPool")}
            class="mt-1"
          />
          <div class="flex-1">
            <div class="font-medium mb-1">Lead Pool (Self-Serve)</div>
            <p class="text-sm text-muted-foreground">
              All leads go into a shared pool. Agents pick leads themselves on their own pace.
            </p>
            <Show when={mode() === "LeadPool"}>
              <div class="mt-3 pt-3 border-t">
                <Badge variant="outline" class="text-xs">
                  All {props.matchedContactCount} contacts will be available in the pool
                </Badge>
              </div>
            </Show>
          </div>
        </label>

        {/* Hybrid */}
        <label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="radio"
            name="assignmentMode"
            value="Hybrid"
            checked={mode() === "Hybrid"}
            onChange={() => handleModeChange("Hybrid")}
            class="mt-1"
          />
          <div class="flex-1">
            <div class="font-medium mb-1">Hybrid</div>
            <p class="text-sm text-muted-foreground">
              Some leads are pre-assigned, rest go to a pool for agents to pick from.
            </p>
            <Show when={mode() === "Hybrid"}>
              <div class="mt-3 pt-3 border-t space-y-3">
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={evenDistribution()}
                    onChange={(e) => handleEvenDistributionChange(e.target.checked)}
                    class="rounded"
                  />
                  <span class="text-sm">Even distribution for pre-assigned leads</span>
                </label>
                
                <div>
                  <label class="text-sm">Max pre-assigned leads per agent</label>
                  <input
                    type="number"
                    value={maxLeadsPerAgent() || ""}
                    onInput={(e) => handleMaxLeadsChange(parseInt(e.target.value) || undefined)}
                    placeholder="e.g., 30"
                    min="1"
                    class="w-full mt-1 p-2 border rounded-md"
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    Remaining leads will go to the pool
                  </p>
                </div>
              </div>
            </Show>
          </div>
        </label>
      </div>

      {/* Distribution Preview */}
      <Show when={distributionPreview() && props.selectedAgentCount > 0}>
        <Card class="p-4 bg-muted/50">
          <div class="text-sm font-medium mb-2">Distribution Preview</div>
          <p class="text-sm text-muted-foreground">
            {distributionPreview()!.distribution}
          </p>
          <Show when={mode() === "Hybrid" && maxLeadsPerAgent()}>
            <p class="text-xs text-muted-foreground mt-2">
              Remainder will be available in the lead pool
            </p>
          </Show>
        </Card>
      </Show>

      {/* Warnings */}
      <Show when={props.selectedAgentCount === 0}>
        <Card class="p-4 bg-destructive/10 border-destructive/20">
          <p class="text-sm text-destructive">
            ⚠️ Please select at least one agent in the previous step
          </p>
        </Card>
      </Show>

      <Show when={props.matchedContactCount === 0}>
        <Card class="p-4 bg-destructive/10 border-destructive/20">
          <p class="text-sm text-destructive">
            ⚠️ No contacts match your filters. Please adjust filters in step 1.
          </p>
        </Card>
      </Show>
    </div>
  );
};
