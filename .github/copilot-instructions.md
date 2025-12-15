# AI Coding Agent Instructions

## Project Overview

**AOLF Club** is a multi-tenant location management system for educational centers. Users authenticate via OAuth (GitHub/Google), admins manage locations, and roles are assigned per-location. The app supports CSV imports, user invitations, and location-specific URLs for access control.

## Architecture & Key Patterns

### Framework Stack

- **SolidJS** (reactive UI library with fine-grained reactivity using signals)
- **SolidStart** (`@solidjs/start`) for SSR/routing/meta-framework features - SolidJS's meta-framework like Next.js for React
- **Vinxi** as the build tool and dev server
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **TypeScript** with `jsxImportSource: "solid-js"`
- **AWS DynamoDB** for database (single table design with GSI indexes)
- **@solid-mediakit/auth** with Auth.js for OAuth authentication
- **Zod** for schema validation (both DB and UI layers)

### Database Layer - AWS DynamoDB Single Table Design

**CRITICAL ARCHITECTURE**: All entities stored in ONE table with composite keys. **NO GSI (Global Secondary Indexes)** - all access patterns use PK/SK patterns.

#### Table Structure (See `src/server/db/client.ts` and `docs/DYNAMODB_SCHEMA_NO_GSI.md`)

- **Primary Keys**: `PK: "EntityType#uuid"` + `SK: "METADATA"` for entity metadata
- **Email Lookup**: `PK: "EMAIL#user@example.com"` + `SK: "USER"` (no GSI needed)
- **Relationships**: Bidirectional items (e.g., `PK: "USER#uuid" + SK: "GROUP#uuid"` AND `PK: "GROUP#uuid" + SK: "USER#uuid"`)
- **Queries**: Use `begins_with(SK, "PREFIX#")` for one-to-many relationships

#### Repository Pattern (See `src/server/db/repositories/`)

All repositories extend `BaseRepository<TSchema>` providing:

- `create(data)` - Auto-generates ULID, timestamps, validates with Zod
- `getById(id)`, `getByIdOrThrow(id)`
- `update(id, updates)`, `softDelete(id)`, `hardDelete(id)`
- `list(options)` with pagination
- `batchGet(ids)`, `exists(id)`

**Entity-Specific Repositories**:

- `userRepository` - All user types (teacher, volunteer, member, guest, admin)
- `locationRepository`
- `roleRepository`, `permissionRepository`, `userGroupRepository`
- `emailRepository` (for identity resolution)
- `relationshipRepository` (generic graph edges for many-to-many)

**Example Usage**:

```typescript
import { userRepository, locationRepository } from "~/server/db/repositories";

// Create user (OAuth flow)
const user = await userRepository.create({
  name: "John Doe",
  email: "john@example.com",
  userType: null, // Will be assigned by admin
  status: "pending_assignment",
});

// Create user (CSV import flow)
const teacher = await userRepository.create({
  name: "Jane Smith",
  email: "jane@example.com",
  userType: "teacher",
  status: "active",
  teacherData: {
    subject: "Mathematics",
    qualification: "M.Ed",
  },
});

// Get pending users
const pending = await userRepository.findPending();

// Assign user type
await userRepository.assignUserType(userId, "teacher");
```

**Permission System (No GSI)**:

- User → UserGroup → Role → Permission hierarchy
- Email lookup: `PK: "EMAIL#email"` + `SK: "USER"` returns `userId`
- User's groups: Query `PK: "USER#id"` with `SK begins_with GROUP#`
- Group's roles: Query `PK: "GROUP#id"` with `SK begins_with ROLE#`
- Role's permissions: Query `PK: "ROLE#id"` with `SK begins_with PERMISSION#`
- Bidirectional relationships maintained with transaction writes (see `docs/DYNAMODB_SCHEMA_NO_GSI.md`)

### Schema Layer - Two-Tier Validation

**DB Schemas** (`src/lib/schemas/db/`):

- Server-side only, extend `BaseEntitySchema` (id, entityType, createdAt, updatedAt)
- Strict validation for persistence
- Example: `TeacherSchema`, `LocationSchema`, `RelationshipSchema`

