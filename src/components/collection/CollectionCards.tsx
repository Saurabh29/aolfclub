import { For, Show, createSignal, onMount, type JSX } from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { CardRenderer } from "./types";
import { Button } from "~/components/ui/button";

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
  // Track client-side mount to avoid hydration mismatch for interactive elements
  const [isClient, setIsClient] = createSignal(false);
  onMount(() => setIsClient(true));

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

  const hasItems = () => {
    const data = props.controller.data();
    return data && data.items.length > 0;
  };

  return (
    <div class={props.containerClass}>
      <Show when={props.controller.isLoading()}>
        <div class="p-8 text-center text-muted-foreground">Loading...</div>
      </Show>

      <Show when={props.controller.error()}>
        <div class="p-8 text-center text-destructive">
          Error: {props.controller.error()?.message}
        </div>
      </Show>

      <Show when={!props.controller.isLoading() && !props.controller.error()}>
        {/* Empty state */}
        <Show when={!hasItems()}>
          <div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Show when={props.emptyIcon}>{props.emptyIcon}</Show>
            <p class="text-lg font-medium mt-4">
              {props.emptyMessage ?? "No items found"}
            </p>
            {/* Render emptyAction only on client to avoid hydration mismatch */}
            <Show when={isClient() && props.emptyAction}>
              <div class="mt-4">{props.emptyAction}</div>
            </Show>
          </div>
        </Show>

        {/* Card grid */}
        <Show when={hasItems()}>
          <div class={gridClass()}>
            <For each={props.controller.data()?.items ?? []}>
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

        {/* Pagination controls for cards */}
        <Show when={hasItems() && props.controller.data()?.pageInfo}>
          {(pageInfo) => (
            <div class="mt-6 flex items-center justify-between">
              <div class="text-sm text-muted-foreground">
                <Show when={pageInfo().totalCount}>
                  {(count) => {
                    const spec = props.controller.querySpec();
                    const pageIndex = spec.pagination.pageIndex ?? 0;
                    const pageSize = spec.pagination.pageSize;
                    const start = pageIndex * pageSize + 1;
                    const end = Math.min((pageIndex + 1) * pageSize, count());
                    return <span>Showing {start} to {end} of {count()} results</span>;
                  }}
                </Show>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const spec = props.controller.querySpec();
                    const currentPage = spec.pagination.pageIndex ?? 0;
                    if (currentPage > 0) {
                      props.controller.setPagination({
                        ...spec.pagination,
                        pageIndex: currentPage - 1,
                      });
                    }
                  }}
                  disabled={(props.controller.querySpec().pagination.pageIndex ?? 0) === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const spec = props.controller.querySpec();
                    const currentPage = spec.pagination.pageIndex ?? 0;
                    props.controller.setPagination({
                      ...spec.pagination,
                      pageIndex: currentPage + 1,
                    });
                  }}
                  disabled={!pageInfo().hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
