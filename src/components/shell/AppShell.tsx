/**
 * AppShell — authenticated layout wrapper.
 *
 * Mobile:  top bar + page content + bottom nav
 * Desktop: left sidebar + page content  (md breakpoint)
 *
 * Navigation items are role-aware (stubbed for now — wire real roles later).
 */
import { createSignal, Show, type Component, type JSX } from "solid-js";
import { useLocation, useNavigate, A } from "@solidjs/router";
import { AvatarMenu, type StubSession } from "./AvatarMenu";
import type { Location } from "~/lib/schemas/domain";

export interface AppShellProps {
  children: JSX.Element;
  session: StubSession | null;
  userLocations: Location[];
  activeLocation: Location | null;
  /** Called when the user picks a different centre; parent persists to DB */
  onSelectLocation: (slug: string) => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

function buildNav(): NavItem[] {
  return [
    { href: "/app/leads", label: "My Leads", icon: "🏠" },
    { href: "/app/tasks", label: "Tasks", icon: "📋" },
    { href: "/app/members", label: "Members", icon: "👥" },
  ];
}

export const AppShell: Component<AppShellProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = () => buildNav();

  const isActive = (href: string) => location.pathname.startsWith(href);

  const handleSelectLocation = (slug: string) => {
    props.onSelectLocation(slug);
  };

  const handleSignOut = () => {
    // TODO: call real sign-out
    navigate("/");
  };

  const handleSignIn = () => {
    // TODO: trigger auth flow
    navigate("/");
  };

  return (
    <div class="flex h-svh overflow-hidden bg-background">
      {/* ── Desktop sidebar (md+) ── */}
      <aside class="hidden md:flex flex-col w-56 border-r border-border bg-background flex-shrink-0">
        {/* Logo */}
        <div class="flex items-center gap-2 px-5 py-4 border-b border-border">
          <span class="text-xl">🌿</span>
          <span class="font-semibold text-sm">AOLF Club</span>
        </div>

        {/* Nav links */}
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Show
            when={navItems().length > 0}
            fallback={
              <p class="text-xs text-muted-foreground px-2">
                Select a centre to begin
              </p>
            }
          >
            {navItems().map((item) => (
              <A
                href={item.href}
                class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span class="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </A>
            ))}
          </Show>
        </nav>

        {/* Avatar at bottom of sidebar */}
        <div class="p-4 border-t border-border">
          <div class="flex items-center gap-3">
            <AvatarMenu
              session={props.session}
              userLocations={props.userLocations}
              activeSlug={props.activeLocation?.slug ?? null}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onSelectLocation={handleSelectLocation}
            />
            <Show when={props.session}>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{props.session!.name}</p>
                <Show when={props.activeLocation}>
                  <p class="text-xs text-muted-foreground truncate">
                    {props.activeLocation!.name}
                  </p>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div class="flex flex-col flex-1 min-w-0">
        {/* Top bar (mobile only — hidden on md+) */}
        <header class="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-lg">🌿</span>
            <span class="font-semibold text-sm">
              <Show when={props.activeLocation} fallback="AOLF Club">
                {props.activeLocation!.name}
              </Show>
            </span>
          </div>
          <AvatarMenu
            session={props.session}
            userLocations={props.userLocations}
            activeSlug={props.activeLocation?.slug ?? null}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onSelectLocation={handleSelectLocation}
          />
        </header>

        {/* Page content — scrollable */}
        <main class="flex-1 overflow-y-auto pb-20 md:pb-0">
          {props.children}
        </main>

        {/* ── Mobile bottom nav ── */}
        <Show when={navItems().length > 0}>
          <nav class="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-border bg-background z-40">
            {navItems().map((item) => (
              <A
                href={item.href}
                class={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors ${
                  isActive(item.href)
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span class="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </A>
            ))}
          </nav>
        </Show>
      </div>
    </div>
  );
};
