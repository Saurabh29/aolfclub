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

  const loadGoogleMapsAPI = async () => {
    // Check for existing script
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    ) as HTMLScriptElement;
    
    if (existingScript) {
      // Wait for it to load if it's still loading
      if (typeof google !== "undefined" && google.maps?.places) {
        initializePlaceAutocomplete();
        return;
      }
      
      // Poll for places library to be available
      const checkPlacesLoaded = setInterval(() => {
        if (typeof google !== "undefined" && google.maps?.places) {
          clearInterval(checkPlacesLoaded);
          initializePlaceAutocomplete();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkPlacesLoaded);
        if (isLoading()) {
          setError("Google Places library failed to load");
          setIsLoading(false);
        }
      }, 10000);
      return;
    }

    const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyATU_c30CPNnUzXQ7kJtj9DKA0HpVtJDn0";
    
    return new Promise<void>((resolve, reject) => {
      const scriptElement = document.createElement("script");
      scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async&v=weekly`;
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.onload = () => {
        // Poll for places library since loading=async means libraries load separately
        const checkPlacesLoaded = setInterval(() => {
          if (typeof google !== "undefined" && google.maps?.places) {
            clearInterval(checkPlacesLoaded);
            resolve();
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkPlacesLoaded);
          if (!google?.maps?.places) {
            reject(new Error("Google Places library failed to load"));
          }
        }, 10000);
      };
      scriptElement.onerror = () => {
        reject(new Error("Failed to load Google Maps API"));
      };
      document.head.appendChild(scriptElement);
    });
  };

  const initializePlaceAutocomplete = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      setError("Google Maps Places library not available.");
      console.error("Google Maps Places library not available.");
      setIsLoading(false);
      return;
    }
    
    if (!autocompleteContainerRef) {
      setError("Autocomplete container not found.");
      console.error("Autocomplete container not found.");
      setIsLoading(false);
      return;
    }

    try {
      // Clear any existing autocomplete elements to prevent duplicates
      if (autocompleteContainerRef.firstChild) {
        autocompleteContainerRef.innerHTML = "";
      }

      // Create the PlaceAutocompleteElement (web component)
      const placeAutocomplete = new (google.maps.places as any).PlaceAutocompleteElement();

      // Set custom attributes
      placeAutocomplete.setAttribute("data-keyboard-scroll", "true");
      if (props.placeholder) {
        placeAutocomplete.setAttribute("placeholder", props.placeholder);
      }

      // Append it to our container div
      autocompleteContainerRef.appendChild(placeAutocomplete);

      // Add the gmp-select listener
      placeAutocomplete.addEventListener("gmp-placeselect", async (event: any) => {
        const place = event.place;
        
        // Fetch place details
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
    // Add global styles for Google Place autocomplete input
    const styleId = 'gmp-place-autocomplete-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        gmp-place-autocomplete input {
          border: 1px solid rgb(209, 213, 219) !important;
          border-radius: 0.375rem !important;
          padding: 0.5rem 0.75rem !important;
          font-size: 0.875rem !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        gmp-place-autocomplete input:focus {
          outline: 2px solid rgb(59, 130, 246) !important;
          outline-offset: 2px !important;
          border-color: rgb(59, 130, 246) !important;
        }
      `;
      document.head.appendChild(style);
    }

    try {
      await loadGoogleMapsAPI();
      initializePlaceAutocomplete();
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
    <div class={`flex flex-col space-y-2 ${props.class || ""}`}>
      <Show when={error()}>
        <p class="text-sm text-red-600">{error()}</p>
      </Show>

      <div>
        <div
          ref={autocompleteContainerRef}
          class="w-full"
          style={{
            "min-height": "40px",
          }}
        />
        <Show when={isLoading()}>
          <p class="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Loading Google Places Autocomplete...
          </p>
        </Show>
      </div>
    </div>
  );
}
