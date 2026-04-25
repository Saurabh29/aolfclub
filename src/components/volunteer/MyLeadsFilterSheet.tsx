import { type Component } from "solid-js";
import { SlidersHorizontal } from "lucide-solid";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "~/components/ui/drawer";
import { ChipToggleGroup } from "~/components/collection/filter-components";
import { toggleItem } from "~/lib/utils/toggle-item";
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

  const TAG_OPTIONS = LEAD_TAGS.map((t) => ({ value: t, label: t }));

  const NOTES_OPTIONS: { value: "yes" | "no"; label: string }[] = [
    { value: "yes", label: "Has Notes" },
    { value: "no", label: "No Notes" },
  ];

  const selectedNotes = () => {
    if (props.filters.hasNotes === true) return ["yes" as const];
    if (props.filters.hasNotes === false) return ["no" as const];
    return [];
  };

  return (
    <Drawer open={props.isOpen} onOpenChange={(open) => { if (!open) props.onClose(); }}>
      <DrawerContent class="max-h-[85vh]">
        <DrawerHeader class="flex flex-row items-center justify-between">
          <DrawerTitle class="flex items-center gap-2">
            <SlidersHorizontal class="w-4 h-4" /> Filters
          </DrawerTitle>
          <button
            onClick={() => props.onFiltersChange({ ...DEFAULT_LEAD_FILTERS })}
            class="text-sm text-destructive hover:underline"
          >
            Clear all
          </button>
        </DrawerHeader>

        <div class="px-4 space-y-5 overflow-y-auto pb-2">
          <ChipToggleGroup
            label="Interest Level"
            options={INTEREST_LEVEL_OPTIONS}
            selected={props.filters.interestLevels}
            onToggle={toggleInterestLevel}
          />
          <ChipToggleGroup
            label="Status"
            options={STATUS_OPTIONS}
            selected={props.filters.statuses}
            onToggle={toggleStatus}
          />
          <ChipToggleGroup
            label="Call History"
            options={CALL_HISTORY_OPTIONS}
            selected={props.filters.callHistory}
            onToggle={toggleCallHistory}
          />
          <ChipToggleGroup
            label="Tags"
            options={TAG_OPTIONS}
            selected={props.filters.tags}
            onToggle={toggleTag}
          />
          <ChipToggleGroup
            label="Notes"
            options={NOTES_OPTIONS}
            selected={selectedNotes()}
            onToggle={(v) => toggleHasNotes(v === "yes")}
          />
        </div>

        <DrawerFooter>
          <Button class="w-full" onClick={props.onClose}>
            Show {props.matchCount} Lead{props.matchCount !== 1 ? "s" : ""}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
