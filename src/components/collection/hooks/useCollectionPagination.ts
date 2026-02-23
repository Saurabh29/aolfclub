import { createMemo } from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { PaginationSpec } from "~/lib/schemas/query";

/**
 * useCollectionPagination - Shared pagination controls logic
 * 
 * Extracts common pagination logic used by both Table and Cards components.
 * Returns helpers for navigating pages and displaying pagination info.
 */
export function useCollectionPagination<T, TField extends string = string>(
  controller: CollectionQueryState<T, TField>
) {
  // Current pagination state from controller
  const pagination = createMemo(() => controller.querySpec().pagination);
  const pageInfo = createMemo(() => controller.data()?.pageInfo);

  // Current page index (0-based)
  const currentPageIndex = createMemo(() => pagination().pageIndex ?? 0);

  // Navigate to next page
  const goToNextPage = () => {
    const spec = controller.querySpec();
    const currentPage = spec.pagination.pageIndex ?? 0;
    
    controller.setPagination({
      ...spec.pagination,
      pageIndex: currentPage + 1,
    });
  };

  // Navigate to previous page
  const goToPreviousPage = () => {
    const spec = controller.querySpec();
    const currentPage = spec.pagination.pageIndex ?? 0;
    
    if (currentPage > 0) {
      controller.setPagination({
        ...spec.pagination,
        pageIndex: currentPage - 1,
      });
    }
  };

  // Navigate to specific page
  const goToPage = (pageIndex: number) => {
    const spec = controller.querySpec();
    
    controller.setPagination({
      ...spec.pagination,
      pageIndex: Math.max(0, pageIndex),
    });
  };

  // Change page size
  const setPageSize = (pageSize: number) => {
    const spec = controller.querySpec();
    
    controller.setPagination({
      ...spec.pagination,
      pageSize,
      pageIndex: 0, // Reset to first page when changing page size
    });
  };

  // Can navigate to previous page
  const canGoPrevious = createMemo(() => currentPageIndex() > 0);

  // Can navigate to next page
  const canGoNext = createMemo(() => pageInfo()?.hasNextPage ?? false);

  // Calculate display info (showing X to Y of Z results)
  const displayInfo = createMemo(() => {
    const info = pageInfo();
    const totalCount = info?.totalCount;
    
    if (!totalCount) return null;
    
    const pageIndex = currentPageIndex();
    const pageSize = pagination().pageSize;
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, totalCount);
    
    return { start, end, totalCount };
  });

  // Total number of pages (for offset pagination)
  const totalPages = createMemo(() => {
    const info = pageInfo();
    const totalCount = info?.totalCount;
    
    if (!totalCount) return null;
    
    const pageSize = pagination().pageSize;
    return Math.ceil(totalCount / pageSize);
  });

  return {
    // State
    currentPageIndex,
    pagination,
    pageInfo,
    displayInfo,
    totalPages,
    
    // Actions
    goToNextPage,
    goToPreviousPage,
    goToPage,
    setPageSize,
    
    // Computed
    canGoPrevious,
    canGoNext,
  };
}
