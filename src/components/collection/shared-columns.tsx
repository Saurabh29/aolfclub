/**
 * Shared column definitions for Lead and Member tables.
 *
 * Used by both community.tsx and ContactPickerDrawer.tsx to avoid duplication.
 */
import { createColumnHelper } from "@tanstack/solid-table";
import { Badge } from "~/components/ui/badge";
import type { Lead } from "~/lib/schemas/domain/lead.schema";
import type { Member } from "~/lib/schemas/domain/member.schema";

// -- Shared cell renderers ---------------------------------------------------

export function renderDisplayName(name: string) {
  return <span class="font-medium">{name}</span>;
}

export function renderPhone(phone: string) {
  return <span class="text-sm text-muted-foreground">{phone}</span>;
}

export function renderDate(isoDate: string | undefined) {
  return isoDate ? (
    <span class="text-sm">{new Date(isoDate).toLocaleDateString()}</span>
  ) : (
    <span class="text-muted-foreground"> - </span>
  );
}

// -- Lead columns ------------------------------------------------------------

const leadColHelper = createColumnHelper<Lead>();

export const leadColumns = [
  leadColHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => renderDisplayName(info.getValue()),
  }),
  leadColHelper.accessor("phone", {
    header: "Phone",
    cell: (info) => renderPhone(info.getValue()),
  }),
  leadColHelper.accessor("lastInterestLevel", {
    header: "Interest",
    cell: (info) => {
      const level = info.getValue();
      if (!level) return <span class="text-muted-foreground"> - </span>;
      const variant =
        level === "High" ? "default" :
        level === "Medium" ? "secondary" :
        level === "Low" ? "outline" : "error";
      return <Badge variant={variant}>{level}</Badge>;
    },
  }),
  leadColHelper.accessor("nextFollowUpDate", {
    header: "Follow-up",
    cell: (info) => renderDate(info.getValue()),
  }),
  leadColHelper.accessor("totalCallCount", {
    header: "Calls",
    cell: (info) => <span class="text-sm">{info.getValue()}</span>,
  }),
];

// -- Member columns ----------------------------------------------------------

const memberColHelper = createColumnHelper<Member>();

export const memberColumns = [
  memberColHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => renderDisplayName(info.getValue()),
  }),
  memberColHelper.accessor("phone", {
    header: "Phone",
    cell: (info) => renderPhone(info.getValue()),
  }),
  memberColHelper.accessor("memberSince", {
    header: "Member Since",
    cell: (info) => renderDate(info.getValue()),
  }),
  memberColHelper.accessor("programsDone", {
    header: "Programs",
    cell: (info) => <span class="text-sm">{info.getValue().length}</span>,
  }),
];
