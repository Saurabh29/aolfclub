/**
 * MemberFilterPane
 *
 * Left-side semantic filter panel for the Members collection.
 *
 * Ownership model:
 *   This pane owns:  memberSince (year range), programsDone, interestedPrograms
 *   Table owns:      displayName search (text search), sorting
 */
import {
  createSignal,
  createEffect,
  For,
  batch,
  type Component,
} from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers";
import type { FilterCondition } from "~/lib/schemas/query";
import type { Member, MemberField } from "~/lib/schemas/domain/member.schema";
import { PROGRAMS } from "./LeadFilterPane";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
  FilterPaneShell,
  CheckboxFilterGroup,
  FilterSearchInput,
} from "~/components/collection/filter-components";
import { toggleItem } from "~/lib/utils/toggle-item";

// -- Component -----------------------------------------------------------------

export interface MemberFilterPaneProps {
  controller: CollectionQueryState<Member, MemberField>;
  compact?: boolean;
}

export const MemberFilterPane: Component<MemberFilterPaneProps> = (props) => {
  const currentYear = new Date().getFullYear();

  const [searchText, setSearchText] = createSignal("");
  const [selectedPrograms, setSelectedPrograms] = createSignal<string[]>([]);
  const [selectedDonePrograms, setSelectedDonePrograms] = createSignal<string[]>([]);
  const [memberSinceYear, setMemberSinceYear] = createSignal<string | null>(null);

  const activeCount = () => {
    let n = selectedPrograms().length + selectedDonePrograms().length;
    if (memberSinceYear() !== null) n++;
    if (searchText()) n++;
    return n;
  };

  createEffect(() => {
    const programs = selectedPrograms();
    const donePrograms = selectedDonePrograms();
    const sinceStr = memberSinceYear();
    const since = sinceStr !== null ? parseInt(sinceStr) : null;
    const search = searchText().trim();

    const filters: FilterCondition<MemberField>[] = [];

    // Interested in programs (AND: must match all selected)
    for (const p of programs) {
      filters.push({ field: "interestedPrograms", op: "contains", value: p });
    }

    // Programs done (AND)
    for (const p of donePrograms) {
      filters.push({ field: "programsDone", op: "contains", value: p });
    }

    // Member since year  -  memberSince is ISO datetime, so gte year-01-01
    if (since !== null) {
      filters.push({
        field: "memberSince",
        op: "gte",
        value: `${since}-01-01T00:00:00.000Z`,
      });
    }

    // Name search
    if (search) {
      filters.push({ field: "displayName", op: "contains", value: search });
    }

    props.controller.setFilters(filters);
  });

  const clearAll = () => {
    batch(() => {
      setSearchText("");
      setSelectedPrograms([]);
      setSelectedDonePrograms([]);
      setMemberSinceYear(null);
    });
  };

  const toggleProgram = (p: string) => {
    setSelectedPrograms((prev) => toggleItem(prev, p));
  };

  const toggleDoneProgram = (p: string) => {
    setSelectedDonePrograms((prev) => toggleItem(prev, p));
  };

  // Generate year options from 2015 to current year
  const years = Array.from(
    { length: currentYear - 2014 },
    (_, i) => String(currentYear - i)
  );

  return (
    <FilterPaneShell activeCount={activeCount()} onClearAll={clearAll}>
      {/* Search */}
      <FilterSearchInput
        value={searchText()}
        onInput={setSearchText}
      />

      {/* Member Since — using solid-ui Select */}
      <div class="space-y-1.5">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member Since</p>
        <Select
          value={memberSinceYear() ?? undefined}
          onChange={(v) => setMemberSinceYear(v ?? null)}
          options={years}
          placeholder="Any year"
          itemComponent={(itemProps) => (
            <SelectItem item={itemProps.item}>{itemProps.item.rawValue} or later</SelectItem>
          )}
        >
          <SelectTrigger class="h-8 text-sm">
            <SelectValue<string>>{(state) => state.selectedOption() ? `${state.selectedOption()} or later` : "Any year"}</SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>

      {/* Interested In Programs */}
      <CheckboxFilterGroup
        label="Interested In"
        options={PROGRAMS}
        selected={selectedPrograms()}
        onToggle={toggleProgram}
        defaultOpen={true}
      />

      {/* Programs Done */}
      <CheckboxFilterGroup
        label="Completed Programs"
        options={PROGRAMS}
        selected={selectedDonePrograms()}
        onToggle={toggleDoneProgram}
        defaultOpen={false}
      />
    </FilterPaneShell>
  );
};
