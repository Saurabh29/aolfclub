import { Show, For, createSignal, type Component } from "solid-js";
import { Card } from "~/components/ui/card";
import {
  Phone,
  MessageCircle,
  GraduationCap,
  Clock,
  FileText,
  Target,
  MapPin,
  Star,
  Check,
  X,
} from "lucide-solid";
import type { Lead, Task, InterestLevel, LeadTag } from "~/lib/schemas/domain";
import { OUTCOME_TAGS, CONTACT_TAGS } from "~/lib/schemas/domain";
import { formatFollowUpDate, formatRelativeTime, getFollowUpDateColor } from "~/lib/utils/lead-status";

// -- Call log data contract ----------------------------------------------------

export interface CallLogData {
  outcome: LeadTag | null;
  interestLevel?: InterestLevel;
  notes: string;
  followUpDate?: string;
  tags: LeadTag[];
  /** null when card was expanded by tapping rather than a call/WA button */
  channel: "call" | "whatsapp" | null;
  markComplete: boolean;
}

// -- Constants -----------------------------------------------------------------

const QUICK_TEMPLATES = [
  { label: "Interested", text: "Interested in [program]. Will send details." },
  { label: "Not Now", text: "Not interested at this time." },
  { label: "Wrong #", text: "Wrong number / Do not call." },
];

const FOLLOW_UP_PRESETS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "1 Week", days: 7 },
];

// -- Props ---------------------------------------------------------------------

export interface LeadCardProps {
  lead: Lead;
  task?: Task;
  showTaskBadge?: boolean;
  onCallLogSave: (lead: Lead, data: CallLogData) => void;
}

// -- Helpers -------------------------------------------------------------------

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

const isOutcomeTag = (tag: string): boolean =>
  (OUTCOME_TAGS as readonly string[]).includes(tag);

const outcomeIdleClass = (tag: LeadTag): string => {
  if (tag === "Answered") return "bg-green-50 border-green-300 text-green-800";
  if (tag === "No Answer") return "bg-yellow-50 border-yellow-300 text-yellow-800";
  if (tag === "Busy") return "bg-orange-50 border-orange-300 text-orange-800";
  return "bg-red-50 border-red-300 text-red-800";
};

const outcomeActiveClass = (tag: LeadTag): string => {
  if (tag === "Answered") return "bg-green-500 border-green-500 text-white";
  if (tag === "No Answer") return "bg-yellow-500 border-yellow-500 text-white";
  if (tag === "Busy") return "bg-orange-500 border-orange-500 text-white";
  return "bg-red-500 border-red-500 text-white";
};

// -- Component -----------------------------------------------------------------

