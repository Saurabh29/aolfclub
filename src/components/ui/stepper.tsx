import { createSignal, For, Show, type Component } from "solid-js";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowSkip?: boolean;
}

/**
 * Stepper Component - Visual progress indicator for multi-step processes
 */
export const Stepper: Component<StepperProps> = (props) => {
  const canClickStep = (index: number) => {
    if (!props.allowSkip) {
      // Can only go back to previous steps
      return index < props.currentStep;
    }
    return true;
  };

  const getStepStatus = (index: number): "completed" | "current" | "upcoming" => {
    if (index < props.currentStep) return "completed";
    if (index === props.currentStep) return "current";
    return "upcoming";
  };

  return (
    <nav aria-label="Progress">
      <ol role="list" class="flex items-center">
        <For each={props.steps}>
          {(step, index) => {
            const status = () => getStepStatus(index());
            const isClickable = () => props.onStepClick && canClickStep(index());

            return (
              <>
                <li class="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => isClickable() && props.onStepClick?.(index())}
                    disabled={!isClickable()}
                    class={`group flex items-center ${
                      isClickable() ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span class="flex items-center px-6 py-4 text-sm font-medium">
                      <span
                        class={`
                          flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors
                          ${
                            status() === "completed"
                              ? "bg-primary text-primary-foreground"
                              : status() === "current"
                              ? "border-2 border-primary bg-background text-primary"
                              : "border-2 border-muted bg-background text-muted-foreground"
                          }
                          ${isClickable() ? "group-hover:bg-primary/80" : ""}
                        `}
                      >
                        <Show
                          when={status() === "completed"}
                          fallback={<span>{index() + 1}</span>}
                        >
                          <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fill-rule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </Show>
                      </span>
                      <span class="ml-4 text-sm font-medium">
                        <span
                          class={
                            status() === "current"
                              ? "text-primary"
                              : status() === "completed"
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {step.label}
                        </span>
                        <Show when={step.description}>
                          <span class="block text-xs text-muted-foreground mt-1">
                            {step.description}
                          </span>
                        </Show>
                      </span>
                    </span>
                  </button>
                </li>
                <Show when={index() < props.steps.length - 1}>
                  <li class="flex-1">
                    <div class="flex items-center">
                      <div
                        class={`h-0.5 w-full transition-colors ${
                          index() < props.currentStep ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    </div>
                  </li>
                </Show>
              </>
            );
          }}
        </For>
      </ol>
    </nav>
  );
};
