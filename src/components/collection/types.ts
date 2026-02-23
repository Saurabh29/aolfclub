import type { JSX } from "solid-js";

/**
 * Card renderer function for CollectionCards
 */
export type CardRenderer<T> = (item: T, isSelected: boolean) => JSX.Element;

/**
 * List item renderer function
 */
export type ListItemRenderer<T> = (item: T, isSelected: boolean) => JSX.Element;

/**
 * Empty state configuration shared across collection components
 */
export interface EmptyStateConfig {
  /** Message to display when no items are found */
  emptyMessage?: string;
  /** Icon element to display when empty */
  emptyIcon?: JSX.Element;
  /** Action element (e.g., button) to display when empty */
  emptyAction?: JSX.Element;
}
