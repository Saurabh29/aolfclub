/**
 * PAGE SCHEMA (ReBAC Design)
 *
 * Represents a page/feature in the application
 * Access is controlled via Role → Page mappings
 *
 * DynamoDB Keys:
 * - PK: PAGE#<pageName>
 * - SK: META
 */

import { z } from "zod";

export const PageNameSchema = z.enum([
  "LEADS",
  "MEMBERS",
  "TASKS",
  "CALLS",
  "REPORTS",
  "SETTINGS",
]);

export const PageSchema = z.object({
  PK: z.string().regex(/^PAGE#[A-Z_]+$/),
  SK: z.literal("META"),
  itemType: z.literal("Page"),
  pageName: PageNameSchema,
  displayName: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PageName = z.infer<typeof PageNameSchema>;
export type Page = z.infer<typeof PageSchema>;
