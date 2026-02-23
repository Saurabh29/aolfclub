import { Show } from "solid-js";
import { Button } from "~/components/ui/button";

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

/**
 * CollectionPaginationControls - Shared pagination controls UI
 * Used by both Table and Cards components
 */
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
