/**
 * /community  -  unified people page (authenticated).
 *
 * Layout:
 *   +--------------+--------------------------------+
 *   |  Filter pane |  Tab bar + table/cards         |
 *   |  (left 240px)|  + floating bulk-action toolbar|
 *   +--------------+--------------------------------+
 *
 * Three tabs: Leads   Members   Team
 *
 * Filter pane ownership:
 *   Lead pane   > lastInterestLevel, interestedPrograms, totalCallCount, nextFollowUpDate
 *   Member pane > memberSince, interestedPrograms, programsDone
 *   (Both also own the displayName search so it round-trips through the server.)
 *   Table       > sorting only (no column-level filtering to avoid field conflicts)
 */
import { createColumnHelper } from "@tanstack/solid-table";
import { createSignal, Show, Switch, Match, For, createMemo } from "solid-js";
import { createAsync, useAction, revalidate } from "@solidjs/router";
import { Download, X, Upload, RefreshCw, PanelLeftClose, PanelLeftOpen, Target, GraduationCap, Users, ShieldCheck } from "lucide-solid";
import { queryLeadsQuery, queryMembersQuery, getCommunityTeamQuery, assignRoleAction } from "~/server/api";
import type { Lead, LeadField } from "~/lib/schemas/domain/lead.schema";
import type { Member, MemberField } from "~/lib/schemas/domain/member.schema";
import type { GroupType } from "~/lib/schemas/domain/user.schema";
import { createCollectionQueryController } from "~/lib/controllers";
import { ResponsiveCollectionView } from "~/components/collection";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { ImportSheet } from "~/components/community/ImportSheet";
import type { ImportEntityType } from "~/components/community/ImportSheet";
import { LeadFilterPane } from "~/components/community/LeadFilterPane";
import { MemberFilterPane } from "~/components/community/MemberFilterPane";

// -- Cell renderers ------------------------------------------------------------

function renderDisplayName(name: string) {
  return <span class="font-medium">{name}</span>;
}
function renderPhone(phone: string) {
  return <span class="text-sm text-muted-foreground">{phone}</span>;
}
function renderDate(isoDate: string | undefined) {
  return isoDate ? (
    <span class="text-sm">{new Date(isoDate).toLocaleDateString()}</span>
  ) : (
    <span class="text-muted-foreground"> - </span>
  );
}

// -- Columns -------------------------------------------------------------------

const leadColHelper = createColumnHelper<Lead>();
const leadColumns = [
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

const memberColHelper = createColumnHelper<Member>();
const memberColumns = [
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

type ContactTab = "leads" | "members" | "team";

const ROLE_BADGE_VARIANT: Record<GroupType, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  TEACHER: "secondary",
  VOLUNTEER: "outline",
};

const ROLE_LABELS: Record<GroupType, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  VOLUNTEER: "Volunteer",
};

// -- Bulk action toolbar -------------------------------------------------------

interface BulkToolbarProps {
  count: number;
  onExport: () => void;
  onClear: () => void;
}

function BulkToolbar(props: BulkToolbarProps) {
  return (
    <Show when={props.count > 0}>
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-3 shadow-xl">
        <span class="text-sm font-medium">{props.count} selected</span>
        <div class="w-px h-4 bg-border" />
        <Button size="sm" variant="outline" onClick={props.onExport}>
          <Download class="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
        <Button size="sm" variant="ghost" onClick={props.onClear} class="text-muted-foreground">
          <X class="w-3.5 h-3.5 mr-1" /> Clear
        </Button>
      </div>
    </Show>
  );
}

// -- Page ----------------------------------------------------------------------

