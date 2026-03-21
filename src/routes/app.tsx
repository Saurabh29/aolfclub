/**
 * /app — authenticated app shell layout.
 *
 * Wraps all /app/* child routes with the AppShell (sidebar + bottom nav).
 * Active location is loaded from the server (stored on the user record in DB),
 * NOT derived from the URL. Switching locations updates the DB record.
 *
 * Stub session + userId — replace with real auth when ready.
 */
import { createResource, createSignal, createEffect, Show, type Component } from "solid-js";
import { type RouteSectionProps } from "@solidjs/router";
import { AppShell } from "~/components/shell/AppShell";
import {
  queryLocationsQuery,
  getActiveLocationIdQuery,
  setActiveLocationMutation,
} from "~/server/api";
import type { LocationField, Location } from "~/lib/schemas/domain";
import type { QuerySpec } from "~/lib/schemas/query";
import type { StubSession } from "~/components/shell/AvatarMenu";

// ── STUBS — replace with real session when auth is wired ───────────────────
const STUB_USER_ID = "stub-user";
const STUB_SESSION: StubSession = {
  name: "Volunteer User",
  email: "volunteer@example.org",
};
// ───────────────────────────────────────────────────────────────────────────

const AppLayout: Component<RouteSectionProps> = (props) => {
  // All active locations — for the location switcher in AvatarMenu
  const [locationsData] = createResource(async () => {
    const spec: QuerySpec<LocationField> = {
      filters: [{ field: "isActive", op: "eq", value: true }],
      sorting: [{ field: "name", direction: "asc" }],
      pagination: { pageSize: 50, pageIndex: 0 },
    };
    return await queryLocationsQuery(spec);
  });

  // Active location ID — read once from DB on mount
  const [storedActiveId] = createResource(
    async () => await getActiveLocationIdQuery(STUB_USER_ID)
  );

  // Local signal — updated optimistically on switch; initialised from DB
  const [activeLocId, setActiveLocId] = createSignal<string | null>(null);

  // Sync signal from DB once loaded
  createEffect(() => {
    const id = storedActiveId();
    if (id !== undefined) setActiveLocId(id ?? null);
  });

  const allLocations = () => (locationsData()?.items ?? []) as Location[];

  // Active location: match by ID, fall back to first location if none stored yet
  const activeLocation = () => {
    const id = activeLocId();
    if (id) {
      const found = allLocations().find((l) => l.id === id);
      if (found) return found;
    }
    return allLocations()[0] ?? null;
  };

  // Switch active location: optimistic UI update + persist to DB
  const handleSelectLocation = async (slug: string) => {
    const loc = allLocations().find((l) => l.slug === slug);
    if (!loc) return;
    setActiveLocId(loc.id); // instant optimistic update
    await setActiveLocationMutation(STUB_USER_ID, loc.id);
  };

  return (
    <Show
      when={!locationsData.loading}
      fallback={
        <div class="flex items-center justify-center h-svh text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <AppShell
        session={STUB_SESSION}
        userLocations={allLocations()}
        activeLocation={activeLocation()}
        onSelectLocation={handleSelectLocation}
      >
        {props.children}
      </AppShell>
    </Show>
  );
};

export default AppLayout;
