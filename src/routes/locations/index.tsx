import { createSignal, Show, For, Suspense } from "solid-js";
import { A, createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { queryLocationsQuery, deleteLocationAction } from "~/server/api";
import type { LocationField } from "~/lib/schemas/domain";
import type { QuerySpec } from "~/lib/schemas/query";

const LIST_SPEC: QuerySpec<LocationField> = {
  filters: [],
  sorting: [{ field: "name", direction: "asc" }],
  pagination: { pageSize: 100, pageIndex: 0 },
};

export const route = {
  preload: () => queryLocationsQuery(LIST_SPEC),
} satisfies RouteDefinition;

export default function LocationsPage() {
  const locationsData = createAsync(() => queryLocationsQuery(LIST_SPEC), { deferStream: true });
  const deleteLocation = useAction(deleteLocationAction);
  const [deletingId, setDeletingId] = createSignal<string | undefined>();

  const locations = () => locationsData()?.items ?? [];

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const result = await deleteLocation(id);
      if (!result.success) alert(`Failed to delete: ${result.error}`);
    } finally {
      setDeletingId(undefined);
    }
  };

  return (
    <main class="container mx-auto p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold">📍 Locations</h1>
          <p class="text-muted-foreground mt-1 text-sm">
            Manage NGO centres and chapters
          </p>
        </div>
        <A href="/locations/new">
          <Button>+ Add Location</Button>
        </A>
      </div>

      <Suspense fallback={<div class="text-muted-foreground text-sm">Loading locations…</div>}>
        {/* Empty */}
        <Show when={locations().length === 0}>
          <Card class="p-12 text-center">
            <div class="text-5xl mb-4">📍</div>
            <h3 class="text-xl font-semibold mb-2">No locations yet</h3>
            <p class="text-muted-foreground mb-4">
              Create your first NGO centre to get started.
            </p>
            <A href="/locations/new">
              <Button>+ Add Location</Button>
            </A>
          </Card>
        </Show>

        {/* List */}
        <Show when={locations().length > 0}>
          <div class="grid gap-4 sm:grid-cols-2">
            <For each={locations()}>
              {(loc) => (
                <Card class="p-5 flex flex-col gap-3">
                  {/* Top row: name + status */}
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <h2 class="font-semibold text-base leading-tight">{loc.name}</h2>
                      <div class="text-xs text-muted-foreground mt-0.5 font-mono">
                        /locations/{loc.slug}
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={loc.isActive ? "default" : "secondary"}>
                        {loc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <Show when={loc.description}>
                    <p class="text-sm text-muted-foreground line-clamp-2">{loc.description}</p>
                  </Show>

                  {/* Address */}
                  <Show when={loc.formattedAddress || loc.city}>
                    <div class="flex items-start gap-1.5 text-sm">
                      <span class="flex-shrink-0">📌</span>
                      <span class="text-muted-foreground">
                        {loc.formattedAddress ?? [loc.address, loc.city, loc.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </Show>

                  {/* Contact row */}
                  <div class="flex flex-wrap gap-3 text-sm">
                    <Show when={loc.phone}>
                      <a href={`tel:${loc.phone}`} class="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        📞 {loc.phone}
                      </a>
                    </Show>
                    <Show when={loc.email}>
                      <a href={`mailto:${loc.email}`} class="flex items-center gap-1 text-muted-foreground hover:text-foreground truncate">
                        ✉️ {loc.email}
                      </a>
                    </Show>
                    <Show when={loc.capacity}>
                      <span class="flex items-center gap-1 text-muted-foreground">
                        👥 Cap: {loc.capacity}
                      </span>
                    </Show>
                  </div>

                  {/* Actions */}
                  <div class="flex gap-2 pt-1">
                    <A href={`/locations/${loc.id}/edit`} class="flex-1">
                      <Button variant="outline" size="sm" class="w-full">✏️ Edit</Button>
                    </A>
                    <Button
                      variant="outline"
                      size="sm"
                      class="text-destructive hover:bg-destructive/10"
                      disabled={deletingId() === loc.id}
                      onClick={() => handleDelete(loc.id, loc.name)}
                    >
                      {deletingId() === loc.id ? "…" : "🗑️"}
                    </Button>
                  </div>
                </Card>
              )}
            </For>
          </div>
        </Show>
      </Suspense>
    </main>
  );
}
