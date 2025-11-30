import { createSignal, createEffect, For, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import AddLocationModal from "~/components/AddLocationModal";
import { locationsApi } from "~/lib/user-api";
import type { Location } from "~/schemas/location.schema";

/**
 * Locations Page
 * 
 * Displays all locations in a card grid with edit/delete functionality.
 */
export default function LocationsPage() {
  // ============================================================================
  // STATE
  // ============================================================================

  const [locations, setLocations] = createSignal<Location[]>([]);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [editingLocation, setEditingLocation] = createSignal<Location | null>(null);
  const [loading, setLoading] = createSignal(true);

  // ============================================================================
  // LOAD LOCATIONS
  // ============================================================================

  createEffect(() => {
    loadLocations();
  });

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await locationsApi.getAll();
      setLocations(data);
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddLocation = () => {
    setEditingLocation(null);
    setShowAddModal(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setShowAddModal(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) {
      return;
    }

    try {
      await locationsApi.delete(locationId);
      await loadLocations();
    } catch (error) {
      console.error("Failed to delete location:", error);
      alert("Failed to delete location");
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingLocation(null);
  };

  const handleSaveLocation = async () => {
    await loadLocations();
    setEditingLocation(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Locations</h1>
              <p class="text-sm text-gray-600 mt-1">
                Manage your organization's locations
              </p>
            </div>

            <Button onClick={handleAddLocation}>
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Location
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Show
          when={!loading()}
          fallback={
            <div class="text-center py-12">
              <p class="text-gray-500">Loading locations...</p>
            </div>
          }
        >
          <Show
            when={locations().length > 0}
            fallback={
              <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No locations</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by creating a new location.</p>
                <div class="mt-6">
                  <Button onClick={handleAddLocation}>
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Location
                  </Button>
                </div>
              </div>
            }
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <For each={locations()}>
                {(location) => (
                  <Card class="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <CardTitle class="text-lg flex items-center gap-2">
                            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {location.name}
                          </CardTitle>
                          <Show when={location.address}>
                            <CardDescription class="mt-2">
                              <div class="flex items-start gap-1 text-xs">
                                <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {location.address}
                              </div>
                            </CardDescription>
                          </Show>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Show when={location.description}>
                        <p class="text-sm text-gray-600 mb-4">{location.description}</p>
                      </Show>
                      
                      <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          class="flex-1"
                          onClick={() => handleEditLocation(location)}
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          class="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                          onClick={() => handleDeleteLocation(location.id)}
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </main>

      {/* Add/Edit Location Modal */}
      <AddLocationModal
        open={showAddModal()}
        onClose={handleCloseModal}
        onSave={handleSaveLocation}
        editingLocation={editingLocation()}
      />
    </div>
  );
}
