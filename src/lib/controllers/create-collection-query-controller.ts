import { createSignal, createResource } from "solid-js";
import type { QuerySpec, QueryResult, SortSpec, FilterCondition } from "~/lib/schemas/query";
import type { CollectionQueryState } from "./types";

export interface CreateCollectionQueryControllerOptions<T, TField extends string = string> {
  /**
   * Query function that returns Promise<QueryResult<T>>
   * Typically a SolidStart query function
   */
  queryFn: (spec: QuerySpec<TField>) => Promise<QueryResult<T>>;

  /**
   * Initial query specification
   */
  initialQuery: QuerySpec<TField>;

  /**
   * Extract ID from item (default: item.id)
   */
  getId?: (item: T) => string;
}

/**
 * createCollectionQueryController - Client state engine for collections
 * 
 * One controller → many UIs (Table, Cards, Lists)
 * Integrates with TanStack Table for advanced filtering/sorting
 * Orchestrates QuerySpec and server communication
 * 
 * @example
 * ```tsx
 * const controller = createCollectionQueryController({
 *   queryFn: (spec) => queryUsersQuery(spec),
 *   initialQuery: {
 *     filters: [],
 *     sorting: [],
 *     pagination: { pageSize: 20, pageIndex: 0 }
 *   }
 * });
 * 
 * // Use with TanStack Table
 * <UserTable controller={controller} />
 * 
 * // Use with Cards (responsive)
 * <UserCards controller={controller} />
 * ```
 */
export function createCollectionQueryController<T, TField extends string = string>(
  options: CreateCollectionQueryControllerOptions<T, TField>
): CollectionQueryState<T, TField> {
  const { queryFn, initialQuery, getId = (item: any) => item.id } = options;

  // Query state
  const [querySpec, setQuerySpec] = createSignal<QuerySpec<TField>>(initialQuery);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

  // Data fetching with createResource
  const [data, { refetch }] = createResource(querySpec, queryFn);

  // Derived state
  const isLoading = () => data.loading;
  const error = () => (data.error as Error) ?? null;

  // Actions
  const refresh = () => refetch();

  const setFilters = (filters: FilterCondition<TField>[]) => {
    setQuerySpec((prev) => ({ ...prev, filters }));
  };

  const setSorting = (sorting: SortSpec<TField>[]) => {
    setQuerySpec((prev) => ({ ...prev, sorting }));
  };

  const setPagination = (pagination: QuerySpec<TField>["pagination"]) => {
    setQuerySpec((prev) => ({ ...prev, pagination }));
  };

  const selectItem = (id: string) => {
    setSelectedIds((prev) => new Set([...prev, id]));
  };

  const deselectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    if (selectedIds().has(id)) {
      deselectItem(id);
    } else {
      selectItem(id);
    }
  };

  const selectAll = () => {
    const items = data()?.items ?? [];
    setSelectedIds(new Set(items.map(getId)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set<string>());
  };

  return {
    querySpec,
    setQuerySpec,
    data,
    isLoading,
    error,
    selectedIds,
    setSelectedIds,
    refresh,
    setFilters,
    setSorting,
    setPagination,
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    clearSelection,
  };
}
