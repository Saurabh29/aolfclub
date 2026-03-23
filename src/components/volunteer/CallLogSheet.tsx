import { createSignal, Show, For, type Component } from "solid-js";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { Lead, Task, InterestLevel } from "~/lib/schemas/domain";

export interface CallLogData {
  outcome: "answered" | "no_answer" | "busy" | "invalid" | "skip";
  interestLevel?: InterestLevel;
  notes: string;
  followUpDate?: string;
  markComplete: boolean;
}

export interface CallLogSheetProps {
  /** Lead being called */
  lead: Lead;
  /** Associated task for context */
  task?: Task;
  /** Whether sheet is visible */
  isOpen: boolean;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Callback when call log is saved */
  onSave: (data: CallLogData) => void;
}

const QUICK_TEMPLATES = [
  { label: "Interested", text: "Interested in [program]. Will send details." },
  { label: "Not Now", text: "Not interested at this time. No follow-up needed." },
  { label: "Wrong #", text: "Wrong number / Do not call." },
];

const FOLLOW_UP_PRESETS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "1 Week", days: 7 },
];

/**
 * Call Log Bottom Sheet
 * Slides up after call to capture outcome, notes, and follow-up
 */
export const CallLogSheet: Component<CallLogSheetProps> = (props) => {
  const [outcome, setOutcome] = createSignal<CallLogData["outcome"]>("answered");
  const [interestLevel, setInterestLevel] = createSignal<number>(0);
  const [notes, setNotes] = createSignal("");
  const [followUpDate, setFollowUpDate] = createSignal<string>("");
  const [markComplete, setMarkComplete] = createSignal(false);

  const applyTemplate = (template: string) => {
    setNotes(template);
  };

  const setPresetFollowUp = (days: number) => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    future.setHours(10, 0, 0, 0); // Default to 10 AM
    setFollowUpDate(future.toISOString().slice(0, 16)); // Format for datetime-local
  };

  const handleSave = () => {
    const data: CallLogData = {
      outcome: outcome(),
      notes: notes(),
      markComplete: markComplete() || outcome() === "invalid",
    };

    // Add interest level if answered
    if (outcome() === "answered" && interestLevel() > 0) {
      const levels: InterestLevel[] = ["Not_Interested", "Low", "Low", "Medium", "High", "High"];
      data.interestLevel = levels[interestLevel()];
    }

    // Add follow-up if set
    if (followUpDate() && !markComplete()) {
      data.followUpDate = new Date(followUpDate()).toISOString();
    }

    props.onSave(data);
    resetForm();
  };

  const handleSkip = () => {
    props.onClose();
    resetForm();
  };

  const resetForm = () => {
    setOutcome("answered");
    setInterestLevel(0);
    setNotes("");
    setFollowUpDate("");
    setMarkComplete(false);
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
        <Card class="w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          {/* Drag Handle */}
          <div class="flex justify-center pt-2 pb-1 sm:hidden">
            <div class="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          <div class="p-6 space-y-4">
            {/* Header */}
            <div>
              <h3 class="text-lg font-semibold">Log Call: {props.lead.displayName}</h3>
              <Show when={props.task}>
                <p class="text-sm text-muted-foreground">📋 Task: {props.task!.name}</p>
              </Show>
            </div>

            {/* Call Outcome */}
            <div class="space-y-2">
              <label class="text-sm font-medium">📞 Call Outcome:</label>
              <div class="space-y-2">
                <For each={[
                  { value: "answered", label: "Answered" },
                  { value: "no_answer", label: "No Answer" },
                  { value: "busy", label: "Busy / Voicemail" },
                  { value: "invalid", label: "Invalid Number" },
                  { value: "skip", label: "Skip Logging" },
                ] as const}>
                  {(option) => (
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="outcome"
                        value={option.value}
                        checked={outcome() === option.value}
                        onChange={() => setOutcome(option.value)}
                        class="w-4 h-4"
                      />
                      <span class="text-sm">{option.label}</span>
                    </label>
                  )}
                </For>
              </div>
            </div>

            {/* Interest Level (only if answered) */}
            <Show when={outcome() === "answered"}>
              <div class="space-y-2">
                <label class="text-sm font-medium">⭐ Interest Level:</label>
                <div class="flex gap-1">
                  <For each={[1, 2, 3, 4, 5]}>
                    {(star) => (
                      <button
                        type="button"
                        onClick={() => setInterestLevel(star)}
                        class="text-3xl transition-transform hover:scale-110"
                        aria-label={`${star} stars`}
                      >
                        {star <= interestLevel() ? "⭐" : "☆"}
                      </button>
                    )}
                  </For>
                </div>
                <p class="text-xs text-muted-foreground">Tap stars to rate 1-5</p>
              </div>
            </Show>

            {/* Notes */}
            <div class="space-y-2">
              <label class="text-sm font-medium">📝 Notes:</label>
              <textarea
                value={notes()}
                onInput={(e) => setNotes(e.target.value)}
                placeholder="Type notes here..."
                rows={3}
                class="w-full p-2 border rounded-md resize-none"
              />
              
              {/* Quick Templates */}
              <div class="flex flex-wrap gap-2">
                <For each={QUICK_TEMPLATES}>
                  {(template) => (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template.text)}
                    >
                      {template.label}
                    </Button>
                  )}
                </For>
              </div>
            </div>

            {/* Schedule Follow-up */}
            <Show when={outcome() !== "skip" && outcome() !== "invalid"}>
              <div class="space-y-2">
                <label class="text-sm font-medium">⏰ Schedule Follow-up:</label>
                
                {/* Preset Buttons */}
                <div class="flex flex-wrap gap-2">
                  <For each={FOLLOW_UP_PRESETS}>
                    {(preset) => (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPresetFollowUp(preset.days)}
                      >
                        {preset.label}
                      </Button>
                    )}
                  </For>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMarkComplete(!markComplete())}
                    class={markComplete() ? "bg-green-100 border-green-500" : ""}
                  >
                    ✅ Mark Complete
                  </Button>
                </div>

                {/* Custom Date Picker */}
                <Show when={!markComplete()}>
                  <input
                    type="datetime-local"
                    value={followUpDate()}
                    onInput={(e) => setFollowUpDate(e.target.value)}
                    class="w-full p-2 border rounded-md"
                  />
                </Show>
              </div>
            </Show>

            {/* Auto-complete message for invalid number */}
            <Show when={outcome() === "invalid"}>
              <div class="p-3 bg-yellow-100 border border-yellow-500 rounded-md text-sm">
                ⚠️ Invalid number will automatically mark this lead as complete.
              </div>
            </Show>

            {/* Action Buttons */}
            <div class="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                class="flex-1"
              >
                Skip
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={outcome() !== "skip" && notes().trim() === ""}
                class="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Show>
  );
};
