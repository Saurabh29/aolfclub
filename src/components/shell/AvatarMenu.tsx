/**
 * AvatarMenu  -  contextual dropdown off the top-right avatar icon.
 *
 * Unauthenticated:  Sign in
 * Authenticated:    My centres (switchable) + Sign out
 *
 * Auth is stubbed  -  swap the `session` prop for real auth later.
 */
import { createSignal, Show, For, onCleanup, onMount, type Component, type JSX } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Globe, Check, LogOut, Github } from "lucide-solid";
import type { Location } from "~/lib/schemas/domain";

const GoogleIcon = () => (
  <svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const PROVIDER_META: Record<string, { label: string; icon: () => JSX.Element }> = {
  github: { label: "GitHub", icon: () => <Github class="w-4 h-4" /> },
  google: { label: "Google", icon: () => <GoogleIcon /> },
};

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
  /** Provider IDs to show sign-in buttons for (e.g. ["github", "google"]) */
  providers?: string[];
  onSignIn: (provider: string) => void;
  onSignOut: () => void;
  onSelectLocation: (slug: string) => void;
  /**
   * When true the dropdown opens upward and to the right (for sidebar placement).
   * Default: false (opens downward, right-aligned  -  for top-bar placement).
   */
  openUpward?: boolean;
}

export const AvatarMenu: Component<AvatarMenuProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  // Close on outside click  -  registered in onMount so it never runs on the server
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
            <Show when={props.session} fallback={<Globe class="w-5 h-5" />}>
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
          {/* -- Unauthenticated -- */}
          <Show when={!props.session}>
            <div class="px-4 pt-3 pb-1">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sign in with</p>
            </div>
            <For each={props.providers ?? []}>
              {(providerId, idx) => {
                const meta = PROVIDER_META[providerId];
                if (!meta) return null;
                const isLast = () => idx() === (props.providers?.length ?? 0) - 1;
                return (
                  <button
                    type="button"
                    class={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors${isLast() ? " pb-3" : ""}`}
                    onClick={() => props.onSignIn(providerId)}
                  >
                    {meta.icon()}
                    <span class="font-medium">{meta.label}</span>
                  </button>
                );
              }}
            </For>
          </Show>

          {/* -- Authenticated -- */}
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
                    <span class="text-base w-4 flex justify-center">
                      {loc.slug === props.activeSlug ? <Check class="w-3 h-3" /> : null}
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
                <LogOut class="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
