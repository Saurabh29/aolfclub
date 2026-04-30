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
  Show,
  batch,
  type Component,
} from "solid-js";
import { Checkbox } from "~/components/ui/checkbox";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import type { CollectionQueryState } from "~/lib/controllers";
import type { FilterCondition } from "~/lib/schemas/query";
import type { Lead, LeadField } from "~/lib/schemas/domain/lead.schema";
import {
  FilterPaneShell,
  CheckboxFilterGroup,
  FilterSearchInput,
} from "~/components/collection/filter-components";
import { toggleItem } from "~/lib/utils/toggle-item";
import { useDebounced } from "~/lib/utils/use-debounced";

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
  // Debounce the text input so we don't fire a server query per keystroke.
  // 300ms is a good balance between responsiveness and request volume.
  const debouncedSearch = useDebounced(searchText, 300);

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
    const search = debouncedSearch().trim();

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
    setSelectedLevels((prev) => toggleItem(prev, level));
  };

  const toggleProgram = (p: string) => {
    setSelectedPrograms((prev) => toggleItem(prev, p));
  };

  // -- Render ----------------------------------------------------------------

  return (
    <FilterPaneShell activeCount={activeCount()} onClearAll={clearAll}>
      {/* Search */}
      <FilterSearchInput
        value={searchText()}
        onInput={setSearchText}
      />

      {/* Interest Level */}
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interest Level</p>
        <div class="flex flex-wrap gap-1.5">
          {INTEREST_LEVELS.map((level) => (
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
          ))}
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
              <TextField class="w-16">
                <TextFieldInput
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  value={minCalls() ?? ""}
                  onInput={(e: InputEvent) => {
                    const v = parseInt((e.currentTarget as HTMLInputElement).value);
                    setMinCalls(isNaN(v) ? null : v);
                  }}
                  class="h-7 text-sm"
                />
              </TextField>
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
      <CheckboxFilterGroup
        label="Interested In Programs"
        options={PROGRAMS}
        selected={selectedPrograms()}
        onToggle={toggleProgram}
        defaultOpen={true}
      />
    </FilterPaneShell>
  );
};
