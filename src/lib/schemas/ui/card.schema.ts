import { z } from "zod";
import type { JSX } from "solid-js";

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Card Action Schema - for action buttons on cards
 */
export const CardActionSchema = z.object({
  label: z.string().min(1, "Action label is required"),
  icon: z.custom<JSX.Element>().optional(),
  onClick: z.custom<(item: any) => void>(),
});

export type CardAction<T = any> = {
  label: string;
  icon?: JSX.Element;
  onClick: (item: T) => void;
};

// ============================================================================
// Generic Card List Props Schema
// ============================================================================

/**
 * Generic Card List Props Schema - main component configuration
 */
export const GenericCardListPropsSchema = z.object({
  // Core items array - accepts any record type for maximum flexibility
  items: z.array(z.record(z.string(), z.any())),

  // Required: function to extract unique ID from items
  getId: z.custom<(item: any) => string>(),

  // Required: function to render card header
  renderHeader: z.custom<(item: any) => JSX.Element>(),

  // Optional: function to render card content
  renderContent: z.custom<(item: any) => JSX.Element>().optional(),

  // Optional: card click handler
  onItemClick: z.custom<(item: any) => void>().optional(),

  // Optional: action buttons
  actions: z.array(CardActionSchema).optional(),

  // Optional: CSS classes
  cardClass: z.string().optional(),
  listClass: z.string().optional(),

  // Optional: grid configuration
  gridConfig: z
    .object({
      cols: z
        .object({
          sm: z.number().optional(),
          md: z.number().optional(),
          lg: z.number().optional(),
          xl: z.number().optional(),
        })
        .optional(),
      gap: z.string().optional(),
    })
    .optional(),
});

export type GenericCardListProps<
  T extends Record<string, any> = Record<string, any>,
> = Omit<
  z.infer<typeof GenericCardListPropsSchema>,
  | "items"
  | "getId"
  | "renderHeader"
  | "renderContent"
  | "onItemClick"
  | "actions"
> & {
  items: T[];
  getId: (item: T) => string;
  renderHeader: (item: T) => JSX.Element;
  renderContent?: (item: T) => JSX.Element;
  onItemClick?: (item: T) => void;
  actions?: CardAction<T>[];
};
