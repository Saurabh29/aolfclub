import { createSignal, createMemo, createResource, Show, For } from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";
import { Home, ClipboardList, AlertCircle, Calendar, CheckCircle2, ArrowRight, PartyPopper, SlidersHorizontal, X } from "lucide-solid";
import { LeadCard, type CallLogData } from "~/components/volunteer/LeadCard";
import { MyLeadsFilterSheet, type LeadFilters, type FilterStatus, DEFAULT_LEAD_FILTERS } from "~/components/volunteer/MyLeadsFilterSheet";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { queryLeadsQuery, queryTasksQuery } from "~/server/api";
import { getUser } from "~/lib/auth";
import type { LeadField, TaskField, Lead, Task, InterestLevel, LeadTag } from "~/lib/schemas/domain";
import type { QuerySpec } from "~/lib/schemas/query";
import {
  getLeadStatus,
  isLeadOverdue,
  isLeadDueToday,
  calculateCompletionRate,
  getProgressColor,
} from "~/lib/utils/lead-status";

// ── Filter helpers ────────────────────────────────────────────────────────

const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  High: "High",
  Medium: "Medium",
  Low: "Low",
  Not_Interested: "Not Interested",
};

const STATUS_LABELS: Record<FilterStatus, string> = {
  overdue: "Overdue",
  due_today: "Due Today",
  not_started: "Not Started",
  completed: "Completed",
};

const CALL_HISTORY_LABELS: Record<"never" | "not_in_7d", string> = {
  never: "Never Called",
  not_in_7d: "Not in 7d",
};

function isFiltersActive(f: LeadFilters): boolean {
  return (
    f.interestLevels.length > 0 ||
    f.statuses.length > 0 ||
    f.callHistory.length > 0 ||
    f.tags.length > 0 ||
    f.hasNotes !== undefined
  );
}

function activeFilterCount(f: LeadFilters): number {
  return (
    f.interestLevels.length +
    f.statuses.length +
    f.callHistory.length +
    f.tags.length +
    (f.hasNotes !== undefined ? 1 : 0)
  );
}

function leadMatchesFilters(lead: Lead, f: LeadFilters): boolean {
  if (f.interestLevels.length > 0) {
    if (!lead.lastInterestLevel || !f.interestLevels.includes(lead.lastInterestLevel))
      return false;
  }
  if (f.statuses.length > 0) {
    const overdue = isLeadOverdue(lead);
    const today = isLeadDueToday(lead);
    const status = getLeadStatus(lead);
    const matches = f.statuses.some((s) => {
      if (s === "overdue") return overdue;
      if (s === "due_today") return today && !overdue;
      if (s === "not_started") return status === "not_started";
      if (s === "completed") return status === "completed";
      return false;
    });
    if (!matches) return false;
  }
  if (f.callHistory.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const matches = f.callHistory.some((c) => {
      if (c === "never") return lead.totalCallCount === 0;
      if (c === "not_in_7d")
        return lead.lastCallDate ? new Date(lead.lastCallDate) < sevenDaysAgo : true;
      return false;
    });
    if (!matches) return false;
  }
  if (f.tags.length > 0) {
    const leadTags = lead.tags ?? [];
    if (!f.tags.some((t) => leadTags.includes(t))) return false;
  }
  if (f.hasNotes === true && !(lead.lastNotes && lead.lastNotes.trim())) return false;
  if (f.hasNotes === false && lead.lastNotes && lead.lastNotes.trim()) return false;
  return true;
}

/**
 * Volunteer My Leads Dashboard
 * Shows assigned leads with campaign filtering and progress tracking
 */
