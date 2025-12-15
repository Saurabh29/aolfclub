import { A } from "@solidjs/router";
import { createMemo } from "solid-js";
import GenericCardList from "~/components/GenericCardList";

// Example entity types
interface Store {
  id: string;
  name: string;
  location: string;
  revenue: number;
  status: "active" | "inactive";
}

interface User {
  id: string;
  email: string;
  role: string;
  lastLogin: string;
}

interface Lead {
  id: string;
  company: string;
  contact: string;
  value: number;
  stage: string;
}

// Icon components
const EditIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const MessageIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

const EmailIcon = () => (
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export default function CardDemo() {
  // Sample data
  const stores: Store[] = [
    {
      id: "s1",
      name: "Downtown Store",
      location: "Seattle, WA",
      revenue: 125000,
      status: "active",
    },
    {
      id: "s2",
      name: "Mall Location",
      location: "Portland, OR",
      revenue: 98000,
      status: "active",
    },
    {
      id: "s3",
      name: "Airport Shop",
      location: "San Francisco, CA",
      revenue: 156000,
      status: "inactive",
    },
  ];

  const users: User[] = [
    {
      id: "u1",
      email: "alice@example.com",
      role: "Admin",
      lastLogin: "2025-11-28",
    },
    {
      id: "u2",
      email: "bob@example.com",
      role: "Manager",
      lastLogin: "2025-11-27",
    },
    {
      id: "u3",
      email: "carol@example.com",
      role: "User",
      lastLogin: "2025-11-26",
    },
  ];

  const leads: Lead[] = [
    {
      id: "l1",
      company: "Acme Corp",
      contact: "John Doe",
      value: 50000,
      stage: "Proposal",
    },
    {
      id: "l2",
      company: "Tech Startup",
      contact: "Jane Smith",
      value: 75000,
      stage: "Negotiation",
    },
    {
      id: "l3",
      company: "Enterprise Inc",
      contact: "Bob Johnson",
      value: 120000,
      stage: "Qualified",
    },
  ];

  const storeActions = createMemo(() => [
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: (store: Store) => alert(`Edit: ${store.name}`),
    },
    {
      label: "Delete",
      icon: <DeleteIcon />,
      onClick: (store: Store) => alert(`Delete: ${store.name}`),
    },
  ]);

  const userActions = createMemo(() => [
    {
      label: "Message",
      icon: <MessageIcon />,
      onClick: (user: User) => alert(`Message: ${user.email}`),
    },
  ]);

  const leadActions = createMemo(() => [
    {
      label: "Call",
      icon: <PhoneIcon />,
      onClick: (lead: Lead) => alert(`Call: ${lead.contact}`),
    },
    {
      label: "Email",
      icon: <EmailIcon />,
      onClick: (lead: Lead) => alert(`Email: ${lead.contact}`),
    },
  ]);

  return (
    <main class="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-7xl space-y-8">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">
            Generic Card List Demo
          </h1>
          <p class="text-muted-foreground">
            Reusable component supporting any entity type
          </p>
          <A href="/" class="text-sky-600 hover:underline text-sm">
            ← Back to Home
          </A>
        </div>

        {/* Stores Example */}
        <section class="space-y-4">
          <h2 class="text-2xl font-semibold">Stores</h2>
          <GenericCardList
            items={stores}
            getId={(store) => store.id}
            renderHeader={(store) => (
              <div>
                <h3 class="font-semibold text-lg truncate">{store.name}</h3>
                <p class="text-sm text-muted-foreground">{store.location}</p>
              </div>
            )}
            renderContent={(store) => (
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Revenue:</span>
                  <span class="font-medium">
                    ${store.revenue.toLocaleString()}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Status:</span>
                  <span
                    class={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      store.status === "active"
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {store.status}
                  </span>
                </div>
              </div>
            )}
            onItemClick={(store) => alert(`Clicked: ${store.name}`)}
            actions={storeActions()}
          />
        </section>

        {/* Users Example */}
        <section class="space-y-4">
          <h2 class="text-2xl font-semibold">Users</h2>
          <GenericCardList
            items={users}
            getId={(user) => user.id}
            renderHeader={(user) => (
              <div>
                <h3 class="font-semibold text-base truncate">{user.email}</h3>
                <p class="text-xs text-muted-foreground">{user.role}</p>
              </div>
            )}
            renderContent={(user) => (
              <div class="text-sm">
                <span class="text-muted-foreground">Last login: </span>
                <span>{user.lastLogin}</span>
              </div>
            )}
            onItemClick={(user) => alert(`View profile: ${user.email}`)}
            actions={userActions()}
          />
        </section>

        {/* Leads Example */}
        <section class="space-y-4">
          <h2 class="text-2xl font-semibold">Sales Leads</h2>
          <GenericCardList
            items={leads}
            getId={(lead) => lead.id}
            renderHeader={(lead) => (
              <div>
                <h3 class="font-semibold text-lg truncate">{lead.company}</h3>
                <p class="text-sm text-muted-foreground">{lead.contact}</p>
              </div>
            )}
            renderContent={(lead) => (
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Value:</span>
                  <span class="font-bold text-primary">
                    ${lead.value.toLocaleString()}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Stage:</span>
                  <span class="rounded bg-info px-2 py-0.5 text-xs font-medium text-info-foreground">
                    {lead.stage}
                  </span>
                </div>
              </div>
            )}
            onItemClick={(lead) => alert(`Open lead: ${lead.company}`)}
            actions={leadActions()}
          />
        </section>
      </div>
    </main>
  );
}
