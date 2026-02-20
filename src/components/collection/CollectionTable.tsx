import { For, Show, createMemo } from "solid-js";
import {
  createSolidTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/solid-table";
import type { CollectionQueryState } from "~/lib/controllers/types";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";

export interface CollectionTableProps<T, TField extends string = string> {
  controller: CollectionQueryState<T, TField>;
  columns: ColumnDef<T, any>[];
  getId: (item: T) => string;
  selectable?: boolean;
  onRowClick?: (item: T) => void;
}

/**
 * CollectionTable - TanStack Table implementation
 * 
 * KEY DESIGN: TanStack Table is controlled by QuerySpec
 * - Table reads sorting/pagination from controller.querySpec()
 * - Table changes call controller.setSorting()/setPagination() directly
 * - NO separate adapter layer - internal conversion only
 */
export function CollectionTable<T, TField extends string = string>(
  props: CollectionTableProps<T, TField>
) {
  // Derive TanStack-compatible state FROM QuerySpec (one-way: QuerySpec → Table UI)
  const tableState = createMemo(() => {
    const spec = props.controller.querySpec();
    return {
      sorting: spec.sorting.map((s) => ({ id: s.field as string, desc: s.direction === "desc" })),
      pagination: {
        pageIndex: spec.pagination.pageIndex ?? 0,
        pageSize: spec.pagination.pageSize,
      },
    };
  });

  // Create TanStack Table instance (controlled by QuerySpec)
  const table = createSolidTable({
    get data() {
      return Array.from(props.controller.data()?.items ?? []);
    },
    get columns() {
      return props.columns;
    },
    getCoreRowModel: getCoreRowModel(),
    // Server-side operations enabled
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    // Controlled state from QuerySpec
    state: {
      get sorting() {
        return tableState().sorting;
      },
      get pagination() {
        return tableState().pagination;
      },
    },
    // Page count from server response
    get pageCount() {
      const data = props.controller.data();
      const totalCount = data?.pageInfo.totalCount;
      const pageSize = props.controller.querySpec().pagination.pageSize;
      return totalCount ? Math.ceil(totalCount / pageSize) : -1;
    },
    // Sync sorting changes back to QuerySpec
    onSortingChange: (updater: any) => {
      const currentSorting = tableState().sorting;
      const newSorting = typeof updater === "function" ? updater(currentSorting) : updater;
      props.controller.setSorting(
        newSorting.map((s: any) => ({
          field: s.id as TField,
          direction: s.desc ? "desc" : "asc",
        }))
      );
    },
    // Sync pagination changes back to QuerySpec
    onPaginationChange: (updater: any) => {
      const currentPagination = tableState().pagination;
      const newPagination =
        typeof updater === "function" ? updater(currentPagination) : updater;
      props.controller.setPagination({
        pageSize: newPagination.pageSize,
        pageIndex: newPagination.pageIndex,
      });
    },
  });

  const handleRowClick = (item: T) => {
    if (props.selectable) {
      props.controller.toggleItem(props.getId(item));
    }
    props.onRowClick?.(item);
  };

  return (
    <div class="w-full">
      {/* Loading/Error states */}
      <Show when={props.controller.isLoading()}>
        <div class="p-8 text-center text-muted-foreground">Loading...</div>
      </Show>

      <Show when={props.controller.error()}>
        <div class="p-8 text-center text-destructive">
          Error: {props.controller.error()?.message}
        </div>
      </Show>

      {/* Table */}
      <Show when={!props.controller.isLoading() && !props.controller.error()}>
        <div class="rounded-md border">
          <Table>
            <TableHeader>
              <For each={table.getHeaderGroups()}>
                {(headerGroup) => (
                  <TableRow>
                    <Show when={props.selectable}>
                      <TableHead class="w-12">
                        <Checkbox
                          checked={
                            props.controller.selectedIds().size > 0 &&
                            props.controller.selectedIds().size ===
                              (props.controller.data()?.items.length ?? 0)
                          }
                          indeterminate={
                            props.controller.selectedIds().size > 0 &&
                            props.controller.selectedIds().size <
                              (props.controller.data()?.items.length ?? 0)
                          }
                          onChange={() => {
                            if (props.controller.selectedIds().size > 0) {
                              props.controller.clearSelection();
                            } else {
                              props.controller.selectAll();
                            }
                          }}
                        />
                      </TableHead>
                    </Show>
                    <For each={headerGroup.headers}>
                      {(header) => (
                        <TableHead
                          class={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:bg-muted/50"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div class="flex items-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {/* Sort indicator */}
                            <Show when={header.column.getIsSorted()}>
                              <span class="text-xs">
                                {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                              </span>
                            </Show>
                          </div>
                        </TableHead>
                      )}
                    </For>
                  </TableRow>
                )}
              </For>
            </TableHeader>
            <TableBody>
              <Show
                when={table.getRowModel().rows.length > 0}
                fallback={
                  <TableRow>
                    <TableCell
                      colSpan={props.columns.length + (props.selectable ? 1 : 0)}
                      class="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                }
              >
                <For each={table.getRowModel().rows}>
                  {(row) => {
                    const id = props.getId(row.original);
                    const isSelected = props.controller.selectedIds().has(id);

                    return (
                      <TableRow
                        onClick={() => handleRowClick(row.original)}
                        class={isSelected ? "bg-muted/50" : "hover:bg-muted/50 cursor-pointer"}
                      >
                        <Show when={props.selectable}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => props.controller.toggleItem(id)}
                            />
                          </TableCell>
                        </Show>
                        <For each={row.getVisibleCells()}>
                          {(cell) => (
                            <TableCell>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          )}
                        </For>
                      </TableRow>
                    );
                  }}
                </For>
              </Show>
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        <div class="mt-4 flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            <Show when={props.controller.data()?.pageInfo.totalCount}>
              {(count) => {
                const state = table.getState().pagination;
                const start = state.pageIndex * state.pageSize + 1;
                const end = Math.min((state.pageIndex + 1) * state.pageSize, count());
                return (
                  <span>
                    Showing {start} to {end} of {count()} results
                  </span>
                );
              }}
            </Show>
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}
