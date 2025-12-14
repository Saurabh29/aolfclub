import { createSignal, onMount, Show } from "solid-js";

export type PlaceDetails = {
  name: string;
  formattedAddress: string;
  placeId: string;
  latitude?: number;
  longitude?: number;
};

type GooglePlaceSearchProps = {
  value: string;
  onPlaceSelect: (place: PlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
};

/**
 * GooglePlaceSearch Component
 * 
 * Reusable Google Places autocomplete search component using PlaceAutocompleteElement.
 * 
 * Features:
 * - Google Places Web Component (PlaceAutocompleteElement)
 * - Native autocomplete UI provided by Google
 * - Auto-loads Google Maps API if not already loaded
 * - Handles API loading states and errors
 */
export default function GooglePlaceSearch(props: GooglePlaceSearchProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  
  let autocompleteContainerRef: HTMLDivElement | undefined;

  // ============================================================================
  // GOOGLE PLACES API SETUP  
  // ============================================================================

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyATU_c30CPNnUzXQ7kJtj9DKA0HpVtJDn0";

  const loadGoogleMapsAPI = () => {
    return new Promise<void>((resolve, reject) => {
      // Check if already loaded
      if (typeof google !== "undefined" && google.maps?.places) {
        resolve();
        return;
      }

      // Check for existing script
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      ) as HTMLScriptElement;
      
      if (existingScript) {
        // Wait for existing script to load
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error("Failed to load Google Maps API")));
        return;
      }

      // Load the Google Maps API
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps API"));
      document.head.appendChild(script);
    });
  };

  const initializePlaceAutocomplete = async () => {
    if (!autocompleteContainerRef) {
      setError("Autocomplete container not found.");
      setIsLoading(false);
      return;
    }

    try {
      // Wait for google.maps.places to be available
      if (!google?.maps?.places) {
        throw new Error("Google Maps Places library not loaded");
      }

      // Clear any existing autocomplete elements
      if (autocompleteContainerRef.firstChild) {
        autocompleteContainerRef.innerHTML = "";
      }

      // Create the PlaceAutocompleteElement
      const placeAutocomplete = new (google.maps.places as any).PlaceAutocompleteElement();

      // Add border styling directly to the web component
      placeAutocomplete.style.border = "1px solid #d1d5db";
      placeAutocomplete.style.borderRadius = "0.375rem";
      placeAutocomplete.style.width = "100%";

      // Append it to container
      autocompleteContainerRef.appendChild(placeAutocomplete);

      // Add the gmp-select listener
      placeAutocomplete.addEventListener("gmp-select", async (event: any) => {
        const { placePrediction } = event;
        const place = placePrediction.toPlace();
        
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "id"],
        });

        const placeDetails: PlaceDetails = {
          name: place.displayName || "",
          formattedAddress: place.formattedAddress || "",
          placeId: place.id || "",
          latitude: place.location?.lat(),
          longitude: place.location?.lng(),
        };
        
        props.onPlaceSelect(placeDetails);
      });

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize PlaceAutocompleteElement:", err);
      setError("Failed to initialize autocomplete");
      setIsLoading(false);
    }
  };

  onMount(async () => {
    try {
      await loadGoogleMapsAPI();
      await initializePlaceAutocomplete();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to initialize map components.");
      setIsLoading(false);
    }
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div>
      <Show when={!API_KEY && !isLoading()}>
        <p class="text-sm text-destructive">
          Configuration Error: Google Maps API key is missing.
        </p>
      </Show>

      <Show when={API_KEY}>
        <div
          ref={autocompleteContainerRef}
          style={{
            "min-height": "40px",
          }}
        />
        <Show when={isLoading()}>
          <p class="text-sm text-muted-foreground mt-1">Loading...</p>
        </Show>
        <Show when={error()}>
          <p class="text-sm text-destructive mt-1">{error()}</p>
        </Show>
      </Show>
    </div>
  );
}