export const LeadCard: Component<LeadCardProps> = (props) => {
  // -- Expanded state ---------------------------------------------------------
  const [isExpanded, setIsExpanded] = createSignal(false);

  // -- Last channel clicked (call or whatsapp) --------------------------------
  const [lastChannel, setLastChannel] = createSignal<"call" | "whatsapp" | null>(null);

  // -- Display state â€” reflects last saved values for instant UI feedback -----
  const [displayStarCount, setDisplayStarCount] = createSignal(
    levelToStarCount(props.lead.lastInterestLevel)
  );
  const [displayTags, setDisplayTags] = createSignal<LeadTag[]>(props.lead.tags ?? []);
  const [displayNotes, setDisplayNotes] = createSignal(props.lead.lastNotes ?? "");
  const [displayFollowUpDate, setDisplayFollowUpDate] = createSignal(
    props.lead.nextFollowUpDate
      ? new Date(props.lead.nextFollowUpDate).toISOString().split("T")[0]
      : ""
  );

  // -- Staged form state â€” only committed on Save -----------------------------
  const [stagedOutcome, setStagedOutcome] = createSignal<LeadTag | null>(null);
  const [stagedStarCount, setStagedStarCount] = createSignal(0);
  const [stagedContactTags, setStagedContactTags] = createSignal<LeadTag[]>([]);
  const [stagedNotes, setStagedNotes] = createSignal("");
  const [stagedFollowUpDate, setStagedFollowUpDate] = createSignal("");

  // -- Derived ----------------------------------------------------------------

  const displayPrograms = () => {
    const p = props.lead.interestedPrograms;
    if (p.length === 0) return "No programs";
    if (p.length <= 2) return p.join(", ");
    return `${p.slice(0, 2).join(", ")} +${p.length - 2}`;
  };

  // -- Open expanded â€” initialise staged from current display state -----------

  const openExpanded = (channel: "call" | "whatsapp" | null) => {
    const tags = displayTags();
    setStagedOutcome((tags.find((t) => isOutcomeTag(t)) as LeadTag | undefined) ?? null);
    setStagedStarCount(displayStarCount());
    setStagedContactTags(tags.filter((t) => !isOutcomeTag(t)));
    setStagedNotes(displayNotes());
    setStagedFollowUpDate(displayFollowUpDate());
    setLastChannel(channel);
    setIsExpanded(true);
  };

  // -- Handlers ---------------------------------------------------------------

  const handleCardClick = () => {
    if (!isExpanded()) openExpanded(null);
  };

  const handleCallClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.lead.phone) window.location.href = `tel:${props.lead.phone}`;
    if (isExpanded()) {
      setLastChannel("call");
    } else {
      openExpanded("call");
    }
  };

  const handleWhatsAppClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.lead.phone) {
      const msg = `Hi ${props.lead.displayName}, `;
      window.open(
        `https://wa.me/${props.lead.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`,
        "_blank"
      );
    }
    if (isExpanded()) {
      setLastChannel("whatsapp");
    } else {
      openExpanded("whatsapp");
    }
  };

  const handleSave = (e: MouseEvent) => {
    e.stopPropagation();
    const outcome = stagedOutcome();
    const allTags: LeadTag[] = outcome
      ? [outcome, ...stagedContactTags()]
      : [...stagedContactTags()];
    const level = starCountToLevel(stagedStarCount());
    const data: CallLogData = {
      outcome,
      interestLevel: level ?? undefined,
      notes: stagedNotes(),
      followUpDate: stagedFollowUpDate()
        ? new Date(stagedFollowUpDate()).toISOString()
        : undefined,
      tags: allTags,
      channel: lastChannel(),
      markComplete: outcome === "Invalid Number",
    };
    props.onCallLogSave(props.lead, data);
    // Update display state immediately for snappy feedback
    setDisplayStarCount(stagedStarCount());
    setDisplayTags(allTags);
    setDisplayNotes(stagedNotes());
    if (stagedFollowUpDate()) setDisplayFollowUpDate(stagedFollowUpDate());
    setIsExpanded(false);
    setLastChannel(null);
  };

  const handleCancel = (e: MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
    setLastChannel(null);
  };

  const setFollowUpPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setStagedFollowUpDate(d.toISOString().split("T")[0]);
  };

  // -- Stars ------------------------------------------------------------------

  const CollapsedStars = () => {
    const count = displayStarCount();
    return (
      <span class="flex gap-0.5 shrink-0">
        {Array(5).fill(0).map((_, i) => (
          <Star
            class={`w-3.5 h-3.5 ${
              i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </span>
    );
  };

  const StagedStars = () => {
    const count = stagedStarCount();
    return (
      <span class="flex gap-1">
        {Array(5).fill(0).map((_, i) => (
          <button
            onClick={(e) => { e.stopPropagation(); setStagedStarCount(i + 1); }}
            class="focus:outline-none"
            aria-label={`Rate ${i + 1} stars`}
          >
            <Star
              class={`w-5 h-5 transition-colors ${
                i < count
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30 hover:text-amber-300"
              }`}
            />
          </button>
        ))}
      </span>
    );
  };

  // -- Action buttons (always top-right) -------------------------------------

  const ActionButtons = () => (
    <div class="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleCallClick}
        class="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300 transition-colors"
        aria-label="Call"
      >
        <Phone class="w-4 h-4" />
      </button>
      <button
        onClick={handleWhatsAppClick}
        class="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300 transition-colors"
        aria-label="WhatsApp"
      >
        <MessageCircle class="w-4 h-4" />
      </button>
    </div>
  );

  // -- Render -----------------------------------------------------------------

  return (
    <Card
      class={`p-3 transition-shadow ${
        isExpanded() ? "shadow-md" : "hover:shadow-md cursor-pointer"
      }`}
      onClick={handleCardClick}
    >
      {/* -- Collapsed -- */}
      <Show when={!isExpanded()}>
        <div class="space-y-1.5">
          {/* Name + action buttons */}
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold text-base leading-tight">{props.lead.displayName}</h3>
            {ActionButtons()}
          </div>

          <Show when={props.showTaskBadge && props.task}>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <Target class="w-3 h-3 shrink-0" />
              <span>{props.task!.name}</span>
            </div>
          </Show>

          {/* Programs + star rating */}
          <div class="flex items-center justify-between gap-2 text-sm">
            <div class="flex items-center gap-1 min-w-0">
              <GraduationCap class="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span class="text-muted-foreground truncate">{displayPrograms()}</span>
            </div>
            {CollapsedStars()}
          </div>

          {/* Follow-up date + tags */}
          <Show when={props.lead.nextFollowUpDate || displayTags().length > 0}>
            <div class="flex items-center justify-between gap-2">
              <Show when={props.lead.nextFollowUpDate}>
                <div
                  class={`flex items-center gap-1 shrink-0 text-xs font-medium ${getFollowUpDateColor(props.lead.nextFollowUpDate)}`}
                >
                  <Clock class="w-3.5 h-3.5 shrink-0" />
                  <span>{formatFollowUpDate(props.lead.nextFollowUpDate!)}</span>
                </div>
              </Show>
              <Show when={displayTags().length > 0}>
                <div class="flex items-center gap-1 flex-wrap justify-end">
                  <For each={displayTags()}>
                    {(tag) => (
                      <span
                        class={`text-[10px] px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap border ${
                          isOutcomeTag(tag)
                            ? outcomeIdleClass(tag)
                            : "bg-muted text-muted-foreground border-transparent"
                        }`}
                      >
                        {tag}
                      </span>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>

          {/* Last notes preview */}
          <Show when={displayNotes()}>
            <p class="text-xs text-muted-foreground line-clamp-1 italic">
              "{displayNotes()}"
            </p>
          </Show>
        </div>
      </Show>

      {/* -- Expanded -- */}
      <Show when={isExpanded()}>
        <div class="space-y-4" onClick={(e) => e.stopPropagation()}>

          {/* Name + action buttons (always top-right) */}
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-semibold text-base leading-tight truncate">
                {props.lead.displayName}
              </h3>
              <Show when={props.task && props.showTaskBadge}>
                <div class="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Target class="w-3 h-3 shrink-0" />
                  <span>{props.task!.name}</span>
                </div>
              </Show>
            </div>
            {ActionButtons()}
          </div>

          {/* Programs + interest stars */}
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-1 text-sm font-medium">
                <GraduationCap class="w-3.5 h-3.5" /> Programs
              </div>
              {StagedStars()}
            </div>
            <Show
              when={props.lead.interestedPrograms.length > 0}
              fallback={<p class="text-sm text-muted-foreground ml-4">None listed</p>}
            >
              <ul class="text-sm text-muted-foreground ml-4 list-disc space-y-0.5">
                <For each={props.lead.interestedPrograms}>{(p) => <li>{p}</li>}</For>
              </ul>
            </Show>
          </div>

          {/* Last call date */}
          <Show when={props.lead.lastCallDate}>
            <div class="text-sm flex items-center gap-1.5 text-muted-foreground">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              Last called: {formatRelativeTime(props.lead.lastCallDate!)}
            </div>
          </Show>

          {/* -- Tags (merged: outcome + contact labels) -- */}
          <div>
            <p class="text-sm font-medium mb-2">Tags</p>

            {/* Row 1 â€” Call outcome (single-select, colour-coded) */}
            <div class="flex flex-wrap gap-2 mb-2">
              <For each={OUTCOME_TAGS}>
                {(tag) => {
                  const selected = () => stagedOutcome() === tag;
                  return (
                    <button
                      onClick={() =>
                        setStagedOutcome((prev) => (prev === tag ? null : tag))
                      }
                      class={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        selected() ? outcomeActiveClass(tag) : outcomeIdleClass(tag)
                      }`}
                    >
                      {tag}
                    </button>
                  );
                }}
              </For>
            </div>

            {/* Row 2 â€” Contact labels (multi-select, neutral) */}
            <div class="flex flex-wrap gap-2">
              <For each={CONTACT_TAGS}>
                {(tag) => {
                  const selected = () => stagedContactTags().includes(tag);
                  return (
                    <button
                      onClick={() =>
                        setStagedContactTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      class={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selected()
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div class="flex items-center gap-1 text-sm font-medium mb-1.5">
              <FileText class="w-3.5 h-3.5" /> Notes
            </div>
            <textarea
              value={stagedNotes()}
              onInput={(e) => setStagedNotes(e.currentTarget.value)}
              placeholder="Add notes..."
              rows={3}
              class="w-full text-sm p-2.5 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div class="flex flex-wrap gap-1.5 mt-1.5">
              <For each={QUICK_TEMPLATES}>
                {(t) => (
                  <button
                    onClick={() => setStagedNotes(t.text)}
                    class="text-[11px] px-2 py-0.5 rounded border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {t.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Follow-up (hidden for Invalid Number) */}
          <Show when={stagedOutcome() !== "Invalid Number"}>
            <div>
              <div class="flex items-center gap-1 text-sm font-medium mb-1.5">
                <Clock class="w-3.5 h-3.5" /> Follow-up
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <For each={FOLLOW_UP_PRESETS}>
                  {(p) => (
                    <button
                      onClick={() => setFollowUpPreset(p.days)}
                      class="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {p.label}
                    </button>
                  )}
                </For>
              </div>
              <input
                type="date"
                value={stagedFollowUpDate()}
                onInput={(e) => setStagedFollowUpDate(e.currentTarget.value)}
                class="w-full text-sm p-2 rounded-md border border-input bg-background"
              />
            </div>
          </Show>

          <Show when={stagedOutcome() === "Invalid Number"}>
            <div class="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              This lead will be marked complete on save.
            </div>
          </Show>

          {/* Task info */}
          <Show when={props.task && !props.showTaskBadge}>
            <div class="border-t pt-3 space-y-1.5">
              <div class="text-sm flex items-center gap-1.5 text-muted-foreground">
                <Target class="w-3.5 h-3.5 shrink-0" />
                <span class="font-medium text-foreground">{props.task!.name}</span>
              </div>
              <Show when={props.task!.objective}>
                <div class="text-muted-foreground bg-muted p-2 rounded-md text-xs">
                  {props.task!.objective}
                </div>
              </Show>
            </div>
          </Show>

          {/* -- Save / Cancel â€” always at bottom -- */}
          <div class="grid grid-cols-2 gap-2 pt-1 border-t">
            <button
              onClick={handleCancel}
              class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
            >
              <X class="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Check class="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </Show>
    </Card>
  );
};
