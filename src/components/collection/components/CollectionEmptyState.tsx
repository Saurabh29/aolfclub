import { Show, type JSX } from "solid-js";

export interface CollectionEmptyStateProps {
  /** Message to display when no items are found */
  message?: string;
  /** Icon element to display when empty */
  icon?: JSX.Element;
  /** Action element (e.g., button) to display when empty */
  action?: JSX.Element;
  /** Whether client-side is mounted (for hydration safety) */
  isClient: boolean;
}

/**
 * CollectionEmptyState - Shared empty state UI
 * Used by both Table and Cards components
 */
export function CollectionEmptyState(props: CollectionEmptyStateProps) {
  return (
    <div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Show when={props.icon}>{props.icon}</Show>
      <p class="text-lg font-medium mt-4">
        {props.message ?? "No items found"}
      </p>
      {/* Render action only on client to avoid hydration mismatch */}
      <Show when={props.isClient && props.action}>
        <div class="mt-4">{props.action}</div>
      </Show>
    </div>
  );
}
