import { createSignal, createMemo, onMount } from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers/types";

/**
 * useCollectionState - Shared collection state helpers
 * 
 * Extracts common state logic used by both Table and Cards components.
 * Handles loading, error, empty states, and hydration protection.
 */
export function useCollectionState<T, TField extends string = string>(
  controller: CollectionQueryState<T, TField>
) {
  // Track client-side mount to avoid hydration mismatch for interactive elements
  const [isClient, setIsClient] = createSignal(false);
  onMount(() => setIsClient(true));

  // Loading state
  const isLoading = createMemo(() => controller.isLoading());

  // Error state
  const error = createMemo(() => controller.error());
  const hasError = createMemo(() => error() !== null);

  // Data and items
  const data = createMemo(() => controller.data());
  const items = createMemo(() => data()?.items ?? []);

  // Empty state (no items but not loading/error)
  const isEmpty = createMemo(() => {
    return !isLoading() && !hasError() && items().length === 0;
  });

  // Has items (successful data with items)
  const hasItems = createMemo(() => {
    return !isLoading() && !hasError() && items().length > 0;
  });

  // Should show content (not loading, not error)
  const shouldShowContent = createMemo(() => {
    return !isLoading() && !hasError();
  });

  return {
    // Client state
    isClient,
    
    // Loading/Error
    isLoading,
    error,
    hasError,
    
    // Data state
    data,
    items,
    isEmpty,
    hasItems,
    shouldShowContent,
  };
}
