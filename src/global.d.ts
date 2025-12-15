/// <reference types="@solidjs/start/env" />

// Google Maps API type declarations
declare namespace google {
  namespace maps {
    namespace places {
      // Prediction types
      interface PlacePrediction {
        description: string;
        place_id: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
          main_text_matched_substrings?: Array<{
            offset: number;
            length: number;
          }>;
        };
        types: string[];
        terms?: Array<{
          offset: number;
          value: string;
        }>;
      }

      // Place result types
      interface PlaceResult {
        formatted_address?: string;
        name?: string;
        geometry?: PlaceGeometry;
        place_id?: string;
        types?: string[];
        address_components?: AddressComponent[];
      }

      interface PlaceGeometry {
        location: LatLng;
        viewport?: LatLngBounds;
      }

      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      interface LatLng {
        lat(): number;
        lng(): number;
      }

      interface LatLngBounds {
        getNorthEast(): LatLng;
        getSouthWest(): LatLng;
      }

      // Request types
      interface AutocompletionRequest {
        input: string;
        bounds?: LatLngBounds;
        componentRestrictions?: ComponentRestrictions;
        location?: LatLng;
        offset?: number;
        radius?: number;
        types?: string[];
      }

      interface ComponentRestrictions {
        country: string | string[];
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
        language?: string;
        region?: string;
        sessionToken?: AutocompleteSessionToken;
      }

      // Service classes
      class AutocompleteService {
        getPlacePredictions(
          request: AutocompletionRequest,
          callback: (
            predictions: PlacePrediction[] | null,
            status: PlacesServiceStatus,
          ) => void,
        ): void;
      }

      class PlacesService {
        constructor(attrContainer: HTMLDivElement | HTMLElement);

        getDetails(
          request: PlaceDetailsRequest,
          callback: (
            place: PlaceResult | null,
            status: PlacesServiceStatus,
          ) => void,
        ): void;
      }

      class AutocompleteSessionToken {}

      // Status enum
      enum PlacesServiceStatus {
        OK = "OK",
        ZERO_RESULTS = "ZERO_RESULTS",
        INVALID_REQUEST = "INVALID_REQUEST",
        OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
        REQUEST_DENIED = "REQUEST_DENIED",
        UNKNOWN_ERROR = "UNKNOWN_ERROR",
        NOT_FOUND = "NOT_FOUND",
      }
    }
  }
}
