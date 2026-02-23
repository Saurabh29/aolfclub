import { Show, type JSX } from "solid-js";
import { Button } from "~/components/ui/button";

/**
 * Collection State Components
 * 
 * Consolidated UI components for collection loading, error, empty, and pagination states.
 * Used by both CollectionTable and CollectionCards components.
 */

// ============================================================================
// Loading State
// ============================================================================

export interface CollectionLoadingStateProps {
  /** Custom loading message */
  message?: string;
  /** Custom loading icon/spinner */
  icon?: JSX.Element;
}

export function CollectionLoadingState(props: CollectionLoadingStateProps) {
  return (
    <div class="p-8 text-center text-muted-foreground">
      {props.icon}
      {props.message ?? "Loading..."}
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

export interface CollectionErrorStateProps {
  error: Error | null;
  /** Custom error message */
  message?: string;
}

export function CollectionErrorState(props: CollectionErrorStateProps) {
  return (
    <div class="p-8 text-center text-destructive">
      {props.message ?? `Error: ${props.error?.message}`}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

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

// ============================================================================
// Pagination Controls
// ============================================================================

export interface CollectionPaginationControlsProps {
  /** Display info (showing X to Y of Z) */
  displayInfo?: { start: number; end: number; totalCount: number } | null;
  /** Handler for previous page */
  onPrevious: () => void;
  /** Handler for next page */
  onNext: () => void;
  /** Whether previous button is disabled */
  canGoPrevious: boolean;
  /** Whether next button is disabled */
  canGoNext: boolean;
  /** Additional CSS class for the container */
  class?: string;
}

export function CollectionPaginationControls(props: CollectionPaginationControlsProps) {
  return (
    <div class={props.class ?? "mt-4 flex items-center justify-between"}>
      <div class="text-sm text-muted-foreground">
        <Show when={props.displayInfo}>
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
          onClick={props.onPrevious}
          disabled={!props.canGoPrevious}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={props.onNext}
          disabled={!props.canGoNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
