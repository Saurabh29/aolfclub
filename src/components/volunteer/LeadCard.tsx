import { Show, createSignal, type Component } from "solid-js";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { User, Task } from "~/lib/schemas/domain";
import { formatFollowUpDate, formatRelativeTime } from "~/lib/utils/lead-status";

export interface LeadCardProps {
  /** Lead/member to display */
  lead: User;
  /** Associated task (optional - shown when viewing all tasks) */
  task?: Task;
  /** Show task badge even in single task view */
  showTaskBadge?: boolean;
  /** Callback when call button clicked */
  onCall: (lead: User) => void;
  /** Callback when WhatsApp button clicked */
  onWhatsApp: (lead: User) => void;
  /** Callback when card is expanded */
  onExpand?: (lead: User) => void;
  /** Callback when notes are updated */
  onUpdateNotes?: (lead: User, notes: string) => void;
  /** Callback when follow-up date is rescheduled */
  onReschedule?: (lead: User, date: string) => void;
}

/**
 * Lead Card Component
 * Displays lead info with call/WhatsApp actions
 */
export const LeadCard: Component<LeadCardProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [notes, setNotes] = createSignal(props.lead.lastNotes || "");
  const [followUpDate, setFollowUpDate] = createSignal(
    props.lead.nextFollowUpDate 
      ? new Date(props.lead.nextFollowUpDate).toISOString().split('T')[0]
      : ""
  );

  const interestStars = () => {
    const level = props.lead.lastInterestLevel;
    if (!level) return 0;
    
    switch (level) {
      case "High": return 5;
      case "Medium": return 3;
      case "Low": return 2;
      case "Not_Interested": return 1;
      default: return 0;
    }
  };

  const displayStars = () => {
    const count = interestStars();
    return Array(5)
      .fill(0)
      .map((_, i) => (i < count ? "⭐" : "☆"))
      .join("");
  };

  const displayPrograms = () => {
    const programs = props.lead.interestedPrograms;
    if (programs.length === 0) return "No programs selected";
    if (programs.length <= 2) return programs.join(", ");
    return `${programs.slice(0, 2).join(", ")} +${programs.length - 2} more`;
  };

  const handleToggleExpand = () => {
    const newState = !isExpanded();
    setIsExpanded(newState);
    if (newState && props.onExpand) {
      props.onExpand(props.lead);
    }
  };

  return (
    <Card
      class="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleToggleExpand}
    >
      {/* Compact View */}
      <Show when={!isExpanded()}>
        <div class="space-y-2">
          {/* Header: Name + Stars */}
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold text-base">{props.lead.displayName}</h3>
            <span class="text-lg leading-none" aria-label={`Interest: ${interestStars()} stars`}>
              {displayStars()}
            </span>
          </div>

          {/* Task Badge (if shown) */}
          <Show when={props.showTaskBadge && props.task}>
            <div class="flex items-center gap-1 text-sm text-muted-foreground">
              <span>📋</span>
              <span>{props.task!.name}</span>
            </div>
          </Show>

          {/* Programs */}
          <div class="flex items-start gap-1 text-sm">
            <span class="flex-shrink-0">🎓</span>
            <span class="text-muted-foreground">{displayPrograms()}</span>
          </div>

          {/* Follow-up Time */}
          <Show when={props.lead.nextFollowUpDate}>
            <div class="flex items-center gap-1 text-sm">
              <span>⏰</span>
              <span class="text-muted-foreground">
                {formatFollowUpDate(props.lead.nextFollowUpDate!)}
              </span>
            </div>
          </Show>

          {/* Last Notes */}
          <Show when={props.lead.lastNotes}>
            <div class="flex items-start gap-1 text-sm">
              <span class="flex-shrink-0">💬</span>
              <span class="text-muted-foreground line-clamp-1">
                "{props.lead.lastNotes}"
              </span>
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => props.onCall(props.lead)}
              class="flex-1"
            >
              📞 Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.onWhatsApp(props.lead)}
              class="flex-1"
            >
              💬 WhatsApp
            </Button>
          </div>
        </div>
      </Show>

      {/* Expanded View */}
      <Show when={isExpanded()}>
        <div class="space-y-4">
          {/* Close Button */}
          <div class="flex items-start justify-between">
            <h3 class="font-semibold text-lg">{props.lead.displayName}</h3>
            <div class="flex items-center gap-2">
              <span class="text-xl">{displayStars()}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                class="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Interested Programs */}
          <div>
            <div class="text-sm font-medium mb-1">🎓 Interested Programs:</div>
            <Show
              when={props.lead.interestedPrograms.length > 0}
              fallback={<div class="text-sm text-muted-foreground ml-4">None listed</div>}
            >
              <ul class="text-sm text-muted-foreground ml-4 list-disc space-y-1">
                {props.lead.interestedPrograms.map((program) => (
                  <li>{program}</li>
                ))}
              </ul>
            </Show>
          </div>

          {/* Completed Programs */}
          <Show when={props.lead.programsDone.length > 0}>
            <div>
              <div class="text-sm font-medium mb-1">📚 Completed Programs:</div>
              <ul class="text-sm text-muted-foreground ml-4 list-disc space-y-1">
                {props.lead.programsDone.map((program) => (
                  <li>{program}</li>
                ))}
              </ul>
            </div>
          </Show>

          {/* Member Since */}
          <Show when={props.lead.memberSince}>
            <div class="text-sm">
              <span class="font-medium">📅 Member Since:</span>{" "}
              <span class="text-muted-foreground">
                {new Date(props.lead.memberSince!).toLocaleDateString()}
              </span>
            </div>
          </Show>

          {/* Last Called */}
          <Show when={props.lead.lastCallDate}>
            <div class="text-sm">
              <span class="font-medium">📞 Last Called:</span>{" "}
              <span class="text-muted-foreground">
                {formatRelativeTime(props.lead.lastCallDate!)}
              </span>
            </div>
          </Show>

          {/* Last Notes */}
          <Show when={props.lead.lastNotes}>
            <div>
              <div class="text-sm font-medium mb-1">📝 Last Notes:</div>
              <div class="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {props.lead.lastNotes}
              </div>
            </div>
          </Show>

          {/* Editable Notes */}
          <div>
            <div class="text-sm font-medium mb-1">📝 Notes:</div>
            <textarea
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
              onBlur={() => {
                if (notes() !== props.lead.lastNotes && props.onUpdateNotes) {
                  props.onUpdateNotes(props.lead, notes());
                }
              }}
              onClick={(e) => e.stopPropagation()}
              class="w-full min-h-[80px] text-sm p-3 rounded-md border border-input bg-background resize-y"
              placeholder="Add notes about this member..."
            />
          </div>

          {/* Next Follow-up Reschedule */}
          <div>
            <label class="text-sm font-medium mb-1 block">⏰ Next Follow-up:</label>
            <input
              type="date"
              value={followUpDate()}
              onInput={(e) => setFollowUpDate(e.currentTarget.value)}
              onBlur={() => {
                const currentDate = props.lead.nextFollowUpDate 
                  ? new Date(props.lead.nextFollowUpDate).toISOString().split('T')[0]
                  : "";
                if (followUpDate() !== currentDate && props.onReschedule) {
                  props.onReschedule(props.lead, followUpDate());
                }
              }}
              onClick={(e) => e.stopPropagation()}
              class="w-full text-sm p-2 rounded-md border border-input bg-background"
            />
          </div>

          {/* Task Info */}
          <Show when={props.task}>
            <div class="border-t pt-3 space-y-2">
              <div class="text-sm">
                <span class="font-medium">🎯 Task:</span>{" "}
                <span class="text-muted-foreground">{props.task!.name}</span>
              </div>
              <Show when={props.task!.objective}>
                <div class="text-sm">
                  <span class="font-medium">📌 Objective:</span>{" "}
                  <div class="text-muted-foreground bg-muted p-2 rounded-md mt-1">
                    {props.task!.objective}
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="grid grid-cols-2 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Button onClick={() => props.onCall(props.lead)} class="w-full">
              📞 Call Now
            </Button>
            <Button
              variant="outline"
              onClick={() => props.onWhatsApp(props.lead)}
              class="w-full"
            >
              💬 Send WhatsApp
            </Button>
          </div>
        </div>
      </Show>
    </Card>
  );
};
