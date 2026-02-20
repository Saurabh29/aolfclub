/**
 * Google Places Autocomplete Component
 * Uses solid-ui Combobox with Google Places API
 * * Optimized for @googlemaps/js-api-loader v2.0.2
 * Uses the functional API: setOptions() and importLibrary()
 */

import { createSignal, onMount, type Component, Show } from "solid-js";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { cn } from "~/lib/utils";
import { Search, X } from "lucide-solid";
import {
	Combobox,
	ComboboxControl,
	ComboboxInput,
	ComboboxContent,
	ComboboxItem,
	ComboboxItemLabel,
} from "~/components/ui/combobox";

// Types remain consistent with your existing schema
export interface PlaceDetails {
	placeId: string;
	formattedAddress: string;
	lat: number;
	lng: number;
	addressComponents?: {
		streetNumber?: string;
		route?: string;
		city?: string;
		state?: string;
		stateCode?: string;
		postalCode?: string;
		country?: string;
		countryCode?: string;
	};
}

export interface GooglePlaceSearchProps {
	onPlaceSelect: (place: PlaceDetails) => void;
	onClear?: () => void;
	placeholder?: string;
	class?: string;
	disabled?: boolean;
	initialValue?: string;
}

/**
 * Extracts structured address data from the Google Place object.
 */
function extractAddressComponents(
	place: google.maps.places.Place
): PlaceDetails["addressComponents"] {
	const components = place.addressComponents;
	if (!components) return undefined;

	const componentMap = new Map(
		components.flatMap((c) => c.types.map((t) => [t, c]))
	);

	const get = (key: string) => componentMap.get(key)?.longText ?? undefined;
	const getShort = (key: string) => componentMap.get(key)?.shortText ?? undefined;

	const result: PlaceDetails["addressComponents"] = {
		streetNumber: get("street_number"),
		route: get("route"),
		city: get("locality"),
		state: get("administrative_area_level_1"),
		stateCode: getShort("administrative_area_level_1"),
		postalCode: get("postal_code"),
		country: get("country"),
		countryCode: getShort("country"),
	};

	return Object.values(result).some((v) => v !== undefined)
		? result
		: undefined;
}

export const GooglePlaceSearch: Component<GooglePlaceSearchProps> = (props) => {
	const [placePredictions, setPlacePredictions] = createSignal<{ value: string; label: string; suggestion: any }[]>([]);
	const [selectedOption, setSelectedOption] = createSignal<{ value: string; label: string; suggestion: any } | null>(null);
	const [inputValue, setInputValue] = createSignal(props.initialValue || "");
	const [isLoading, setIsLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);

	onMount(async () => {
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			setError("VITE_GOOGLE_MAPS_API_KEY is missing.");
			setIsLoading(false);
			return;
		}

		try {
			// Use a single config object for the loader
			setOptions({ key: apiKey, v: "weekly" });

			// Import the places library
			await importLibrary("places");

			setIsLoading(false);
		} catch (err) {
			console.error("Google Places API Error:", err);
			setError("Failed to load Google Places service.");
			setIsLoading(false);
		}
	});

	const handleInputChange = async (value: string) => {
		setInputValue(value);

		if (!value.trim()) {
			setPlacePredictions([]);
			props.onClear?.();
			return;
		}

		try {
			// Fetch suggestions using the new AutocompleteSuggestion API
			const request = { input: value };
			const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

			if (suggestions && suggestions.length > 0) {
				setPlacePredictions(
					suggestions.map((suggestion) => ({
						value: suggestion.placePrediction?.placeId || "",
						label: suggestion.placePrediction?.text?.toString() || "",
						suggestion: suggestion,
					}))
				);
			} else {
				setPlacePredictions([]);
			}
		} catch (err) {
			console.error("Autocomplete suggestions failed:", err);
			setPlacePredictions([]);
		}
	};

	const handleSelectionChange = async (option: { value: string; label: string; suggestion: any } | null) => {
		if (!option) {
			setInputValue("");
			return;
		}

		setSelectedOption(option);
		setInputValue(option.label);

		try {
			// Convert suggestion to Place and fetch details
			const place = option.suggestion.placePrediction?.toPlace();

			if (!place) {
				console.error("Could not convert suggestion to place");
				return;
			}

			// Fetch place details using the new Place API
			await place.fetchFields({
				fields: ["id", "location", "formattedAddress", "addressComponents", "displayName"],
			});

			if (place.id && place.location) {
				props.onPlaceSelect({
					placeId: place.id,
					formattedAddress: place.formattedAddress || place.displayName || "",
					lat: place.location.lat(),
					lng: place.location.lng(),
					addressComponents: extractAddressComponents(place),
				});
				setError(null);
			} else {
				console.warn("Place is missing ID or location after fetching fields.");
			}
		} catch (err) {
			console.error("Failed to get place details:", err);
		}
	};

	const handleClear = () => {
		setInputValue("");
		setSelectedOption(null);
		setPlacePredictions([]);
		props.onClear?.();
	};

	return (
		<div class={cn("relative w-full", props.class)}>
			<Combobox<{ value: string; label: string; suggestion: any }>
				options={placePredictions()}
				value={selectedOption()}
				onInputChange={handleInputChange}
				onChange={handleSelectionChange}
				placeholder={props.placeholder || "Search for a place..."}
				optionValue="value"
				optionTextValue="label"
				defaultFilter={() => true}
				disabled={props.disabled || isLoading()}
				itemComponent={(itemProps) => (
					<ComboboxItem item={itemProps.item}>
						<ComboboxItemLabel>{itemProps.item.rawValue.label}</ComboboxItemLabel>
					</ComboboxItem>
				)}
			>
				<ComboboxControl
					class={cn(
						"flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2",
						"text-sm text-gray-900",
						"focus-within:outline-none focus-within:ring-2 focus-within:ring-gray-400 focus-within:ring-offset-2"
					)}
				>
					<div class="flex items-center gap-2 flex-1">
						<Search size={16} class="text-gray-500 flex-shrink-0" />
						<ComboboxInput value={inputValue()} onInput={(e) => setInputValue(e.currentTarget.value)}
							class="flex-1 bg-transparent outline-none py-0 placeholder:text-gray-500" />
					</div>
					<Show when={(selectedOption() || inputValue()) && !props.disabled && !isLoading()}>
						<button
							type="button"
							onClick={handleClear}
							class="text-gray-500 hover:text-gray-700 focus:outline-none flex-shrink-0"
							aria-label="Clear search"
						>
							<X size={16} />
						</button>
					</Show>
				</ComboboxControl>
				<ComboboxContent class="bg-white border border-gray-200 shadow-lg" />
			</Combobox>

			<Show when={error()}>
				<p class="mt-1 text-xs text-red-500">{error()}</p>
			</Show>

			<Show when={isLoading()}>
				<div class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-md">
					<div class="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
				</div>
			</Show>
		</div>
	);
};

export default GooglePlaceSearch;