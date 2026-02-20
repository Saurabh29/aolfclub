import { For, Show } from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { CardRenderer } from "./types";
import { Button } from "~/components/ui/button";

export interface CollectionCardsProps<T, TField extends string = string> {
  controller: CollectionQueryState<T, TField>;
  getId: (item: T) => string;
  renderCard: CardRenderer<T>;
  selectable?: boolean;
  columns?: number;
}

/**
 * CollectionCards - Generic card grid component
 */
export function CollectionCards<T, TField extends string = string>(
  props: CollectionCardsProps<T, TField>
) {
  const handleCardClick = (item: T) => {
    if (props.selectable) {
      props.controller.toggleItem(props.getId(item));
    }
  };

  const gridClass = () => {
    const cols = props.columns ?? 3;
    return `grid grid-cols-1 md:grid-cols-${Math.min(cols, 3)} lg:grid-cols-${cols} gap-4`;
  };

  return (
    <div>
      <Show when={props.controller.isLoading()}>
        <div class="p-8 text-center text-muted-foreground">Loading...</div>
      </Show>

      <Show when={props.controller.error()}>
        <div class="p-8 text-center text-destructive">
          Error: {props.controller.error()?.message}
        </div>
      </Show>

      <Show when={!props.controller.isLoading() && !props.controller.error()}>
        <div class={gridClass()}>
          <For each={props.controller.data()?.items ?? []}>
            {(item) => {
              const id = props.getId(item);
              const isSelected = props.controller.selectedIds().has(id);

              return (
                <div
                  onClick={() => handleCardClick(item)}
                  class={isSelected ? "ring-2 ring-primary rounded-lg" : ""}
                >
                  {props.renderCard(item, isSelected)}
                </div>
              );
            }}
          </For>
        </div>

        {/* Pagination controls for cards */}
        <Show when={props.controller.data()?.pageInfo}>
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
