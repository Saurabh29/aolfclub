import { createSignal } from "solid-js";
import { useNavigate, useAction, type RouteDefinition } from "@solidjs/router";
import { LocationForm } from "~/components/locations/LocationForm";
import { createLocationAction } from "~/server/api";
import type { CreateLocationRequest } from "~/lib/schemas/domain";

// Empty preload signals Solid Router to eagerly load this route's JS module
// on hover over any <A href="/locations/new"> link, before the click lands.
export const route = {
  preload: () => {},
} satisfies RouteDefinition;

export default function NewLocationPage() {
  const navigate = useNavigate();
  const createLocation = useAction(createLocationAction);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [serverError, setServerError] = createSignal<string | undefined>();

  const handleSubmit = async (data: CreateLocationRequest) => {
    setIsSubmitting(true);
    setServerError(undefined);
    try {
      const result = await createLocation(data);
      if (!result.success) {
        setServerError(result.error ?? "Failed to create location");
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

