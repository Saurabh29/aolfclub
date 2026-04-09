/**
 * AvatarMenu — contextual dropdown off the top-right avatar icon.
 *
 * Unauthenticated:  Sign in
 * Authenticated:    My centres (switchable) + Sign out
 *
 * Auth is stubbed — swap the `session` prop for real auth later.
 */
import { createSignal, Show, For, onCleanup, onMount, type Component } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import type { Location } from "~/lib/schemas/domain";

export interface StubSession {
  name: string;
  email: string;
  image?: string;
}

export interface AvatarMenuProps {
  /** null = unauthenticated */
  session: StubSession | null;
  /** Locations the user belongs to */
  userLocations: Location[];
  /** Currently active location slug (null if none selected) */
  activeSlug: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSelectLocation: (slug: string) => void;
  /**
   * When true the dropdown opens upward and to the right (for sidebar placement).
   * Default: false (opens downward, right-aligned — for top-bar placement).
   */
  openUpward?: boolean;
}

export const AvatarMenu: Component<AvatarMenuProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  // Close on outside click — registered in onMount so it never runs on the server
  onMount(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-avatar-menu]")) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    onCleanup(() => document.removeEventListener("mousedown", handleOutside));
  });

  const initials = () => {
    if (!props.session) return null;
    return props.session.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div class="relative" data-avatar-menu>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        class="flex items-center justify-center w-9 h-9 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
        aria-label="Account menu"
        aria-expanded={open()}
      >
        <Show
          when={props.session?.image}
          fallback={
            <Show when={props.session} fallback={<span class="text-lg">🌐</span>}>
              <span>{initials()}</span>
            </Show>
          }
        >
          <img
            src={props.session!.image}
            alt={props.session!.name}
            class="w-9 h-9 rounded-full object-cover"
          />
        </Show>
      </button>

      {/* Dropdown panel */}
      <Show when={open()}>
        <div
          class={`absolute z-50 min-w-[220px] rounded-xl border border-border bg-background shadow-xl overflow-hidden ${
            props.openUpward ? "bottom-full mb-2 left-0" : "top-11 right-0"
          }`}
          onClick={() => setOpen(false)}
        >
          {/* ── Unauthenticated ── */}
          <Show when={!props.session}>
            <button
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
              onClick={props.onSignIn}
            >
              <span class="text-base">👤</span>
              <span class="font-medium">Sign in</span>
            </button>
          </Show>

          {/* ── Authenticated ── */}
          <Show when={props.session}>
            {/* User info */}
            <div class="px-4 py-3 border-b border-border">
              <div class="font-medium text-sm truncate">{props.session!.name}</div>
              <div class="text-xs text-muted-foreground truncate">{props.session!.email}</div>
            </div>

            {/* My centres */}
            <Show when={props.userLocations.length > 0}>
              <div class="px-4 pt-2 pb-1">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  My Centres
                </p>
              </div>
              <For each={props.userLocations}>
                {(loc) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    onClick={() => props.onSelectLocation(loc.slug)}
                  >
                    <span class="text-base">
                      {loc.slug === props.activeSlug ? "✓" : "  "}
                    </span>
                    <span class={loc.slug === props.activeSlug ? "font-semibold" : ""}>
                      {loc.name}
                    </span>
                  </button>
                )}
              </For>
            </Show>

            {/* Sign out */}
            <div class="border-t border-border mt-1">
              <button
                type="button"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-muted transition-colors"
                onClick={props.onSignOut}
              >
                <span class="text-base">→</span>
                <span>Sign out</span>
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
