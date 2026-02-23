import { createSignal, createResource, type Accessor, type Setter } from "solid-js";
import type { QuerySpec, QueryResult, SortSpec, FilterCondition } from "~/lib/schemas/query";

/**
 * CollectionQueryState - Controller state interface
 * 
 * Responsibility: Query orchestration, NOT storage or business logic
 * Generic TField provides type-safe field names for queries
 * 
 * KEY DESIGN: QuerySpec is the single source of truth.
 * UI components (including TanStack Table) read from and write to QuerySpec
 * via the setFilters/setSorting/setPagination methods.
 */
export interface CollectionQueryState<T, TField extends string = string> {
  // Query state (the canonical QuerySpec - SINGLE SOURCE OF TRUTH)
  querySpec: Accessor<QuerySpec<TField>>;
  setQuerySpec: Setter<QuerySpec<TField>>;

  // Data state (from server)
  data: Accessor<QueryResult<T> | undefined>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | null>;

  // Selection state
  selectedIds: Accessor<Set<string>>;
  setSelectedIds: Setter<Set<string>>;

  // Query Actions (modify QuerySpec directly)
  refresh: () => void;
  setFilters: (filters: FilterCondition<TField>[]) => void;
  setSorting: (sorting: SortSpec<TField>[]) => void;
  setPagination: (pagination: QuerySpec<TField>["pagination"]) => void;
  
  // Selection Actions
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

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
