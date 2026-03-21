import { createSignal, Show, Suspense } from "solid-js";
import { useNavigate, useParams, useAction, createAsync, type RouteDefinition } from "@solidjs/router";
import { LocationForm } from "~/components/locations/LocationForm";
import { getLocationByIdQuery, updateLocationAction } from "~/server/api";
import type { CreateLocationRequest } from "~/lib/schemas/domain";

export const route = {
  preload: (args) => getLocationByIdQuery((args.params as { id: string }).id),
} satisfies RouteDefinition;

export default function EditLocationPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateLocation = useAction(updateLocationAction);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [serverError, setServerError] = createSignal<string | undefined>();

  const locationData = createAsync(() => getLocationByIdQuery(params.id), { deferStream: true });

  const handleSubmit = async (data: CreateLocationRequest) => {
    setIsSubmitting(true);
    setServerError(undefined);
    try {
      const result = await updateLocation(params.id, data);
      if (!result.success) {
        setServerError(result.error ?? "Failed to update location");
        return;
      }
      navigate("/locations");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="container mx-auto p-4 sm:p-8 max-w-2xl">
      <div class="mb-6">
        <a href="/locations" class="text-sm text-muted-foreground hover:text-foreground">← Back to Locations</a>
        <h1 class="text-2xl font-bold mt-2">✏️ Edit Location</h1>
        <Show when={locationData()}>
          <p class="text-muted-foreground text-sm mt-1">{locationData()!.name}</p>
        </Show>
      </div>

      <Suspense fallback={<div class="text-muted-foreground text-sm">Loading…</div>}>
        <Show when={locationData()} fallback={<div class="text-destructive text-sm">Location not found.</div>}>
          <LocationForm
            initial={locationData()!}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/locations")}
            submitLabel="Save Changes"
            isSubmitting={isSubmitting()}
            serverError={serverError()}
          />
        </Show>
      </Suspense>
    </main>
  );
}
