import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { LeadSchema, LeadSource } from "~/schemas/user.schema";
import type { Lead } from "~/schemas/user.schema";

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
                : "text-gray-300 fill-gray-300"
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
    const message = encodeURIComponent(`Hi ${props.lead.fullName}, this is from AOL Foundation. How can we help you?`);
    return `https://wa.me/${phone}?text=${message}`;
  };

  /**
   * Helper to format date
   */
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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
    <Card class="w-full shadow-sm rounded-xl">
      <CardHeader class="pb-3">
        {/* Top Section: Name + Rating */}
        <div class="flex items-center justify-between">
          <CardTitle class="text-lg font-semibold text-gray-900">
            {props.lead.fullName}
          </CardTitle>
          <StarRating value={props.lead.rating} />
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        {/* Details Section */}
        <div class="space-y-2 text-sm">
          {/* Phone */}
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span class="text-gray-700 font-medium">{props.lead.phone}</span>
          </div>

          {/* Source */}
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <Badge variant="secondary" class={cn("text-xs", getSourceColor(props.lead.leadSource))}>
              {props.lead.leadSource}
            </Badge>
          </div>

          {/* Last Contact */}
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-gray-600">Last contact: {formatDate(props.lead.lastContact)}</span>
          </div>

          {/* Next Follow-up (if available) */}
          <Show when={props.lead.nextFollowUp}>
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-blue-600 font-medium">Follow-up: {formatDate(props.lead.nextFollowUp!)}</span>
            </div>
          </Show>
        </div>

        <Separator />

        {/* Actions Section */}
        <div class="flex items-center gap-3">
          {/* CALL Button */}
          <a href={`tel:${props.lead.phone}`} class="flex-1">
            <Button variant="outline" size="default" class="w-full h-11 flex items-center justify-center gap-2">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              CALL
            </Button>
          </a>

          {/* WHATSAPP Button */}
          <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" class="flex-1">
            <Button variant="outline" size="default" class="w-full h-11 flex items-center justify-center gap-2 text-green-600 border-green-300 hover:bg-green-50">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WHATSAPP
            </Button>
          </a>

          {/* DETAILS Button */}
          <Button variant="default" size="default" class="h-11 px-6">
            DETAILS
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
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Assigned Leads</h1>
            <p class="text-sm text-gray-600 mt-1">
              Follow up with your assigned leads
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar (Placeholder) */}
        <div class="mb-4">
          <Input
            type="search"
            placeholder="Search leads by name or phone..."
            value={searchQuery()}
            onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setSearchQuery(e.currentTarget.value)}
            class="w-full"
          />
        </div>

        {/* Filter Bar (Placeholder) */}
        <div class="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
          <Button variant="outline" size="sm">All Sources</Button>
          <Button variant="outline" size="sm">Walk-in</Button>
          <Button variant="outline" size="sm">Referral</Button>
          <Button variant="outline" size="sm">Campaign</Button>
          <Separator orientation="vertical" class="h-6" />
          <Button variant="outline" size="sm">All Ratings</Button>
          <Button variant="outline" size="sm">5 ⭐</Button>
          <Button variant="outline" size="sm">4+ ⭐</Button>
        </div>

        {/* Lead List */}
        <div class="space-y-4">
          <Show
            when={leads().length > 0}
            fallback={
              <Card>
                <CardContent class="py-12">
                  <div class="text-center text-gray-500">
                    <p class="text-lg font-medium">No leads assigned</p>
                    <p class="text-sm mt-1">Your assigned leads will appear here</p>
                  </div>
                </CardContent>
              </Card>
            }
          >
            <For each={leads()}>
              {(lead) => <LeadCard lead={lead} />}
            </For>
          </Show>
        </div>

        {/* Summary */}
        <div class="mt-6 text-center text-sm text-gray-600">
          Showing {leads().length} assigned lead{leads().length !== 1 ? "s" : ""}
        </div>
      </main>
    </div>
  );
}
