import type { JSX } from "solid-js";

export interface CollectionLoadingStateProps {
  /** Custom loading message */
  message?: string;
  /** Custom loading icon/spinner */
  icon?: JSX.Element;
}

/**
 * CollectionLoadingState - Shared loading state UI
 * Used by both Table and Cards components
 */
export function CollectionLoadingState(props: CollectionLoadingStateProps) {
  return (
    <div class="p-8 text-center text-muted-foreground">
      {props.icon}
      {props.message ?? "Loading..."}
    </div>
  );
}
