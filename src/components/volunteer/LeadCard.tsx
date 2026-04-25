import { Show, For, createSignal, type Component } from "solid-js";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Phone, MessageCircle, GraduationCap, Clock, FileText, Target, MapPin, Star, X } from "lucide-solid";
import type { Lead, Task, InterestLevel, LeadTag } from "~/lib/schemas/domain";
import { LEAD_TAGS } from "~/lib/schemas/domain";
import { formatFollowUpDate, formatRelativeTime, getFollowUpDateColor } from "~/lib/utils/lead-status";

export interface LeadCardProps {
  lead: Lead;
  task?: Task;
  showTaskBadge?: boolean;
  onCall: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onExpand?: (lead: Lead) => void;
  onUpdateNotes?: (lead: Lead, notes: string) => void;
  onReschedule?: (lead: Lead, date: string) => void;
  onUpdateInterestLevel?: (lead: Lead, level: InterestLevel) => void;
  onUpdateTags?: (lead: Lead, tags: LeadTag[]) => void;
}

const levelToStarCount = (level: InterestLevel | undefined): number => {
  if (!level) return 0;
  switch (level) {
    case "High": return 5;
    case "Medium": return 3;
    case "Low": return 2;
    case "Not_Interested": return 1;
  }
};

const starCountToLevel = (count: number): InterestLevel | null => {
  if (count === 0) return null;
  if (count === 1) return "Not_Interested";
  if (count === 2) return "Low";
  if (count === 3) return "Medium";
  return "High";
};

