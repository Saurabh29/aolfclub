/**
 * ContactPickerDrawer
 *
 * Full-screen drawer used inside the Task Creation wizard (Step 1).
 * Reuses LeadFilterPane / MemberFilterPane and the same collection table
 * from the Community page  -  without duplicating any logic.
 *
 * Layout:
 *   +--------------+------------------------------------+
 *   | Filter pane  |  Selectable table (sortable)       |
 *   |  (left 240px)|                                    |
 *   |              |  +- floating confirm bar --------+ |
 *   |              |  |  N selected  [Done >]  [Clear]| |
 *   |              |  +-------------------------------+ |
 *   +--------------+------------------------------------+
 *
 * The drawer is opened by the wizard; on "Done" it returns:
 *   - selectedIds: string[]    -  the final checked row IDs
 *   - filterSpec: string       -  JSON.stringify(QuerySpec) for audit / re-display
 */
import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Switch,
  Match,
  For,
  onMount,
  onCleanup,
  type Component,
} from "solid-js";
import { X, ChevronDown, ArrowRight } from "lucide-solid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { createColumnHelper } from "@tanstack/solid-table";
import { createCollectionQueryController } from "~/lib/controllers";
import { ResponsiveCollectionView } from "~/components/collection";
import { leadColumns, memberColumns } from "~/components/collection/shared-columns";
import { LeadFilterPane } from "~/components/community/LeadFilterPane";
import { MemberFilterPane } from "~/components/community/MemberFilterPane";
import { queryLeadsQuery, queryMembersQuery, queryUsersQuery } from "~/server/api";
import type { Lead, LeadField } from "~/lib/schemas/domain/lead.schema";
import type { Member, MemberField } from "~/lib/schemas/domain/member.schema";
import type { User } from "~/lib/schemas/domain/user.schema";

// -- Assignment column helpers ------------------------------------------------

const leadAssignColHelper = createColumnHelper<Lead>();
const memberAssignColHelper = createColumnHelper<Member>();

/**
 * Build lead columns with an "Assigned To" column appended.
 * The column cell reads reactively from the assignment map and agent list.
 */
function buildLeadColumns(
  getMap: () => Map<string, string>,
  getAgents: () => User[]
) {
  return [
    ...leadColumns,
    leadAssignColHelper.display({
      id: "_assignedTo",
      header: "Assigned To",
      cell: (info) => {
        const agentId = getMap().get(info.row.original.id);
        if (!agentId) return <span class="text-xs text-muted-foreground">Unassigned</span>;
        const agent = getAgents().find((a) => a.id === agentId);
        return (
          <span class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {agent?.displayName ?? "Unknown"}
          </span>
        );
      },
    }),
  ];
}

function buildMemberColumns(
  getMap: () => Map<string, string>,
  getAgents: () => User[]
) {
  return [
    ...memberColumns,
    memberAssignColHelper.display({
      id: "_assignedTo",
      header: "Assigned To",
      cell: (info) => {
        const agentId = getMap().get(info.row.original.id);
        if (!agentId) return <span class="text-xs text-muted-foreground">Unassigned</span>;
        const agent = getAgents().find((a) => a.id === agentId);
        return (
          <span class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {agent?.displayName ?? "Unknown"}
          </span>
        );
      },
    }),
  ];
}

// Columns imported from ~/components/collection/shared-columns

// -- Props ---------------------------------------------------------------------

export interface ContactPickerResult {
  /** IDs of all contacts included in the task (pre-assigned + pool) */
  selectedIds: string[];
  /** JSON-stringified QuerySpec used when the user clicked Done  -  for audit */
  filterSpec: string;
  /** Contacts directly assigned to a specific agent inside the drawer */
  inlineAssignments: Array<{ agentId: string; contactIds: string[] }>;
}

