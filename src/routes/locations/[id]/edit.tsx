import { createResource, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { LocationForm } from "~/components/locations/LocationForm";
import { getLocationByIdQuery, updateLocationMutation } from "~/server/api";
import type { CreateLocationRequest } from "~/lib/schemas/domain";

export default function EditLocationPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [serverError, setServerError] = createSignal<string | undefined>();

  const [locationData] = createResource(() => params.id, getLocationByIdQuery);

  const handleSubmit = async (data: CreateLocationRequest) => {
    setIsSubmitting(true);
    setServerError(undefined);
    try {
      await updateLocationMutation(params.id, data);
      navigate("/locations");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to update location");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="container mx-auto p-4 sm:p-8 max-w-2xl">
      {/* Header */}
      <div class="mb-6">
        <a href="/locations" class="text-sm text-muted-foreground hover:text-foreground">← Back to Locations</a>
        <h1 class="text-2xl font-bold mt-2">✏️ Edit Location</h1>
        <Show when={locationData()}>
          <p class="text-muted-foreground text-sm mt-1">{locationData()!.name}</p>
        </Show>
      </div>

      <Show when={locationData.loading}>
        <div class="text-muted-foreground text-sm">Loading…</div>
      </Show>

      <Show when={locationData.error}>
        <div class="text-destructive text-sm">Failed to load location.</div>
      </Show>

      <Show when={locationData() && !locationData.loading}>
        <LocationForm
          initial={locationData()!}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/locations")}
          submitLabel="Save Changes"
          isSubmitting={isSubmitting()}
          serverError={serverError()}
        />
      </Show>
    </main>
  );
}
