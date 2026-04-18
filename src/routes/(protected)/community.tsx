/**
 * /community â€” unified people page (authenticated).
 *
 * Layout:
 *   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 *   â”‚  Filter pane â”‚  Tab bar + table/cards         â”‚
 *   â”‚  (left 240px)â”‚  + floating bulk-action toolbarâ”‚
 *   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *
 * Three tabs: Leads Â· Members Â· Team
 *
 * Filter pane ownership:
 *   Lead pane   â†’ lastInterestLevel, interestedPrograms, totalCallCount, nextFollowUpDate
 *   Member pane â†’ memberSince, interestedPrograms, programsDone
 *   (Both also own the displayName search so it round-trips through the server.)
 *   Table       â†’ sorting only (no column-level filtering to avoid field conflicts)
 */
import { createColumnHelper } from "@tanstack/solid-table";
import { createSignal, Show, Switch, Match, For } from "solid-js";
import { queryLeadsQuery, queryMembersQuery, queryUsersQuery } from "~/server/api";
import type { Lead, LeadField } from "~/lib/schemas/domain/lead.schema";
import type { Member, MemberField } from "~/lib/schemas/domain/member.schema";
import type { User, UserField } from "~/lib/schemas/domain/user.schema";
import { createCollectionQueryController } from "~/lib/controllers";
import { ResponsiveCollectionView } from "~/components/collection";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { ImportSheet } from "~/components/community/ImportSheet";
import type { ImportEntityType } from "~/components/community/ImportSheet";
import { LeadFilterPane } from "~/components/community/LeadFilterPane";
import { MemberFilterPane } from "~/components/community/MemberFilterPane";

// â”€â”€ Cell renderers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    <span class="text-muted-foreground">â€”</span>
  );
}

// â”€â”€ Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      if (!level) return <span class="text-muted-foreground">â€”</span>;
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

const userColHelper = createColumnHelper<User>();
const userColumns = [
  userColHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => (
      <div class="flex items-center gap-2">
        <Show when={info.row.original.image}>
          <img src={info.row.original.image} alt={info.getValue()} class="w-8 h-8 rounded-full" />
        </Show>
        {renderDisplayName(info.getValue())}
      </div>
    ),
  }),
  userColHelper.accessor("email", {
    header: "Email",
    cell: (info) => <span class="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
  userColHelper.accessor("createdAt", {
    header: "Joined",
    cell: (info) => renderDate(info.getValue()),
  }),
];

type ContactTab = "leads" | "members" | "team";

// â”€â”€ Bulk action toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          â¬‡ Export CSV
        </Button>
        <Button size="sm" variant="ghost" onClick={props.onClear} class="text-muted-foreground">
          âœ• Clear
        </Button>
      </div>
    </Show>
  );
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CommunityPage() {
  const [activeTab, setActiveTab] = createSignal<ContactTab>("leads");
  const [showImport, setShowImport] = createSignal(false);
  const [filterPaneOpen, setFilterPaneOpen] = createSignal(true);

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

  const usersController = createCollectionQueryController<User, UserField>({
    queryFn: (spec) => queryUsersQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 20, pageIndex: 0 },
    },
  });

  const activeController = () => {
    if (activeTab() === "leads") return leadsController;
    if (activeTab() === "members") return membersController;
    return usersController;
  };

  const selectedCount = () => activeController().selectedIds().size;

  const handleExport = () => {
    // TODO: export selected IDs as CSV
    alert(`Export ${selectedCount()} records (not yet implemented)`);
  };

  const tabs: { id: ContactTab; label: string; icon: string }[] = [
    { id: "leads", label: "Leads", icon: "ðŸŽ¯" },
    { id: "members", label: "Members", icon: "ðŸŽ“" },
    { id: "team", label: "Team", icon: "ðŸ™‹" },
  ];

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
            {filterPaneOpen() ? "â—€ Hide Filters" : "â–¶ Show Filters"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            â¬† Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeController().refresh()}
          >
            â†º Refresh
          </Button>
        </div>
      </div>

      {/* Body: filter pane + content */}
      <div class="flex flex-1 overflow-hidden">

        {/* â”€â”€ Filter pane â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                {/* Team tab has no semantic filter pane â€” just shows a placeholder */}
                <div class="flex flex-col h-full bg-background border-r border-border px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</p>
                  <input
                    type="text"
                    placeholder="Name or emailâ€¦"
                    class="mt-2 w-full h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onInput={(e) => {
                      const v = e.currentTarget.value.trim();
                      usersController.setFilters(
                        v ? [{ field: "displayName" as UserField, op: "contains", value: v }] : []
                      );
                    }}
                  />
                </div>
              </Match>
            </Switch>
          </div>
        </Show>

        {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  <span class="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          {/* Result count row */}
          <div class="flex items-center justify-between px-4 py-2 shrink-0 text-sm text-muted-foreground border-b border-border">
            <Show
              when={activeController().data()?.pageInfo.totalCount !== undefined}
              fallback={<span>Loading…</span>}
            >
              <span>
                {activeController().data()!.pageInfo.totalCount} result{activeController().data()!.pageInfo.totalCount !== 1 ? "s" : ""}
                <Show when={selectedCount() > 0}>
                  {" · "}<span class="text-foreground font-medium">{selectedCount()} selected</span>
                </Show>
              </span>
            </Show>
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
                            {" Â· "}{member.programsDone.length} programs
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
                <ResponsiveCollectionView
                  controller={usersController}
                  columns={userColumns}
                  getId={(user) => user.id}
                  renderCard={(user) => (
                    <Card>
                      <CardHeader>
                        <CardTitle class="flex items-center gap-3">
                          <Show when={user.image}>
                            <img src={user.image} alt={user.displayName} class="w-10 h-10 rounded-full" />
                          </Show>
                          <div>
                            <div class="font-semibold">{user.displayName}</div>
                            <div class="text-sm text-muted-foreground font-normal">{user.email}</div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline">Volunteer</Badge>
                      </CardContent>
                    </Card>
                  )}
                  selectable={true}
                  cardColumns={3}
                  emptyMessage="No volunteers found"
                />
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
          entityType={activeTab() as ImportEntityType}
          onClose={() => setShowImport(false)}
        />
      </Show>
    </div>
  );
}
