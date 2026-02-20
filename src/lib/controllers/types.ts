import type { QuerySpec, QueryResult, SortSpec, FilterCondition } from "~/lib/schemas/query";
import type { Accessor, Setter } from "solid-js";

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
