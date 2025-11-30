import { createSignal, onMount, For, Show } from "solid-js";
import { cn } from "~/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

/**
 * Location type definition
 */
type Location = {
  id: string;
  name: string;
};

/**
 * AuthDropdown Component
 * 
 * Combined authentication and location selector dropdown.
 * Displays user session controls and location selection in one place.
 * 
 * Features:
 * - Toggle dropdown via profile icon
 * - Location selection with visual indicator for active location
 * - Sign-in options (Google/GitHub OAuth)
 * - Sign-out functionality
 * - localStorage persistence for selected location
 * - Keyboard accessible (Escape to close, Tab navigation)
 * - Mobile and desktop responsive
 * 
 * Design rationale:
 * - Most users have 1 location (no UI clutter on main page)
 * - Multi-location users (max 5) get easy access via same menu
 * - Click location name directly (no nested dropdown needed)
 * - Centralizes session + context (auth + location) in one place
 */

type AuthDropdownProps = {
  locations?: Location[];
  onLocationChange?: (locationId: string) => void;
};

export default function AuthDropdown(props: AuthDropdownProps) {
  /**
   * Currently selected location ID.
   * Persisted in localStorage and restored on mount.
   */
  const [selectedLocationId, setSelectedLocationId] = createSignal<string>("");

  /**
   * Mock authentication state.
   * TODO: Replace with actual auth context/store
   * Set to true by default to simulate logged-in user for testing
   */
  const [isAuthenticated, setIsAuthenticated] = createSignal(true);

  /**
   * Initialize selected location on mount.
   * Restores from localStorage or defaults to first location.
   */
  onMount(() => {
    if (!props.locations || props.locations.length === 0) return;

    const storedId = localStorage.getItem("selectedLocationId");
    const isValid = storedId && props.locations.some((loc) => loc.id === storedId);
    const initialId = isValid ? storedId : props.locations[0].id;

    setSelectedLocationId(initialId);
    if (props.onLocationChange) {
      props.onLocationChange(initialId);
    }
  });

  /**
   * Handle location selection.
   * Updates state, persists to localStorage, and notifies parent.
   */
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    localStorage.setItem("selectedLocationId", locationId);
    if (props.onLocationChange) {
      props.onLocationChange(locationId);
    }
  };
  /**
   * Placeholder: Initiates Google OAuth login flow
   */
  const loginWithGoogle = () => {
    console.log("🔐 Initiating Google OAuth login...");
    // TODO: Implement actual Google OAuth flow
    // Example: window.location.href = '/auth/google';
    // Mock login for demo
    setIsAuthenticated(true);
  };

  /**
   * Placeholder: Initiates GitHub OAuth login flow
   */
  const loginWithGithub = () => {
    console.log("🔐 Initiating GitHub OAuth login...");
    // TODO: Implement actual GitHub OAuth flow
    // Example: window.location.href = '/auth/github';
    // Mock login for demo
    setIsAuthenticated(true);
  };

  /**
   * Placeholder: Handle sign out
   */
  const handleSignOut = () => {
    console.log("🚪 Signing out...");
    // TODO: Implement actual sign out logic
    setIsAuthenticated(false);
  };

  return (
    <DropdownMenu preventScroll={false} modal={false}>
      <DropdownMenuTrigger
        class={cn(
          "flex items-center justify-center",
          "h-10 w-10 rounded-full",
          "bg-gradient-to-br from-sky-400 to-sky-600",
          "text-white font-semibold",
          "transition-all duration-200",
          "hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        )}
        aria-label="Open user menu"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-72 bg-white border border-gray-200">
        <Show when={isAuthenticated()}>
          {/* User Info Section */}
          <div class="px-4 py-3">
            <p class="text-sm font-semibold text-gray-900">Alex Johnson</p>
            <p class="text-xs text-gray-600">alex@example.com</p>
          </div>

          <DropdownMenuSeparator />

          {/* Location Selection Section */}
          <Show when={props.locations && props.locations.length > 0}>
            <div class="px-2 py-2">
              <DropdownMenuLabel class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Your Locations
              </DropdownMenuLabel>
              <div class="mt-1 space-y-1">
                <For each={props.locations}>
                  {(location) => {
                    const isSelected = () => selectedLocationId() === location.id;
                    return (
                      <DropdownMenuItem
                        onSelect={() => handleLocationSelect(location.id)}
                        class={cn(
                          "flex items-center gap-3 px-2 py-2.5 cursor-pointer rounded-md transition-colors",
                          isSelected() ? "bg-sky-50" : "hover:bg-gray-50"
                        )}
                      >
                        {/* Location Icon */}
                        <div class={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
                          isSelected() ? "bg-sky-100" : "bg-gray-100"
                        )}>
                          <svg
                            class={cn("h-4 w-4", isSelected() ? "text-sky-600" : "text-gray-600")}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>

                        {/* Location Name */}
                        <span class={cn(
                          "flex-1 text-sm font-medium",
                          isSelected() ? "text-sky-700" : "text-gray-900"
                        )}>
                          {location.name}
                        </span>

                        {/* Selected Indicator */}
                        <Show when={isSelected()}>
                          <svg
                            class="h-5 w-5 text-sky-600 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </Show>
                      </DropdownMenuItem>
                    );
                  }}
                </For>
              </div>
            </div>

            <DropdownMenuSeparator />
          </Show>

          {/* Sign Out Button */}
          <DropdownMenuItem
            onSelect={handleSignOut}
            class={cn(
              "flex items-center gap-3 px-2 py-3 cursor-pointer text-red-600 hover:bg-red-50"
            )}
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span class="text-sm font-medium">Sign Out</span>
          </DropdownMenuItem>
        </Show>

        {/* Not Authenticated - Sign In Options */}
        <Show when={!isAuthenticated()}>
          <div class="px-2 py-2">
            <DropdownMenuLabel class="text-base font-semibold text-gray-900">
              Sign In
            </DropdownMenuLabel>
            <p class="px-2 text-sm text-gray-600">
              Choose a provider to continue
            </p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={loginWithGoogle}
            class={cn(
              "flex items-center gap-3",
              "px-2 py-3",
              "cursor-pointer"
            )}
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200">
              <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            
            <span class="text-sm font-medium text-gray-900">
              Continue with Google
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={loginWithGithub}
            class={cn(
              "flex items-center gap-3",
              "px-2 py-3",
              "cursor-pointer"
            )}
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
              <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            
            <span class="text-sm font-medium text-gray-900">
              Continue with GitHub
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div class="px-4 py-2">
            <p class="text-xs text-gray-600 text-center">
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
