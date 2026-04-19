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
  onCleanup,
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
import type { Member, MemberField } from "~/lib/schemas/domain/member.schema";
import { PROGRAMS } from "./LeadFilterPane";

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
  const [memberSinceYear, setMemberSinceYear] = createSignal<number | null>(null);
  const [interestedOpen, setInterestedOpen] = createSignal(true);
  const [doneOpen, setDoneOpen] = createSignal(false);

  const activeCount = () => {
    let n = selectedPrograms().length + selectedDonePrograms().length;
    if (memberSinceYear() !== null) n++;
    if (searchText()) n++;
    return n;
  };

  let filterTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(filterTimer));

  createEffect(() => {
    const programs = selectedPrograms();
    const donePrograms = selectedDonePrograms();
    const since = memberSinceYear();
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

    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => props.controller.setFilters(filters), 0);
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
    setSelectedPrograms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleDoneProgram = (p: string) => {
    setSelectedDonePrograms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  // Generate year options from 2015 to current year
  const years = Array.from(
    { length: currentYear - 2014 },
    (_, i) => currentYear - i
  );

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

        {/* Member Since */}
        <div class="space-y-1.5">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member Since</p>
          <select
            value={memberSinceYear() ?? ""}
            onChange={(e) => {
              const v = parseInt(e.currentTarget.value);
              setMemberSinceYear(isNaN(v) ? null : v);
            }}
            class="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Any year</option>
            <For each={years}>
              {(y) => <option value={y}>{y} or later</option>}
            </For>
          </select>
        </div>

        {/* Interested In Programs */}
        <div class="space-y-2">
          <button
            type="button"
            class="flex w-full items-center justify-between"
            onClick={() => setInterestedOpen((v) => !v)}
          >
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Interested In
              <Show when={selectedPrograms().length > 0}>
                <span class="ml-1 text-primary">({selectedPrograms().length})</span>
              </Show>
            </p>
            <span class="text-muted-foreground text-xs">{interestedOpen() ? <ChevronUp class="w-3 h-3" /> : <ChevronDown class="w-3 h-3" />}</span>
          </button>
          <Show when={interestedOpen()}>
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

        {/* Programs Done */}
        <div class="space-y-2">
          <button
            type="button"
            class="flex w-full items-center justify-between"
            onClick={() => setDoneOpen((v) => !v)}
          >
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Programs
              <Show when={selectedDonePrograms().length > 0}>
                <span class="ml-1 text-primary">({selectedDonePrograms().length})</span>
              </Show>
            </p>
            <span class="text-muted-foreground text-xs">{doneOpen() ? <ChevronUp class="w-3 h-3" /> : <ChevronDown class="w-3 h-3" />}</span>
          </button>
          <Show when={doneOpen()}>
            <div class="space-y-1.5">
              <For each={PROGRAMS}>
                {(prog) => (
                  <div
                    class="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleDoneProgram(prog)}
                  >
                    <Checkbox checked={selectedDonePrograms().includes(prog)} onChange={() => {}} />
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
