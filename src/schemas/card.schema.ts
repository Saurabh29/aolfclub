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

/**
 * Component Base Schema - common fields for all component types
 */
export const ComponentBaseSchema = z.object({
  id: z.string().optional(),
  className: z.string().optional(),
});

// ============================================================================
// Component-Specific Item Schemas
// ============================================================================

/**
 * Metric Component Schema - displays key-value metrics
 */
export const MetricComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("metric"),
  data: z.object({
    label: z.string(),
    value: z.union([z.string(), z.number()]),
    variant: z.enum(["default", "primary", "success", "warning", "error", "info"]).optional(),
    icon: z.custom<JSX.Element>().optional(),
  }),
});

export type MetricComponent = z.infer<typeof MetricComponentSchema>;

/**
 * List Item Component Schema - displays list of items
 */
export const ListItemComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("list"),
  data: z.object({
    items: z.array(z.string()),
    ordered: z.boolean().optional(),
    icon: z.custom<JSX.Element>().optional(),
  }),
});

export type ListItemComponent = z.infer<typeof ListItemComponentSchema>;

/**
 * Badge Component Schema - displays badge/tag
 */
export const BadgeComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("badge"),
  data: z.object({
    label: z.string(),
    variant: z.enum(["default", "primary", "secondary", "success", "warning", "error", "info"]).optional(),
    size: z.enum(["sm", "md", "lg"]).optional(),
  }),
});

export type BadgeComponent = z.infer<typeof BadgeComponentSchema>;

/**
 * Label Component Schema - displays key-value label
 */
export const LabelComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("label"),
  data: z.object({
    key: z.string(),
    value: z.string(),
    orientation: z.enum(["horizontal", "vertical"]).optional(),
  }),
});

export type LabelComponent = z.infer<typeof LabelComponentSchema>;

/**
 * Icon Card Component Schema - card with icon and text
 */
export const IconCardComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("iconCard"),
  data: z.object({
    icon: z.custom<JSX.Element>(),
    title: z.string(),
    description: z.string().optional(),
    variant: z.enum(["default", "primary", "success", "warning", "error", "info"]).optional(),
  }),
});

export type IconCardComponent = z.infer<typeof IconCardComponentSchema>;

/**
 * Custom Component Schema - for user-defined components with render function
 */
export const CustomComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("custom"),
  data: z.object({
    render: z.custom<(data: any) => JSX.Element>(),
    props: z.record(z.string(), z.any()).optional(),
  }),
});

export type CustomComponent = z.infer<typeof CustomComponentSchema>;

// ============================================================================
// Component Union Schema
// ============================================================================

/**
 * Discriminated union of all component types
 */
export const ComponentUnionSchema = z.discriminatedUnion("type", [
  MetricComponentSchema,
  ListItemComponentSchema,
  BadgeComponentSchema,
  LabelComponentSchema,
  IconCardComponentSchema,
  CustomComponentSchema,
]);

export type ComponentUnion = z.infer<typeof ComponentUnionSchema>;

// ============================================================================
// Card Configuration Schema
// ============================================================================

/**
 * Card Item Schema - represents a single card with header and components
 */
export const CardItemSchema = z.object({
  id: z.string(),
  header: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    render: z.custom<JSX.Element>().optional(),
  }),
  components: z.array(ComponentUnionSchema).optional(),
  footer: z.custom<JSX.Element>().optional(),
  onClick: z.custom<(item: any) => void>().optional(),
  actions: z.array(CardActionSchema).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CardItem = z.infer<typeof CardItemSchema>;

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
  gridConfig: z.object({
    cols: z.object({
      sm: z.number().optional(),
      md: z.number().optional(),
      lg: z.number().optional(),
      xl: z.number().optional(),
    }).optional(),
    gap: z.string().optional(),
  }).optional(),
});

export type GenericCardListProps<T extends Record<string, any> = Record<string, any>> = Omit<
  z.infer<typeof GenericCardListPropsSchema>,
  'items' | 'getId' | 'renderHeader' | 'renderContent' | 'onItemClick' | 'actions'
> & {
  items: T[];
  getId: (item: T) => string;
  renderHeader: (item: T) => JSX.Element;
  renderContent?: (item: T) => JSX.Element;
  onItemClick?: (item: T) => void;
  actions?: CardAction<T>[];
};

// ============================================================================
// Structured Card List Props Schema (with ComponentUnion)
// ============================================================================

/**
 * Structured Card List Props - for cards using ComponentUnion schema
 */
export const StructuredCardListPropsSchema = z.object({
  cards: z.array(CardItemSchema),
  cardClass: z.string().optional(),
  listClass: z.string().optional(),
  gridConfig: z.object({
    cols: z.object({
      sm: z.number().optional(),
      md: z.number().optional(),
      lg: z.number().optional(),
      xl: z.number().optional(),
    }).optional(),
    gap: z.string().optional(),
  }).optional(),
});

export type StructuredCardListProps = z.infer<typeof StructuredCardListPropsSchema>;
