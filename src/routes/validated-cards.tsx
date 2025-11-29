import { A } from "@solidjs/router";
import { createMemo } from "solid-js";
import StructuredCardList from "~/components/StructuredCardList";
import {
  type CardItem,
  type MetricComponent,
  type BadgeComponent,
  type LabelComponent,
  type IconCardComponent,
} from "~/schemas/card.schema";

// Icon components
const DollarIcon = () => (
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ChartIcon = () => (
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const EditIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function ValidatedCardsDemo() {
  // Example 1: Store Cards with Metrics and Badges
  const storeCards = createMemo((): CardItem[] => [
    {
      id: "store-1",
      header: {
        title: "Downtown Seattle Store",
        subtitle: "Premium Location",
      },
      components: [
        {
          type: "metric",
          data: {
            label: "Monthly Revenue",
            value: "$125,000",
            variant: "success",
            icon: <DollarIcon />,
          },
        } satisfies MetricComponent,
        {
          type: "metric",
          data: {
            label: "Active Customers",
            value: "1,234",
            variant: "primary",
            icon: <UserIcon />,
          },
        } satisfies MetricComponent,
        {
          type: "label",
          data: {
            key: "Location",
            value: "Seattle, WA",
          },
        } satisfies LabelComponent,
        {
          type: "badge",
          data: {
            label: "Active",
            variant: "success",
            size: "sm",
          },
        } satisfies BadgeComponent,
      ],
      actions: [
        {
          label: "Edit",
          icon: <EditIcon />,
          onClick: (card) => alert(`Edit: ${card.header.title}`),
        },
        {
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: (card) => alert(`Delete: ${card.header.title}`),
        },
      ],
      onClick: (card) => alert(`Clicked: ${card.header.title}`),
      metadata: {
        region: "west",
        tier: "premium",
      },
    },
    {
      id: "store-2",
      header: {
        title: "Portland Mall Store",
        subtitle: "High Traffic",
      },
      components: [
        {
          type: "metric",
          data: {
            label: "Monthly Revenue",
            value: "$98,500",
            variant: "success",
            icon: <DollarIcon />,
          },
        } satisfies MetricComponent,
        {
          type: "metric",
          data: {
            label: "Active Customers",
            value: "892",
            variant: "primary",
            icon: <UserIcon />,
          },
        } satisfies MetricComponent,
        {
          type: "label",
          data: {
            key: "Location",
            value: "Portland, OR",
          },
        } satisfies LabelComponent,
        {
          type: "badge",
          data: {
            label: "Active",
            variant: "success",
            size: "sm",
          },
        } satisfies BadgeComponent,
      ],
      actions: [
        {
          label: "Edit",
          icon: <EditIcon />,
          onClick: (card) => alert(`Edit: ${card.header.title}`),
        },
        {
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: (card) => alert(`Delete: ${card.header.title}`),
        },
      ],
      onClick: (card) => alert(`Clicked: ${card.header.title}`),
    },
    {
      id: "store-3",
      header: {
        title: "San Francisco Airport",
        subtitle: "Travel Hub",
      },
      components: [
        {
          type: "metric",
          data: {
            label: "Monthly Revenue",
            value: "$156,000",
            variant: "success",
            icon: <DollarIcon />,
          },
        } satisfies MetricComponent,
        {
          type: "metric",
          data: {
            label: "Active Customers",
            value: "2,103",
            variant: "primary",
            icon: <UserIcon />,
          },
        } satisfies MetricComponent,
        {
          type: "label",
          data: {
            key: "Location",
            value: "San Francisco, CA",
          },
        } satisfies LabelComponent,
        {
          type: "badge",
          data: {
            label: "Inactive",
            variant: "error",
            size: "sm",
          },
        } satisfies BadgeComponent,
      ],
      actions: [
        {
          label: "Edit",
          icon: <EditIcon />,
          onClick: (card) => alert(`Edit: ${card.header.title}`),
        },
        {
          label: "Delete",
          icon: <DeleteIcon />,
          onClick: (card) => alert(`Delete: ${card.header.title}`),
        },
      ],
      onClick: (card) => alert(`Clicked: ${card.header.title}`),
    },
  ]);

  // Example 2: Analytics Cards with IconCard components
  const analyticsCards = createMemo((): CardItem[] => [
    {
      id: "analytics-1",
      header: {
        title: "Q4 Performance",
      },
      components: [
        {
          type: "iconCard",
          data: {
            icon: <ChartIcon />,
            title: "Revenue Growth",
            description: "23% increase from Q3",
            variant: "success",
          },
        } satisfies IconCardComponent,
        {
          type: "metric",
          data: {
            label: "Total Revenue",
            value: "$1.2M",
            variant: "primary",
          },
        } satisfies MetricComponent,
        {
          type: "metric",
          data: {
            label: "New Customers",
            value: "456",
            variant: "info",
          },
        } satisfies MetricComponent,
      ],
    },
    {
      id: "analytics-2",
      header: {
        title: "Customer Metrics",
      },
      components: [
        {
          type: "iconCard",
          data: {
            icon: <UserIcon />,
            title: "Customer Retention",
            description: "92% retention rate",
            variant: "primary",
          },
        } satisfies IconCardComponent,
        {
          type: "list",
          data: {
            items: ["Active: 3,245", "Inactive: 287", "New: 156"],
            ordered: false,
          },
        },
      ],
    },
  ]);

  return (
    <main class="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-7xl space-y-8">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">Validated Card List Demo</h1>
          <p class="text-muted-foreground">
            Using Zod schema validation for type-safe component props
          </p>
          <A href="/" class="text-sky-600 hover:underline text-sm">
            ← Back to Home
          </A>
        </div>

        {/* Store Cards with Metrics */}
        <section class="space-y-4">
          <h2 class="text-2xl font-semibold">Store Performance (Validated)</h2>
          <StructuredCardList cards={storeCards()} />
        </section>

        {/* Analytics Cards */}
        <section class="space-y-4">
          <h2 class="text-2xl font-semibold">Analytics Dashboard (Validated)</h2>
          <StructuredCardList
            cards={analyticsCards()}
            gridConfig={{
              cols: { sm: 1, md: 2, lg: 2, xl: 2 },
              gap: "gap-6",
            }}
          />
        </section>
      </div>
    </main>
  );
}