export default function CommunityPage() {
  const [activeTab, setActiveTab] = createSignal<ContactTab>("leads");
  const [showImport, setShowImport] = createSignal(false);
  const [importEntityType, setImportEntityType] = createSignal<ImportEntityType>("leads");
  const [filterPaneOpen, setFilterPaneOpen] = createSignal(true);

  // Team tab: live role data + assignment
  const teamMembers = createAsync(() => getCommunityTeamQuery(), { deferStream: false });
  const [teamSelectedIds, setTeamSelectedIds] = createSignal<Set<string>>(new Set());
  const [assigningRole, setAssigningRole] = createSignal(false);
  const [teamSearchQuery, setTeamSearchQuery] = createSignal("");
  const doAssignRole = useAction(assignRoleAction);

  // Filtered team members (client-side search)
  const filteredTeamMembers = createMemo(() => {
    const all = teamMembers() ?? [];
    const q = teamSearchQuery().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) => m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  });

  const handleAssignRole = async (groupType: GroupType) => {
    const ids = Array.from(teamSelectedIds());
    if (!ids.length) return;
    setAssigningRole(true);
    try {
      const result = await doAssignRole(ids, groupType);
      if (result.success) {
        const { assigned, failed } = result.data;
        if (failed === 0) {
          alert(`Assigned ${assigned} member(s) to ${ROLE_LABELS[groupType]}.`);
        } else {
          alert(`Assigned ${assigned}, failed ${failed}.`);
        }
        setTeamSelectedIds(new Set());
        // Revalidate the team query so createAsync picks up changes
        await revalidate(getCommunityTeamQuery.key);
      } else {
        alert(`Error: ${result.error}`);
      }
    } finally {
      setAssigningRole(false);
    }
  };

  const leadsController = createCollectionQueryController<Lead, LeadField>({
    queryFn: (spec) => queryLeadsQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 20, pageIndex: 0 },
    },
  });

  const membersController = createCollectionQueryController<Member, MemberField>({
    queryFn: (spec) => queryMembersQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 20, pageIndex: 0 },
    },
  });

  const activeController = () => {
    if (activeTab() === "leads") return leadsController;
    return membersController;
  };

  const selectedCount = () => activeController().selectedIds().size;

  const handleExport = () => {
    // TODO: export selected IDs as CSV
    alert(`Export ${selectedCount()} records (not yet implemented)`);
  };

  const tabs: { id: ContactTab; label: string; Icon: typeof Target }[] = [
    { id: "leads", label: "Leads", Icon: Target },
    { id: "members", label: "Members", Icon: GraduationCap },
    { id: "team", label: "Team", Icon: Users },
  ];

  const toggleTeamRow = (id: string) => {
    setTeamSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTeamAll = () => {
    const all = filteredTeamMembers();
    setTeamSelectedIds((prev) =>
      prev.size === all.length ? new Set() : new Set(all.map((m) => m.id))
    );
  };

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h1 class="text-2xl font-bold">Community</h1>
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterPaneOpen((v) => !v)}
            class="text-muted-foreground"
          >
            {filterPaneOpen()
              ? <><PanelLeftClose class="w-4 h-4 mr-1" /> Hide Filters</>
              : <><PanelLeftOpen class="w-4 h-4 mr-1" /> Show Filters</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setImportEntityType(activeTab() as ImportEntityType); setShowImport(true); }}>
            <Upload class="w-3.5 h-3.5 mr-1" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeController().refresh()}
          >
            <RefreshCw class="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Body: filter pane + content */}
      <div class="flex flex-1 overflow-hidden">

        {/* -- Filter pane --------------------------------------------------- */}
        <Show when={filterPaneOpen()}>
          <div class="w-56 shrink-0 hidden md:block overflow-hidden">
            <Switch>
              <Match when={activeTab() === "leads"}>
                <LeadFilterPane controller={leadsController} />
              </Match>
              <Match when={activeTab() === "members"}>
                <MemberFilterPane controller={membersController} />
              </Match>
              <Match when={activeTab() === "team"}>
                {/* Team tab has no semantic filter pane  -  just shows a placeholder */}
                <div class="flex flex-col h-full bg-background border-r border-border px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</p>
                  <input
                    type="text"
                    placeholder="Name or email..."
                    class="mt-2 w-full h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onInput={(e) => setTeamSearchQuery(e.currentTarget.value.trim())}
                  />
                </div>
              </Match>
            </Switch>
          </div>
        </Show>

        {/* -- Main content --------------------------------------------------- */}
        <div class="flex flex-col flex-1 overflow-hidden">

          {/* Tab bar */}
          <div class="flex gap-1 border-b border-border px-4 shrink-0">
            <For each={tabs}>
              {(tab) => (
                <button
                  type="button"
                  class={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                    activeTab() === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.Icon class="w-3.5 h-3.5 inline mr-1" />
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          {/* Result count row */}
          <div class="flex items-center justify-between px-4 py-2 shrink-0 text-sm text-muted-foreground border-b border-border">
            <Switch>
              <Match when={activeTab() === "team"}>
                <Show when={teamMembers() !== undefined} fallback={<span>Loading...</span>}>
                  <span>
                    {filteredTeamMembers().length} result{filteredTeamMembers().length !== 1 ? "s" : ""}
                    <Show when={teamSelectedIds().size > 0}>
                      {"   "}<span class="text-foreground font-medium">{teamSelectedIds().size} selected</span>
                    </Show>
                  </span>
                </Show>
              </Match>
              <Match when={true}>
                <Show
                  when={activeController().data()?.pageInfo.totalCount !== undefined}
                  fallback={<span>Loading...</span>}
                >
                  <span>
                    {activeController().data()!.pageInfo.totalCount} result{activeController().data()!.pageInfo.totalCount !== 1 ? "s" : ""}
                    <Show when={selectedCount() > 0}>
                      {"   "}<span class="text-foreground font-medium">{selectedCount()} selected</span>
                    </Show>
                  </span>
                </Show>
              </Match>
            </Switch>
          </div>

          {/* Scrollable collection */}
          <div class="flex-1 overflow-y-auto p-4">
            <Switch>
              <Match when={activeTab() === "leads"}>
                <ResponsiveCollectionView
                  controller={leadsController}
                  columns={leadColumns}
                  getId={(lead) => lead.id}
                  renderCard={(lead) => (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          <div class="font-semibold">{lead.displayName}</div>
                          <div class="text-sm text-muted-foreground font-normal">{lead.phone}</div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div class="flex gap-2 flex-wrap">
                          <Show when={lead.lastInterestLevel}>
                            <Badge>{lead.lastInterestLevel}</Badge>
                          </Show>
                          <span class="text-xs text-muted-foreground">{lead.totalCallCount} calls</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  selectable={true}
                  cardColumns={3}
                  emptyMessage="No leads match the current filters"
                />
              </Match>

              <Match when={activeTab() === "members"}>
                <ResponsiveCollectionView
                  controller={membersController}
                  columns={memberColumns}
                  getId={(member) => member.id}
                  renderCard={(member) => (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          <div class="font-semibold">{member.displayName}</div>
                          <div class="text-sm text-muted-foreground font-normal">{member.phone}</div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div class="text-xs text-muted-foreground">
                          <Show when={member.memberSince}>
                            Member since {new Date(member.memberSince!).getFullYear()}
                          </Show>
                          <Show when={member.programsDone.length > 0}>
                            {"   "}{member.programsDone.length} programs
                          </Show>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  selectable={true}
                  cardColumns={3}
                  emptyMessage="No members match the current filters"
                />
              </Match>

              <Match when={activeTab() === "team"}>
                {/* Role-assignment toolbar */}
                <Show when={teamSelectedIds().size > 0}>
                  <div class="flex items-center gap-3 px-4 py-3 mb-3 rounded-lg border border-border bg-muted">
                    <span class="text-sm font-medium">{teamSelectedIds().size} selected</span>
                    <div class="ml-auto flex items-center gap-2">
                      <span class="text-xs text-muted-foreground mr-1">Assign role:</span>
                      <For each={(["ADMIN", "TEACHER", "VOLUNTEER"] as GroupType[])}>
                        {(role) => (
                          <Button
                            size="sm"
                            variant={ROLE_BADGE_VARIANT[role]}
                            disabled={assigningRole()}
                            onClick={() => handleAssignRole(role)}
                          >
                            {ROLE_LABELS[role]}
                          </Button>
                        )}
                      </For>
                      <Button size="sm" variant="ghost" onClick={() => setTeamSelectedIds(new Set())}>
                        <X class="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Show>

                {/* Team table */}
                <Show
                  when={filteredTeamMembers().length > 0}
                  fallback={
                    <div class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                      <Users class="w-8 h-8 opacity-30" />
                      <p class="text-sm">No team members at this location yet.</p>
                    </div>
                  }
                >
                  <div class="border border-border rounded-lg overflow-hidden">
                    <table class="w-full text-sm">
                      <thead class="bg-muted border-b border-border">
                        <tr>
                          <th class="w-10 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={filteredTeamMembers().length > 0 && teamSelectedIds().size === filteredTeamMembers().length}
                              onChange={toggleTeamAll}
                              class="w-4 h-4 rounded border-border"
                            />
                          </th>
                          <th class="px-3 py-2 text-left font-medium">Member</th>
                          <th class="px-3 py-2 text-left font-medium">Email</th>
                          <th class="px-3 py-2 text-left font-medium">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={filteredTeamMembers()}>
                          {(member) => (
                            <tr
                              class="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                              classList={{ "bg-muted/70": teamSelectedIds().has(member.id) }}
                              onClick={() => toggleTeamRow(member.id)}
                            >
                              <td class="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={teamSelectedIds().has(member.id)}
                                  onChange={() => toggleTeamRow(member.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  class="w-4 h-4 rounded border-border"
                                />
                              </td>
                              <td class="px-3 py-2">
                                <div class="flex items-center gap-2">
                                  <Show when={member.image}>
                                    <img src={member.image} alt={member.displayName} class="w-7 h-7 rounded-full" />
                                  </Show>
                                  <div class="flex items-center gap-1">
                                    <span class="font-medium">{member.displayName}</span>
                                    <Show when={member.isAdmin}>
                                      <ShieldCheck class="w-3.5 h-3.5 text-primary" />
                                    </Show>
                                  </div>
                                </div>
                              </td>
                              <td class="px-3 py-2 text-muted-foreground">{member.email}</td>
                              <td class="px-3 py-2">
                                <Show
                                  when={member.activeRole}
                                  fallback={<span class="text-muted-foreground">—</span>}
                                >
                                  {(role) => (
                                    <Badge variant={ROLE_BADGE_VARIANT[role()]}>
                                      {ROLE_LABELS[role()]}
                                    </Badge>
                                  )}
                                </Show>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Match>
            </Switch>
          </div>
        </div>
      </div>

      {/* Floating bulk-action toolbar */}
      <BulkToolbar
        count={selectedCount()}
        onExport={handleExport}
        onClear={() => activeController().clearSelection()}
      />

      {/* Import sheet */}
      <Show when={showImport()}>
        <ImportSheet
          entityType={importEntityType()}
          onClose={() => setShowImport(false)}
        />
      </Show>
    </div>
  );
}
