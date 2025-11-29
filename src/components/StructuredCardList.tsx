import { For, Match, Switch, type JSX } from "solid-js";
import { Card, CardContent, CardHeader, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import {
  StructuredCardListPropsSchema,
  type StructuredCardListProps,
  type ComponentUnion,
  type MetricComponent,
  type ListItemComponent,
  type BadgeComponent,
  type LabelComponent,
  type IconCardComponent,
  type CustomComponent,
} from "~/schemas/card.schema";

/**
 * Renders a single component based on its type
 */
function ComponentRenderer(props: { component: ComponentUnion }) {
  return (
    <Switch>
      <Match when={props.component.type === "metric"}>
        <MetricRenderer component={props.component as MetricComponent} />
      </Match>
      <Match when={props.component.type === "list"}>
        <ListRenderer component={props.component as ListItemComponent} />
      </Match>
      <Match when={props.component.type === "badge"}>
        <BadgeRenderer component={props.component as BadgeComponent} />
      </Match>
      <Match when={props.component.type === "label"}>
        <LabelRenderer component={props.component as LabelComponent} />
      </Match>
      <Match when={props.component.type === "iconCard"}>
        <IconCardRenderer component={props.component as IconCardComponent} />
      </Match>
      <Match when={props.component.type === "custom"}>
        <CustomRenderer component={props.component as CustomComponent} />
      </Match>
    </Switch>
  );
}

/**
 * Metric Component Renderer
 */
function MetricRenderer(props: { component: MetricComponent }) {
  const variantClasses = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success-foreground",
    warning: "text-warning-foreground",
    error: "text-error-foreground",
    info: "text-info-foreground",
  };

  const variant = props.component.data.variant || "default";

  return (
    <div class={cn("flex items-center gap-2", props.component.className)}>
      {props.component.data.icon && (
        <div class="flex-shrink-0">{props.component.data.icon}</div>
      )}
      <div class="flex-1 min-w-0">
        <div class="text-sm text-muted-foreground">{props.component.data.label}</div>
        <div class={cn("text-lg font-semibold truncate", variantClasses[variant])}>
          {props.component.data.value}
        </div>
      </div>
    </div>
  );
}

/**
 * List Component Renderer
 */
function ListRenderer(props: { component: ListItemComponent }) {
  const isOrdered = props.component.data.ordered;
  const listClass = isOrdered ? "list-decimal" : "list-disc";

  return (
    <div class={cn(props.component.className)}>
      {isOrdered ? (
        <ol class={cn(listClass, "ml-5 space-y-1")}>
          <For each={props.component.data.items}>
            {(item) => (
              <li class="text-sm">
                {props.component.data.icon && (
                  <span class="mr-2 inline-block">{props.component.data.icon}</span>
                )}
                {item}
              </li>
            )}
          </For>
        </ol>
      ) : (
        <ul class={cn(listClass, "ml-5 space-y-1")}>
          <For each={props.component.data.items}>
            {(item) => (
              <li class="text-sm">
                {props.component.data.icon && (
                  <span class="mr-2 inline-block">{props.component.data.icon}</span>
                )}
                {item}
              </li>
            )}
          </For>
        </ul>
      )}
    </div>
  );
}

/**
 * Badge Component Renderer
 */
function BadgeRenderer(props: { component: BadgeComponent }) {
  const variantClasses = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    error: "bg-error text-error-foreground",
    info: "bg-info text-info-foreground",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-base",
  };

  const variant = props.component.data.variant || "default";
  const size = props.component.data.size || "md";

  return (
    <span
      class={cn(
        "inline-flex items-center rounded-full font-medium",
        variantClasses[variant],
        sizeClasses[size],
        props.component.className
      )}
    >
      {props.component.data.label}
    </span>
  );
}

/**
 * Label Component Renderer
 */
function LabelRenderer(props: { component: LabelComponent }) {
  const isVertical = props.component.data.orientation === "vertical";

  return (
    <div
      class={cn(
        "flex gap-2",
        isVertical ? "flex-col" : "flex-row items-center justify-between",
        props.component.className
      )}
    >
      <span class="text-sm text-muted-foreground">{props.component.data.key}:</span>
      <span class="text-sm font-medium">{props.component.data.value}</span>
    </div>
  );
}

/**
 * Icon Card Component Renderer
 */
function IconCardRenderer(props: { component: IconCardComponent }) {
  const variantClasses = {
    default: "bg-muted",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success-foreground",
    warning: "bg-warning/10 text-warning-foreground",
    error: "bg-error/10 text-error-foreground",
    info: "bg-info/10 text-info-foreground",
  };

  const variant = props.component.data.variant || "default";

  return (
    <div class={cn("flex gap-3", props.component.className)}>
      <div class={cn("flex h-10 w-10 items-center justify-center rounded-lg", variantClasses[variant])}>
        {props.component.data.icon}
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-medium">{props.component.data.title}</div>
        {props.component.data.description && (
          <div class="text-sm text-muted-foreground">{props.component.data.description}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom Component Renderer
 */
function CustomRenderer(props: { component: CustomComponent }) {
  return (
    <div class={cn(props.component.className)}>
      {props.component.data.render(props.component.data.props || {})}
    </div>
  );
}

/**
 * Structured Card List Component - uses validated ComponentUnion schema
 */
export default function StructuredCardList(props: StructuredCardListProps) {
  // Runtime validation with Zod
  try {
    StructuredCardListPropsSchema.parse(props);
  } catch (error) {
    console.error("StructuredCardList validation error:", error);
    throw new Error("Invalid props provided to StructuredCardList");
  }

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
      gap
    );
  };

  return (
    <div class={cn(getGridClasses(), props.listClass)}>
      <For each={props.cards}>
        {(card) => (
          <Card
            class={cn(
              "relative flex flex-col overflow-hidden transition-all hover:shadow-lg",
              card.onClick && "cursor-pointer",
              props.cardClass
            )}
            onClick={() => card.onClick?.(card)}
          >
            <CardHeader class="flex-none">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  {card.header.render || (
                    <div>
                      {card.header.title && (
                        <h3 class="font-semibold text-lg truncate">{card.header.title}</h3>
                      )}
                      {card.header.subtitle && (
                        <p class="text-sm text-muted-foreground">{card.header.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>

                {card.actions && card.actions.length > 0 && (
                  <div class="flex flex-none items-center gap-1">
                    <For each={card.actions}>
                      {(action) => (
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(card);
                          }}
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

            {card.components && card.components.length > 0 && (
              <CardContent class="flex-1 space-y-3">
                <For each={card.components}>
                  {(component) => <ComponentRenderer component={component} />}
                </For>
              </CardContent>
            )}

            {card.footer && (
              <CardFooter class="flex-none">{card.footer}</CardFooter>
            )}
          </Card>
        )}
      </For>
    </div>
  );
}
