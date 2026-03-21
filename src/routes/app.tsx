/**
 * /app — authenticated app shell layout.
 *
 * Wraps all /app/* child routes with the AppShell (sidebar + bottom nav).
 * Active location is loaded from the server (stored on the user record in DB),
 * NOT derived from the URL. Switching locations updates the DB record.
 *
 * Uses real Auth.js session — STUB constants removed.
 */
import { createSignal, createEffect, Show, type Component } from "solid-js";
import { createAsync, type RouteSectionProps } from "@solidjs/router";
import { AppShell } from "~/components/shell/AppShell";
import {
  queryLocationsQuery,
  getActiveLocationIdQuery,
  setActiveLocationMutation,
} from "~/server/api";
import { getUser, getAuthSession } from "~/lib/auth";
import type { LocationField, Location } from "~/lib/schemas/domain";
import type { QuerySpec } from "~/lib/schemas/query";
import type { StubSession } from "~/components/shell/AvatarMenu";

const AppLayout: Component<RouteSectionProps> = (props) => {
  // Enforce authentication — throws redirect("/") if not signed in.
  // deferStream: true blocks SSR streaming until auth is confirmed.
  const user = createAsync(() => getUser(), { deferStream: true });

  // Full session for display (name, email, image)
  const session = createAsync(() => getAuthSession());

  // All active locations — for the location switcher in AvatarMenu
  const locationsData = createAsync(async () => {
    const spec: QuerySpec<LocationField> = {
      filters: [{ field: "isActive", op: "eq", value: true }],
      sorting: [{ field: "name", direction: "asc" }],
      pagination: { pageSize: 50, pageIndex: 0 },
    };
    return await queryLocationsQuery(spec);
  });

  // Active location ID from DB (keyed to session userId server-side)
  const storedActiveId = createAsync(() => getActiveLocationIdQuery());

  // Local signal — updated optimistically on switch; initialised from DB
  const [activeLocId, setActiveLocId] = createSignal<string | null>(null);

  createEffect(() => {
    const id = storedActiveId();
    if (id !== undefined) setActiveLocId(id ?? null);
  });

  const allLocations = () => (locationsData()?.items ?? []) as Location[];

  const activeLocation = () => {
    const id = activeLocId();
    if (id) {
      const found = allLocations().find((l) => l.id === id);
      if (found) return found;
    }
    return allLocations()[0] ?? null;
  };

  // Shape the session data to match AppShell's StubSession prop
  const shellSession = (): StubSession | null => {
    const s = session();
    const u = user();
    if (!s?.user && !u) return null;
    return {
      name: (s?.user as any)?.name ?? (u as any)?.name ?? "User",
      email: (s?.user as any)?.email ?? (u as any)?.email ?? "",
      image: (s?.user as any)?.image ?? (u as any)?.image ?? undefined,
    };
  };

  // Switch active location: optimistic UI update + persist to DB
  const handleSelectLocation = async (slug: string) => {
    const loc = allLocations().find((l) => l.slug === slug);
    if (!loc) return;
    setActiveLocId(loc.id); // instant optimistic update
    await setActiveLocationMutation(loc.id);
  };

  return (
    <Show
      when={user()}
      fallback={
        <div class="flex items-center justify-center h-svh text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <AppShell
        session={shellSession()}
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

