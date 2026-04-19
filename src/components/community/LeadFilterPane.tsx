/**
 * LeadFilterPane
 *
 * Left-side semantic filter panel for the Leads collection.
 *
 * Ownership model (prevents field conflicts with the table search):
 *   This pane owns:  lastInterestLevel, interestedPrograms, totalCallCount,
 *                    nextFollowUpDate (presence)
 *   Table owns:      displayName search (text search), sorting
 *
 * Every change merges semantic filters with any existing table search filter
 * and calls controller.setFilters()  -  a single round-trip per change.
 */
import {
  createSignal,
  createEffect,
  For,
  Show,
  batch,
  type Component,
} from "solid-js";
import { ChevronUp, ChevronDown } from "lucide-solid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import type { CollectionQueryState } from "~/lib/controllers";
import type { FilterCondition } from "~/lib/schemas/query";
import type { Lead, LeadField } from "~/lib/schemas/domain/lead.schema";

// -- Constants -----------------------------------------------------------------

const INTEREST_LEVELS = ["High", "Medium", "Low", "Not_Interested"] as const;
type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const PROGRAMS = [
  "Yoga 101",
  "Advanced Yoga",
  "Meditation Basics",
  "Pranayama Intensive",
  "Teacher Training",
  "Kids Yoga",
  "Senior Wellness",
] as const;

/** Fields this pane "owns"  -  table search must never touch these. */
const OWNED_FIELDS: LeadField[] = [
  "lastInterestLevel",
  "interestedPrograms",
  "totalCallCount",
  "nextFollowUpDate",
];

// -- Helpers -------------------------------------------------------------------

function interestLabel(level: InterestLevel): string {
  return level === "Not_Interested" ? "Not Interested" : level;
}

function interestVariant(level: InterestLevel) {
  if (level === "High") return "default" as const;
  if (level === "Medium") return "secondary" as const;
  if (level === "Low") return "outline" as const;
  return "error" as const;
}

// -- Props ---------------------------------------------------------------------

export interface LeadFilterPaneProps {
  controller: CollectionQueryState<Lead, LeadField>;
  /** When true, collapse into compact chip mode (used inside task drawer) */
  compact?: boolean;
}

// -- Component -----------------------------------------------------------------