**UI Schemas** (`src/lib/schemas/ui/`):

- Form validation, user input
- Subset of DB schema fields (no timestamps, computed fields)
- Example: `AddLocationFormSchema` (no id/timestamps, optional Google Places data)

**Why Two Schemas?**

- DB schemas enforce storage contracts
- UI schemas match form requirements
- Prevents leaking DB internals to client

### Server Actions Pattern

All mutations use SolidStart server actions with `"use server"` directive (see `src/server/actions/locations.ts`):

```typescript
"use server"; // File-level directive

export async function createLocation(formData: AddLocationForm) {
  "use server"; // Function-level directive

  // 1. Validate with UI schema
  const validatedData = AddLocationFormSchema.parse(formData);

  // 2. Transform to DB entity
  const location: Location = {
    id: ulid(),
    entityType: "Location",
    ...validatedData,
    createdAt: now,
    updatedAt: now,
  };

  // 3. Validate with DB schema
  LocationSchema.parse(location);

  // 4. Persist via repository
  await locationRepository.create(location);

  return { success: true, data: location };
}
```

**Rules**:

- Always use `"use server"` at both file and function level for server actions
- Validate input with UI schema, entity with DB schema
- Return `{ success: boolean, data?: T, error?: string }` shape
- Handle errors with try/catch, return error messages to client

### Authentication & Authorization

#### OAuth Setup (See `src/server/auth/index.ts`)

- **Providers**: GitHub, Google (via `@solid-mediakit/auth`)
- **Config**: `authOptions: SolidAuthConfig` with callbacks
- **Route**: `/api/auth/*` handled by `[...solidauth].ts`
- **Client**: `useAuth()` hook from `@solid-mediakit/auth/client`

**App-level Session**:

```tsx
// src/app.tsx wraps all routes
<SessionProvider>
  <Suspense>{props.children}</Suspense>
</SessionProvider>
```

**Protected Routes**:
Use `(protected)` route group for auth-required pages (see `src/routes/(protected)/locations.tsx`).

**User Creation Workflows** (See `docs/USER_CREATION_WORKFLOWS.md`):

1. **OAuth Login**: User created with `status: "pending_assignment"`, `userType: null`
   - Limited access until admin assigns userType and group
2. **CSV Import**: User created with `status: "active"`, userType known from CSV
   - Type-specific data stored in nested objects (`teacherData`, `volunteerData`, etc.)
3. **Permission Assignment**: Admin assigns user to UserGroup(s), which have Roles with Permissions
4. **Email Lookup**: Always create `PK: EMAIL#...` item for both flows (no GSI needed)

### UI Component Library - solid-ui

**IMPORTANT: Always use solid-ui components when available before writing custom code.**

- **Documentation**: https://www.solid-ui.com/docs/components/
- **Installation**: `pnpx solidui-cli@latest add <component-name>`
- **Import Pattern**: `import { Component } from "~/components/ui/component-name"`

**Available Components** (always check docs for latest):

- Layout: Flex, Grid
- UI: Accordion, Alert, AlertDialog, Avatar, Badge, Button, Card, Carousel, Checkbox, Collapsible, Combobox, Command, ContextMenu, Dialog, DropdownMenu, HoverCard, Input, Label, Menubar, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Sheet, Skeleton, Slider, Switch, Tabs, Textarea, Toast, Toggle, ToggleGroup, Tooltip
- Data Display: Table, DataTable
- Visualizations: BarList, Charts, DeltaBar, Progress, ProgressCircle
- Forms: Form validation with Zod integration

**Component Usage Priority**:

