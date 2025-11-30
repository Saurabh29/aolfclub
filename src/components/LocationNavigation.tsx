import { createSignal, For, Show } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { Location } from "~/schemas/location.schema";

type LocationNavigationProps = {
  locations: Location[];
  activeLocationId: string;
  onSelect: (locationId: string) => void;
  onAddLocation: () => void;
};

/**
 * LocationNavigation Component
 * 
 * A persistent UI control for viewing and switching between locations.
 * 
 * Features:
 * - Shows current active location
 * - Dropdown/panel with list of available locations
 * - Highlights current selection
 * - "Add Location" button to open modal
 * - Single location users see plain text but can still click
 * - Multiple location users see a selector
 * 
 * Emits:
 * - onSelect(locationId: string) - Updates global/app-level location state
 * - onAddLocation() - Opens Add Location modal
 */
export default function LocationNavigation(props: LocationNavigationProps) {
  const [open, setOpen] = createSignal(false);

  // Get active location details
  const activeLocation = () => 
    props.locations.find((l) => l.id === props.activeLocationId);

  const handleSelect = (locationId: string) => {
    props.onSelect(locationId);
    setOpen(false);
  };

  const handleAddLocation = () => {
    props.onAddLocation();
    setOpen(false);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DropdownMenu open={open()} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        as={(triggerProps: any) => (
          <Button
            {...triggerProps}
            variant="outline"
            class={cn(
              "flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50",
              props.locations.length === 1 && "cursor-pointer"
            )}
          >
            {/* Location Icon */}
            <svg
              class="h-4 w-4 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>

            {/* Location Name */}
            <span class="font-medium text-gray-900">
              {activeLocation()?.name || "Select Location"}
            </span>

            {/* Badge for single location */}
            <Show when={props.locations.length === 1}>
              <Badge variant="secondary" class="text-xs">
                Only
              </Badge>
            </Show>

            {/* Dropdown Arrow */}
            <svg
              class={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                open() && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        )}
      />

      <DropdownMenuContent class="w-80 bg-white border border-gray-200">
        <DropdownMenuLabel class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Select Location
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Location List */}
        <div class="max-h-[300px] overflow-y-auto">
          <For each={props.locations}>
            {(location) => (
              <DropdownMenuItem
                onSelect={() => handleSelect(location.id)}
                class={cn(
                  "flex items-start gap-3 px-3 py-2.5 cursor-pointer",
                  location.id === props.activeLocationId
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                )}
              >
                {/* Checkmark for active location */}
                <div class="flex-shrink-0 mt-0.5">
                  <Show
                    when={location.id === props.activeLocationId}
                    fallback={<div class="w-4 h-4" />}
                  >
                    <svg
                      class="w-4 h-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </Show>
                </div>

                {/* Location Info */}
                <div class="flex-1 min-w-0">
                  <p
                    class={cn(
                      "text-sm font-medium truncate",
                      location.id === props.activeLocationId
                        ? "text-blue-900"
                        : "text-gray-900"
                    )}
                  >
                    {location.name}
                  </p>
                  <Show when={location.address}>
                    <p class="text-xs text-gray-600 line-clamp-1 mt-0.5">
                      {location.address}
                    </p>
                  </Show>
                  <Show when={location.description && !location.address}>
                    <p class="text-xs text-gray-600 line-clamp-1 mt-0.5">
                      {location.description}
                    </p>
                  </Show>
                </div>
              </DropdownMenuItem>
            )}
          </For>
        </div>

        <DropdownMenuSeparator />

        {/* Add Location Button */}
        <DropdownMenuItem
          onSelect={handleAddLocation}
          class="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 cursor-pointer"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span class="text-sm font-medium">Add New Location</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
