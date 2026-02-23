import { Show } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { CardRenderer, EmptyStateConfig } from "./types";
import { CollectionTable } from "./CollectionTable";
import { CollectionCards } from "./CollectionCards";
import { useMediaQuery } from "./hooks/useMediaQuery";

export interface ResponsiveCollectionViewProps<T, TField extends string = string>
  extends EmptyStateConfig {
  controller: CollectionQueryState<T, TField>;
  columns: ColumnDef<T, any>[];
  getId: (item: T) => string;
  renderCard: CardRenderer<T>;
  selectable?: boolean;
  onRowClick?: (item: T) => void;
  /**
   * Breakpoint for switching from cards to table
   * Default: "(min-width: 768px)" (tablets and up)
   */
  breakpoint?: string;
  /** Number of columns for card grid (default: 3) */
  cardColumns?: number;
  /** Container class for card view */
  containerClass?: string;
  /** Card wrapper class for card view */
  cardClass?: string;
  /** Table wrapper class for table view */
  tableClass?: string;
}

/**
 * ResponsiveCollectionView - Auto-switches between cards and table
 * 
 * - Mobile: Cards
 * - Desktop/Tablet: Table
 * 
 * @example
 * ```tsx
 * <ResponsiveCollectionView
 *   controller={controller}
 *   columns={userColumns}
 *   getId={(u) => u.id}
 *   renderCard={(user) => <UserCard user={user} />}
 *   selectable={true}
 * />
 * ```
 */
export function ResponsiveCollectionView<T, TField extends string = string>(
  props: ResponsiveCollectionViewProps<T, TField>
) {
  const isDesktop = useMediaQuery(props.breakpoint ?? "(min-width: 768px)");

  return (
    <Show
      when={isDesktop()}
      fallback={
        <CollectionCards
          controller={props.controller}
          getId={props.getId}
          renderCard={props.renderCard}
          selectable={props.selectable}
          columns={props.cardColumns}
          containerClass={props.containerClass}
          cardClass={props.cardClass}
          emptyMessage={props.emptyMessage}
          emptyIcon={props.emptyIcon}
          emptyAction={props.emptyAction}
        />
      }
    >
      <CollectionTable
        controller={props.controller}
        columns={props.columns}
        getId={props.getId}
        selectable={props.selectable}
        onRowClick={props.onRowClick}
        containerClass={props.containerClass}
        tableClass={props.tableClass}
        emptyMessage={props.emptyMessage}
        emptyIcon={props.emptyIcon}
        emptyAction={props.emptyAction}
      />
    </Show>
  );
}
