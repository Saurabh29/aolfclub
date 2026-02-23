import { For, Show, type JSX } from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { CardRenderer } from "./types";
import { Button } from "~/components/ui/button";
import { useCollectionState, useCollectionPagination } from "./hooks";

export interface CollectionCardsProps<T, TField extends string = string> {
  controller: CollectionQueryState<T, TField>;
  getId: (item: T) => string;
  renderCard: CardRenderer<T>;
  selectable?: boolean;
  columns?: number;
  /** Additional CSS class for the container div */
  containerClass?: string;
  /** Additional CSS class for each card wrapper */
  cardClass?: string;
  /** Message to display when no items are found */
  emptyMessage?: string;
  /** Icon element to display when empty */
  emptyIcon?: JSX.Element;
  /** Action element (e.g., button) to display when empty */
  emptyAction?: JSX.Element;
}

/**
 * CollectionCards - Generic card grid component
 * 
 * Features:
 * - Responsive grid layout with explicit Tailwind classes
 * - Loading and error states
 * - Empty state with custom message, icon, and action
 * - Pagination controls
 * - Selection support
 * - Hydration mismatch protection
 */
export function CollectionCards<T, TField extends string = string>(
  props: CollectionCardsProps<T, TField>
) {
  // Use shared hooks for common logic
  const state = useCollectionState(props.controller);
  const pagination = useCollectionPagination(props.controller);

  const handleCardClick = (item: T) => {
    if (props.selectable) {
      props.controller.toggleItem(props.getId(item));
    }
  };

  // Use explicit Tailwind classes for JIT compiler
  const gridClass = () => {
    const cols = props.columns ?? 3;
    const mdCols = Math.min(cols, 3);
    
    // Map to explicit classes for Tailwind JIT
    const mdColsClass = {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
    }[mdCols] || "md:grid-cols-2";
    
    const lgColsClass = {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
    }[cols] || "lg:grid-cols-3";
    
    return `grid grid-cols-1 ${mdColsClass} ${lgColsClass} gap-4`;
  };

  return (
    <div class={props.containerClass}>
      <Show when={state.isLoading()}>
        <div class="p-8 text-center text-muted-foreground">Loading...</div>
      </Show>

      <Show when={state.hasError()}>
        <div class="p-8 text-center text-destructive">
          Error: {state.error()?.message}
        </div>
      </Show>

      <Show when={state.shouldShowContent()}>
        {/* Empty state */}
        <Show when={state.isEmpty()}>
          <div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Show when={props.emptyIcon}>{props.emptyIcon}</Show>
            <p class="text-lg font-medium mt-4">
              {props.emptyMessage ?? "No items found"}
            </p>
            {/* Render emptyAction only on client to avoid hydration mismatch */}
            <Show when={state.isClient() && props.emptyAction}>
              <div class="mt-4">{props.emptyAction}</div>
            </Show>
          </div>
        </Show>

        {/* Card grid */}
        <Show when={state.hasItems()}>
          <div class={gridClass()}>
            <For each={state.items()}>
              {(item) => {
                const id = props.getId(item);
                const isSelected = props.controller.selectedIds().has(id);

                return (
                  <div
                    onClick={() => handleCardClick(item)}
                    class={[
                      props.cardClass,
                      isSelected ? "ring-2 ring-primary rounded-lg" : "",
                      props.selectable ? "cursor-pointer" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {props.renderCard(item, isSelected)}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Pagination controls */}
        <Show when={state.hasItems() && pagination.pageInfo()}>
          <div class="mt-6 flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              <Show when={pagination.displayInfo()}>
                {(info) => (
                  <span>
                    Showing {info().start} to {info().end} of {info().totalCount} results
                  </span>
                )}
              </Show>
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.goToPreviousPage}
                disabled={!pagination.canGoPrevious()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.goToNextPage}
                disabled={!pagination.canGoNext()}
              >
                Next
              </Button>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
