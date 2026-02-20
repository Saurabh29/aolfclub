import type { JSX } from "solid-js";

/**
 * Card renderer function for CollectionCards
 */
export type CardRenderer<T> = (item: T, isSelected: boolean) => JSX.Element;

/**
 * List item renderer function
 */
export type ListItemRenderer<T> = (item: T, isSelected: boolean) => JSX.Element;
