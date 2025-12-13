import { createSignal, createEffect, Show } from "solid-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import GooglePlaceSearch, { type PlaceDetails } from "~/components/GooglePlaceSearch";
import { locationsApi } from "~/lib/user-api";
import type { Location } from "~/lib/schemas/ui/location.schema";

type AddLocationModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: () => void; // Optional callback after successful save
  editingLocation?: Location | null; // Location to edit (if provided)
};

/**
 * AddLocationModal Component
 * 
 * Modal dialog for adding or editing a location.
 * 
 * Features:
 * - Toggle between Google Places autocomplete and Manual entry
 * - Google Places Text API integration (no map UI)
 * - Location Name (required)
 * - Address (optional)
 * - Description (optional)
 * - Edit existing location support
 * - Form validation
 * - Save/Cancel actions
 */
export default function AddLocationModal(props: AddLocationModalProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [mode, setMode] = createSignal<"google" | "manual">("google");
  const [locationId, setLocationId] = createSignal("");
  const [name, setName] = createSignal("");
  const [address, setAddress] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [placeId, setPlaceId] = createSignal("");
  const [formattedAddress, setFormattedAddress] = createSignal("");
  const [latitude, setLatitude] = createSignal<number | undefined>(undefined);
  const [longitude, setLongitude] = createSignal<number | undefined>(undefined);
  const [saving, setSaving] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Populate form when editing
  createEffect(() => {
    if (props.open && props.editingLocation) {
      const loc = props.editingLocation;
      setLocationId(loc.locationId || "");
      setName(loc.name || "");
      setAddress(loc.address || "");
      setDescription(loc.description || "");
      setPlaceId(loc.placeId || "");
      setFormattedAddress(loc.formattedAddress || "");
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      setSearchQuery(loc.formattedAddress || loc.name || "");
      // Set mode based on whether Google Places data exists
      setMode(loc.placeId ? "google" : "manual");
    }
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const isValidUrlSlug = (text: string): boolean => {
    // URL-safe pattern: lowercase letters, numbers, and hyphens only
    // Must be 6-50 characters
    const urlSlugPattern = /^[a-z0-9-]{6,50}$/;
    return urlSlugPattern.test(text);
  };

  const sanitizeForUrl = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const isValid = () => {
    const hasValidLocationId = isValidUrlSlug(locationId());
    const hasValidName = name().trim().length >= 2;
    return hasValidLocationId && hasValidName;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetForm = () => {
    setLocationId("");
    setName("");
    setAddress("");
    setDescription("");
    setPlaceId("");
    setFormattedAddress("");
    setLatitude(undefined);
    setLongitude(undefined);
    setSearchQuery("");
    setMode("google");
  };

  const handlePlaceSelect = (place: PlaceDetails) => {
    setName(place.name);
    setFormattedAddress(place.formattedAddress);
    setAddress(place.formattedAddress);
    setPlaceId(place.placeId);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setSearchQuery(place.formattedAddress);
    
    // Auto-generate locationId from place name if not set
    if (!locationId()) {
      const sanitized = sanitizeForUrl(place.name);
      setLocationId(sanitized);
    }
  };

  const handleSave = async () => {
    if (!isValid()) {
      alert("Please provide a valid Location ID (6-50 characters, lowercase letters, numbers, and hyphens) and Location Name (minimum 2 characters)");
      return;
    }

    setSaving(true);
    try {
      const locationData: any = {
        locationId: locationId(),
        name: name(),
        address: address() || undefined,
        description: description() || undefined,
        placeId: mode() === "google" ? placeId() || undefined : undefined,
        formattedAddress: mode() === "google" ? formattedAddress() || undefined : undefined,
        latitude: latitude(),
        longitude: longitude(),
      };

      if (props.editingLocation) {
        // Update existing location
        await locationsApi.update(props.editingLocation.id, locationData);
      } else {
        // Create new location
        await locationsApi.create(locationData);
      }

      resetForm();
      props.onSave?.();
      props.onClose();
    } catch (error) {
      console.error("Failed to save location:", error);
      alert("Failed to save location. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const toggleMode = () => {
    const newMode = mode() === "google" ? "manual" : "google";
    setMode(newMode);
    
    // Clear Google-specific data when switching to manual
    if (newMode === "manual") {
      setSearchQuery("");
      setPlaceId("");
      setFormattedAddress("");
      setLatitude(undefined);
      setLongitude(undefined);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent class="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {props.editingLocation ? "Edit Location" : "Add New Location"}
          </DialogTitle>
          <DialogDescription>
            {props.editingLocation 
              ? "Update the location details" 
              : "Create a new location using Google Places or manual entry"
            }
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          {/* Mode Toggle */}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center gap-2">
              <Show
                when={mode() === "google"}
                fallback={
                  <>
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span class="text-sm font-medium text-gray-700">Manual Entry</span>
                  </>
                }
              >
                <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span class="text-sm font-medium text-blue-700">Google Places</span>
              </Show>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMode}
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Switch to {mode() === "google" ? "Manual" : "Google"}
            </Button>
          </div>

          {/* Google Places Search */}
          <Show when={mode() === "google"}>
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-1">
                Search Location <span class="text-red-600">*</span>
              </label>
              <GooglePlaceSearch
                value={searchQuery()}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Start typing to search places..."
              />
            </div>

            {/* Show selected place info */}
            <Show when={placeId()}>
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div class="flex items-start gap-2">
                  <svg class="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-blue-900">Place selected from Google</p>
                    <p class="text-xs text-blue-700 mt-0.5">{formattedAddress()}</p>
                  </div>
                </div>
              </div>
            </Show>
          </Show>

          {/* Location ID (URL slug) */}
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">
              Location ID <span class="text-red-600">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., main-center, downtown-branch"
              value={locationId()}
              onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setLocationId(e.currentTarget.value.toLowerCase())}
              class="w-full bg-white font-mono text-sm"
            />
            <p class="text-xs text-gray-500 mt-1">
              Unique identifier for URL (6-50 characters, lowercase letters, numbers, hyphens only)
            </p>
            <Show when={locationId().length > 0 && !isValidUrlSlug(locationId())}>
              <p class="text-xs text-red-600 mt-1">
                Must be 6-50 characters with only lowercase letters, numbers, and hyphens
              </p>
            </Show>
            <Show when={isValidUrlSlug(locationId())}>
              <p class="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Valid location ID
              </p>
            </Show>
          </div>

          {/* Location Name (Always visible, auto-filled from Google or manual) */}
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">
              Location Name <span class="text-red-600">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Main Center, Downtown Branch"
              value={name()}
              onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setName(e.currentTarget.value)}
              class="w-full bg-white"
            />
            <Show when={name().length > 0 && name().length < 2}>
              <p class="text-xs text-red-600 mt-1">
                Minimum 2 characters required
              </p>
            </Show>
          </div>

          {/* Address (Only shown in manual mode) */}
          <Show when={mode() === "manual"}>
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-1">
                Address <span class="text-gray-500 text-xs">(Optional)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., 123 Main Street, City, State ZIP"
                value={address()}
                onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setAddress(e.currentTarget.value)}
                class="w-full bg-white"
              />
            </div>
          </Show>

          {/* Description */}
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">
              Description <span class="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              placeholder="e.g., Primary center with meditation hall and classrooms"
              value={description()}
              onInput={(e: InputEvent & { currentTarget: HTMLTextAreaElement }) => setDescription(e.currentTarget.value)}
              class="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-white"
            />
          </div>

          {/* Coordinates Info (for Google mode) */}
          <Show when={mode() === "google" && latitude() && longitude()}>
            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span class="text-xs text-gray-600">
                Coordinates: {latitude()?.toFixed(6)}, {longitude()?.toFixed(6)}
              </span>
            </div>
          </Show>
        </div>

        {/* Actions */}
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving()}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid() || saving()}
          >
            <Show when={saving()} fallback={props.editingLocation ? "Update Location" : "Save Location"}>
              Saving...
            </Show>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
