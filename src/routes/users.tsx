import { createColumnHelper } from "@tanstack/solid-table";
import { Show } from "solid-js";
import { queryUsersQuery } from "~/server/api";
import type { User, UserField } from "~/lib/schemas/domain/user.schema";
import { createCollectionQueryController } from "~/lib/controllers";
import { ResponsiveCollectionView } from "~/components/collection";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";

// TanStack Table column definitions
const columnHelper = createColumnHelper<User>();
const userColumns = [
  columnHelper.accessor("displayName", {
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
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => <span class="text-sm text-muted-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor("userType", {
    header: "Type",
    cell: (info) => (
      <Badge variant={info.getValue() === "LEAD" ? "default" : "secondary"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("isAdmin", {
    header: "Admin",
    cell: (info) => (
      <Show when={info.getValue()}>
        <Badge variant="error">Admin</Badge>
      </Show>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

export default function UsersPage() {
  // Phase 5: Collection Query Controller
  const controller = createCollectionQueryController<User, UserField>({
    queryFn: (spec) => queryUsersQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 10, pageIndex: 0 },
    },
  });

  // Card renderer for mobile view
  const renderUserCard = (user: User) => (
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
        <div class="flex gap-2">
          <Badge variant={user.userType === "LEAD" ? "default" : "secondary"}>
            {user.userType}
          </Badge>
          <Show when={user.isAdmin}>
            <Badge variant="error">Admin</Badge>
          </Show>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main class="container mx-auto p-8">
      <h1 class="text-4xl font-bold mb-8">Phase 5 Demo: Collection Components</h1>

      {/* Actions and selection info */}
      <div class="mb-6 flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <Show when={controller.selectedIds().size > 0}>
            {controller.selectedIds().size} selected
          </Show>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" onClick={() => controller.refresh()}>
            Refresh
          </Button>
          <Show when={controller.selectedIds().size > 0}>
            <Button variant="destructive" onClick={() => controller.clearSelection()}>
              Clear Selection
            </Button>
          </Show>
        </div>
      </div>

      {/* Responsive collection view */}
      <ResponsiveCollectionView
        controller={controller}
        columns={userColumns}
        getId={(user) => user.id}
        renderCard={renderUserCard}
        selectable={true}
        onRowClick={(user) => console.log("User clicked:", user)}
        cardColumns={3}
        emptyMessage="No users found"
        emptyIcon={
          <svg
            class="w-16 h-16 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        }
        emptyAction={
          <Button onClick={() => controller.refresh()}>
            Refresh to Load Users
          </Button>
        }
      />

      {/* Query-as-data pattern demo */}
      <section class="mt-12 p-6 bg-muted rounded-lg">
        <h2 class="text-xl font-semibold mb-4">🎯 Phase 5: Query-as-Data with Controller</h2>
        <div class="space-y-4 text-sm">
          <div>
            <h3 class="font-semibold mb-2">Current QuerySpec:</h3>
            <pre class="bg-background p-3 rounded overflow-x-auto border">
              {JSON.stringify(controller.querySpec(), null, 2)}
            </pre>
          </div>
          <div class="grid gap-2">
            <h3 class="font-semibold">Features:</h3>
            <ul class="list-disc list-inside space-y-1">
              <li>Auto-responsive: Cards on mobile, table on desktop</li>
              <li>TanStack Table with server-side sorting & pagination</li>
              <li>Row selection with checkbox support</li>
              <li>QuerySpec as single source of truth</li>
              <li>Built with Solid UI components</li>
              <li>Empty state with custom message, icon, and action button</li>
              <li>Container and card class customization</li>
              <li>Hydration mismatch protection for interactive elements</li>
              <li>Explicit Tailwind classes for JIT compiler optimization</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
