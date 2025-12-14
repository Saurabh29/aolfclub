import { createSignal, createEffect, onMount, For, Show } from "solid-js";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a physical location (store/site) in the system.
 * Users may have access to one or multiple locations.
 */
export type Location = {
  id: string;
  name: string;
};

/**
 * Represents a task associated with a specific location.
 * Tasks can have various statuses and priority levels.
 */
export type Task = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
};

// ============================================================================
// MOCK DATA & ASYNC API
// ============================================================================

/**
 * Mock tasks database - organized by location ID.
 * Each location has its own set of tasks.
 * 
 * NOTE: Location data now comes from the database via getLocations() server function.
 * This component should be updated to accept locations as a prop.
 */
const MOCK_TASKS_DB: Record<string, Task[]> = {
  "loc-1": [
    {
      id: "task-1",
      title: "Complete inventory check",
      description: "Verify stock levels and update system",
      status: "pending",
      priority: "high",
      dueDate: "2025-12-05",
    },
    {
      id: "task-2",
      title: "Update display signage",
      description: "Install new promotional materials",
      status: "in-progress",
      priority: "medium",
      dueDate: "2025-12-03",
    },
    {
      id: "task-3",
      title: "Schedule staff meeting",
      description: "Quarterly review and planning session",
      status: "completed",
      priority: "low",
    },
  ],
  "loc-2": [
    {
      id: "task-4",
      title: "Repair cash register #3",
      description: "Contact maintenance for faulty cash register",
      status: "pending",
      priority: "high",
      dueDate: "2025-12-02",
    },
    {
      id: "task-5",
      title: "Train new employee",
      description: "Onboarding for Sarah Johnson",
      status: "in-progress",
      priority: "medium",
      dueDate: "2025-12-10",
    },
  ],
  "loc-3": [
    {
      id: "task-6",
      title: "Update security protocols",
      description: "Review and update access codes",
      status: "pending",
      priority: "high",
      dueDate: "2025-12-01",
    },
  ],
};

/**
 * Simulates an async API call to fetch tasks for a specific location.
 * Includes artificial delay to demonstrate loading states.
 * 
 * @param locationId - The ID of the location to fetch tasks for
 * @returns Promise resolving to an array of tasks
 */
export async function getTasksForLocation(locationId: string): Promise<Task[]> {
  // Simulate network delay (300-800ms)
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));
  
  // Return tasks for the specified location, or empty array if none exist
  return MOCK_TASKS_DB[locationId] || [];
}

// ============================================================================
// COMPONENT 1: LocationSelector
// ============================================================================

/**
 * LocationSelector Component
 * 
 * Displays location selection UI that adapts based on the number of available locations:
 * - Single location: Shows a read-only Badge (no interaction needed)
 * - Multiple locations: Shows a Select dropdown with all options
 * 
 * Features:
 * - Mobile-first responsive design
 * - localStorage persistence for selected location
 * - Automatic selection on mount (from localStorage or first location)
 * - Clean visual integration with dashboard styling
 * 
 * @param props.locations - Array of available locations
 * @param props.onSelect - Callback fired when location changes
 */
type LocationSelectorProps = {
  locations: Location[];
  onSelect: (locationId: string) => void;
};