export interface ContactPickerDrawerProps {
  /** "LEAD" or "MEMBER"  -  determines which data source and filter pane to use */
  targetType: "LEAD" | "MEMBER";
  /** Pre-selected IDs to restore when drawer re-opens */
  initialSelectedIds?: string[];
  /** Existing assignments to restore (edit mode) */
  initialAssignments?: Array<{ agentId: string; contactIds: string[] }>;
  /** Agent IDs from the team selection step  -  enables inline assignment toolbar */
  selectedAgentIds?: string[];
  /** Called when user confirms selection */
  onDone: (result: ContactPickerResult) => void;
  /** Called when user cancels (X or Escape) */
  onCancel: () => void;
}

// -- Component -----------------------------------------------------------------

export const ContactPickerDrawer: Component<ContactPickerDrawerProps> = (props) => {
  // -- Controller  -  only create the one needed by targetType ----------------
  const controller = props.targetType === "LEAD"
    ? createCollectionQueryController<Lead, LeadField>({
        queryFn: (spec) => queryLeadsQuery(spec),
        initialQuery: {
          filters: [],
          sorting: [{ field: "displayName", direction: "asc" }],
          pagination: { pageSize: 25, pageIndex: 0 },
        },
      })
    : createCollectionQueryController<Member, MemberField>({
        queryFn: (spec) => queryMembersQuery(spec),
        initialQuery: {
          filters: [],
          sorting: [{ field: "displayName", direction: "asc" }],
          pagination: { pageSize: 25, pageIndex: 0 },
        },
      });

  // Restore pre-selected IDs and assignment map on mount
  onMount(() => {
    if (props.initialSelectedIds?.length) {
      controller.setSelectedIds(new Set(props.initialSelectedIds));
    }
    if (props.initialAssignments?.length) {
      const map = new Map<string, string>();
      for (const a of props.initialAssignments) {
        for (const cid of a.contactIds) {
          map.set(cid, a.agentId);
        }
      }
      setInlineAssignmentMap(map);
    }
  });

  // Escape key closes drawer
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") props.onCancel();
  };
  onMount(() => document.addEventListener("keydown", handleKeyDown));
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));

  // -- Agent resolution + inline assignment ---------------------------------

  // Fetch display names for the agents selected in the team step
  const [agentsData] = createResource(async () => {
    if (!props.selectedAgentIds?.length) return [] as User[];
    const result = await queryUsersQuery({
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 100, pageIndex: 0 },
    });
    const selectedSet = new Set(props.selectedAgentIds);
    return Array.from(result.items).filter((u) => selectedSet.has(u.id));
  });

  const agents = () => agentsData() ?? [];

  // contactId > agentId map; built incrementally as user assigns batches
  const [inlineAssignmentMap, setInlineAssignmentMap] = createSignal(
    new Map<string, string>()
  );
  const [showAgentDropdown, setShowAgentDropdown] = createSignal(false);

  // -- Augmented columns + client-side sort ----------------------------------

  /** Columns with "Assigned To" appended */
  const augmentedLeadColumns = createMemo(() =>
    buildLeadColumns(() => inlineAssignmentMap(), () => agents())
  );
  const augmentedMemberColumns = createMemo(() =>
    buildMemberColumns(() => inlineAssignmentMap(), () => agents())
  );

  /**
   * Sort items so unassigned contacts appear first (top = work remaining).
   * Within each group sort alphabetically by displayName.
   * Only active when agents are present (assignment UI is shown).
   */
  const sortedLeadItems = createMemo(() => {
    const items = [...(controller.data()?.items ?? [])] as Lead[];
    if (agents().length === 0) return items;
    const map = inlineAssignmentMap();
    return items.sort((a, b) => {
      const aAssigned = map.has(a.id);
      const bAssigned = map.has(b.id);
      if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
      return a.displayName.localeCompare(b.displayName);
    });
  });

  const sortedMemberItems = createMemo(() => {
    const items = [...(controller.data()?.items ?? [])] as Member[];
    if (agents().length === 0) return items;
    const map = inlineAssignmentMap();
    return items.sort((a, b) => {
      const aAssigned = map.has(a.id);
      const bAssigned = map.has(b.id);
      if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
      return a.displayName.localeCompare(b.displayName);
    });
  });

  const assignmentCountForAgent = (agentId: string) => {
    let n = 0;
    inlineAssignmentMap().forEach((aid) => { if (aid === agentId) n++; });
    return n;
  };

  /** Assign all currently-checked rows to one agent, then clear the selection */
  const assignSelectedToAgent = (agentId: string) => {
    const map = new Map(inlineAssignmentMap());
    controller.selectedIds().forEach((id) => map.set(id, agentId));
    setInlineAssignmentMap(map);
    controller.clearSelection();
    setShowAgentDropdown(false);
  };

  // -- Derived ---------------------------------------------------------------

  const selectedCount = () => controller.selectedIds().size;
  const totalCount = () => controller.data()?.pageInfo.totalCount ?? 0;

  /** Contacts that have been assigned to an agent (across all batches) */
  const assignedCount = () => inlineAssignmentMap().size;

  /** Contacts checked in the table but NOT yet assigned  -  will go to pool */
  const poolCount = () => {
    let n = 0;
    controller.selectedIds().forEach((id) => {
      if (!inlineAssignmentMap().has(id)) n++;
    });
    return n;
  };

  /** Total contacts in the task = assigned IDs union currently-checked rows */
  const totalForTask = () => {
    const all = new Set([
      ...Array.from(inlineAssignmentMap().keys()),
      ...Array.from(controller.selectedIds()),
    ]);
    return all.size;
  };

  const handleDone = () => {
    const checkedIds = Array.from(controller.selectedIds());
    const assignedIds = Array.from(inlineAssignmentMap().keys());
    const allIds = Array.from(new Set([...assignedIds, ...checkedIds]));

    // Group assignments by agent
    const byAgent = new Map<string, string[]>();
    inlineAssignmentMap().forEach((agentId, contactId) => {
      if (!byAgent.has(agentId)) byAgent.set(agentId, []);
      byAgent.get(agentId)!.push(contactId);
    });
    const inlineAssignments = Array.from(byAgent.entries()).map(
      ([agentId, contactIds]) => ({ agentId, contactIds })
    );

    props.onDone({
      selectedIds: allIds,
      filterSpec: JSON.stringify(controller.querySpec()),
      inlineAssignments,
    });
  };

  // -- Render ----------------------------------------------------------------

  return (
    /* Backdrop */
    <div class="fixed inset-0 z-50 bg-black/50 flex flex-col">
      {/* Drawer panel */}
      <div class="flex flex-col flex-1 bg-background overflow-hidden">

        {/* Drawer header */}
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 class="text-lg font-semibold">
              Select {props.targetType === "LEAD" ? "Leads" : "Members"}
            </h2>
            <p class="text-sm text-muted-foreground mt-0.5">
              Use the filters to narrow the list, then check the contacts you want to include.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onCancel}
            class="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        {/* Body: filter pane + table */}
        <div class="flex flex-1 overflow-hidden">

          {/* Filter pane */}
          <div class="w-56 shrink-0 hidden md:block overflow-hidden">
            <Switch>
              <Match when={props.targetType === "LEAD"}>
                <LeadFilterPane controller={controller as any} compact />
              </Match>
              <Match when={props.targetType === "MEMBER"}>
                <MemberFilterPane controller={controller as any} compact />
              </Match>
            </Switch>
          </div>

          {/* Results */}
          <div class="flex flex-col flex-1 overflow-hidden">
            {/* Result count + clear */}
            <div class="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 text-sm text-muted-foreground">
              <span>
                <Show when={!controller.isLoading()} fallback="Loading...">
                  {totalCount()} result{totalCount() !== 1 ? "s" : ""}
                  <Show when={selectedCount() > 0}>
                    {"   "}
                    <span class="text-foreground font-medium">{selectedCount()} selected</span>
                  </Show>
                </Show>
              </span>
              <Show when={selectedCount() > 0}>
                <button
                  type="button"
                  onClick={() => controller.clearSelection()}
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear selection
                </button>
              </Show>
            </div>

            {/* Bulk assign toolbar  -  appears when rows are checked AND agents exist */}
            <Show when={selectedCount() > 0 && agents().length > 0}>
              <div class="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20 shrink-0 text-sm">
                <span class="font-medium text-foreground">{selectedCount()} selected</span>
                <div class="relative">
                  <button
                    type="button"
                    onClick={() => setShowAgentDropdown((v) => !v)}
                    class="flex items-center gap-1 rounded border border-primary/30 bg-background px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Assign to <ChevronDown class="w-3 h-3" />
                  </button>
                  <Show when={showAgentDropdown()}>
                    {/* Click-outside overlay */}
                    <div class="fixed inset-0 z-10" onClick={() => setShowAgentDropdown(false)} />
                    <div class="absolute top-full left-0 mt-1 z-20 min-w-48 rounded-md border bg-background shadow-lg">
                      <For each={agents()}>
                        {(agent) => (
                          <button
                            type="button"
                            onClick={() => assignSelectedToAgent(agent.id)}
                            class="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                          >
                            <span>{agent.displayName}</span>
                            <Show when={assignmentCountForAgent(agent.id) > 0}>
                              <Badge variant="secondary" class="ml-2 text-xs">
                                {assignmentCountForAgent(agent.id)}
                              </Badge>
                            </Show>
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Selectable table */}
            <div class="flex-1 overflow-y-auto p-4 pb-24">
              <Switch>
                <Match when={props.targetType === "LEAD"}>
                  <ResponsiveCollectionView
                    controller={controller as any}
                    columns={augmentedLeadColumns()}
                    itemsOverride={sortedLeadItems()}
                    getId={(lead) => lead.id}
                    renderCard={(lead) => (
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            <div class="font-semibold">{lead.displayName}</div>
                            <div class="text-sm text-muted-foreground font-normal">{lead.phone}</div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Show when={lead.lastInterestLevel}>
                            <Badge>{lead.lastInterestLevel}</Badge>
                          </Show>
                        </CardContent>
                      </Card>
                    )}
                    selectable={true}
                    cardColumns={2}
                    emptyMessage="No leads match the current filters"
                  />
                </Match>
                <Match when={props.targetType === "MEMBER"}>
                  <ResponsiveCollectionView
                    controller={controller as any}
                    columns={augmentedMemberColumns()}
                    itemsOverride={sortedMemberItems()}
                    getId={(member) => member.id}
                    renderCard={(member) => (
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            <div class="font-semibold">{member.displayName}</div>
                            <div class="text-sm text-muted-foreground font-normal">{member.phone}</div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Show when={member.memberSince}>
                            <span class="text-xs text-muted-foreground">
                              Since {new Date(member.memberSince!).getFullYear()}
                            </span>
                          </Show>
                        </CardContent>
                      </Card>
                    )}
                    selectable={true}
                    cardColumns={2}
                    emptyMessage="No members match the current filters"
                  />
                </Match>
              </Switch>
            </div>
          </div>
        </div>

        {/* Floating confirm bar */}
        <div class="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg">
          <span class="text-sm text-muted-foreground">
            <Show when={totalForTask() > 0} fallback="No contacts selected yet">
              <span class="font-semibold text-foreground">{totalForTask()}</span>
              {" "}contact{totalForTask() !== 1 ? "s" : ""}
              <Show when={assignedCount() > 0}>
                {"   "}<span class="text-xs font-medium text-primary">{assignedCount()} pre-assigned</span>
              </Show>
              <Show when={poolCount() > 0}>
                {"   "}<span class="text-xs">{poolCount()} in pool</span>
              </Show>
            </Show>
          </span>
          <div class="flex items-center gap-3">
            <Button variant="outline" onClick={props.onCancel}>
              Cancel
            </Button>
            <Button onClick={handleDone} disabled={totalForTask() === 0}>
              Confirm {totalForTask() > 0 ? `(${totalForTask()})` : ""} <ArrowRight class="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
