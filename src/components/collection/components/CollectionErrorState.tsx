export interface CollectionErrorStateProps {
  error: Error | null;
  /** Custom error message */
  message?: string;
}

/**
 * CollectionErrorState - Shared error state UI
 * Used by both Table and Cards components
 */
export function CollectionErrorState(props: CollectionErrorStateProps) {
  return (
    <div class="p-8 text-center text-destructive">
      {props.message ?? `Error: ${props.error?.message}`}
    </div>
  );
}
