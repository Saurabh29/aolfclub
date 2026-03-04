import { createSignal, createMemo, createResource, For, Show, type Component } from "solid-js";
import { queryUsersQuery } from "~/server/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import type { QuerySpec } from "~/lib/schemas/query";
import type { UserField, User } from "~/lib/schemas/domain";

export interface SelectTeamStepProps {
  /** Currently selected agent IDs */
  selectedAgentIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (agentIds: string[]) => void;
}

/**
 * Step 2: Select Team
 * Choose agents who will work on this task
 */
export const SelectTeamStep: Component<SelectTeamStepProps> = (props) => {
  const [searchTerm, setSearchTerm] = createSignal("");

  // Query for agents (Members will be volunteers)
  const [volunteersData] = createResource(async () => {
    const spec: QuerySpec<UserField> = {
      filters: [
        { field: "userType" as UserField, op: "eq", value: "MEMBER" },
      ],
      sorting: [],
      pagination: { pageSize: 100, pageIndex: 0 },
    };
    return await queryUsersQuery(spec);
  });

  // Also query for Leads (will be teachers/trainers)
  const [teachersData] = createResource(async () => {
    const spec: QuerySpec<UserField> = {
      filters: [
        { field: "userType" as UserField, op: "eq", value: "LEAD" },
      ],
      sorting: [],
      pagination: { pageSize: 100, pageIndex: 0 },
    };
    return await queryUsersQuery(spec);
  });

  // Combine volunteers and teachers
  const allAgents = createMemo(() => {
    const vData = volunteersData();
    const tData = teachersData();
    const volunteers = vData ? Array.from(vData.items) : [];
    const teachers = tData ? Array.from(tData.items) : [];
    return [...volunteers, ...teachers];
  });

  // Filter by search term
  const filteredAgents = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return allAgents();
    
    return allAgents().filter((agent) => {
      const name = agent.displayName.toLowerCase();
      const email = agent.email.toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  });

  // Separate by type
  const volunteers = createMemo(() =>
    filteredAgents().filter((a) => a.userType === "MEMBER")
  );
  const teachers = createMemo(() =>
    filteredAgents().filter((a) => a.userType === "LEAD")
  );

  const selectedAgents = createMemo(() => 
    allAgents().filter((a) => props.selectedAgentIds.includes(a.id))
  );

  const isAgentSelected = (agentId: string) => {
    return props.selectedAgentIds.includes(agentId);
  };

  const toggleAgent = (agentId: string) => {
    const updated = isAgentSelected(agentId)
      ? props.selectedAgentIds.filter((id) => id !== agentId)
      : [...props.selectedAgentIds, agentId];
    props.onSelectionChange(updated);
  };

  const selectAll = (agents: User[]) => {
    const agentIds = agents.map((a) => a.id);
    const allSelected = agentIds.every((id) => isAgentSelected(id));
    
    if (allSelected) {
      // Deselect all from this group
      const updated = props.selectedAgentIds.filter((id) => !agentIds.includes(id));
      props.onSelectionChange(updated);
    } else {
      // Select all from this group
      const updated = [...new Set([...props.selectedAgentIds, ...agentIds])];
      props.onSelectionChange(updated);
    }
  };

  const removeAgent = (agentId: string) => {
    const updated = props.selectedAgentIds.filter((id) => id !== agentId);
    props.onSelectionChange(updated);
  };

  const isLoading = () => volunteersData.loading || teachersData.loading;

  return (
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold mb-1">Select Team Members</h3>
        <p class="text-sm text-muted-foreground">
          Choose agents who will make calls for this task
        </p>
      </div>

      {/* Selected Agents Summary */}
      <Show when={selectedAgents().length > 0}>
        <Card class="p-4 bg-primary/5 border-primary/20">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Selected Agents</span>
              <Badge variant="default" class="text-base px-3 py-1">
                {selectedAgents().length}
              </Badge>
            </div>
            <div class="flex flex-wrap gap-2">
              <For each={selectedAgents()}>
                {(agent) => (
                  <Badge variant="secondary" class="gap-1 pr-1">
                    {agent.displayName}
                    <button
                      type="button"
                      onClick={() => removeAgent(agent.id)}
                      class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      aria-label={`Remove ${agent.displayName}`}
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Badge>
                )}
              </For>
            </div>
          </div>
        </Card>
      </Show>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.target.value)}
          class="w-full p-2 border rounded-md"
        />
      </div>

      <Show when={isLoading()}>
        <div class="space-y-2">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      </Show>

      <Show when={!isLoading()}>
        <div class="space-y-6">
          {/* Volunteers */}
          <Show when={volunteers().length > 0}>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-medium">Volunteers ({volunteers().length})</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAll(volunteers())}
                >
                  {volunteers().every((v) => isAgentSelected(v.id))
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div class="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                <For each={volunteers()}>
                  {(agent) => (
                    <label class="flex items-start gap-3 p-2 hover:bg-muted rounded cursor-pointer">
                      <Checkbox
                        checked={isAgentSelected(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                      />
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm">
                          {agent.displayName}
                        </div>
                        <div class="text-xs text-muted-foreground truncate">
                          {agent.email}
                        </div>
                      </div>
                    </label>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Teachers */}
          <Show when={teachers().length > 0}>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-medium">Teachers ({teachers().length})</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAll(teachers())}
                >
                  {teachers().every((t) => isAgentSelected(t.id))
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div class="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                <For each={teachers()}>
                  {(agent) => (
                    <label class="flex items-start gap-3 p-2 hover:bg-muted rounded cursor-pointer">
                      <Checkbox
                        checked={isAgentSelected(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                      />
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm">
                          {agent.displayName}
                        </div>
                        <div class="text-xs text-muted-foreground truncate">
                          {agent.email}
                        </div>
                      </div>
                    </label>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* No results */}
          <Show when={filteredAgents().length === 0 && !isLoading()}>
            <div class="text-center py-8 text-muted-foreground">
              <p>No agents found</p>
              <Show when={searchTerm()}>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  class="mt-2"
                >
                  Clear search
                </Button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
