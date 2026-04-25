import { Show, For, type Component } from "solid-js";
import { SlidersHorizontal, X } from "lucide-solid";
import { Button } from "~/components/ui/button";
import type { InterestLevel, LeadTag } from "~/lib/schemas/domain";
import { LEAD_TAGS } from "~/lib/schemas/domain";

export type FilterStatus = "overdue" | "due_today" | "not_started" | "completed";

export interface LeadFilters {
  interestLevels: InterestLevel[];
  statuses: FilterStatus[];
  callHistory: ("never" | "not_in_7d")[];
  tags: LeadTag[];
  hasNotes?: boolean;
}

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  interestLevels: [],
  statuses: [],
  callHistory: [],
  tags: [],
  hasNotes: undefined,
};

export interface MyLeadsFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  matchCount: number;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

const INTEREST_LEVEL_OPTIONS: { value: InterestLevel; label: string }[] = [
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
  { value: "Not_Interested", label: "Not Interested" },
];

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "due_today", label: "Due Today" },
  { value: "not_started", label: "Not Started" },
  { value: "completed", label: "Completed" },
];

const CALL_HISTORY_OPTIONS: { value: "never" | "not_in_7d"; label: string }[] = [
  { value: "never", label: "Never Called" },
  { value: "not_in_7d", label: "Not in 7 Days" },
];

export const MyLeadsFilterSheet: Component<MyLeadsFilterSheetProps> = (props) => {
  const toggleInterestLevel = (level: InterestLevel) => {
    props.onFiltersChange({
      ...props.filters,
      interestLevels: toggleItem(props.filters.interestLevels, level),
    });
  };

  const toggleStatus = (status: FilterStatus) => {
    props.onFiltersChange({
      ...props.filters,
      statuses: toggleItem(props.filters.statuses, status),
    });
  };

  const toggleCallHistory = (value: "never" | "not_in_7d") => {
    props.onFiltersChange({
      ...props.filters,
      callHistory: toggleItem(props.filters.callHistory, value),
    });
  };

  const toggleTag = (tag: LeadTag) => {
    props.onFiltersChange({
      ...props.filters,
      tags: toggleItem(props.filters.tags, tag),
    });
  };

  const toggleHasNotes = (value: boolean) => {
    props.onFiltersChange({
      ...props.filters,
      hasNotes: props.filters.hasNotes === value ? undefined : value,
    });
  };

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div class="fixed inset-0 bg-black/50 z-50" onClick={props.onClose} />

      {/* Bottom Sheet */}
      <div class="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-xl">
        {/* Drag handle */}
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div class="p-4 space-y-5 pb-6">
          {/* Header */}
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold flex items-center gap-2">
              <SlidersHorizontal class="w-4 h-4" /> Filters
            </h3>
            <div class="flex items-center gap-3">
              <button
                onClick={() =>
                  props.onFiltersChange({ ...DEFAULT_LEAD_FILTERS })
                }
                class="text-sm text-destructive hover:underline"
              >
                Clear all
              </button>
              <button
                onClick={props.onClose}
                class="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interest Level */}
          <div>
            <p class="text-sm font-medium mb-2">Interest Level</p>
            <div class="flex flex-wrap gap-2">
              <For each={INTEREST_LEVEL_OPTIONS}>
                {(item) => (
                  <button
                    onClick={() => toggleInterestLevel(item.value)}
                    class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      props.filters.interestLevels.includes(item.value)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Status */}
          <div>
            <p class="text-sm font-medium mb-2">Status</p>
            <div class="flex flex-wrap gap-2">
              <For each={STATUS_OPTIONS}>
                {(item) => (
                  <button
                    onClick={() => toggleStatus(item.value)}
                    class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      props.filters.statuses.includes(item.value)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Call History */}
          <div>
            <p class="text-sm font-medium mb-2">Call History</p>
            <div class="flex flex-wrap gap-2">
              <For each={CALL_HISTORY_OPTIONS}>
                {(item) => (
                  <button
                    onClick={() => toggleCallHistory(item.value)}
                    class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      props.filters.callHistory.includes(item.value)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Tags */}
          <div>
            <p class="text-sm font-medium mb-2">Tags</p>
            <div class="flex flex-wrap gap-2">
              <For each={LEAD_TAGS}>
                {(tag) => (
                  <button
                    onClick={() => toggleTag(tag)}
                    class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      props.filters.tags.includes(tag)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {tag}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Has Notes */}
          <div>
            <p class="text-sm font-medium mb-2">Notes</p>
            <div class="flex gap-2">
              <button
                onClick={() => toggleHasNotes(true)}
                class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  props.filters.hasNotes === true
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                Has Notes
              </button>
              <button
                onClick={() => toggleHasNotes(false)}
                class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  props.filters.hasNotes === false
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                No Notes
              </button>
            </div>
          </div>

          {/* Apply Button */}
          <Button class="w-full" onClick={props.onClose}>
            Show {props.matchCount} Lead{props.matchCount !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Show>
  );
};