export const LeadFilterPane: Component<LeadFilterPaneProps> = (props) => {
  const [selectedLevels, setSelectedLevels] = createSignal<InterestLevel[]>([]);
  const [selectedPrograms, setSelectedPrograms] = createSignal<string[]>([]);
  const [neverCalled, setNeverCalled] = createSignal(false);
  const [hasFollowUp, setHasFollowUp] = createSignal(false);
  const [minCalls, setMinCalls] = createSignal<number | null>(null);
  const [searchText, setSearchText] = createSignal("");
  const [programsOpen, setProgramsOpen] = createSignal(true);

  // -- Active filter count (for badge on collapse) ---------------------------

  const activeCount = () => {
    let n = selectedLevels().length + selectedPrograms().length;
    if (neverCalled()) n++;
    if (hasFollowUp()) n++;
    if (minCalls() !== null) n++;
    if (searchText()) n++;
    return n;
  };

  // -- Build and push filters whenever state changes -------------------------

  createEffect(() => {
    // Read all signals to establish reactive dependencies
    const levels = selectedLevels();
    const programs = selectedPrograms();
    const nc = neverCalled();
    const fu = hasFollowUp();
    const mc = minCalls();
    const search = searchText().trim();

    const filters: FilterCondition<LeadField>[] = [];

    // Interest levels  -  one "eq" per selected level (OR semantics handled by
    // server-side filter: any match passes). We use multiple `eq` here which
    // the in-memory executor treats as OR within the same field group.
    // If only one level, a simple eq. Multiple > use "in" operator.
    if (levels.length === 1) {
      filters.push({ field: "lastInterestLevel", op: "eq", value: levels[0] });
    } else if (levels.length > 1) {
      filters.push({ field: "lastInterestLevel", op: "in", value: levels });
    }

    // Programs  -  each program is an AND (must be interested in ALL selected)
    for (const p of programs) {
      filters.push({ field: "interestedPrograms", op: "contains", value: p });
    }

    // Never called > totalCallCount eq 0
    if (nc) {
      filters.push({ field: "totalCallCount", op: "eq", value: 0 });
    }

    // Minimum calls (if set and not conflicting with neverCalled)
    if (!nc && mc !== null && mc > 0) {
      filters.push({ field: "totalCallCount", op: "gte", value: mc });
    }

    // Has follow-up scheduled (nextFollowUpDate not empty)
    if (fu) {
      filters.push({ field: "nextFollowUpDate", op: "neq", value: null });
    }

    // Name search  -  this pane also owns the text search for convenience
    if (search) {
      filters.push({ field: "displayName", op: "contains", value: search });
    }

    props.controller.setFilters(filters);
  });

  // -- Actions ---------------------------------------------------------------

  const clearAll = () => {
    batch(() => {
      setSelectedLevels([]);
      setSelectedPrograms([]);
      setNeverCalled(false);
      setHasFollowUp(false);
      setMinCalls(null);
      setSearchText("");
    });
  };

  const toggleLevel = (level: InterestLevel) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleProgram = (p: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  // -- Render ----------------------------------------------------------------

  return (
    <div class="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold">Filters</span>
          <Show when={activeCount() > 0}>
            <Badge variant="default" class="text-xs px-1.5 py-0.5 leading-none">
              {activeCount()}
            </Badge>
          </Show>
        </div>
        <Show when={activeCount() > 0}>
          <button
            type="button"
            onClick={clearAll}
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </Show>
      </div>

      {/* Scrollable body */}
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-5">

        {/* Search */}
        <div class="space-y-1.5">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</p>
          <input
            type="text"
            placeholder="Name or phone..."
            value={searchText()}
            onInput={(e) => setSearchText(e.currentTarget.value)}
            class="w-full h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Interest Level */}
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interest Level</p>
          <div class="flex flex-wrap gap-1.5">
            <For each={INTEREST_LEVELS}>
              {(level) => (
                <button
                  type="button"
                  onClick={() => toggleLevel(level)}
                  class={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                    selectedLevels().includes(level)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {interestLabel(level)}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Call History */}
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call History</p>
          <div class="space-y-2">
            <div
              class="flex items-center gap-2 cursor-pointer"
              onClick={() => { setNeverCalled((v) => !v); if (!neverCalled()) setMinCalls(null); }}
            >
              <Checkbox checked={neverCalled()} onChange={() => {}} />
              <span class="text-sm">Never called</span>
            </div>
            <Show when={!neverCalled()}>
              <div class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground shrink-0">Min calls</span>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  value={minCalls() ?? ""}
                  onInput={(e) => {
                    const v = parseInt(e.currentTarget.value);
                    setMinCalls(isNaN(v) ? null : v);
                  }}
                  class="w-16 h-7 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </Show>
          </div>
        </div>

        {/* Follow-up */}
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-up</p>
          <div
            class="flex items-center gap-2 cursor-pointer"
            onClick={() => setHasFollowUp((v) => !v)}
          >
            <Checkbox checked={hasFollowUp()} onChange={() => {}} />
            <span class="text-sm">Has scheduled follow-up</span>
          </div>
        </div>

        {/* Programs */}
        <div class="space-y-2">
          <button
            type="button"
            class="flex w-full items-center justify-between"
            onClick={() => setProgramsOpen((v) => !v)}
          >
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Interested In Programs
              <Show when={selectedPrograms().length > 0}>
                <span class="ml-1 text-primary">({selectedPrograms().length})</span>
              </Show>
            </p>
            <span class="text-muted-foreground text-xs">{programsOpen() ? <ChevronUp class="w-3 h-3" /> : <ChevronDown class="w-3 h-3" />}</span>
          </button>
          <Show when={programsOpen()}>
            <div class="space-y-1.5">
              <For each={PROGRAMS}>
                {(prog) => (
                  <div
                    class="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleProgram(prog)}
                  >
                    <Checkbox checked={selectedPrograms().includes(prog)} onChange={() => {}} />
                    <span class="text-sm">{prog}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

      </div>
    </div>
  );
};
