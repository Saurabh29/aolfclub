import { z } from "zod";

/**
 * Navigation Item Schema
 * Validates structure of navigation items used in both mobile bottom nav
 * and desktop sidebar navigation
 */
export const NavigationItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  href: z.string(),
  description: z.string().optional(),
});

export type NavigationItem = z.infer<typeof NavigationItemSchema>;

/**
 * Summary Card Schema
 * Validates dashboard summary cards that link to subpages
 */
export const SummaryCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  href: z.string(),
  badge: z.string().optional(),
});

export type SummaryCard = z.infer<typeof SummaryCardSchema>;
