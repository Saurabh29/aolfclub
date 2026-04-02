import { createSignal, createMemo, For, Show, type Component } from "solid-js";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { QuerySpecSchema } from "~/lib/schemas/query";
import type { QuerySpec } from "~/lib/schemas/query";
import type { LeadField } from "~/lib/schemas/domain";

export const AVAILABLE_PROGRAMS = [
  "Yoga 101",
  "Advanced Yoga",
  "Meditation Basics",
  "Pranayama Intensive",
  "Teacher Training",
  "Kids Yoga",
  "Senior Wellness",
] as const;

export interface FilterLeadsStepProps {
  /** Current filter specification as JSON string */
  contactFilterSpec: string;
  /** Callback when filter changes */
  onFilterChange: (filterSpec: string) => void;
  /** Estimated count of matching contacts */
  matchedCount?: number;
}

/**
 * Step 1: Filter Leads
 * Allows filtering by programs, interest level, and call history.
 * The task's targetUserType (LEAD|MEMBER) determines which data source is queried.
 */
export const FilterLeadsStep: Component<FilterLeadsStepProps> = (props) => {
  // Parse and validate existing filter or start fresh
  const initialFilter = (): QuerySpec<LeadField> => {
    try {
      if (!props.contactFilterSpec) {
        return {
          filters: [],
          sorting: [],
          pagination: { pageSize: 20, pageIndex: 0 },
        };
      }
      const parsed = JSON.parse(props.contactFilterSpec);
      const validated = QuerySpecSchema.parse(parsed);
      return validated as QuerySpec<LeadField>;
    } catch (error) {
      console.warn("Invalid contactFilterSpec, using defaults:", error);
      return {
        filters: [],
        sorting: [],
        pagination: { pageSize: 20, pageIndex: 0 },
      };
    }
  };

  const [interestedPrograms, setInterestedPrograms] = createSignal<string[]>([]);
  const [programsDone, setProgramsDone] = createSignal<string[]>([]);
  const [interestLevels, setInterestLevels] = createSignal<string[]>([]);
  const [hasCallHistory, setHasCallHistory] = createSignal<boolean | null>(null);
  const [hasFollowUp, setHasFollowUp] = createSignal<boolean | null>(null);

  // Build QuerySpec from current selections
  const buildFilterSpec = createMemo((): QuerySpec<LeadField> => {
    const filters: QuerySpec<LeadField>["filters"] = [];

    // Interested programs
    if (interestedPrograms().length > 0) {
      interestedPrograms().forEach((program) => {
        filters.push({
          field: "interestedPrograms" as LeadField,
          op: "contains",
          value: program,
        });
      });
    }

    // Programs done
    if (programsDone().length > 0) {
      programsDone().forEach((program) => {
        filters.push({
          field: "interestedPrograms" as LeadField, // approximation for cross-entity filter
          op: "contains",
          value: program,
        });
      });
    }

    // Interest levels
    if (interestLevels().length > 0) {
      interestLevels().forEach((level) => {
        filters.push({
          field: "lastInterestLevel" as LeadField,
          op: "eq",
          value: level,
        });
      });
    }

    // Call history presence
    if (hasCallHistory() !== null) {
      filters.push({
        field: "lastCallDate" as LeadField,
        op: hasCallHistory() ? "neq" : "eq",
        value: hasCallHistory() ? null : null,
      });
    }

    // Follow-up presence
    if (hasFollowUp() !== null) {
      filters.push({
        field: "nextFollowUpDate" as LeadField,
        op: hasFollowUp() ? "neq" : "eq",
        value: hasFollowUp() ? null : null,
      });
    }

    return {
      filters,
      sorting: [],
      pagination: { pageSize: 1000, pageIndex: 0 },
    };
  });

  // Update parent whenever filter changes
  const handleFilterChange = () => {
    const spec = buildFilterSpec();
    props.onFilterChange(JSON.stringify(spec));
  };

  const toggleProgram = (program: string, list: "interested" | "done") => {
    const setter = list === "interested" ? setInterestedPrograms : setProgramsDone;
    const getter = list === "interested" ? interestedPrograms : programsDone;
    
    setter((prev) => {
      const updated = prev.includes(program)
        ? prev.filter((p) => p !== program)
        : [...prev, program];
      handleFilterChange();
      return updated;
    });
  };

  const toggleInterestLevel = (level: string) => {
    setInterestLevels((prev) => {
      const updated = prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level];
      handleFilterChange();
      return updated;
    });
  };

  const clearAllFilters = () => {
    setInterestedPrograms([]);
    setProgramsDone([]);
    setInterestLevels([]);
    setHasCallHistory(null);
    setHasFollowUp(null);
    props.onFilterChange(JSON.stringify({ filters: [] }));
  };

  return (
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold mb-1">Filter Target Audience</h3>
        <p class="text-sm text-muted-foreground">
          Select criteria to identify leads for this campaign
        </p>
      </div>

      {/* Matched Count */}
      <Show when={props.matchedCount !== undefined}>
        <Card class="p-4 bg-primary/5 border-primary/20">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Matching Leads</span>
            <Badge variant="default" class="text-base px-3 py-1">
              {props.matchedCount}
            </Badge>
          </div>
        </Card>
      </Show>

      <div class="grid md:grid-cols-2 gap-6">
        {/* Interest Level */}
        <div class="space-y-3">
          <label class="text-sm font-medium">Interest Level</label>
          <div class="space-y-2">
            <For each={["High", "Medium", "Low", "Not_Interested"]}>
              {(level) => (
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={interestLevels().includes(level)}
                    onChange={() => toggleInterestLevel(level)}
                  />
                  <span class="text-sm">{level.replace("_", " ")}</span>
                </label>
              )}
            </For>
          </div>
        </div>

        {/* Interested Programs */}
        <div class="space-y-3">
          <label class="text-sm font-medium">Interested In Programs</label>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <For each={AVAILABLE_PROGRAMS}>
              {(program) => (
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={interestedPrograms().includes(program)}
                    onChange={() => toggleProgram(program, "interested")}
                  />
                  <span class="text-sm">{program}</span>
                </label>
              )}
            </For>
          </div>
        </div>

        {/* Programs Done */}
        <div class="space-y-3">
          <label class="text-sm font-medium">Completed Programs</label>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <For each={AVAILABLE_PROGRAMS}>
              {(program) => (
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={programsDone().includes(program)}
                    onChange={() => toggleProgram(program, "done")}
                  />
                  <span class="text-sm">{program}</span>
                </label>
              )}
            </For>
          </div>
        </div>

        {/* Call History */}
        <div class="space-y-3">
          <label class="text-sm font-medium">Call History</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={hasCallHistory() === true}
                onChange={() => {
                  setHasCallHistory(hasCallHistory() === true ? null : true);
                  handleFilterChange();
                }}
              />
              <span class="text-sm">Has been called before</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={hasCallHistory() === false}
                onChange={() => {
                  setHasCallHistory(hasCallHistory() === false ? null : false);
                  handleFilterChange();
                }}
              />
              <span class="text-sm">Never called</span>
            </label>
          </div>
        </div>

        {/* Follow-up Status */}
        <div class="space-y-3">
          <label class="text-sm font-medium">Follow-up Status</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={hasFollowUp() === true}
                onChange={() => {
                  setHasFollowUp(hasFollowUp() === true ? null : true);
                  handleFilterChange();
                }}
              />
              <span class="text-sm">Has scheduled follow-up</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={hasFollowUp() === false}
                onChange={() => {
                  setHasFollowUp(hasFollowUp() === false ? null : false);
                  handleFilterChange();
                }}
              />
              <span class="text-sm">No follow-up scheduled</span>
            </label>
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      <div class="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
        >
          Clear All Filters
        </Button>
      </div>

      {/* Debug: Show active filters */}
      <Show when={import.meta.env.DEV}>
        <details class="text-xs">
          <summary class="cursor-pointer text-muted-foreground">
            Debug: Filter Spec
          </summary>
          <pre class="mt-2 p-2 bg-muted rounded overflow-auto">
            {JSON.stringify(buildFilterSpec(), null, 2)}
          </pre>
        </details>
      </Show>
    </div>
  );
};
