import { z } from "zod";

/**
 * Capability-based authorization model.
 *
 * Capabilities are fine-grained API permissions that decouple
 * "who can call this API" from "who can see this page".
 *
 * Role → Capability mappings are stored in DynamoDB:
 *   ROLE#<roleName> / CAP#<capability> → { permission: "ALLOW" }
 *
 * Page visibility for the nav menu is derived from capabilities
 * using PAGE_CAPABILITY_MAP (code, not DB).
 */

// ---------------------------------------------------------------------------
// All capabilities in the system
// ---------------------------------------------------------------------------

export const ALL_CAPABILITIES = [
  "leads:read",
  "leads:write",
  "tasks:read",
  "tasks:write",
  "members:read",
  "members:write",
  "community:read",
  "community:write",
  "locations:read",
  "locations:write",
  "import:execute",
] as const;

export const CapabilityEnum = z.enum(ALL_CAPABILITIES);
export type Capability = z.infer<typeof CapabilityEnum>;

// ---------------------------------------------------------------------------
// Role → Capability default matrix (used by seed script)
// ---------------------------------------------------------------------------

export const ROLE_CAPABILITIES: Record<string, readonly Capability[]> = {
  ADMIN: ALL_CAPABILITIES,
  TEACHER: [
    "leads:read",
    "leads:write",
    "tasks:read",
    "tasks:write",
    "members:read",
    "members:write",
    "community:read",
    "community:write",
    "locations:read",
    "import:execute",
  ],
  VOLUNTEER: [
    "leads:read",
    "tasks:read",
  ],
};

// ---------------------------------------------------------------------------
// Page visibility: which capability is needed to *see* a page in the nav
// ---------------------------------------------------------------------------

export const PAGE_CAPABILITY_MAP: Record<string, Capability> = {
  leads: "leads:read",
  tasks: "tasks:write",
  community: "community:read",
  locations: "locations:read",
};

/** All navigable page names (matches AppShell nav items). */
export const ALL_PAGES = Object.keys(PAGE_CAPABILITY_MAP);
