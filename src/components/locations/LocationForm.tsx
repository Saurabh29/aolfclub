/**
 * LocationForm — shared form for Create and Edit location.
 * Handles slug auto-generation, Google Place population, and validation.
 */
import { createSignal, Show, type Component } from "solid-js";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { GooglePlaceSearch, type PlaceDetails } from "~/components/widgets/GooglePlaceSearch";
import type { Location, CreateLocationRequest } from "~/lib/schemas/domain";

export interface LocationFormData {
  slug: string;
  name: string;
  description: string;
  placeId: string;
  formattedAddress: string;
  lat: string;
  lng: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  countryCode: string;
  phone: string;
  email: string;
  capacity: string;
  isActive: boolean;
}

export interface LocationFormProps {
  /** Pre-fill for edit mode */
  initial?: Location;
  onSubmit: (data: CreateLocationRequest) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  serverError?: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export const LocationForm: Component<LocationFormProps> = (props) => {
  const init = props.initial;

  const [form, setForm] = createSignal<LocationFormData>({
    slug: init?.slug ?? "",
    name: init?.name ?? "",
    description: init?.description ?? "",
    placeId: init?.placeId ?? "",
    formattedAddress: init?.formattedAddress ?? "",
    lat: init?.lat != null ? String(init.lat) : "",
    lng: init?.lng != null ? String(init.lng) : "",
    address: init?.address ?? "",
    city: init?.city ?? "",
    state: init?.state ?? "",
    zipCode: init?.zipCode ?? "",
    country: init?.country ?? "",
    countryCode: init?.countryCode ?? "",
    phone: init?.phone ?? "",
    email: init?.email ?? "",
    capacity: init?.capacity != null ? String(init.capacity) : "",
    isActive: init?.isActive ?? true,
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = createSignal(!!init?.slug);
  const [errors, setErrors] = createSignal<Partial<Record<keyof LocationFormData, string>>>({});

  const set = (field: keyof LocationFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleNameChange = (name: string) => {
    set("name", name);
    if (!slugManuallyEdited()) {
      set("slug", toSlug(name));
    }
  };

  const handlePlaceSelect = (place: PlaceDetails) => {
    const ac = place.addressComponents;
    setForm((prev) => ({
      ...prev,
      placeId: place.placeId,
      formattedAddress: place.formattedAddress,
      lat: String(place.lat),
      lng: String(place.lng),
      address: ac?.streetNumber && ac?.route
        ? `${ac.streetNumber} ${ac.route}`
        : prev.address,
      city: ac?.city ?? prev.city,
      state: ac?.state ?? prev.state,
      zipCode: ac?.postalCode ?? prev.zipCode,
      country: ac?.country ?? prev.country,
      countryCode: ac?.countryCode ?? prev.countryCode,
    }));
  };

  const validate = (): boolean => {
    const f = form();
    const errs: Partial<Record<keyof LocationFormData, string>> = {};
    if (!f.name.trim()) errs.name = "Name is required";
    if (!f.slug.trim()) errs.slug = "Slug is required";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug))
      errs.slug = "Lowercase letters, numbers and hyphens only";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      errs.email = "Invalid email address";
    if (f.capacity && (isNaN(Number(f.capacity)) || Number(f.capacity) <= 0))
      errs.capacity = "Must be a positive number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const f = form();
    const payload: CreateLocationRequest = {
      slug: f.slug,
      name: f.name,
      description: f.description || undefined,
      placeId: f.placeId || undefined,
      formattedAddress: f.formattedAddress || undefined,
      lat: f.lat ? parseFloat(f.lat) : undefined,
      lng: f.lng ? parseFloat(f.lng) : undefined,
      address: f.address || undefined,
      city: f.city || undefined,
      state: f.state || undefined,
      zipCode: f.zipCode || undefined,
      country: f.country || undefined,
      countryCode: f.countryCode || undefined,
      phone: f.phone || undefined,
      email: f.email || undefined,
      capacity: f.capacity ? parseInt(f.capacity) : undefined,
      isActive: f.isActive,
    };
    await props.onSubmit(payload);
  };

  const inputClass = (field: keyof LocationFormData) =>
    `w-full text-sm p-2 rounded-md border bg-background ${errors()[field] ? "border-destructive" : "border-input"}`;
  const labelClass = "text-sm font-medium block mb-1";

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {props.serverError && (
        <div class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {props.serverError}
        </div>
      )}

      {/* ── Section 1: Identity ── */}
      <Card class="p-5 space-y-4">
        <h2 class="font-semibold text-base border-b pb-2">🏷️ Identity</h2>

        {/* Name */}
        <div>
          <label class={labelClass}>Centre Name <span class="text-destructive">*</span></label>
          <input
            type="text"
            value={form().name}
            onInput={(e) => handleNameChange(e.currentTarget.value)}
            placeholder="e.g. Bangalore South Centre"
            class={inputClass("name")}
          />
          <Show when={errors().name}><p class="text-destructive text-xs mt-1">{errors().name}</p></Show>
        </div>

        {/* Slug */}
        <div>
          <label class={labelClass}>URL Slug <span class="text-destructive">*</span></label>
          <input
            type="text"
            value={form().slug}
            onInput={(e) => {
              setSlugManuallyEdited(true);
              set("slug", e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="bangalore-south"
            class={inputClass("slug")}
          />
          <Show when={form().slug}>
            <p class="text-xs text-muted-foreground mt-1 font-mono">/locations/{form().slug}</p>
          </Show>
          <Show when={errors().slug}><p class="text-destructive text-xs mt-1">{errors().slug}</p></Show>
        </div>

        {/* Description */}
        <div>
          <label class={labelClass}>Description</label>
          <textarea
            value={form().description}
            onInput={(e) => set("description", e.currentTarget.value)}
            placeholder="Briefly describe this centre and the programs it runs…"
            rows={2}
            class={`${inputClass("description")} resize-y`}
          />
        </div>

        {/* Active toggle */}
        <div class="flex items-center gap-3">
          <label class="text-sm font-medium">Status:</label>
          <button
            type="button"
            onClick={() => set("isActive", !form().isActive)}
            class={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              form().isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-input"
            }`}
          >
            {form().isActive ? "✅ Active" : "⏸ Inactive"}
          </button>
        </div>
      </Card>

      {/* ── Section 2: Location ── */}
      <Card class="p-5 space-y-4">
        <h2 class="font-semibold text-base border-b pb-2">📍 Location</h2>

        {/* Google Place Search */}
        <div>
          <label class={labelClass}>Search Location</label>
          <GooglePlaceSearch
            onPlaceSelect={handlePlaceSelect}
            onClear={() =>
              setForm((prev) => ({
                ...prev,
                placeId: "",
                formattedAddress: "",
                lat: "",
                lng: "",
              }))
            }
            placeholder="Search for the centre address…"
            initialValue={form().formattedAddress}
          />
          <Show when={form().formattedAddress}>
            <div class="mt-2 flex items-start gap-2 bg-muted/50 p-2 rounded-md text-sm">
              <span>📌</span>
              <span class="text-muted-foreground">{form().formattedAddress}</span>
              <Show when={form().lat && form().lng}>
                <Badge variant="outline" class="ml-auto text-xs flex-shrink-0">
                  {parseFloat(form().lat).toFixed(4)}, {parseFloat(form().lng).toFixed(4)}
                </Badge>
              </Show>
            </div>
          </Show>
        </div>

        {/* Address fields (editable, auto-filled) */}
        <div>
          <label class={labelClass}>Street Address</label>
          <input
            type="text"
            value={form().address}
            onInput={(e) => set("address", e.currentTarget.value)}
            placeholder="Street address"
            class={inputClass("address")}
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class={labelClass}>City</label>
            <input type="text" value={form().city} onInput={(e) => set("city", e.currentTarget.value)} placeholder="City" class={inputClass("city")} />
          </div>
          <div>
            <label class={labelClass}>State / Province</label>
            <input type="text" value={form().state} onInput={(e) => set("state", e.currentTarget.value)} placeholder="State" class={inputClass("state")} />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class={labelClass}>Postal Code</label>
            <input type="text" value={form().zipCode} onInput={(e) => set("zipCode", e.currentTarget.value)} placeholder="Postal code" class={inputClass("zipCode")} />
          </div>
          <div>
            <label class={labelClass}>Country</label>
            <input type="text" value={form().country} onInput={(e) => set("country", e.currentTarget.value)} placeholder="Country" class={inputClass("country")} />
          </div>
        </div>
      </Card>

      {/* ── Section 3: Contact & Operations ── */}
      <Card class="p-5 space-y-4">
        <h2 class="font-semibold text-base border-b pb-2">📞 Contact &amp; Operations</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class={labelClass}>Phone</label>
            <input
              type="tel"
              value={form().phone}
              onInput={(e) => set("phone", e.currentTarget.value)}
              placeholder="+91 80 1234 5678"
              class={inputClass("phone")}
            />
          </div>
          <div>
            <label class={labelClass}>Email</label>
            <input
              type="email"
              value={form().email}
              onInput={(e) => set("email", e.currentTarget.value)}
              placeholder="centre@example.org"
              class={inputClass("email")}
            />
            <Show when={errors().email}><p class="text-destructive text-xs mt-1">{errors().email}</p></Show>
          </div>
        </div>

        <div class="max-w-xs">
          <label class={labelClass}>Capacity (members)</label>
          <input
            type="number"
            value={form().capacity}
            onInput={(e) => set("capacity", e.currentTarget.value)}
            placeholder="e.g. 120"
            min={1}
            class={inputClass("capacity")}
          />
          <Show when={errors().capacity}><p class="text-destructive text-xs mt-1">{errors().capacity}</p></Show>
        </div>
      </Card>

      {/* Submit bar */}
      <div class="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={props.isSubmitting}>
          {props.isSubmitting ? "Saving…" : (props.submitLabel ?? "Save Location")}
        </Button>
      </div>
    </form>
  );
};