export default function MyLeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = createSignal<string | null>(
    (typeof searchParams.task === "string" ? searchParams.task : null)
  );
  const [activeFilters, setActiveFilters] = createSignal<LeadFilters>(DEFAULT_LEAD_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = createSignal(false);

  // Get volunteer ID from session
  const user = createAsync(() => getUser());
  const volunteerId = () => (user() as any)?.id as string | undefined;

  // Tasks for this volunteer
  const [tasksData] = createResource(async () => {
    const spec: QuerySpec<TaskField> = {
      filters: [],
      sorting: [{ field: "createdAt", direction: "desc" }],
      pagination: { pageSize: 50, pageIndex: 0 },
    };
    return await queryTasksQuery(spec);
  });

  const tasks = createMemo(() => tasksData()?.items || []);

  // Derive which lead IDs are assigned to this volunteer across all tasks
  const myAssignedLeadIds = createMemo(() => {
    const vid = volunteerId();
    if (!vid) return new Set<string>();
    const ids = new Set<string>();
    for (const task of tasks()) {
      if (!task.selectedAgentIds.includes(vid)) continue;
      for (const assignment of task.assignments) {
        if (assignment.agentId === vid) {
          for (const contactId of assignment.contactIds) ids.add(contactId);
        }
      }
    }
    return ids;
  });

  // Reactively fetch ONLY the leads assigned to this volunteer (avoids pageSize > 100)
  const [leadsData] = createResource(
    () => [...myAssignedLeadIds()],
    async (ids) => {
      if (ids.length === 0) return { items: [] as Lead[], totalCount: 0, hasNextPage: false };
      const spec: QuerySpec<LeadField> = {
        filters: [{ field: "id", op: "in", value: ids }],
        sorting: [{ field: "displayName", direction: "asc" }],
        pagination: { pageSize: 100, pageIndex: 0 },
      };
      return await queryLeadsQuery(spec);
    }
  );

  const allLeads = createMemo(() => leadsData()?.items || []);

  // Filter leads by selected task + active filters (combined with grouping)
  const filteredAndGrouped = createMemo(() => {
    // allLeads() already contains only this volunteer's assigned leads
    let leads = allLeads();

    // Task filter — restrict to a specific campaign's assignment for this volunteer
    const taskId = selectedTaskId();
    if (taskId) {
      const task = tasks().find((t) => t.id === taskId);
      if (task) {
        const vid = volunteerId();
        const taskAssignment = vid
          ? task.assignments.find((a) => a.agentId === vid)
          : null;
        const taskContactSet = new Set(taskAssignment?.contactIds ?? []);
        leads = leads.filter((lead) => taskContactSet.has(lead.id));
      }
    }

    // Lead filters
    const filters = activeFilters();
    if (isFiltersActive(filters)) {
      leads = leads.filter((lead) => leadMatchesFilters(lead, filters));
    }

    // Single-pass grouping into buckets
    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const active: Lead[] = [];
    for (const lead of leads) {
      if (isLeadOverdue(lead)) {
        overdue.push(lead);
      } else if (isLeadDueToday(lead)) {
        today.push(lead);
      } else if (getLeadStatus(lead) !== "completed") {
        active.push(lead);
      }
    }

    return { all: leads, overdue, today, active };
  });

  const filteredLeads = () => filteredAndGrouped().all;
  const overdueLeads = () => filteredAndGrouped().overdue;
  const todayLeads = () => filteredAndGrouped().today;
  const activeLeads = () => filteredAndGrouped().active;

  // Live count for filter sheet "Show N leads" button
  const filterMatchCount = createMemo(() => {
    const vid = volunteerId();
    let leads = allLeads();
    const taskId = selectedTaskId();
    if (taskId) {
      const task = tasks().find((t) => t.id === taskId);
      if (task) {
        const taskAssignment = vid ? task.assignments.find((a) => a.agentId === vid) : null;
        const taskContactSet = new Set(taskAssignment?.contactIds ?? []);
        leads = leads.filter((lead) => taskContactSet.has(lead.id));
      }
    }
    const filters = activeFilters();
    if (!isFiltersActive(filters)) return leads.length;
    return leads.filter((lead) => leadMatchesFilters(lead, filters)).length;
  });

  // Active filter chips (each has a label + remove fn)
  const activeChips = createMemo(() => {
    const f = activeFilters();
    const chips: { key: string; label: string; remove: () => void }[] = [];
    for (const level of f.interestLevels) {
      chips.push({
        key: `level-${level}`,
        label: INTEREST_LEVEL_LABELS[level],
        remove: () =>
          setActiveFilters((prev) => ({
            ...prev,
            interestLevels: prev.interestLevels.filter((l) => l !== level),
          })),
      });
    }
    for (const status of f.statuses) {
      chips.push({
        key: `status-${status}`,
        label: STATUS_LABELS[status],
        remove: () =>
          setActiveFilters((prev) => ({
            ...prev,
            statuses: prev.statuses.filter((s) => s !== status),
          })),
      });
    }
    for (const ch of f.callHistory) {
      chips.push({
        key: `callHistory-${ch}`,
        label: CALL_HISTORY_LABELS[ch],
        remove: () =>
          setActiveFilters((prev) => ({
            ...prev,
            callHistory: prev.callHistory.filter((c) => c !== ch),
          })),
      });
    }
    for (const tag of f.tags) {
      chips.push({
        key: `tag-${tag}`,
        label: tag,
        remove: () =>
          setActiveFilters((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) })),
      });
    }
    if (f.hasNotes !== undefined) {
      const val = f.hasNotes;
      chips.push({
        key: "hasNotes",
        label: val ? "Has Notes" : "No Notes",
        remove: () => setActiveFilters((prev) => ({ ...prev, hasNotes: undefined })),
      });
    }
    return chips;
  });

  // Calculate overall progress
  const overallProgress = createMemo(() => calculateCompletionRate(Array.from(filteredLeads())));

  // Get selected task
  const selectedTask = createMemo(() => {
    const taskId = selectedTaskId();
    if (!taskId) return null;
    return tasks().find((t) => t.id === taskId) || null;
  });

  // Handle task filter change
  const handleTaskFilterChange = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      setSearchParams({ task: taskId });
    } else {
      setSearchParams({});
    }
  };

  // Handle call log save (inline form)
  const handleCallLogSave = async (lead: Lead, data: CallLogData) => {
    console.log("Saving call log:", lead.displayName, data);
    // TODO: await updateLeadMutation({
    //   id: lead.id,
    //   lastCallDate: new Date().toISOString(),
    //   lastInterestLevel: data.interestLevel,
    //   lastNotes: data.notes,
    //   nextFollowUpDate: data.followUpDate,
    //   tags: data.tags,
    //   totalCallCount: (lead.totalCallCount || 0) + 1,
    // });
  };

  return (
    <main class="container mx-auto p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div class="mb-6">
        {/* Title row with filter icon */}
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Home class="w-6 h-6" /> My Leads
          </h1>
          <button
            onClick={() => setFilterSheetOpen(true)}
            class="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
            aria-label="Filter leads"
          >
            <SlidersHorizontal class="w-5 h-5" />
            <Show when={activeFilterCount(activeFilters()) > 0}>
              <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center px-0.5">
                {activeFilterCount(activeFilters())}
              </span>
            </Show>
          </button>
        </div>
        
        {/* Active filter chip strip — appears only when filters are active */}
        <Show when={activeChips().length > 0}>
          <div class="flex items-center gap-2 overflow-x-auto pb-1 mt-3 -mx-4 px-4 scrollbar-none">
            <For each={activeChips()}>
              {(chip) => (
                <button
                  onClick={chip.remove}
                  class="flex items-center gap-1 shrink-0 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {chip.label} <X class="w-3 h-3" />
                </button>
              )}
            </For>
            <button
              onClick={() => setFilterSheetOpen(true)}
              class="flex items-center gap-1 shrink-0 text-xs px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + Filter
            </button>
          </div>
        </Show>

        {/* Overall Progress */}
        <Show when={filteredLeads().length > 0}>
          <Card class="p-4 bg-primary/5 border-primary/20 mt-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">
                  {selectedTask() ? selectedTask()!.name : "Overall Progress"}
                </span>
                <Badge variant="default">
                  {overallProgress().completed}/{overallProgress().total}
                </Badge>
              </div>
              <div class="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  class={`h-full transition-all ${getProgressColor(overallProgress().percentage)}`}
                  style={{ width: `${overallProgress().percentage}%` }}
                />
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{overallProgress().percentage}% completed</span>
                <span>
                  {overallProgress().overdue > 0 && `${overallProgress().overdue} overdue`}
                </span>
              </div>
            </div>
          </Card>
        </Show>

        {/* Campaign Filter — only show tasks this volunteer is assigned to */}
        <div class="mt-4">
          <label class="text-sm font-medium mb-2 block flex items-center gap-1"><ClipboardList class="w-3.5 h-3.5" /> Campaign:</label>
          <select
            value={selectedTaskId() || ""}
            onChange={(e) => handleTaskFilterChange(e.target.value || null)}
            class="w-full p-2 border rounded-md bg-background"
          >
            <option value="">All Tasks</option>
            <For each={tasks().filter((t) => {
              const vid = volunteerId();
              return vid ? t.selectedAgentIds.includes(vid) : false;
            })}>
              {(task) => {
                const vid = volunteerId();
                const myAssignment = vid ? task.assignments.find((a) => a.agentId === vid) : null;
                const myContactCount = myAssignment?.contactIds.length ?? 0;
                const myLeads = allLeads().filter((l) =>
                  myAssignment?.contactIds.includes(l.id)
                );
                const progress = calculateCompletionRate(myLeads);
                return (
                  <option value={task.id}>
                    {task.name} ({myContactCount}) - {progress.percentage}% completed
                  </option>
                );
              }}
            </For>
          </select>
        </div>
      </div>

      {/* Urgent - Overdue Follow-ups */}
      <Show when={overdueLeads().length > 0}>
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold text-red-600 flex items-center gap-1.5">
               <AlertCircle class="w-4 h-4" /> URGENT - Overdue Follow-ups
            </h2>
            <Badge variant="error">{overdueLeads().length}</Badge>
          </div>
          <div class="space-y-3">
            <For each={overdueLeads()}>
              {(lead) => (
                <LeadCard
                  lead={lead}
                  task={selectedTask() || undefined}
                  showTaskBadge={!selectedTaskId()}
                  onCallLogSave={handleCallLogSave}
                />
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* Today - Follow-ups Due */}
      <Show when={todayLeads().length > 0}>
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold text-amber-600 flex items-center gap-1.5">
               <Calendar class="w-4 h-4" /> TODAY - Follow-ups Due
            </h2>
            <Badge variant="default">{todayLeads().length}</Badge>
          </div>
          <div class="space-y-3">
            <For each={todayLeads()}>
              {(lead) => (
                <LeadCard
                  lead={lead}
                  task={selectedTask() || undefined}
                  showTaskBadge={!selectedTaskId()}
                  onCallLogSave={handleCallLogSave}
                />
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* Active Leads */}
      <Show when={activeLeads().length > 0}>
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold flex items-center gap-1.5"><CheckCircle2 class="w-4 h-4" /> MY ACTIVE LEADS</h2>
            <Badge variant="secondary">{activeLeads().length}</Badge>
          </div>
          <div class="space-y-3">
            <For each={activeLeads()}>
              {(lead) => (
                <LeadCard
                  lead={lead}
                  task={selectedTask() || undefined}
                  showTaskBadge={!selectedTaskId()}
                  onCallLogSave={handleCallLogSave}
                />
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* Empty State */}      <Show when={filteredLeads().length === 0 && !leadsData.loading}>
        <Card class="p-12 text-center">
          <div class="text-6xl mb-4 flex justify-center"><PartyPopper class="w-12 h-12 text-primary" /></div>
          <h3 class="text-xl font-semibold mb-2">All caught up!</h3>
          <p class="text-muted-foreground mb-4">
            You have no pending follow-ups.
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            Want to help more? Check the Lead Pool for available leads.
          </p>
          <Button class="flex items-center gap-1">Browse Lead Pool <ArrowRight class="w-3.5 h-3.5" /></Button>
        </Card>
      </Show>

      {/* Filter Sheet */}
      <MyLeadsFilterSheet
        isOpen={filterSheetOpen()}
        onClose={() => setFilterSheetOpen(false)}
        filters={activeFilters()}
        onFiltersChange={setActiveFilters}
        matchCount={filterMatchCount()}
      />
    </main>
  );
}
