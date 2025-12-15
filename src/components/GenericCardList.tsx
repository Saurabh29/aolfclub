import { For } from "solid-js";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
  GenericCardListPropsSchema,
  type GenericCardListProps,
  type CardAction,
} from "~/lib/schemas/ui/card.schema";

export type { CardAction, GenericCardListProps };

export default function GenericCardList<T extends Record<string, any>>(
  props: GenericCardListProps<T>,
) {
  // Runtime validation with Zod
  try {
    GenericCardListPropsSchema.parse({
      items: props.items,
      getId: props.getId,
      renderHeader: props.renderHeader,
      renderContent: props.renderContent,
      onItemClick: props.onItemClick,
      actions: props.actions,
      cardClass: props.cardClass,
      listClass: props.listClass,
      gridConfig: props.gridConfig,
    });
  } catch (error) {
    console.error("GenericCardList validation error:", error);
    throw new Error("Invalid props provided to GenericCardList");
  }

  const handleCardClick = (item: T) => {
    if (props.onItemClick) {
      props.onItemClick(item);
    }
  };

  const handleActionClick = (e: MouseEvent, action: CardAction<T>, item: T) => {
    e.stopPropagation();
    action.onClick(item);
  };

  // Build grid classes from config
  const getGridClasses = () => {
    const config = props.gridConfig;
    if (!config?.cols) {
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    }

    const { sm = 1, md = 2, lg = 3, xl = 4 } = config.cols;
    const gap = config.gap || "gap-4";

    return cn(
      "grid",
      `grid-cols-${sm}`,
      md && `sm:grid-cols-${md}`,
      lg && `lg:grid-cols-${lg}`,
      xl && `xl:grid-cols-${xl}`,
      gap,
    );
  };

  return (
    <div class={cn(getGridClasses(), props.listClass)}>
      <For each={props.items}>
        {(item) => (
          <Card
            class={cn(
              "relative flex flex-col overflow-hidden transition-all hover:shadow-lg",
              props.onItemClick && "cursor-pointer",
              props.cardClass,
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
              <CardContent class="flex-1">
                {props.renderContent(item)}
              </CardContent>
            )}
          </Card>
        )}
      </For>
    </div>
  );
}
