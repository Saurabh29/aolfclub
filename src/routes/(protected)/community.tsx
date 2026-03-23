/**
 * /community — unified people page (authenticated).
 *
 * Three tabs:
 *   - Leads    — prospects (Lead entities)
 *   - Members  — enrolled participants (Member entities)
 *   - Team     — app users / volunteers (User entities)
 */
import { createColumnHelper } from "@tanstack/solid-table";
import { createSignal, Show, Switch, Match } from "solid-js";
import { queryLeadsQuery, queryMembersQuery, queryUsersQuery } from "~/server/api";
import type { Lead, LeadField } from "~/lib/schemas/domain/lead.schema";
import type { Member, MemberField } from "~/lib/schemas/domain/member.schema";
import type { User, UserField } from "~/lib/schemas/domain/user.schema";
import { createCollectionQueryController } from "~/lib/controllers";
import { ResponsiveCollectionView } from "~/components/collection";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";

// ── Lead columns ──────────────────────────────────────────────────────────────

const leadColHelper = createColumnHelper<Lead>();
const leadColumns = [
  leadColHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => <span class="font-medium">{info.getValue()}</span>,
  }),
  leadColHelper.accessor("phone", {
    header: "Phone",
    cell: (info) => <span class="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
  leadColHelper.accessor("lastInterestLevel", {
    header: "Interest",
    cell: (info) => {
      const level = info.getValue();
      if (!level) return <span class="text-muted-foreground">—</span>;
      const variant =
        level === "High" ? "default" :
        level === "Medium" ? "secondary" :
        level === "Low" ? "outline" : "error";
      return <Badge variant={variant}>{level}</Badge>;
    },
  }),
  leadColHelper.accessor("nextFollowUpDate", {
    header: "Follow-up",
    cell: (info) => {
      const val = info.getValue();
      return val ? <span class="text-sm">{new Date(val).toLocaleDateString()}</span> : <span class="text-muted-foreground">—</span>;
    },
  }),
  leadColHelper.accessor("totalCallCount", {
    header: "Calls",
    cell: (info) => <span class="text-sm">{info.getValue()}</span>,
  }),
];

// ── Member columns ────────────────────────────────────────────────────────────

const memberColHelper = createColumnHelper<Member>();
const memberColumns = [
  memberColHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => <span class="font-medium">{info.getValue()}</span>,
  }),
  memberColHelper.accessor("phone", {
    header: "Phone",
    cell: (info) => <span class="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
  memberColHelper.accessor("memberSince", {
    header: "Member Since",
    cell: (info) => {
      const val = info.getValue();
      return val ? <span class="text-sm">{new Date(val).toLocaleDateString()}</span> : <span class="text-muted-foreground">—</span>;
    },
  }),
  memberColHelper.accessor("programsDone", {
    header: "Programs",
    cell: (info) => <span class="text-sm">{info.getValue().length}</span>,
  }),
];

// ── User (volunteer) columns ──────────────────────────────────────────────────

const userColHelper = createColumnHelper<User>();
const userColumns = [
  userColHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => (
      <div class="flex items-center gap-2">
        <Show when={info.row.original.image}>
          <img
            src={info.row.original.image}
            alt={info.getValue()}
            class="w-8 h-8 rounded-full"
          />
        </Show>
        <span class="font-medium">{info.getValue()}</span>
      </div>
    ),
  }),
  userColHelper.accessor("email", {
    header: "Email",
    cell: (info) => <span class="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
  userColHelper.accessor("isAdmin", {
    header: "Role",
    cell: (info) => (
      <Show when={info.getValue()} fallback={<Badge variant="outline">Volunteer</Badge>}>
        <Badge variant="error">Admin</Badge>
      </Show>
    ),
  }),
  userColHelper.accessor("createdAt", {
    header: "Joined",
    cell: (info) => <span class="text-sm">{new Date(info.getValue()).toLocaleDateString()}</span>,
  }),
];

// ── Tab types ─────────────────────────────────────────────────────────────────

type ContactTab = "leads" | "members" | "team";

// ── Page component ────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [activeTab, setActiveTab] = createSignal<ContactTab>("leads");

  // One controller per entity type, created once
  const leadsController = createCollectionQueryController<Lead, LeadField>({
    queryFn: (spec) => queryLeadsQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 10, pageIndex: 0 },
    },
  });

  const membersController = createCollectionQueryController<Member, MemberField>({
    queryFn: (spec) => queryMembersQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 10, pageIndex: 0 },
    },
  });

  const usersController = createCollectionQueryController<User, UserField>({
    queryFn: (spec) => queryUsersQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 10, pageIndex: 0 },
    },
  });

  const tabs: { id: ContactTab; label: string; icon: string }[] = [
    { id: "leads", label: "Leads", icon: "🎯" },
    { id: "members", label: "Members", icon: "🎓" },
    { id: "team", label: "Team", icon: "🙋" },
  ];

  return (
    <main class="container mx-auto p-6">
      <h1 class="text-3xl font-bold mb-6">Community</h1>

      {/* Tab bar */}
      <div class="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            type="button"
            class={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab() === tab.id
                ? "border-b-2 border-primary text-primary bg-transparent"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span class="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <Switch>
        <Match when={activeTab() === "leads"}>
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm text-muted-foreground">
              <Show when={leadsController.selectedIds().size > 0}>
                {leadsController.selectedIds().size} selected
              </Show>
            </div>
            <Button variant="outline" onClick={() => leadsController.refresh()}>
              Refresh
            </Button>
          </div>
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
            emptyMessage="No leads found"
          />
        </Match>

        <Match when={activeTab() === "members"}>
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm text-muted-foreground">
              <Show when={membersController.selectedIds().size > 0}>
                {membersController.selectedIds().size} selected
              </Show>
            </div>
            <Button variant="outline" onClick={() => membersController.refresh()}>
              Refresh
            </Button>
          </div>
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
                      {" · "}{member.programsDone.length} programs
                    </Show>
                  </div>
                </CardContent>
              </Card>
            )}
            selectable={true}
            cardColumns={3}
            emptyMessage="No members found"
          />
        </Match>

        <Match when={activeTab() === "team"}>
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm text-muted-foreground">
              <Show when={usersController.selectedIds().size > 0}>
                {usersController.selectedIds().size} selected
              </Show>
            </div>
            <Button variant="outline" onClick={() => usersController.refresh()}>
              Refresh
            </Button>
          </div>
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
                  <Show when={user.isAdmin} fallback={<Badge variant="outline">Volunteer</Badge>}>
                    <Badge variant="error">Admin</Badge>
                  </Show>
                </CardContent>
              </Card>
            )}
            selectable={true}
            cardColumns={3}
            emptyMessage="No volunteers found"
          />
        </Match>
      </Switch>
    </main>
  );
}