export const LeadCard: Component<LeadCardProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [notes, setNotes] = createSignal(props.lead.lastNotes ?? "");
  const [followUpDate, setFollowUpDate] = createSignal(
    props.lead.nextFollowUpDate
      ? new Date(props.lead.nextFollowUpDate).toISOString().split("T")[0]
      : ""
  );
  const [localStarCount, setLocalStarCount] = createSignal(
    levelToStarCount(props.lead.lastInterestLevel)
  );
  const [localTags, setLocalTags] = createSignal<LeadTag[]>(props.lead.tags ?? []);
  const [showTagPicker, setShowTagPicker] = createSignal(false);

  const displayPrograms = () => {
    const programs = props.lead.interestedPrograms;
    if (programs.length === 0) return "No programs";
    if (programs.length <= 2) return programs.join(", ");
    return `${programs.slice(0, 2).join(", ")} +${programs.length - 2}`;
  };

  const handleToggleExpand = () => {
    const next = !isExpanded();
    setIsExpanded(next);
    if (next && props.onExpand) props.onExpand(props.lead);
  };

  const handleStarClick = (index: number, e: MouseEvent) => {
    e.stopPropagation();
    setLocalStarCount(index);
    const level = starCountToLevel(index);
    if (level && props.onUpdateInterestLevel) {
      props.onUpdateInterestLevel(props.lead, level);
    }
  };

  const handleTagToggle = (tag: LeadTag, e: MouseEvent) => {
    e.stopPropagation();
    const current = localTags();
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setLocalTags(next);
    if (props.onUpdateTags) props.onUpdateTags(props.lead, next);
  };

  const Stars = (size = "w-3.5 h-3.5") => {
    const count = localStarCount();
    return (
      <span class="flex gap-0.5 shrink-0">
        {Array(5).fill(0).map((_, i) => (
          <button
            onClick={(e) => handleStarClick(i + 1, e)}
            class="focus:outline-none"
            aria-label={`Rate ${i + 1} star${i !== 0 ? "s" : ""}`}
          >
            <Star
              class={`${size} transition-colors ${
                i < count
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40 hover:text-amber-300"
              }`}
            />
          </button>
        ))}
      </span>
    );
  };

  return (
    <Card
      class="p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleToggleExpand}
    >
      <Show when={!isExpanded()}>
        <div class="space-y-1.5">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold text-base leading-tight">{props.lead.displayName}</h3>
            <div
              class="flex items-center gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => props.onCall(props.lead)}
                class="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300 transition-colors"
                aria-label="Call"
              >
                <Phone class="w-4 h-4" />
              </button>
              <button
                onClick={() => props.onWhatsApp(props.lead)}
                class="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle class="w-4 h-4" />
              </button>
            </div>
          </div>

          <Show when={props.showTaskBadge && props.task}>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <Target class="w-3 h-3 shrink-0" />
              <span>{props.task!.name}</span>
            </div>
          </Show>

          <div class="flex items-center justify-between gap-2 text-sm">
            <div class="flex items-center gap-1 min-w-0">
              <GraduationCap class="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span class="text-muted-foreground truncate">{displayPrograms()}</span>
            </div>
            {Stars()}
          </div>

          <Show when={props.lead.nextFollowUpDate || localTags().length > 0}>
            <div class="flex items-center justify-between gap-2">
              <Show when={props.lead.nextFollowUpDate}>
                <div
                  class={`flex items-center gap-1 shrink-0 text-xs font-medium ${getFollowUpDateColor(props.lead.nextFollowUpDate)}`}
                >
                  <Clock class="w-3.5 h-3.5 shrink-0" />
                  <span>{formatFollowUpDate(props.lead.nextFollowUpDate!)}</span>
                </div>
              </Show>
              <Show when={localTags().length > 0}>
                <div class="flex items-center gap-1 flex-wrap justify-end">
                  <For each={localTags()}>
                    {(tag) => (
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground leading-none whitespace-nowrap">
                        {tag}
                      </span>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>

          <Show when={props.lead.lastNotes}>
            <p class="text-xs text-muted-foreground line-clamp-1 italic">
              "{props.lead.lastNotes}"
            </p>
          </Show>
        </div>
      </Show>

      <Show when={isExpanded()}>
        <div class="space-y-4">
          <div class="flex items-start justify-between">
            <h3 class="font-semibold text-lg leading-tight">{props.lead.displayName}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
                setShowTagPicker(false);
              }}
              class="text-muted-foreground hover:text-foreground ml-2 shrink-0"
              aria-label="Close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-1 text-sm font-medium">
                <GraduationCap class="w-3.5 h-3.5" /> Interested Programs
              </div>
              {Stars("w-4 h-4")}
            </div>
            <Show
              when={props.lead.interestedPrograms.length > 0}
              fallback={<div class="text-sm text-muted-foreground ml-4">None listed</div>}
            >
              <ul class="text-sm text-muted-foreground ml-4 list-disc space-y-0.5">
                <For each={props.lead.interestedPrograms}>
                  {(program) => <li>{program}</li>}
                </For>
              </ul>
            </Show>
          </div>

          <Show when={props.lead.lastCallDate}>
            <div class="text-sm flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              <span class="font-medium">Last Called:</span>
              <span class="text-muted-foreground">
                {formatRelativeTime(props.lead.lastCallDate!)}
              </span>
            </div>
          </Show>

          <Show when={props.lead.nextFollowUpDate || localTags().length > 0}>
            <div class="flex items-center justify-between gap-2">
              <Show when={props.lead.nextFollowUpDate}>
                <div
                  class={`flex items-center gap-1 text-sm font-medium ${getFollowUpDateColor(props.lead.nextFollowUpDate)}`}
                >
                  <Clock class="w-3.5 h-3.5 shrink-0" />
                  <span>{formatFollowUpDate(props.lead.nextFollowUpDate!)}</span>
                </div>
              </Show>
              <Show when={localTags().length > 0}>
                <div class="flex items-center gap-1 flex-wrap justify-end">
                  <For each={localTags()}>
                    {(tag) => (
                      <button
                        onClick={(e) => handleTagToggle(tag, e)}
                        class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Tap to remove"
                      >
                        {tag} x
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>

          <div onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-medium">Tags</span>
              <button
                onClick={() => setShowTagPicker((v) => !v)}
                class="text-xs text-primary hover:underline"
              >
                {showTagPicker() ? "Done" : "Edit tags"}
              </button>
            </div>
            <Show when={showTagPicker()}>
              <div class="grid grid-cols-2 gap-1.5">
                <For each={LEAD_TAGS}>
                  {(tag) => (
                    <button
                      onClick={(e) => handleTagToggle(tag, e)}
                      class={`text-xs text-left px-2.5 py-1.5 rounded-md border transition-colors ${
                        localTags().includes(tag)
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {localTags().includes(tag) ? "check " : ""}
                      {tag}
                    </button>
                  )}
                </For>
              </div>
            </Show>
            <Show when={!showTagPicker() && localTags().length === 0}>
              <p class="text-xs text-muted-foreground">No tags set</p>
            </Show>
          </div>

          <div>
            <div class="flex items-center gap-1 text-sm font-medium mb-1">
              <FileText class="w-3.5 h-3.5" /> Notes:
            </div>
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
              placeholder="Add notes about this lead..."
            />
          </div>

          <div>
            <label class="flex items-center gap-1 text-sm font-medium mb-1 block">
              <Clock class="w-3.5 h-3.5" /> Next Follow-up:
            </label>
            <input
              type="date"
              value={followUpDate()}
              onInput={(e) => setFollowUpDate(e.currentTarget.value)}
              onBlur={() => {
                const current = props.lead.nextFollowUpDate
                  ? new Date(props.lead.nextFollowUpDate).toISOString().split("T")[0]
                  : "";
                if (followUpDate() !== current && props.onReschedule) {
                  props.onReschedule(props.lead, followUpDate());
                }
              }}
              onClick={(e) => e.stopPropagation()}
              class="w-full text-sm p-2 rounded-md border border-input bg-background"
            />
          </div>

          <Show when={props.task}>
            <div class="border-t pt-3 space-y-2">
              <div class="text-sm flex items-center gap-1.5">
                <Target class="w-3.5 h-3.5 shrink-0" />
                <span class="font-medium">Task:</span>
                <span class="text-muted-foreground">{props.task!.name}</span>
              </div>
              <Show when={props.task!.objective}>
                <div class="text-sm">
                  <div class="flex items-center gap-1 font-medium mb-1">
                    <MapPin class="w-3.5 h-3.5" /> Objective:
                  </div>
                  <div class="text-muted-foreground bg-muted p-2 rounded-md text-xs">
                    {props.task!.objective}
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          <div
            class="grid grid-cols-2 gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button onClick={() => props.onCall(props.lead)} class="w-full">
              <Phone class="w-3.5 h-3.5 mr-1" /> Call Now
            </Button>
            <Button
              variant="outline"
              onClick={() => props.onWhatsApp(props.lead)}
              class="w-full"
            >
              <MessageCircle class="w-3.5 h-3.5 mr-1" /> WhatsApp
            </Button>
          </div>
        </div>
      </Show>
    </Card>
  );
};