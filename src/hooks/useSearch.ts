import { createMemo, createSignal, Accessor } from "solid-js";

/**
 * Custom hook for client-side search/filtering
 *
 * @param items - Signal or accessor containing array of items to search
 * @param searchFn - Function that determines if an item matches the query
 * @returns Object with query signal, setter, and filtered results
 *
 * @example
 * ```tsx
 * const { query, setQuery, filtered } = useSearch(
 *   locations,
 *   (loc, q) =>
 *     loc.name.toLowerCase().includes(q) ||
 *     (loc.address?.toLowerCase().includes(q) ?? false)
 * );
 * ```
 */
export function useSearch<T>(
  items: Accessor<T[]>,
  searchFn: (item: T, query: string) => boolean,
) {
  const [query, setQuery] = createSignal("");

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return items();
    return items().filter((item) => searchFn(item, q));
  });

  const clear = () => setQuery("");

  return {
    query,
    setQuery,
    filtered,
    clear,
  };
}
