import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { LeadSchema, LeadSource } from "~/lib/schemas/ui/user.schema";
import type { Lead } from "~/lib/schemas/ui/user.schema";

/**
 * Assigned Leads Page
 *
 * Features:
 * - Search bar (placeholder)
 * - Filter bar (placeholder)
 * - Lead card list with:
 *   - Name + star rating
 *   - Phone, source, dates
 *   - CALL, WHATSAPP, DETAILS buttons
 *
 * Mobile-first design with touch-friendly buttons
 */

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_LEADS: Lead[] = [
  {
    id: "lead-1",
    fullName: "Rajesh Kumar",
    phone: "+919876543210",
    email: "rajesh@example.com",
    leadSource: LeadSource.WALK_IN,
    rating: 5,
    lastContact: "2025-11-28T10:30:00Z",
    nextFollowUp: "2025-12-05T14:00:00Z",
    programsWant: ["HP", "MY"],
    notes: "Very interested in morning programs",
    createdAt: "2025-11-20T08:00:00Z",
    updatedAt: "2025-11-28T10:30:00Z",
  },
  {
    id: "lead-2",
    fullName: "Priya Sharma",
    phone: "+919123456789",
    email: "",
    leadSource: LeadSource.REFERRAL,
    rating: 4,
    lastContact: "2025-11-30T15:45:00Z",
    nextFollowUp: "2025-12-03T11:00:00Z",
    programsWant: ["Sahaj", "VTP"],
    notes: "Referred by existing member",
    createdAt: "2025-11-25T09:00:00Z",
    updatedAt: "2025-11-30T15:45:00Z",
  },
  {
    id: "lead-3",
    fullName: "Amit Patel",
    phone: "+919988776655",
    email: "amit.patel@example.com",
    leadSource: LeadSource.CAMPAIGN,
    rating: 3,
    lastContact: "2025-11-29T12:00:00Z",
    programsWant: ["UY", "AMP"],
    notes: "From social media campaign",
    createdAt: "2025-11-27T10:00:00Z",
    updatedAt: "2025-11-29T12:00:00Z",
  },
];

// Validate mock data
const validatedLeads = MOCK_LEADS.map((lead) => {
  const result = LeadSchema.safeParse(lead);
  if (!result.success) {
    console.error("Invalid lead data:", lead, result.error);
    return null;
  }
  return result.data;
}).filter((lead): lead is Lead => lead !== null);

// ============================================================================
// STAR RATING COMPONENT (Read-only)
// ============================================================================

interface StarRatingProps {
  value: number;
  max?: number;
}

