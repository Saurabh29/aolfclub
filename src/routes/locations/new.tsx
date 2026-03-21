import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { LocationForm } from "~/components/locations/LocationForm";
import { createLocationMutation } from "~/server/api";
import type { CreateLocationRequest } from "~/lib/schemas/domain";

export default function NewLocationPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [serverError, setServerError] = createSignal<string | undefined>();

  const handleSubmit = async (data: CreateLocationRequest) => {
    setIsSubmitting(true);
    setServerError(undefined);
    try {
      await createLocationMutation(data);
      navigate("/locations");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="container mx-auto p-4 sm:p-8 max-w-2xl">
      {/* Header */}
      <div class="mb-6">
        <a href="/locations" class="text-sm text-muted-foreground hover:text-foreground">← Back to Locations</a>
        <h1 class="text-2xl font-bold mt-2">📍 Add New Location</h1>
        <p class="text-muted-foreground text-sm mt-1">Create a new NGO centre or chapter</p>
      </div>

      <LocationForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/locations")}
        submitLabel="Create Location"
        isSubmitting={isSubmitting()}
        serverError={serverError()}
      />
    </main>
  );
}