1. **First**: Check if solid-ui has the component (https://www.solid-ui.com/docs/components/)
2. **Second**: Install via CLI if not already present: `pnpx solidui-cli@latest add <component>`
3. **Last Resort**: Create custom component only if solid-ui doesn't provide it

**Example solid-ui Usage**:

```tsx
// Instead of custom dropdown, use solid-ui DropdownMenu
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";

// Instead of custom card, use solid-ui Card
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";

// Instead of custom badge, use solid-ui Badge
import { Badge } from "~/components/ui/badge";
```

**Benefits of Using solid-ui**:

- Built-in accessibility (ARIA attributes, keyboard navigation)
- Consistent styling across the app
- Less custom code to maintain
- Battle-tested components from Kobalte (underlying UI library)
- Automatic click-outside, focus management, animations

### Routing

File-based routing in `src/routes/`:

- `index.tsx` → `/` (home page)
- `about.tsx` → `/about`
- `(protected)/locations.tsx` → `/locations` (auth-protected via route group)
- `[...404].tsx` → catch-all 404 handler (bracket syntax for dynamic/catch-all routes)

Navigation uses `<A>` component from `@solidjs/router`, NOT standard `<a>` for SPA routing.

### Data Fetching Pattern

Use `createResource` for async data loading (see `src/routes/(protected)/locations.tsx`):

```tsx
const [locations, { refetch, mutate }] = createResource(async () => {
  const result = await getLocations(); // Server action
  if (!result.success) throw new Error(result.error);
  return result.data;
});

// Refetch after mutation
await createLocation(formData);
refetch();
```

**Rules**:

- Use `createResource` for initial page data, NOT `createEffect`
- Server actions return `{ success, data?, error? }` shape
- Always check `result.success` before accessing `result.data`
- Use `refetch()` to reload data after mutations

### Entry Points

- **Client**: `src/entry-client.tsx` mounts `<StartClient />` to DOM
- **Server**: `src/entry-server.tsx` exports handler with `<StartServer />` and HTML document template
- **Root**: `src/app.tsx` defines app shell with `<Router>`, `<Nav>`, and `<Suspense>` wrapper

### Styling System

Uses **Tailwind CSS v4** with:

- CSS variables for design tokens in `src/app.css` (`:root` with `--background`, `--primary`, etc.)
- `tailwind.config.cjs` extends theme with semantic color system (primary, secondary, destructive, info, success, warning, error)
- **LIGHT MODE ONLY**: Dark mode is NOT supported - never use `dark:` classes or dark mode variants
- `cn()` utility in `src/lib/utils.ts` combines `clsx` and `tailwind-merge` for conditional class merging

**CRITICAL STYLING RULES**:

- **NO DARK MODE**: This application only supports light mode
- **NEVER** use `dark:` prefix in class names (e.g., ~~`dark:bg-gray-900`~~)
- **NEVER** use `[.dark &]` or `[data-kb-theme="dark"] &` selectors
- Use explicit light mode colors: `bg-white`, `text-gray-900`, `border-gray-200`, etc.
- The dark mode CSS variables in `app.css` are disabled and should not be used

**Example pattern** (see `src/components/Counter.tsx`):

```tsx
class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300"
```

### Component Patterns

- Use **SolidJS signals** for reactivity: `createSignal()` not `useState()`
- Components are functions returning JSX (no FC wrapper)
- Use `class` not `className` in JSX
- Import path alias `~/*` maps to `src/*` (configured in tsconfig.json)

**Example** (see `src/components/Counter.tsx`):

```tsx
const [count, setCount] = createSignal(0);
<button onClick={() => setCount(count() + 1)}>Clicks: {count()}</button>;
```

### UI Component Infrastructure

- `ui.config.json` configures shadcn-like UI component generation
- Components alias: `~/components/ui` (empty currently, but setup for component library)
- Utils alias: `~/lib/utils`

## Developer Workflow

### Commands (pnpm-based)

```bash
pnpm dev      # Start dev server (Vinxi)
pnpm build    # Build for production
pnpm start    # Run production build
```

### Requirements

- **Node.js ≥22** (specified in package.json engines)
- Use **pnpm** not npm/yarn (pnpm-lock.yaml present)

### Adding New Routes

Create `.tsx` files in `src/routes/`:

- Export default component function
- Use `<A>` for internal navigation
- Dynamic routes use bracket syntax: `[id].tsx`

### State Management

- Local state: `createSignal()`, `createMemo()`, `createEffect()`
- Props are getters in SolidJS - access with `props.value()` if reactive, or destructure carefully
- Context: use `createContext` from "solid-js"

### Active Path Detection

Pattern from `src/components/Nav.tsx`:

```tsx
const location = useLocation();
const active = (path: string) =>
  path == location.pathname ? "border-sky-600" : "border-transparent";
```

## Critical Conventions

1. **JSX Syntax**: Use `class` not `className`, `for` not `htmlFor`
2. **Imports**: Always use `~/` path alias for src imports
3. **Reactivity**: Signals are functions - call `count()` to read, `setCount(value)` to write
4. **SSR-Safe**: Components may render on server - avoid direct DOM access in component body
5. **File Routing**: Route files must export default component, organize by file structure not config
6. **Server Actions**: Always use `"use server"` directive at file AND function level
7. **Data Flow**: UI Schema → Server Action → DB Schema → Repository → DynamoDB
8. **IDs**: Use `ulid()` for all entity IDs (time-ordered, sortable, 26 chars)

## Testing & Debugging

### Database Testing

```bash
pnpm db:test  # Test DynamoDB connection (src/server/db/test-connection.ts)
```

### Local DynamoDB Setup

See `src/server/db/repositories/README.md` for DynamoDB Local setup instructions.

### Dev Server

No test framework configured. Dev server runs on default Vinxi port with HMR enabled.

## External Dependencies

### AWS Services

- **DynamoDB** - Primary datastore (single table design, **NO GSI**)
  - Table: `aolfclub-entities` (configurable via `DYNAMODB_TABLE_NAME`)
  - All queries use PK/SK patterns with `begins_with` for relationships
  - Email lookups via dedicated items: `PK: "EMAIL#email"`, `SK: "USER"`

### OAuth Providers

- **GitHub** - Requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- **Google** - Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Auth.js handles sessions via `AUTH_SECRET`

### Google Places API (Optional)

- **API Key**: `VITE_GOOGLE_MAPS_API_KEY` (see `GOOGLE_PLACES_SETUP.md`)
- Fallback to manual mode if unavailable
- Used in `AddLocationDialog` for address autocomplete

## Common Tasks

### Adding a New Entity Type

1. Create DB schema in `src/lib/schemas/db/` extending `BaseEntitySchema`
2. Create UI schema in `src/lib/schemas/ui/` for forms
3. Add entity type to `AllEntityTypeSchema` in `base.schema.ts`
4. Create repository in `src/server/db/repositories/entities/`
5. Export singleton in `src/server/db/repositories/index.ts`
6. Create server actions in `src/server/actions/`
7. Create UI page/component with `createResource` for data loading

### Adding a New Server Action

1. Create file in `src/server/actions/` with `"use server"` directive
2. Accept UI schema type as input parameter
3. Validate with `UISchema.parse(input)`
4. Transform to DB entity with timestamps, ULID
5. Validate with `DBSchema.parse(entity)`
6. Use repository to persist
7. Return `{ success: boolean, data?: T, error?: string }`

### Adding a New Route

1. Create `.tsx` in `src/routes/`
2. Use `(protected)` folder for auth-required routes
3. Export default component function
4. Use `createResource` for data loading
5. Use `<A>` for navigation, not `<a>`

## Gotchas & Constraints

### SolidJS Reactivity

- Props are NOT reactive by default - destructure carefully
- Signals must be called as functions: `count()` not `count`
- Effects run immediately - use `createMemo` for derived state

### DynamoDB Single Table

- All entities share one table - careful with key construction
- **NO GSI** - use bidirectional relationship items instead
- Email lookups use dedicated `PK: EMAIL#...` items, not GSI
- Batch operations limited to 100 items
- No joins - denormalize data or use relationship entities
- Permission checks require 3-4 queries (cache results in session/Redis)

### Light Mode Only

- **NO DARK MODE** support - never use `dark:` classes
- Explicitly use light colors: `bg-white`, `text-gray-900`
- Dark mode CSS variables in `app.css` are disabled

### Server Actions

- Must use `"use server"` at BOTH file AND function level
- Cannot return functions or class instances to client
- All data serialized to JSON - no Date objects, use ISO strings

### solid-ui Components

- Always check https://www.solid-ui.com/docs first before custom components
- Use `pnpx solidui-cli@latest add <component>` to install
- Components are pre-styled but customizable via Tailwind classes