function LocationSelector(props: LocationSelectorProps) {
  /**
   * Track the currently selected location ID.
   * Initialized on mount from localStorage or defaults to first location.
   */
  const [selectedLocationId, setSelectedLocationId] = createSignal<string>("");

  /**
   * Initialize selected location on component mount.
   * Priority:
   * 1. localStorage value (if exists and valid)
   * 2. First location in the array (fallback)
   */
  onMount(() => {
    if (props.locations.length === 0) return;

    // Try to restore from localStorage
    const storedId = localStorage.getItem("selectedLocationId");
    const isStoredIdValid = storedId && props.locations.some((loc) => loc.id === storedId);

    // Use stored value if valid, otherwise use first location
    const initialId = isStoredIdValid ? storedId : props.locations[0].id;
    
    setSelectedLocationId(initialId);
    props.onSelect(initialId);
  });

  /**
   * Handle location selection change.
   * Updates local state, persists to localStorage, and notifies parent.
   */
  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    localStorage.setItem("selectedLocationId", locationId);
    props.onSelect(locationId);
  };

  /**
   * CASE 1: Single Location
   * 
   * When user has only one location, display it as a read-only Badge.
   * Reasoning:
   * - No selection needed (only one option)
   * - Badge is visually lighter than a disabled dropdown
   * - Communicates "current location" without implying interaction
   * - Consistent with dashboard's badge usage pattern
   */
  const isSingleLocation = () => props.locations.length === 1;

  return (
    <div class="w-full">
      <Show
        when={!isSingleLocation()}
        fallback={
          // Single location: Read-only Badge display
          <div class="flex items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <span class="text-sm font-medium text-gray-700">Location:</span>
            <Badge variant="secondary" class="text-sm">
              {props.locations[0]?.name || "No location"}
            </Badge>
          </div>
        }
      >
        {/* 
          Multiple locations: Interactive Select dropdown
          Mobile optimized:
          - Full width on mobile for easy thumb access
          - Adequate touch target size (h-10 = 40px)
          - Clear label and visual hierarchy
          - Card-style container for visual consistency
        */}
        <div class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="flex flex-col gap-3">
            <label for="location-select" class="text-sm font-semibold text-gray-900">
              Select Your Location
            </label>
            <Select
              value={selectedLocationId()}
              onChange={(value) => {
                if (value) handleLocationChange(value);
              }}
              options={props.locations.map(loc => loc.id)}
              placeholder="Choose a location..."
              itemComponent={(itemProps) => (
                <SelectItem item={itemProps.item}>
                  {props.locations.find(loc => loc.id === itemProps.item.rawValue)?.name || itemProps.item.rawValue}
                </SelectItem>
              )}
            >
              <SelectTrigger
                id="location-select"
                aria-label="Select location"
                class="w-full h-12 text-base"
              >
                <SelectValue<string>>
                  {(state) => {
                    const selectedId = state.selectedOption();
                    const location = props.locations.find(loc => loc.id === selectedId);
                    return location?.name || "Select location";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </div>
      </Show>
    </div>
  );
}

// ============================================================================
// COMPONENT 2: TaskList
// ============================================================================

/**
 * TaskList Component
 * 
 * Displays tasks for a selected location with loading and empty states.
 * 
 * Features:
 * - Skeleton loading animation during data fetch
 * - Card-based task display with status badges and priority indicators
 * - Empty state with helpful messaging
 * - Mobile-responsive grid layout
 * - Visual consistency with dashboard summary cards
 * 
 * State Management:
 * - Reactively fetches tasks when selectedLocationId changes
 * - Manages loading state during async operations
 * - Clears stale data before loading new tasks
 * 
 * @param props.selectedLocationId - The ID of the currently selected location
 */
type TaskListProps = {
  selectedLocationId: string;
};

export function TaskList(props: TaskListProps) {
  /**
   * Current tasks for the selected location.
   * Empty array during loading or when no tasks exist.
   */
  const [tasks, setTasks] = createSignal<Task[]>([]);

  /**
   * Loading state indicator.
   * True while fetching tasks from the API.
   */
  const [loading, setLoading] = createSignal(false);

  /**
   * Fetch tasks whenever the selected location changes.
   * 
   * Flow:
   * 1. Clear existing tasks (prevent showing stale data)
   * 2. Set loading state
   * 3. Fetch new tasks from API
   * 4. Update tasks state
   * 5. Clear loading state
   * 
   * This ensures clean transitions between locations.
   */
  createEffect(() => {
    const locationId = props.selectedLocationId;
    if (!locationId) return;

    // Clear old tasks and show loading
    setTasks([]);
    setLoading(true);

    // Fetch tasks for the selected location
    getTasksForLocation(locationId)
      .then((fetchedTasks) => {
        setTasks(fetchedTasks);
      })
      .catch((error) => {
        console.error("Failed to fetch tasks:", error);
        setTasks([]);
      })
      .finally(() => {
        setLoading(false);
      });
  });

  /**
   * Map task status to badge variant for visual consistency.
   * Uses solid-ui Badge component with predefined variants.
   */
  const getStatusBadgeVariant = (status: Task["status"]) => {
    const variants: Record<Task["status"], "default" | "secondary" | "outline"> = {
      pending: "outline",
      "in-progress": "default",
      completed: "secondary",
    };
    return variants[status];
  };

  /**
   * Map priority level to color classes.
   * Provides visual priority indicators in the UI.
   */
  const getPriorityColor = (priority: Task["priority"]) => {
    const colors: Record<Task["priority"], string> = {
      high: "text-red-600",
      medium: "text-yellow-600",
      low: "text-gray-600",
    };
    return colors[priority];
  };

  return (
    <div class="w-full mt-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Tasks</h2>

      <Show when={loading()}>
        {/* Loading State: Skeleton placeholders */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={[1, 2, 3]}>
            {() => (
              <Card class="h-48">
                <CardHeader>
                  <Skeleton class="h-6 w-3/4 mb-2 rounded" />
                  <Skeleton class="h-4 w-full rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton class="h-4 w-1/2 mb-2 rounded" />
                  <Skeleton class="h-4 w-2/3 rounded" />
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </Show>

      <Show when={!loading() && tasks().length === 0}>
        {/* Empty State: No tasks for this location */}
        <Card class="border-dashed">
          <CardContent class="flex flex-col items-center justify-center py-12">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg
                class="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p class="text-lg font-medium text-gray-900 mb-1">No tasks found</p>
            <p class="text-sm text-gray-600 text-center">
              There are no tasks for this location at the moment.
            </p>
          </CardContent>
        </Card>
      </Show>

      <Show when={!loading() && tasks().length > 0}>
        {/* Task Cards Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={tasks()}>
            {(task) => (
              <Card class="transition-all duration-200 hover:shadow-lg hover:border-sky-300 hover:-translate-y-1">
                <CardHeader>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <CardTitle class="text-base">{task.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(task.status)} class="flex-shrink-0 text-xs">
                      {task.status}
                    </Badge>
                  </div>
                  <CardDescription class="text-sm">{task.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-1">
                      <span class="text-gray-600">Priority:</span>
                      <span class={cn("font-medium", getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    </div>
                    <Show when={task.dueDate}>
                      <div class="text-gray-600">
                        Due: {new Date(task.dueDate!).toLocaleDateString()}
                      </div>
                    </Show>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// ============================================================================
// COMPONENT 3: LocationTaskSelector (Wrapper)
// ============================================================================

/**
 * LocationTaskSelector - Main Wrapper Component
 * 
 * Combines LocationSelector and TaskList into a single, cohesive feature.
 * This is the primary export and page-ready component.
 * 
 * Architecture:
 * - Manages selectedLocationId as central state
 * - Passes locations and handlers to LocationSelector
 * - Passes selectedLocationId to TaskList for data fetching
 * - Integrates seamlessly with dashboard layout
 * 
 * Usage:
 * ```tsx
 * import LocationTaskSelector from "~/components/LocationTaskSelector";
 * 
 * export default function SomePage() {
 *   return (
 *     <main>
 *       <LocationTaskSelector />
 *     </main>
 *   );
 * }
 * ```
 * 
 * Features:
 * - Self-contained (no props needed)
 * - Uses mock data (easy to replace with real API)
 * - Mobile-first responsive layout
 * - Consistent spacing with dashboard cards
 * - localStorage persistence across sessions
 * 
 * NOTE: This component uses mock location data. To use real database locations,
 * pass locations as a prop or fetch them using getLocations() from ~/server/actions/locations
 */
export default function LocationTaskSelector(props?: { locations?: Location[] }) {
  /**
   * Currently selected location ID.
   * Shared between LocationSelector (writes) and TaskList (reads).
   */
  const [selectedLocationId, setSelectedLocationId] = createSignal<string>("");

  /**
   * Use provided locations or empty array as fallback
   * In production, locations should be passed from parent component
   */
  const locations = props?.locations || [];

  return (
    <div class="w-full">
      {/* 
        LocationSelector at the top
        - Displays location badge (single) or dropdown (multiple)
        - Updates selectedLocationId via setSelectedLocationId callback
        - Persists selection to localStorage
      */}
      <LocationSelector locations={locations} onSelect={setSelectedLocationId} />

      {/* 
        TaskList below with spacing
        - Fetches and displays tasks for selectedLocationId
        - Shows loading skeleton during fetch
        - Shows empty state when no tasks exist
        - Mobile-responsive card grid layout
      */}
      <TaskList selectedLocationId={selectedLocationId()} />
    </div>
  );
}
