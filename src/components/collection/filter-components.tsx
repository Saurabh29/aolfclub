/**
 * Shared Filter Components
 *
 * Reusable building blocks for filter panes across the app:
 *   - FilterPaneShell: header with active count badge + clear + scrollable body
 *   - CheckboxFilterGroup: collapsible checkbox list with count indicator
 *   - ChipToggleGroup: pill-style multi-select chips
 *   - FilterSearchInput: search text field using solid-ui TextField
 */
import { createSignal, Show, For, type JSX, type Component } from "solid-js";
import { ChevronUp, ChevronDown } from "lucide-solid";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { TextField, TextFieldInput } from "~/components/ui/text-field";

// ── FilterPaneShell ──────────────────────────────────────────────────────

export interface FilterPaneShellProps {
  activeCount: number;
  onClearAll: () => void;
  children: JSX.Element;
}

export const FilterPaneShell: Component<FilterPaneShellProps> = (props) => {
  return (
    <div class="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold">Filters</span>
          <Show when={props.activeCount > 0}>
            <Badge variant="default" class="text-xs px-1.5 py-0.5 leading-none">
              {props.activeCount}
            </Badge>
          </Show>
        </div>
        <Show when={props.activeCount > 0}>
          <button
            type="button"
            onClick={props.onClearAll}
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </Show>
      </div>

      {/* Scrollable body */}
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {props.children}
      </div>
    </div>
  );
};

// ── CheckboxFilterGroup ──────────────────────────────────────────────────

export interface CheckboxFilterGroupProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  defaultOpen?: boolean;
}

export const CheckboxFilterGroup: Component<CheckboxFilterGroupProps> = (props) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true);

  return (
    <div class="space-y-2">
      <button
        type="button"
        class="flex w-full items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {props.label}
          <Show when={props.selected.length > 0}>
            <span class="ml-1 text-primary">({props.selected.length})</span>
          </Show>
        </p>
        <span class="text-muted-foreground text-xs">
          {open() ? <ChevronUp class="w-3 h-3" /> : <ChevronDown class="w-3 h-3" />}
        </span>
      </button>
      <Show when={open()}>
        <div class="space-y-1.5">
          <For each={props.options}>
            {(opt) => (
              <div
                class="flex items-center gap-2 cursor-pointer"
                onClick={() => props.onToggle(opt)}
              >
                <Checkbox checked={props.selected.includes(opt)} onChange={() => {}} />
                <span class="text-sm">{opt}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

// ── ChipToggleGroup ──────────────────────────────────────────────────────

export interface ChipToggleGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}

export function ChipToggleGroup<T extends string>(props: ChipToggleGroupProps<T>) {
  return (
    <div>
      <p class="text-sm font-medium mb-2">{props.label}</p>
      <div class="flex flex-wrap gap-2">
        <For each={props.options}>
          {(item) => (
            <button
              type="button"
              onClick={() => props.onToggle(item.value)}
              class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                props.selected.includes(item.value)
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
  );
}

// ── FilterSearchInput ────────────────────────────────────────────────────

export interface FilterSearchInputProps {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const FilterSearchInput: Component<FilterSearchInputProps> = (props) => {
  return (
    <div class="space-y-1.5">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {props.label ?? "Search"}
      </p>
      <TextField>
        <TextFieldInput
          type="text"
          placeholder={props.placeholder ?? "Name or phone..."}
          value={props.value}
          onInput={(e: InputEvent) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          class="h-8 text-sm"
        />
      </TextField>
    </div>
  );
};