function StarRating(props: StarRatingProps) {
  const max = () => props.max || 5;

  return (
    <div class="flex items-center gap-0.5">
      <For each={Array.from({ length: max() })}>
        {(_, index) => (
          <svg
            class={cn(
              "h-4 w-4",
              index() < props.value
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300 fill-gray-300",
            )}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </For>
    </div>
  );
}

// ============================================================================
// LEAD CARD COMPONENT
// ============================================================================

interface LeadCardProps {
  lead: Lead;
}

function LeadCard(props: LeadCardProps) {
  /**
   * Helper to encode WhatsApp message
   */
  const getWhatsAppUrl = () => {
    const phone = props.lead.phone.replace(/[^0-9]/g, ""); // Remove non-numeric
    const message = encodeURIComponent(
      `Hi ${props.lead.fullName}, this is from AOL Foundation. How can we help you?`,
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  /**
   * Helper to format date
   */
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  /**
   * Helper to get source badge color
   */
  const getSourceColor = (source: string) => {
    switch (source) {
      case LeadSource.WALK_IN:
        return "bg-blue-100 text-blue-800";
      case LeadSource.REFERRAL:
        return "bg-green-100 text-green-800";
      case LeadSource.CAMPAIGN:
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card class="w-full shadow-md sm:shadow-sm rounded-2xl sm:rounded-xl active:shadow-lg transition-shadow">
      <CardHeader class="pb-2 pt-4 px-4 sm:pb-3">
        {/* Top Section: Name + Rating */}
        <div class="flex items-start justify-between gap-2">
          <CardTitle class="text-base sm:text-lg font-semibold text-gray-900 leading-tight sm:leading-normal">
            {props.lead.fullName}
          </CardTitle>
          <StarRating value={props.lead.rating} />
        </div>
      </CardHeader>

      <CardContent class="space-y-3 sm:space-y-4 px-4 pb-4">
        {/* Details Section - Compact mobile layout */}
        <div class="space-y-1.5 sm:space-y-2 text-sm">
          {/* Source + Last Contact */}
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <svg
                class="h-4 w-4 text-gray-400 sm:text-gray-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <Badge
                variant="secondary"
                class={cn(
                  "text-xs px-2 py-0.5",
                  getSourceColor(props.lead.leadSource),
                )}
              >
                {props.lead.leadSource}
              </Badge>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2">
              <svg
                class="h-4 w-4 text-gray-400 sm:text-gray-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span class="text-gray-600 text-xs sm:text-sm">
                Last: {formatDate(props.lead.lastContact)}
              </span>
            </div>
          </div>

          {/* Next Follow-up (if available) - Highlighted */}
          <Show when={props.lead.nextFollowUp}>
            <div class="flex items-center gap-2 bg-blue-50 -mx-4 px-4 py-2 rounded-lg">
              <svg
                class="h-4 w-4 text-blue-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="text-blue-700 font-medium text-xs sm:text-sm">
                Follow-up: {formatDate(props.lead.nextFollowUp!)}
              </span>
            </div>
          </Show>
        </div>

        {/* Actions Section - Mobile: 3 columns, Desktop: horizontal */}
        <div class="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-3 pt-2">
          {/* CALL Button */}
          <a href={`tel:${props.lead.phone}`} class="block sm:flex-1">
            <Button
              variant="outline"
              size="default"
              class="w-full h-12 sm:h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 active:bg-gray-100"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span class="text-xs sm:text-sm font-medium">CALL</span>
            </Button>
          </a>

          {/* WHATSAPP Button */}
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            class="block sm:flex-1"
          >
            <Button
              variant="outline"
              size="default"
              class="w-full h-12 sm:h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-green-600 border-green-300 hover:bg-green-50 active:bg-green-100"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span class="text-xs sm:text-sm font-medium sm:hidden">CHAT</span>
              <span class="text-xs sm:text-sm font-medium hidden sm:inline">
                WHATSAPP
              </span>
            </Button>
          </a>

          {/* DETAILS Button */}
          <Button
            variant="default"
            size="default"
            class="h-12 sm:h-11 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0 active:bg-primary/90"
          >
            <svg
              class="h-5 w-5 sm:hidden"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-xs sm:text-sm font-medium sm:hidden">INFO</span>
            <span class="text-xs sm:text-sm font-medium hidden sm:inline">
              DETAILS
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AssignedLeadsPage() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [leads] = createSignal<Lead[]>(validatedLeads);

  return (
    <div class="min-h-screen bg-gray-50 pb-6">
      {/* Header - Sticky on mobile */}
      <header class="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div class="px-4 py-4 sm:max-w-3xl sm:mx-auto sm:px-6 lg:px-8 sm:py-6">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            Assigned Leads
          </h1>
          <p class="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
            {leads().length} lead{leads().length !== 1 ? "s" : ""} assigned
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main class="px-3 py-4 sm:max-w-3xl sm:mx-auto sm:px-6 lg:px-8 sm:py-6">
        {/* Search Bar (Placeholder) */}
        <div class="mb-3 sm:mb-4">
          <Input
            type="search"
            placeholder="Search leads..."
            value={searchQuery()}
            onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) =>
              setSearchQuery(e.currentTarget.value)
            }
            class="w-full h-12 text-base sm:h-auto"
          />
        </div>

        {/* Filter Bar (Placeholder) - Horizontal scroll */}
        <div class="mb-4 sm:mb-6 flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <Button variant="outline" size="sm" class="flex-shrink-0 h-9">
            All
          </Button>
          <Button variant="outline" size="sm" class="flex-shrink-0 h-9">
            Walk-in
          </Button>
          <Button variant="outline" size="sm" class="flex-shrink-0 h-9">
            Referral
          </Button>
          <Button variant="outline" size="sm" class="flex-shrink-0 h-9">
            Campaign
          </Button>
          <div class="w-px h-6 bg-gray-300 flex-shrink-0" />
          <Button variant="outline" size="sm" class="flex-shrink-0 h-9">
            5 ⭐
          </Button>
          <Button variant="outline" size="sm" class="flex-shrink-0 h-9">
            4+ ⭐
          </Button>
        </div>

        {/* Lead List */}
        <div class="space-y-3 sm:space-y-4">
          <Show
            when={leads().length > 0}
            fallback={
              <Card class="shadow-sm">
                <CardContent class="py-16 sm:py-12">
                  <div class="text-center text-gray-500">
                    <svg
                      class="h-16 w-16 mx-auto mb-4 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p class="text-base sm:text-lg font-medium">
                      No leads assigned
                    </p>
                    <p class="text-sm mt-1">
                      Your assigned leads will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            }
          >
            <For each={leads()}>{(lead) => <LeadCard lead={lead} />}</For>
          </Show>
        </div>
      </main>
    </div>
  );
}
