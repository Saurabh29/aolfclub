import { For, type JSX } from "solid-js";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface CardAction<T> {
  label: string;
  icon?: JSX.Element;
  onClick: (item: T) => void;
}

export interface GenericCardListProps<T extends Record<string, any>> {
  items: T[];
  getId: (item: T) => string;
  renderHeader: (item: T) => JSX.Element;
  renderContent?: (item: T) => JSX.Element;
  onItemClick?: (item: T) => void;
  actions?: CardAction<T>[];
  cardClass?: string;
  listClass?: string;
}

export default function GenericCardList<T extends Record<string, any>>(
  props: GenericCardListProps<T>
) {
  const handleCardClick = (item: T) => {
    if (props.onItemClick) {
      props.onItemClick(item);
    }
  };

  const handleActionClick = (
    e: MouseEvent,
    action: CardAction<T>,
    item: T
  ) => {
    e.stopPropagation();
    action.onClick(item);
  };

  return (
    <div
      class={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        props.listClass
      )}
    >
      <For each={props.items}>
        {(item) => (
          <Card
            class={cn(
              "relative flex flex-col overflow-hidden transition-all hover:shadow-lg",
              props.onItemClick && "cursor-pointer",
              props.cardClass
            )}
            onClick={() => handleCardClick(item)}
          >
            <CardHeader class="flex-none">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">{props.renderHeader(item)}</div>

                {props.actions && props.actions.length > 0 && (
                  <div class="flex flex-none items-center gap-1">
                    <For each={props.actions}>
                      {(action) => (
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                          onClick={(e) => handleActionClick(e, action, item)}
                          aria-label={action.label}
                          title={action.label}
                        >
                          {action.icon || (
                            <span class="text-xs">{action.label[0]}</span>
                          )}
                        </button>
                      )}
                    </For>
                  </div>
                )}
              </div>
            </CardHeader>

            {props.renderContent && (
              <CardContent class="flex-1">{props.renderContent(item)}</CardContent>
            )}
          </Card>
        )}
      </For>
    </div>
  );
}
