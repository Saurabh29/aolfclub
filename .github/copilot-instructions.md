# Copilot Instructions for aolf-club

## Project Overview
SolidStart (SolidJS) full-stack TypeScript app with modular architecture for UI, data, and server logic. Structured for extensibility: collections, queries, and data sources are abstracted for easy adaptation to new entities or backends.

## Core Architectural Principle
> **Query is data, not behavior.**

`QuerySpec` is a UI-agnostic, backend-agnostic query language. UI produces it, DataSources execute it. TanStack Table adapts TO QuerySpec—QuerySpec does NOT depend on TanStack.

**Architecture Flow:**
```
UI (ResponsiveCollectionView)
  ├─ Mobile: CollectionCards
  └─ Desktop: CollectionTable (TanStack Table)
            ↓
    CollectionQueryController (owns QuerySpec state)
            ↓
    SolidStart query() / action()
            ↓
    Service Layer (users.service.ts)
            ↓
    DataSource Instances (usersDataSource)
            ↓
    DataSource Implementation (DummyDataSource or DynamoDBDataSource)
```

## Key Architectural Patterns
- **Collection Query Controllers**: [create-collection-query-controller.ts](../src/lib/controllers/create-collection-query-controller.ts) owns QuerySpec as single source of truth. One controller → many UIs.
- **Schemas**: Zod schemas in `src/lib/schemas/`. Domain entities in `domain/`, query contracts in `query/`.
- **Data Sources**: Abstracted via DataSource interface. Swap implementations by changing [instances.ts](../src/server/data-sources/instances.ts) only.
- **API Layer**: SolidStart `query()` wrappers in `src/server/api/`.
- **Service Layer**: Business logic in `src/server/services/`, delegates to data sources.
- **TanStack Table Isolation**: TanStack types stay INSIDE `CollectionTable`—controller uses QuerySpec only.

## Developer Workflows
- **Dev Server**: `pnpm dev` (hot reload)
- **Build**: `pnpm build`
- **Start Production**: `pnpm start`

## Canonical QuerySpec Rules
- ✅ Use `sorting` (array) — NEVER `sort` (singular)
- ✅ Use `pageSize` + `pageIndex` — NEVER `limit` or `offset`
- ✅ Compute offset: `offset = pageIndex × pageSize` in implementation
- ✅ Use generic `QuerySpec<TField>` for type-safe field names
- ❌ No `mode` field in pagination — cursor vs offset determined by cursor presence

## Project-Specific Conventions
- **Type Safety**: Always use Zod schemas for new entities and API contracts.
- **Query Pattern**: For any new entity, implement:
  - Zod schema in `src/lib/schemas/domain/`
  - DataSource implementation (dummy or real)
  - Service in `src/server/services/`
  - API endpoint in `src/server/api/`
  - UI controller and components
- **Pagination**: Use offset or cursor-based pagination as in `DummyDataSource`.
- **Field Names**: Use `keyof Entity` types for field-safe queries (see `LocationField`).
- **UI Components**: Always reuse Solid UI components from `~/components/ui/*` (Badge, Button, Card, Table, etc.). Only create custom components for domain-specific needs.
- **Filter Operators**: DataSources decide execution strategy (push-down vs post-fetch). Never remove operators from FilterOperator enum.

## Integration Points
- **Google Maps**: Uses `@googlemaps/js-api-loader` for place search widgets.
- **Tailwind CSS**: Configured via `tailwind.config.cjs` and used throughout UI.
- **TanStack Table**: Used for advanced table features in collections.

## Examples
- See [create-collection-query-controller.ts](../src/lib/controllers/create-collection-query-controller.ts) for the canonical pattern for data-driven UIs.
- See [dummy.data-source.ts](../src/server/data-sources/dummy.data-source.ts) for how to implement a new data source.
- See [location.schema.ts](../src/lib/schemas/domain/location.schema.ts) for how to define a new entity schema.

## File/Folder Guide
- `src/components/collection/` — UI for collections (table, cards, etc.)
- `src/lib/controllers/` — Query controllers for stateful data UIs
- `src/lib/schemas/` — Zod schemas for all data and queries
- `src/server/api/` — API endpoints (SolidStart queries)
- `src/server/services/` — Business logic, data orchestration
- `src/server/data-sources/` — Data source implementations

---
For new features, follow the patterns above. Reference existing files for examples before introducing new abstractions or dependencies.
