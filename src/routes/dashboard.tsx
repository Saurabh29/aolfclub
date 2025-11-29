import { A, useLocation } from "@solidjs/router";
import { For, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { NavigationItemSchema, SummaryCardSchema, type NavigationItem, type SummaryCard } from "~/schemas/dashboard.schema";

// ============================================================================
// SAMPLE DATA
// ============================================================================

const navigationItems: NavigationItem[] = [
  {
    id: "serve-hub",
    label: "Serve Hub",
    icon: "home-outline",
    href: "/serve-hub",
    description: "Central dashboard for quick actions and service monitoring.",
  },
  {
    id: "user-management",
    label: "User Management",
    icon: "users-outline",
    href: "/user-management",
    description: "Manage user accounts, roles, and permissions.",
  },
  {
    id: "location-management",
    label: "Location Management",
    icon: "location-outline",
    href: "/location-management",
    description: "View and manage store and site locations.",
  },
].map((item) => NavigationItemSchema.parse(item));

const summaryCards: SummaryCard[] = [
  {
    id: "reports",
    title: "Reports",
    description: "View analytics, sales reports, and performance metrics",
    icon: "📊",
    href: "/reports",
  },
  {
    id: "manage-users",
    title: "Manage Users",
    description: "Add, edit, or remove user accounts and permissions",
    icon: "👥",
    href: "/users",
    badge: "3 pending",
  },
  {
    id: "store-status",
    title: "Store Status",
    description: "Monitor store operations and inventory levels",
    icon: "🏪",
    href: "/stores",
  },
  {
    id: "new-entries",
    title: "New Entries",
    description: "Review recent data entries and submissions",
    icon: "📝",
    href: "/entries",
    badge: "12 new",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Check system alerts and important updates",
    icon: "🔔",
    href: "/notifications",
    badge: "5",
  },
  {
    id: "quick-overview",
    title: "Quick Overview",
    description: "Summary of key metrics and system health",
    icon: "⚡",
    href: "/overview",
  },
].map((card) => SummaryCardSchema.parse(card));

// ============================================================================
// ICON COMPONENT
// ============================================================================

function Icon(props: { name: string; class?: string }) {
  const iconPaths: Record<string, string> = {
    "home-outline": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    "users-outline": "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    "location-outline": "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  };

  return (
    <svg
      class={props.class || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d={iconPaths[props.name] || iconPaths["home-outline"]} />
    </svg>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function Header() {
  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div class="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <div class="flex items-center gap-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-lg">A</div>
          <span class="hidden sm:inline-block text-lg font-semibold text-gray-900">AOLF Club</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:block text-right">
            <p class="text-sm font-medium text-gray-900">Alex</p>
            <p class="text-xs text-gray-500">Administrator</p>
          </div>
          <Avatar>
            <AvatarFallback class="bg-gradient-to-br from-sky-400 to-sky-600 text-white font-semibold">A</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// DESKTOP SIDEBAR
// ============================================================================

function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside class="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav class="p-4 space-y-2">
        <For each={navigationItems}>
          {(item) => {
            const isActive = () => location.pathname === item.href;
            
            return (
              <A
                href={item.href}
                class={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                  isActive() ? "bg-sky-50 text-sky-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon name={item.icon} class={cn("h-5 w-5 flex-shrink-0", isActive() ? "text-sky-600" : "text-gray-400")} />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{item.label}</p>
                  <Show when={item.description}>
                    <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                  </Show>
                </div>
              </A>
            );
          }}
        </For>
      </nav>
    </aside>
  );
}

// ============================================================================
// MOBILE BOTTOM NAV
// ============================================================================

function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav class="lg:hidden fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg">
      <div class="flex items-center justify-around px-2 py-2">
        <For each={navigationItems}>
          {(item) => {
            const isActive = () => location.pathname === item.href;

            return (
              <A
                href={item.href}
                class={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[4rem] transition-all duration-200 rounded-lg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset",
                  isActive() ? "text-sky-600" : "text-gray-600"
                )}
              >
                <Icon name={item.icon} class={cn("h-6 w-6 transition-transform", isActive() ? "scale-110" : "")} />
                <span class={cn("text-xs font-medium", isActive() ? "text-sky-600" : "text-gray-600")}>{item.label}</span>
                <Show when={isActive()}>
                  <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1 h-1 rounded-full bg-sky-600" />
                </Show>
              </A>
            );
          }}
        </For>
      </div>
    </nav>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function Dashboard() {
  return (
    <div class="min-h-screen bg-gray-50">
      <Header />
      <DesktopSidebar />
      <MobileBottomNav />

      <main class="pt-16 pb-20 lg:pb-8 lg:pl-64 min-h-screen">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <section class="mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Welcome back, Alex!</h1>
            <p class="text-lg text-gray-600">Here's your quick overview for today.</p>
          </section>

          <Separator class="my-6" />

          {/* Summary Cards using solid-ui Card components */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <For each={summaryCards}>
              {(card) => (
                <A
                  href={card.href}
                  class="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 rounded-xl"
                >
                  <Card class="h-full transition-all duration-200 hover:shadow-lg hover:border-sky-300 hover:-translate-y-1">
                    <CardHeader>
                      <div class="flex items-start justify-between">
                        <Show when={card.icon}>
                          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-2xl group-hover:bg-sky-100 transition-colors">
                            {card.icon}
                          </div>
                        </Show>
                        <Show when={card.badge}>
                          <Badge variant="secondary">{card.badge}</Badge>
                        </Show>
                      </div>
                      <CardTitle class="group-hover:text-sky-700 transition-colors">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent class="relative">
                      <div class="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg class="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </A>
              )}
            </For>
          </div>
        </div>
      </main>
    </div>
  );
}
