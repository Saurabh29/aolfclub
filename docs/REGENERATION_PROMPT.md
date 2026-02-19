# Multi-Phase Implementation Prompt for AOLF Club Application

## 🔑 Core Architectural Principle

> **Query is data, not behavior.**

Filtering, sorting, and pagination are *described* once using a canonical query language (`QuerySpec`) and *executed differently* depending on the data source (in-memory, DynamoDB, mock).

**TanStack Table adapts TO QuerySpec — QuerySpec does NOT depend ON TanStack.**

### Key Rules:
- ✅ `QuerySpec` is **UI-agnostic** - No TanStack, SolidJS, or React dependencies
- ✅ `QuerySpec` is **backend-agnostic** - Works with DynamoDB, SQL, in-memory
- ✅ **DataSources execute QuerySpec** - They never mutate it
- ✅ **UI adapters convert TO QuerySpec** - One-way flow from UI state
- ❌ **No framework leakage** - Domain knows nothing about UI or database

---

## Project Context

You are building a **SolidStart (SolidJS)** application for the AOLF Club using:
- **Framework**: SolidStart with Vinxi (dev/build/start)
- **Styling**: TailwindCSS
- **UI Components**: Solid UI (https://www.solid-ui.com/) - a port of shadcn/ui for SolidJS
- **Authentication**: OAuth (GitHub/Google) via start-authjs
- **Data Storage**: Will use DynamoDB later (start with dummy data)
- **File-based Routing**: `src/routes/*` with `FileRoutes`
- **Import Alias**: `~` maps to `src`
- **Table Library**: TanStack Table v8 for SolidJS (`@tanstack/solid-table`)
- **Responsive Design**: Cards for mobile, Table for desktop (auto-switch)

**UI Component Rule:**
> Always reuse Solid UI components from https://www.solid-ui.com/
> 
> Before creating any new UI primitive (Button, Dialog, Table, Card, Badge, Input, etc.), check if it exists in Solid UI.
> Import from `~/components/ui/*` where Solid UI components are installed.
> Only create custom components for domain-specific needs not covered by Solid UI.

**Core Principles:**
1. **No framework leakage** - Domain logic is independent of UI framework
2. **Explicit instantiation** - Direct data source instances, no resolver/registry
3. **Data source abstraction** - UI never knows about data source implementation
4. **Type safety** - Zod schemas for runtime validation, TypeScript for compile-time
5. **Server-first** - Use SolidStart server functions (`query`/`action`)
6. **Progressive enhancement** - Start simple, add complexity incrementally

**Architecture Flow:**
```
UI Layer (ResponsiveCollectionView)
  ├─ Mobile: CollectionCards (renders from QueryResult)
  └─ Desktop: CollectionTable (TanStack Table, controlled by QuerySpec)
            ↓
    CollectionQueryController (Owns QuerySpec state)
      ├─ setFilters(), setSorting(), setPagination()
      └─ TanStack Table binds to QuerySpec (one-way sync)
            ↓
    SolidStart query() / action() (Server Functions)
            ↓
    Service Layer (users.service.ts, locations.service.ts)
            ↓
    Data Source Instances (usersDataSource, locationsDataSource)
            ↓
    DataSource Implementation (DummyDataSource or DynamoDBDataSource)
```

**Key Points:**
1. **QuerySpec is the single source of truth** - Controller owns it, components read/write through controller methods
2. **No separate adapter layer** - TanStack Table state syncs TO QuerySpec inside CollectionTable (internal detail)
3. Services directly import data source instances. To swap from Dummy to DynamoDB, change ONE file (`instances.ts`)
4. TanStack Table is a consumer of QuerySpec, not a producer

---

## Phase 1: Domain & Contracts (No Framework Leakage)

### Goal
Define pure domain types, contracts, and schemas with **ZERO** knowledge of:
- DynamoDB or any database
- SolidJS or any UI framework
- HTTP or REST APIs

### File Structure
```
src/lib/
  types.ts                          # Core ApiResult<T> wrapper
  schemas/
    query/
      index.ts                      # Re-exports
      query-spec.schema.ts          # QuerySpec, FilterCondition, SortSpec, PaginationSpec
      query-result.schema.ts        # QueryResult<T>, PageInfo
    db/
      types.ts                      # Enums: UserType, GroupType, etc.
      user.schema.ts                # User domain entity
      location.schema.ts            # Location domain entity
      group.schema.ts               # Group domain entity
      role.schema.ts                # Role domain entity
      page.schema.ts                # Page domain entity
      index.ts                      # Re-exports
    ui/
      user-form.schema.ts           # UI-specific form validation
      location-form.schema.ts
      index.ts
```

### 1.1 Core Wrapper Type

**File**: `src/lib/types.ts`
```typescript
/**
 * ApiResult<T> - Universal success/error wrapper
 * Used by all services, actions, and data sources.
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### 1.2 Query Contracts (Critical Foundation)

**File**: `src/lib/schemas/query/query-spec.schema.ts`

Define the **universal query language** that works across ALL data sources:

```typescript
import { z } from "zod";

/**
 * FilterOperator - Supported filter operations
 * 
 * EXECUTION STRATEGY:
 * - DataSources decide HOW to execute each operator
 * - InMemoryDataSource: Executes all operators in-memory
 * - DynamoDBDataSource: Push-down capable operators (eq, gt, lt, gte, lte, in) to DynamoDB;
 *   Post-fetch operators (contains, startsWith, endsWith, neq) applied after retrieval
 * - DataSources MAY reject unsupported operators in strict mode
 * 
 * ❌ Do NOT remove operators from this list
 * ✅ Document execution capabilities per DataSource implementation
 * 
 * Keep minimal and universal (works for in-memory AND databases)
 * Rule: Only add operators that ALL data sources can support
 */
export const FilterOperatorSchema = z.enum([
  "eq",        // Equals
  "neq",       // Not equals
  "contains",  // String contains (case-insensitive)
  "startsWith", // String starts with
  "endsWith",  // String ends with
  "gt",        // Greater than
  "lt",        // Less than
  "gte",       // Greater than or equal
  "lte",       // Less than or equal
  "in",        // Value in array
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * FilterCondition - Single filter criterion
 * Represents: field <operator> value
 * 
 * Generic TField ensures type-safe field names
 */
export interface FilterCondition<TField extends string = string> {
  field: TField;
  op: FilterOperator;
  value: unknown; // Runtime type depends on field
}

export const FilterConditionSchema = z.object({
  field: z.string().min(1),
  op: FilterOperatorSchema,
  value: z.unknown(),
});

/**
 * SortSpec - Sort specification
 */
export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export interface SortSpec<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export const SortSpecSchema = z.object({
  field: z.string().min(1),
  direction: SortDirectionSchema,
});

/**
 * PaginationSpec - Unified pagination specification
 * Supports both offset-based (pageSize + pageIndex) and cursor-based (pageSize + cursor)
 * 
 * CANONICAL SHAPE:
 * - pageSize: Required number of items per page
 * - pageIndex: Zero-based page number (offset = pageIndex × pageSize)
 * - cursor: Opaque cursor string for cursor-based pagination
 * 
 * Rule: Use pageSize + pageIndex (not limit / offset)
 */
export interface PaginationSpec {
  pageSize: number;      // Always required
  pageIndex?: number;    // For offset-based (default: 0)
  cursor?: string;       // For cursor-based
}

export const PaginationSpecSchema = z.object({
  pageSize: z.number().int().positive().max(100).default(20),
  pageIndex: z.number().int().nonnegative().optional(),
  cursor: z.string().optional(),
});

/**
 * QuerySpec - Complete query specification
 * 
 * This is the CANONICAL query language:
 * - UI produces this
 * - DataSources consume this
 * - NO UI framework knowledge
 * - NO database-specific concepts
 * 
 * Generic TField provides compile-time field name checking
 * 
 * @example
 * ```ts
 * type UserField = "displayName" | "email" | "userType";
 * const spec: QuerySpec<UserField> = {
 *   filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
 *   sorting: [{ field: "displayName", direction: "asc" }],
 *   pagination: { mode: "offset", pageSize: 20, pageIndex: 0 }
 * };
 * ```
 */
export interface QuerySpec<TField extends string = string> {
  filters: FilterCondition<TField>[];
  sorting: SortSpec<TField>[];
  pagination: PaginationSpec;
}

export const QuerySpecSchema = z.object({
  filters: z.array(FilterConditionSchema).default([]),
  sorting: z.array(SortSpecSchema).default([]),
  pagination: PaginationSpecSchema,
});

export type QuerySpecInput = z.input<typeof QuerySpecSchema>;
export type QuerySpecOutput = z.output<typeof QuerySpecSchema>;
```

**File**: `src/lib/schemas/query/query-result.schema.ts`

```typescript
import { z } from "zod";

/**
 * PageInfo - Pagination metadata
 */
export const PageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  nextCursor: z.string().optional(),  // For cursor-based
  totalCount: z.number().int().nonnegative().optional(), // For offset-based
});

export type PageInfo = z.infer<typeof PageInfoSchema>;

/**
 * QueryResult<T> - Paginated response wrapper
 * API-safe: no internal implementation details leaked
 * 
 * Items array is readonly to prevent accidental mutation and encourage immutable data flow
 */
export interface QueryResult<T> {
  items: readonly T[];
  pageInfo: PageInfo;
}

/**
 * Helper to create QueryResult
 */
export function createQueryResult<T>(
  items: T[],
  pageInfo: PageInfo
): QueryResult<T> {
  return { items, pageInfo };
}
```

### 1.3 Domain Entities

**File**: `src/lib/schemas/db/types.ts`
```typescript
/**
 * Domain enums (no database knowledge)
 */
export type UserType = "Volunteer" | "Lead" | "Partner";
export type GroupType = "TEACHER" | "VOLUNTEER";
export type RoleType = "Admin" | "Manager" | "Viewer";
```

**File**: `src/lib/schemas/db/user.schema.ts`
```typescript
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().ulid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  userType: z.enum(["Volunteer", "Lead", "Partner"]),
  isAdmin: z.boolean().default(false),
  activeLocationId: z.string().ulid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
```

**File**: `src/lib/schemas/db/location.schema.ts`
```typescript
import { z } from "zod";

export const LocationSchema = z.object({
  id: z.string().ulid(),
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Location = z.infer<typeof LocationSchema>;
```

**Action Items**:
- ✅ Create `src/lib/types.ts` with `ApiResult<T>`
- ✅ Create query contracts: `QuerySpec`, `QueryResult<T>`, `FilterCondition`, `SortSpec`, `PaginationSpec`
- ✅ Create domain entities: `User`, `Location`, `Group`, `Role`, `Page`
- ✅ NO imports from SolidJS, DynamoDB, or any framework
- ✅ Validate with TypeScript compilation (`pnpm run build`)

**Validation**:
```bash
# Must pass:
pnpm run build
# Confirm no framework imports in src/lib/schemas/
```

---

## Phase 2: Dummy DataSource (Test Data Generation)

### Goal
Create an in-memory data source with realistic dummy data for development and testing. NO database integration yet.

### File Structure
```
src/server/
  data-sources/
    data-source.interface.ts       # DataSource<T> interface
    dummy.data-source.ts           # In-memory implementation
    dummy-data/
      users.ts                     # Generate dummy users
      locations.ts                 # Generate dummy locations
      groups.ts                    # Generate dummy groups
      index.ts                     # Export all generators
    index.ts                       # Re-exports
```

### 2.1 DataSource Interface

**File**: `src/server/data-sources/data-source.interface.ts`

```typescript
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * DataSource<T, TField> - Universal data access interface
 * 
 * Core Principle: DataSources EXECUTE QuerySpec — they never mutate it.
 * 
 * Rules:
 * ✅ Implementations decide HOW to execute queries
 * ✅ UI only knows QuerySpec and QueryResult
 * ✅ Swap implementations without changing UI code
 * ✅ DataSources execute what they can, gracefully handle what they can't
 * ❌ NO database-specific methods (no DynamoDB, no SQL)
 * ❌ NO implementation details leaked to callers
 * 
 * @template T The entity type (User, Location, Group, etc.)
 * @template TField Field names for type-safe queries (optional)
 */
export interface DataSource<T, TField extends string = string> {
  /**
   * Execute a query
   * 
   * Implementation strategies:
   * - InMemoryDataSource: Execute everything (filter, sort, paginate)
   * - DynamoDBDataSource: Push down what DynamoDB can do, pull up the rest
   * - CachedDataSource: Hybrid approach
   * 
   * @param query - Universal query specification
   * @returns Paginated result
   */
  query(query: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>>;

  /**
   * Get item by ID (optional optimization)
   * Useful for direct key lookups in DynamoDB or indexed lookups
   */
  getById?(id: string): Promise<ApiResult<T | null>>;

  /**
   * Get total count (optional, for offset pagination)
   * DynamoDB may not support this efficiently
   */
  getCount?(filters?: QuerySpec<TField>["filters"]): Promise<ApiResult<number>>;
}
```

### 2.2 Dummy Data Generators

**File**: `src/server/data-sources/dummy-data/users.ts`

```typescript
import { ulid } from "ulid";
import type { User } from "~/lib/schemas/db";

/**
 * Generate realistic dummy users for testing
 */
export function generateDummyUsers(count: number): User[] {
  const users: User[] = [];
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"];
  const userTypes: Array<User["userType"]> = ["Volunteer", "Lead", "Partner"];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    users.push({
      id: ulid(),
      email,
      displayName: `${firstName} ${lastName}`,
      userType: userTypes[i % userTypes.length],
      isAdmin: i === 0, // First user is admin
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return users;
}
```

**File**: `src/server/data-sources/dummy-data/locations.ts`

```typescript
import { ulid } from "ulid";
import type { Location } from "~/lib/schemas/db";

export function generateDummyLocations(count: number): Location[] {
  const locations: Location[] = [];
  const cities = ["Seattle", "Portland", "San Francisco", "Los Angeles", "Denver"];
  const states = ["WA", "OR", "CA", "CA", "CO"];
  
  for (let i = 0; i < count; i++) {
    const cityIndex = i % cities.length;
    locations.push({
      id: ulid(),
      code: `LOC${String(i + 1).padStart(3, '0')}`,
      name: `${cities[cityIndex]} Community Center ${i + 1}`,
      address: `${100 + i} Main Street`,
      city: cities[cityIndex],
      state: states[cityIndex],
      zipCode: `${98000 + i}`,
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return locations;
}
```

### 2.3 Dummy DataSource Implementation

**File**: `src/server/data-sources/dummy.data-source.ts`

```typescript
import type { QuerySpec, QueryResult, FilterCondition } from "~/lib/schemas/query";
import type { DataSource } from "./data-source.interface";
import type { ApiResult } from "~/lib/types";

/**
 * DummyDataSource - In-memory implementation with static data
 * Perfect for development and testing without database
 * 
 * Generic TField provides type-safe field names
 */
export class DummyDataSource<
  T extends { id: string },
  TField extends string = string
> implements DataSource<T, TField> {
  private data: T[];

  constructor(data: T[]) {
    this.data = data;
  }

  async query(query: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>> {
    try {
      let filtered = [...this.data];

      // Apply filters
      filtered = this.applyFilters(filtered, query.filters);

      // Apply sorting (array of sort specs)
      if (query.sorting && query.sorting.length > 0) {
        filtered = this.applySorting(filtered, query.sorting);
      }

      // Apply pagination
      const result = this.applyPagination(filtered, query.pagination);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Query failed",
      };
    }
  }

  async getById(id: string): Promise<ApiResult<T | null>> {
    const item = this.data.find((item) => item.id === id);
    return { success: true, data: item ?? null };
  }

  async getCount(filters?: QuerySpec<TField>["filters"]): Promise<ApiResult<number>> {
    if (!filters || filters.length === 0) {
      return { success: true, data: this.data.length };
    }
    const filtered = this.applyFilters([...this.data], filters);
    return { success: true, data: filtered.length };
  }

  // Private helpers
  private applyFilters(items: T[], filters: FilterCondition<TField>[]): T[] {
    return items.filter((item) => {
      return filters.every((filter) => {
        const value = (item as any)[filter.field];
        const filterValue = filter.value;

        switch (filter.op) {
          case "eq":
            return value === filterValue;
          case "contains":
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case "gt":
            return value > filterValue;
          case "lt":
            return value < filterValue;
          case "gte":
            return value >= filterValue;
          case "lte":
            return value <= filterValue;
          case "in":
            return Array.isArray(filterValue) && filterValue.includes(value);
          case "neq":
            return value !== filterValue;
          case "startsWith":
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case "endsWith":
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          default:
            return true;
        }
      });
    });
  }

  /**
   * Apply sorting (supports multiple sort specs)
   * Sorts in order: first sort spec is primary, second is tiebreaker, etc.
   */
  private applySorting(items: T[], sorting: SortSpec<TField>[]): T[] {
    return items.sort((a, b) => {
      for (const sortSpec of sorting) {
        const aVal = (a as any)[sortSpec.field];
        const bVal = (b as any)[sortSpec.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        
        if (comparison !== 0) {
          return sortSpec.direction === "asc" ? comparison : -comparison;
        }
        // If equal, continue to next sort spec
      }
      return 0; // All sort specs were equal
    });
  }

  /**
   * Apply pagination using canonical pageSize/pageIndex
   * offset = pageIndex × pageSize
   */
  private applyPagination(
    items: T[],
    pagination: QuerySpec<TField>["pagination"]
  ): QueryResult<T> {
    const { pageSize, pageIndex, cursor } = pagination;

    // Cursor-based pagination (for compatibility)
    if (cursor) {
      let start = 0;
      try {
        start = parseInt(Buffer.from(cursor, "base64").toString("utf-8"), 10);
      } catch {
        start = 0;
      }
      const end = start + pageSize;
      const page = items.slice(start, end);
      const hasMore = end < items.length;

      return {
        items: page,
        pageInfo: {
          hasNextPage: hasMore,
          nextCursor: hasMore ? Buffer.from(String(end)).toString("base64") : undefined,
        },
      };
    }

    // Offset-based pagination (canonical)
    const start = (pageIndex ?? 0) * pageSize;
    const end = start + pageSize;
    const page = items.slice(start, end);
    
    return {
      items: page,
      pageInfo: {
        hasNextPage: end < items.length,
        totalCount: items.length,
      },
    };
  }
}
```

**Action Items**:
- ✅ Create `DataSource<T>` interface
- ✅ Create dummy data generators for User, Location, Group
- ✅ Implement `DummyDataSource<T>` with in-memory filtering, sorting, pagination
- ✅ Test with sample queries

**Validation**:
```typescript
// Test in a script:
const users = generateDummyUsers(100);
const ds = new DummyDataSource(users);
const result = await ds.query({
  filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
  sorting: [{ field: "displayName", direction: "asc" }],
  pagination: { pageSize: 10, pageIndex: 0 },
});
console.log(result);
```

---

## Phase 3: DataSource Instantiation (Explicit)

### Goal
Create and export explicit data source instances. No resolver/registry pattern—keep it simple and direct.

### File Structure
```
src/server/
  data-sources/
    instances.ts                   # Export instantiated data sources
    index.ts                       # Re-exports
```

### 3.1 Explicit Data Source Instances

**File**: `src/server/data-sources/instances.ts`

```typescript
import { DummyDataSource } from "./dummy.data-source";
import { generateDummyUsers, generateDummyLocations, generateDummyGroups } from "./dummy-data";
import type { User, Location, Group } from "~/lib/schemas/db";

/**
 * Generate dummy data once
 */
const dummyUsers = generateDummyUsers(100);
const dummyLocations = generateDummyLocations(10);
const dummyGroups = generateDummyGroups(20);

/**
 * Export explicit data source instances
 * 
 * Benefits:
 * ✅ Simple and direct - no registry/resolver magic
 * ✅ Easy to import exactly what you need
 * ✅ Type-safe - TypeScript knows the exact type
 * ✅ Easy to swap implementations (just change the instantiation)
 */
export const usersDataSource = new DummyDataSource<User>(dummyUsers);
export const locationsDataSource = new DummyDataSource<Location>(dummyLocations);
export const groupsDataSource = new DummyDataSource<Group>(dummyGroups);

/**
 * Later, to migrate to DynamoDB, just change the instantiation:
 * 
 * export const usersDataSource = new DynamoDBDataSource<User>("aolfclub-entities", "User");
 * 
 * No other code changes needed!
 */
```

**File**: `src/server/data-sources/index.ts`

```typescript
export * from "./data-source.interface";
export * from "./dummy.data-source";
export * from "./instances";
export * from "./dummy-data";
```

**Action Items**:
- ✅ Generate dummy data once at module load
- ✅ Export explicit data source instances (usersDataSource, locationsDataSource, etc.)
- ✅ No registry, no resolver—just direct imports

---

## Phase 4: SolidStart Server Functions

### Goal
Expose data access through SolidStart `query()` and `action()` server functions following official patterns.

### File Structure
```
src/server/
  api/
    users.ts                       # User queries and actions
    locations.ts                   # Location queries and actions
    index.ts                       # Re-exports
  services/
    query.service.ts               # Generic query service
    mutation.service.ts            # Generic mutation service
    index.ts
```

### 4.1 Service Layer (Direct DataSource Usage)

**File**: `src/server/services/users.service.ts`

```typescript
import { usersDataSource } from "../data-sources/instances";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { User } from "~/lib/schemas/db";

/**
 * Query users
 * Directly uses usersDataSource instance
 */
export async function queryUsers(spec: QuerySpec): Promise<ApiResult<QueryResult<User>>> {
  return await usersDataSource.query(spec);
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<ApiResult<User | null>> {
  if (!usersDataSource.getById) {
    return { success: false, error: "getById not supported" };
  }
  return await usersDataSource.getById(id);
}

/**
 * Get user count
 */
export async function getUserCount(filters?: QuerySpec["filters"]): Promise<ApiResult<number>> {
  if (!usersDataSource.getCount) {
    return { success: false, error: "getCount not supported" };
  }
  return await usersDataSource.getCount(filters);
}
```

**File**: `src/server/services/locations.service.ts`

```typescript
import { locationsDataSource } from "../data-sources/instances";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";
import type { Location } from "~/lib/schemas/db";

/**
 * Query locations
 */
export async function queryLocations(spec: QuerySpec): Promise<ApiResult<QueryResult<Location>>> {
  return await locationsDataSource.query(spec);
}

/**
 * Get location by ID
 */
export async function getLocationById(id: string): Promise<ApiResult<Location | null>> {
  if (!locationsDataSource.getById) {
    return { success: false, error: "getById not supported" };
  }
  return await locationsDataSource.getById(id);
}
```

**File**: `src/server/services/index.ts`

```typescript
export * from "./users.service";
export * from "./locations.service";
```

### 4.2 User API (SolidStart Server Functions)

**File**: `src/server/api/users.ts`

```typescript
import { query, action } from "@solidjs/router";
import { queryUsers, getUserById } from "../services/users.service";
import type { QuerySpec } from "~/lib/schemas/query";
import type { User } from "~/lib/schemas/db";

/**
 * Query users with filters, sorting, and pagination
 * 
 * Usage in routes:
 * ```tsx
 * const users = createAsync(() => queryUsersQuery({
 *   filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
 *   sorting: [],
 *   pagination: { mode: "offset", pageSize: 20, pageIndex: 0 }
 * }));
 * ```
 */
export const queryUsersQuery = query(async (spec: QuerySpec<UserField>) => {
  "use server";
  const result = await queryUsers(spec);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-users");

/**
 * Get user by ID
 */
export const getUserByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getUserById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "user-by-id");
```

**File**: `src/server/api/locations.ts`

```typescript
import { query } from "@solidjs/router";
import { queryLocations, getLocationById } from "../services/locations.service";
import type { QuerySpec } from "~/lib/schemas/query";

export const queryLocationsQuery = query(async (spec: QuerySpec) => {
  "use server";
  const result = await queryLocations(spec);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "query-locations");

export const getLocationByIdQuery = query(async (id: string) => {
  "use server";
  const result = await getLocationById(id);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "location-by-id");
```

**Action Items**:
- ✅ Create service layer that directly imports data source instances
- ✅ Create SolidStart `query()` wrappers that call service functions
- ✅ Follow SolidStart data fetching guidelines (named queries, SSR-safe)
- ✅ No resolver—services directly use `usersDataSource`, `locationsDataSource`, etc.

**Validation**:
```bash
# Start dev server
pnpm run dev
# Verify queries work in routes
```

---

## Phase 5: CollectionQueryController (Client State Engine)

### Goal
Create a **CollectionQueryController** that provides a unified client-side interface for managing collections of data. One controller → many UI components (Table, Cards, Lists). Integrates with TanStack Table for advanced table features.

**Naming Rationale**: `CollectionQueryController` emphasizes that this controller's responsibility is **query orchestration**, not storage or business logic.

### Key Features:
- ✅ **Owns QuerySpec as single source of truth** - All query state lives here
- ✅ Orchestrates server queries via SolidStart `createResource`
- ✅ Provides selection state (single/multi-select)
- ✅ Refresh/refetch capability
- ✅ Loading and error states
- ✅ **NO adapter dependency** - Uses QuerySpec directly
- ✅ NO UI rendering logic (pure state management)
- ✅ NO DataSource knowledge (only talks to server functions)

**Key Design Decision:** TanStack Table components bind TO the controller's QuerySpec. When table state changes, components call `controller.setFilters()`, `controller.setSorting()`, `controller.setPagination()` directly. No intermediate adapter layer.

### File Structure
```
src/lib/
  controllers/
    collection-query-controller.ts  # Query orchestration controller
    types.ts                        # Controller types
    index.ts
```

### 5.1 Controller Types

**File**: `src/lib/controllers/types.ts`

```typescript
import type { QuerySpec, QueryResult, SortSpec, FilterCondition } from "~/lib/schemas/query";
import type { Accessor, Setter } from "solid-js";

/**
 * CollectionQueryState - Controller state interface
 * 
 * Responsibility: Query orchestration, NOT storage or business logic
 * Generic TField provides type-safe field names for queries
 * 
 * KEY DESIGN: QuerySpec is the single source of truth.
 * UI components (including TanStack Table) read from and write to QuerySpec
 * via the setFilters/setSorting/setPagination methods.
 */
export interface CollectionQueryState<T, TField extends string = string> {
  // Query state (the canonical QuerySpec - SINGLE SOURCE OF TRUTH)
  querySpec: Accessor<QuerySpec<TField>>;
  setQuerySpec: Setter<QuerySpec<TField>>;

  // Data state (from server)
  data: Accessor<QueryResult<T> | undefined>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | null>;

  // Selection state
  selectedIds: Accessor<Set<string>>;
  setSelectedIds: Setter<Set<string>>;

  // Query Actions (modify QuerySpec directly)
  refresh: () => void;
  setFilters: (filters: FilterCondition<TField>[]) => void;
  setSorting: (sorting: SortSpec<TField>[]) => void;
  setPagination: (pagination: QuerySpec<TField>["pagination"]) => void;
  
  // Selection Actions
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}
```

### 5.2 CollectionQueryController Hook

**File**: `src/lib/controllers/use-collection-query-controller.ts`

```typescript
import { createSignal, createResource, type Accessor } from "solid-js";
import type { QuerySpec, QueryResult, SortSpec, FilterCondition } from "~/lib/schemas/query";
import type { CollectionQueryState } from "./types";
// NO adapter import - controller works directly with QuerySpec

export interface UseCollectionQueryControllerOptions<T, TField extends string = string> {
  /**
   * Query function that returns Promise<QueryResult<T>>
   * Typically a SolidStart query function
   */
  queryFn: (spec: QuerySpec<TField>) => Promise<QueryResult<T>>;

  /**
   * Initial query specification
   */
  initialQuery: QuerySpec<TField>;

  /**
   * Extract ID from item (default: item.id)
   */
  getId?: (item: T) => string;
}

/**
 * useCollectionQueryController - Client state engine for collections
 * 
 * One controller → many UIs (Table, Cards, Lists)
 * Integrates with TanStack Table for advanced filtering/sorting
 * Orchestrates QuerySpec and server communication
 * 
 * @example
 * ```tsx
 * const controller = createCollectionQueryController({
 *   queryFn: (spec) => queryUsersQuery(spec),
 *   initialQuery: {
 *     filters: [],
 *     sorting: [],
 *     pagination: { pageSize: 20, pageIndex: 0 }
 *   }
 * });
 * 
 * // Use with TanStack Table
 * <UserTable controller={controller} />
 * 
 * // Use with Cards (responsive)
 * <UserCards controller={controller} />
 * ```
 */
export function createCollectionQueryController<T, TField extends string = string>(
  options: UseCollectionQueryControllerOptions<T, TField>
): CollectionQueryState<T, TField> {
  const { queryFn, initialQuery, getId = (item: any) => item.id } = options;

  // Query state
  const [querySpec, setQuerySpec] = createSignal<QuerySpec<TField>>(initialQuery);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

  // Data fetching with createResource
  const [data, { refetch }] = createResource(querySpec, queryFn);

  // Derived state
  const isLoading = () => data.loading;
  const error = () => data.error ?? null;

  // Actions
  const refresh = () => refetch();

  const setFilters = (filters: QuerySpec<TField>["filters"]) => {
    setQuerySpec((prev) => ({ ...prev, filters }));
  };

  const setSorting = (sorting: QuerySpec<TField>["sorting"]) => {
    setQuerySpec((prev) => ({ ...prev, sorting }));
  };

  const setPagination = (pagination: QuerySpec<TField>["pagination"]) => {
    setQuerySpec((prev) => ({ ...prev, pagination }));
  };

  const selectItem = (id: string) => {
    setSelectedIds((prev) => new Set([...prev, id]));
  };

  const deselectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    if (selectedIds().has(id)) {
      deselectItem(id);
    } else {
      selectItem(id);
    }
  };

  const selectAll = () => {
    const items = data()?.items ?? [];
    setSelectedIds(new Set(items.map(getId)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return {
    querySpec,
    setQuerySpec,
    data,
    isLoading,
    error,
    selectedIds,
    setSelectedIds,
    refresh,
    setFilters,
    setSorting,
    setPagination,
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    clearSelection,
  };
}
```

**Action Items**:
- ✅ Create `CollectionQueryState<T, TField>` interface with generic types
- ✅ Implement `createCollectionQueryController` hook with query orchestration
- ✅ QuerySpec is single source of truth (no adapter dependency)
- ✅ Support query state, selection state, refresh
- ✅ Test with dummy data

**Usage Example**:
```tsx
// In a route component
import { createCollectionQueryController } from "~/lib/controllers";
import { queryUsersQuery } from "~/server/api/users";
import type { UserField } from "~/lib/schemas/db/user";

export default function UsersPage() {
  const controller = createCollectionQueryController<User, UserField>({
    queryFn: (spec) => queryUsersQuery(spec),
    initialQuery: {
      filters: [],
      sorting: [],
      pagination: { pageSize: 20, pageIndex: 0 }
    }
  });

  return (
    <div>
      <UserTable controller={controller} />
      {/* OR */}
      <UserCards controller={controller} />
    </div>
  );
}
```

---

## Phase 6: UI Abstractions (Responsive: Table + Cards)

### Goal
Create reusable, generic UI components that work with `CollectionQueryController`. Implement **responsive design**: cards for mobile, table for desktop with automatic switching.

### UI Component Strategy

> **ALWAYS reuse Solid UI components** from https://www.solid-ui.com/

Solid UI provides pre-built, accessible components based on Kobalte. Use these instead of building from scratch:

| Need | Solid UI Component | Import |
|------|-------------------|--------|
| Buttons | Button | `~/components/ui/button` |
| Data tables | Table, TableHeader, TableBody, TableRow, TableHead, TableCell | `~/components/ui/table` |
| Cards | Card, CardHeader, CardContent, CardFooter | `~/components/ui/card` |
| Dialogs/Modals | Dialog, DialogTrigger, DialogContent | `~/components/ui/dialog` |
| Form inputs | Input, Label | `~/components/ui/input`, `~/components/ui/label` |
| Dropdowns | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent | `~/components/ui/dropdown-menu` |
| Badges/Tags | Badge | `~/components/ui/badge` |
| Tabs | Tabs, TabsList, TabsTrigger, TabsContent | `~/components/ui/tabs` |
| Checkboxes | Checkbox | `~/components/ui/checkbox` |
| Combobox/Select | Combobox, ComboboxTrigger, ComboboxContent | `~/components/ui/combobox` |
| Avatars | Avatar, AvatarImage, AvatarFallback | `~/components/ui/avatar` |

**Rule:** Only create custom components in `src/components/collection/*` for domain-specific abstractions (like `CollectionTable`, `CollectionCards`) that COMPOSE Solid UI primitives.

### Key Features:
- ✅ **TanStack Table** integration for advanced table features
- ✅ **Solid UI primitives** - Reuse Table, Card, Button, Badge, etc.
- ✅ **Responsive design** - Automatic switch between cards (mobile) and table (desktop)
- ✅ Reusable column definitions
- ✅ Server-side filtering, sorting, pagination
- ✅ Selection support (multi-select)

### File Structure
```
src/components/
  collection/
    ResponsiveCollectionView.tsx   # Responsive wrapper (auto-switches)
    CollectionTable.tsx            # TanStack Table implementation
    CollectionCards.tsx            # Card grid for mobile
    CollectionList.tsx             # Alternative list view
    types.ts                       # Column definitions, etc.
    hooks/
      useMediaQuery.ts             # Responsive breakpoint hook
    index.ts
```

### 6.1 Responsive Hook

**File**: `src/components/collection/hooks/useMediaQuery.ts`

```typescript
import { createSignal, onMount, onCleanup } from "solid-js";

/**
 * useMediaQuery - Reactive media query hook
 * 
 * @param query - CSS media query
 * @returns Signal that updates when media query matches
 * 
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery("(min-width: 768px)");
 * ```
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = createSignal(false);

  onMount(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener("change", handler);

    onCleanup(() => {
      mediaQuery.removeEventListener("change", handler);
    });
  });

  return matches;
}
```

### 6.2 Column Definition Types

**File**: `src/components/collection/types.ts`

```typescript
import type { JSX } from "solid-js";

/**
 * Column definition for CollectionTable
 */
export interface ColumnDef<T> {
  /**
   * Unique column ID
   */
  id: string;

  /**
   * Column header label
   */
  header: string;

  /**
   * Accessor function to get cell value
   */
  accessor: (item: T) => any;

  /**
   * Optional custom cell renderer
   */
  cell?: (item: T) => JSX.Element;

  /**
   * Is column sortable?
   */
  sortable?: boolean;

  /**
   * Column width
   */
  width?: string;
}

/**
 * Card renderer function
 */
export type CardRenderer<T> = (item: T, isSelected: boolean) => JSX.Element;

/**
 * List item renderer function
 */
export type ListItemRenderer<T> = (item: T, isSelected: boolean) => JSX.Element;
```

### 6.3 TanStack Table Component

**File**: `src/components/collection/CollectionTable.tsx`

```tsx
import { For, Show, createEffect, createMemo } from "solid-js";
import {
  createSolidTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/solid-table";
import type { CollectionQueryState } from "~/lib/controllers/types";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";

export interface CollectionTableProps<T, TField extends string = string> {
  controller: CollectionQueryState<T, TField>;
  columns: ColumnDef<T, any>[];
  getId: (item: T) => string;
  selectable?: boolean;
  onRowClick?: (item: T) => void;
}

/**
 * CollectionTable - TanStack Table implementation
 * 
 * KEY DESIGN: TanStack Table is controlled by QuerySpec
 * - Table reads sorting/pagination from controller.querySpec()
 * - Table changes call controller.setSorting()/setPagination() directly
 * - NO separate adapter layer - internal conversion only
 */
export function CollectionTable<T, TField extends string = string>(props: CollectionTableProps<T, TField>) {
  
  // Derive TanStack-compatible state FROM QuerySpec (one-way: QuerySpec → Table UI)
  const tableState = createMemo(() => {
    const spec = props.controller.querySpec();
    return {
      sorting: spec.sorting.map(s => ({ id: s.field, desc: s.direction === "desc" })),
      pagination: {
        pageIndex: spec.pagination.pageIndex ?? 0,
        pageSize: spec.pagination.pageSize,
      },
    };
  });

  // Create TanStack Table instance (controlled by QuerySpec)
  const table = createSolidTable({
    get data() {
      return props.controller.data()?.items ?? [];
    },
    get columns() {
      return props.columns;
    },
    getCoreRowModel: getCoreRowModel(),
    // Server-side operations enabled
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    // Controlled state from QuerySpec
    state: {
      get sorting() { return tableState().sorting; },
      get pagination() { return tableState().pagination; },
    },
    // Page count from server response
    get pageCount() {
      const data = props.controller.data();
      const totalCount = data?.pageInfo.totalCount;
      const pageSize = props.controller.querySpec().pagination.pageSize;
      return totalCount ? Math.ceil(totalCount / pageSize) : -1;
    },
    // Sync sorting changes back to QuerySpec
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(tableState().sorting) : updater;
      props.controller.setSorting(
        newSorting.map(s => ({ field: s.id as TField, direction: s.desc ? "desc" : "asc" }))
      );
    },
    // Sync pagination changes back to QuerySpec
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === "function" ? updater(tableState().pagination) : updater;
      props.controller.setPagination({
        pageSize: newPagination.pageSize,
        pageIndex: newPagination.pageIndex,
      });
    },
  });

  const handleRowClick = (item: T) => {
    if (props.selectable) {
      props.controller.toggleItem(props.getId(item));
    }
    props.onRowClick?.(item);
  };

  return (
    <div class="w-full">
      {/* Loading/Error states */}
      <Show when={props.controller.isLoading()}>
        <div class="p-4 text-center text-gray-500">Loading...</div>
      </Show>

      <Show when={props.controller.error()}>
        <div class="p-4 text-center text-red-500">
          Error: {props.controller.error()?.message}
        </div>
      </Show>

      {/* Table */}
      <Show when={!props.controller.isLoading() && !props.controller.error()}>
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <For each={table.getHeaderGroups()}>
                {(headerGroup) => (
                  <TableRow>
                    <Show when={props.selectable}>
                      <TableHead class="w-12">
                        <input
                          type="checkbox"
                          checked={props.controller.selectedIds().size > 0}
                          indeterminate={
                            props.controller.selectedIds().size > 0 &&
                            props.controller.selectedIds().size <
                              (props.controller.data()?.items.length ?? 0)
                          }
                          onChange={() => {
                            if (props.controller.selectedIds().size > 0) {
                              props.controller.clearSelection();
                            } else {
                              props.controller.selectAll();
                            }
                          }}
                        />
                      </TableHead>
                    </Show>
                    <For each={headerGroup.headers}>
                      {(header) => (
                        <TableHead
                          class={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:bg-gray-100"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {/* Sort indicator */}
                          <Show when={header.column.getIsSorted()}>
                            <span class="ml-2">
                              {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                            </span>
                          </Show>
                        </TableHead>
                      )}
                    </For>
                  </TableRow>
                )}
              </For>
            </TableHeader>
            <TableBody>
              <For each={table.getRowModel().rows}>
                {(row) => {
                  const id = props.getId(row.original);
                  const isSelected = props.controller.selectedIds().has(id);

                  return (
                    <TableRow
                      onClick={() => handleRowClick(row.original)}
                      class={isSelected ? "bg-blue-50" : "hover:bg-gray-50"}
                    >
                      <Show when={props.selectable}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => props.controller.toggleItem(id)}
                          />
                        </TableCell>
                      </Show>
                      <For each={row.getVisibleCells()}>
                        {(cell) => (
                          <TableCell>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        )}
                      </For>
                    </TableRow>
                  );
                }}
              </For>
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        <div class="mt-4 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            <Show when={props.controller.data()?.pageInfo.totalCount}>
              {(count) => (
                <>
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    count()
                  )}{" "}
                  of {count()} results
                </>
              )}
            </Show>
          </div>
          <div class="flex gap-2">
            <button
              class="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              class="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
```

### 6.4 Generic Cards Component

**File**: `src/components/collection/CollectionCards.tsx`

```tsx
import { For, Show } from "solid-js";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { CardRenderer } from "./types";

export interface CollectionCardsProps<T, TField extends string = string> {
  controller: CollectionQueryState<T, TField>;
  getId: (item: T) => string;
  renderCard: CardRenderer<T>;
  selectable?: boolean;
  columns?: number;
}

/**
 * CollectionCards - Generic card grid component
 */
export function CollectionCards<T>(props: CollectionCardsProps<T>) {
  const handleCardClick = (item: T) => {
    if (props.selectable) {
      props.controller.toggleItem(props.getId(item));
    }
  };

  const gridClass = () => {
    const cols = props.columns ?? 3;
    return `grid grid-cols-1 md:grid-cols-${cols} gap-4`;
  };

  return (
    <div>
      <Show when={props.controller.isLoading()}>
        <div>Loading...</div>
      </Show>

      <Show when={props.controller.error()}>
        <div class="text-red-500">Error: {props.controller.error()?.message}</div>
      </Show>

      <Show when={!props.controller.isLoading() && !props.controller.error()}>
        <div class={gridClass()}>
          <For each={props.controller.data()?.items ?? []}>
            {(item) => {
              const id = props.getId(item);
              const isSelected = props.controller.selectedIds().has(id);

              return (
                <div
                  onClick={() => handleCardClick(item)}
                  class={isSelected ? "border-2 border-blue-500" : ""}
                >
                  {props.renderCard(item, isSelected)}
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
```

**Action Items**:
- ✅ Create `useMediaQuery` hook for responsive breakpoints
- ✅ Create `CollectionTable` with TanStack Table integration
- ✅ Create `CollectionCards` generic component
- ✅ Create `CollectionList` generic component  
- ✅ Create `ResponsiveCollectionView` wrapper (auto-switches)
- ✅ All components accept `CollectionQueryController` as prop
- ✅ Support selection, sorting, pagination

### 6.5 Responsive Collection View (Auto-Switch)

**File**: `src/components/collection/ResponsiveCollectionView.tsx`

```tsx
import { Show } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { CollectionQueryState } from "~/lib/controllers/types";
import type { CardRenderer } from "./types";
import { CollectionTable } from "./CollectionTable";
import { CollectionCards } from "./CollectionCards";
import { useMediaQuery } from "./hooks/useMediaQuery";

export interface ResponsiveCollectionViewProps<T, TField extends string = string> {
  controller: CollectionQueryState<T, TField>;
  columns: ColumnDef<T, any>[];
  getId: (item: T) => string;
  renderCard: CardRenderer<T>;
  selectable?: boolean;
  onRowClick?: (item: T) => void;
  /**
   * Breakpoint for switching from cards to table
   * Default: "(min-width: 768px)" (tablets and up)
   */
  breakpoint?: string;
}

/**
 * ResponsiveCollectionView - Auto-switches between cards and table
 * 
 * - Mobile: Cards
 * - Desktop/Tablet: Table
 * 
 * @example
 * ```tsx
 * <ResponsiveCollectionView
 *   controller={controller}
 *   columns={userColumns}
 *   getId={(u) => u.id}
 *   renderCard={(user) => <UserCard user={user} />}
 *   selectable={true}
 * />
 * ```
 */
export function ResponsiveCollectionView<T>(props: ResponsiveCollectionViewProps<T>) {
  const isDesktop = useMediaQuery(props.breakpoint ?? "(min-width: 768px)");

  return (
    <Show
      when={isDesktop()}
      fallback={
        <CollectionCards
          controller={props.controller}
          getId={props.getId}
          renderCard={props.renderCard}
          selectable={props.selectable}
        />
      }
    >
      <CollectionTable
        controller={props.controller}
        columns={props.columns}
        getId={props.getId}
        selectable={props.selectable}
        onRowClick={props.onRowClick}
      />
    </Show>
  );
}
```

**Action Items**:
- ✅ Create `useMediaQuery` hook for responsive breakpoints
- ✅ Create `CollectionTable` with TanStack Table integration
- ✅ Create `CollectionCards` generic component
- ✅ Create `CollectionList` generic component  
- ✅ Create `ResponsiveCollectionView` wrapper (auto-switches)
- ✅ All components accept `CollectionQueryController` as prop
- ✅ Support selection, sorting, pagination

**Usage Example**:
```tsx
import { ResponsiveCollectionView } from "~/components/collection";
import { createColumnHelper } from "@tanstack/solid-table";
import type { User } from "~/lib/schemas/db";

// Define columns for table view
const columnHelper = createColumnHelper<User>();
const userColumns = [
  columnHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("userType", {
    header: "Type",
    cell: (info) => info.getValue(),
  }),
];

// In a route component
const controller = createCollectionQueryController<User, UserField>({
  queryFn: (spec) => queryUsersQuery(spec),
  initialQuery: { filters: [], sorting: [], pagination: { mode: "offset", pageSize: 20, pageIndex: 0 } }
});

// Responsive view: cards on mobile, table on desktop
<ResponsiveCollectionView
  controller={controller}
  columns={userColumns}
  getId={(u) => u.id}
  renderCard={(user) => (
    <div class="p-4 border rounded shadow">
      <h3 class="font-bold">{user.displayName}</h3>
      <p class="text-sm text-gray-600">{user.email}</p>
      <span class="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
        {user.userType}
      </span>
    </div>
  )}
  selectable={true}
/>
```

---

## Phase 7: Mutations (Create / Update / Delete)

### Goal
Implement CRUD operations using SolidStart `action()` functions and integrate with `CollectionQueryController` for automatic refresh.

### File Structure
```
src/server/
  services/
    mutation.service.ts            # Generic mutation service
  api/
    users.ts                       # User mutations
    locations.ts                   # Location mutations
```

### 7.1 Mutation Service Layer

**File**: `src/server/services/users.service.ts` (add to existing file)

```typescript
import { usersDataSource } from "../data-sources/instances";
import type { User } from "~/lib/schemas/db";
import type { ApiResult } from "~/lib/types";

/**
 * Create a new user
 */
export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">
): Promise<ApiResult<User>> {
  if (!usersDataSource.create) {
    return { success: false, error: "Create not supported" };
  }
  return await usersDataSource.create(data);
}

/**
 * Update a user
 */
export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<ApiResult<User>> {
  if (!usersDataSource.update) {
    return { success: false, error: "Update not supported" };
  }
  return await usersDataSource.update(id, data);
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<ApiResult<void>> {
  if (!usersDataSource.delete) {
    return { success: false, error: "Delete not supported" };
  }
  return await usersDataSource.delete(id);
}
```

**File**: `src/server/services/locations.service.ts` (add to existing file)

```typescript
import { locationsDataSource } from "../data-sources/instances";
import type { Location } from "~/lib/schemas/db";
import type { ApiResult } from "~/lib/types";

/**
 * Create a new location
 */
export async function createLocation(
  data: Omit<Location, "id" | "createdAt" | "updatedAt">
): Promise<ApiResult<Location>> {
  if (!locationsDataSource.create) {
    return { success: false, error: "Create not supported" };
  }
  return await locationsDataSource.create(data);
}

/**
 * Update a location
 */
export async function updateLocation(
  id: string,
  data: Partial<Location>
): Promise<ApiResult<Location>> {
  if (!locationsDataSource.update) {
    return { success: false, error: "Update not supported" };
  }
  return await locationsDataSource.update(id, data);
}

/**
 * Delete a location
 */
export async function deleteLocation(id: string): Promise<ApiResult<void>> {
  if (!locationsDataSource.delete) {
    return { success: false, error: "Delete not supported" };
  }
  return await locationsDataSource.delete(id);
}
```

### 7.2 User Mutations (SolidStart Actions)

**File**: `src/server/api/users.ts` (add to existing file)

```typescript
import { action } from "@solidjs/router";
import { createUser, updateUser, deleteUser } from "../services/users.service";
import type { User } from "~/lib/schemas/db";

/**
 * Create a new user
 */
export const createUserAction = action(async (data: Omit<User, "id" | "createdAt" | "updatedAt">) => {
  "use server";
  const result = await createUser(data);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "create-user");

/**
 * Update a user
 */
export const updateUserAction = action(async (id: string, data: Partial<User>) => {
  "use server";
  const result = await updateUser(id, data);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "update-user");

/**
 * Delete a user
 */
export const deleteUserAction = action(async (id: string) => {
  "use server";
  const result = await deleteUser(id);
  if (!result.success) throw new Error(result.error);
}, "delete-user");
```

**File**: `src/server/api/locations.ts` (add to existing file)

```typescript
import { action } from "@solidjs/router";
import { createLocation, updateLocation, deleteLocation } from "../services/locations.service";
import type { Location } from "~/lib/schemas/db";

export const createLocationAction = action(async (data: Omit<Location, "id" | "createdAt" | "updatedAt">) => {
  "use server";
  const result = await createLocation(data);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "create-location");

export const updateLocationAction = action(async (id: string, data: Partial<Location>) => {
  "use server";
  const result = await updateLocation(id, data);
  if (!result.success) throw new Error(result.error);
  return result.data;
}, "update-location");

export const deleteLocationAction = action(async (id: string) => {
  "use server";
  const result = await deleteLocation(id);
  if (!result.success) throw new Error(result.error);
}, "delete-location");
```

### 7.3 Extend DummyDataSource with Mutations

**File**: `src/server/data-sources/dummy.data-source.ts` (add to existing class)

```typescript
import { ulid } from "ulid";

// Add to DummyDataSource class:

async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<ApiResult<T>> {
  const newItem = {
    ...data,
    id: ulid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as T;

  this.data.push(newItem);
  return { success: true, data: newItem };
}

async update(id: string, data: Partial<T>): Promise<ApiResult<T>> {
  const index = this.data.findIndex((item) => item.id === id);
  if (index === -1) {
    return { success: false, error: "Item not found" };
  }

  const updatedItem = {
    ...this.data[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  this.data[index] = updatedItem;
  return { success: true, data: updatedItem };
}

async delete(id: string): Promise<ApiResult<void>> {
  const index = this.data.findIndex((item) => item.id === id);
  if (index === -1) {
    return { success: false, error: "Item not found" };
  }

  this.data.splice(index, 1);
  return { success: true, data: undefined };
}
```

### 7.4 UI Integration with CollectionQueryController

**Usage in a route:**
```tsx
import { createCollectionQueryController } from "~/lib/controllers";
import { queryUsersQuery, createUserAction, deleteUserAction } from "~/server/api/users";
import { useAction } from "@solidjs/router";
import type { UserField } from "~/lib/schemas/db/user";

export default function UsersPage() {
  const controller = createCollectionQueryController<User, UserField>({
    queryFn: (spec) => queryUsersQuery(spec),
    initialQuery: { filters: [], sorting: [], pagination: { pageSize: 20, pageIndex: 0 } }
  });

  const createUser = useAction(createUserAction);
  const deleteUser = useAction(deleteUserAction);

  const handleCreate = async (data: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    await createUser(data);
    controller.refresh(); // Refresh collection after mutation
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
    controller.refresh(); // Refresh collection after mutation
  };

  return (
    <div>
      <button onClick={() => handleCreate({...})}>Add User</button>
      <CollectionTable
        controller={controller}
        columns={userColumns}
        getId={(u) => u.id}
        selectable={true}
      />
      <button onClick={() => handleDelete(selectedId)}>Delete Selected</button>
    </div>
  );
}
```

**Action Items**:
- ✅ Add mutation methods to service layer (createUser, updateUser, deleteUser)
- ✅ Create SolidStart `action()` wrappers for users and locations
- ✅ Extend `DummyDataSource` with mutation methods
- ✅ Integrate with `CollectionQueryController.refresh()`
- ✅ Services directly use data source instances (no resolver)

**Validation**:
```bash
# Test in dev mode
pnpm run dev
# Create a user, verify it appears in table
# Delete a user, verify it disappears
# Update a user, verify changes reflect
```

---

## Summary of All Phases

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **Phase 1** | Domain & Contracts | `QuerySpec<TField>`, `QueryResult<T>`, `ApiResult<T>`, Domain entities with generic types |
| **Phase 2** | Dummy DataSource | `DummyDataSource<T, TField>`, Dummy data generators |
| **Phase 3** | Explicit Instantiation | Direct data source instances (no resolver/registry) |
| **Phase 4** | Server Functions | SolidStart `query()` wrappers, Service layer with direct imports |
| **Phase 5** | CollectionQueryController | `createCollectionQueryController()` hook (QuerySpec as single source of truth) |
| **Phase 6** | UI Abstractions | `ResponsiveCollectionView`, `CollectionTable` (TanStack), `CollectionCards` |
| **Phase 7** | Mutations | Create/Update/Delete actions, Refresh integration |

**Note:** TanStack Table integration is handled internally within `CollectionTable` component using controller's QuerySpec methods directly. No separate adapter layer.

---

## Future: DynamoDB DataSource

Once all phases are complete and tested with dummy data, add DynamoDB support:

### 8.1 Create DynamoDBDataSource

**File**: `src/server/data-sources/dynamodb.data-source.ts`

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { DataSource } from "./data-source.interface";
import type { QuerySpec, QueryResult, FilterOperator } from "~/lib/schemas/query";
import type { ApiResult } from "~/lib/types";

/**
 * DynamoDBDataSource - DynamoDB implementation with partial query execution
 * 
 * EXECUTION STRATEGY:
 * - Push-down operators: eq, gt, lt, gte, lte, in (executed by DynamoDB FilterExpression)
 * - Post-fetch operators: contains, startsWith, endsWith, neq (applied after retrieval)
 * - Sorting and pagination: Applied via Scan parameters and post-processing
 * 
 * Generic TField provides type-safe field names
 */
export class DynamoDBDataSource<
  T extends { id: string },
  TField extends string = string
> implements DataSource<T, TField> {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private pkPrefix: string;

  constructor(tableName: string, pkPrefix: string) {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
    this.pkPrefix = pkPrefix;
  }

  async query(query: QuerySpec<TField>): Promise<ApiResult<QueryResult<T>>> {
    try {
      // Separate push-down vs post-fetch filters
      const pushDownOperators: FilterOperator[] = ["eq", "gt", "lt", "gte", "lte", "in"];
      const pushDownFilters = query.filters.filter(f => pushDownOperators.includes(f.op));
      const postFetchFilters = query.filters.filter(f => !pushDownOperators.includes(f.op));
      
      // Build FilterExpression for push-down filters
      const filterExpression = this.buildFilterExpression(pushDownFilters);
      
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression.expression,
        ExpressionAttributeNames: filterExpression.names,
        ExpressionAttributeValues: filterExpression.values,
        Limit: query.pagination.pageSize,
        ExclusiveStartKey: query.pagination.cursor ? this.decodeCursor(query.pagination.cursor) : undefined,
      });

      const result = await this.docClient.send(command);
      let items = result.Items as T[];
      
      // Apply post-fetch filters (contains, startsWith, endsWith, neq)
      if (postFetchFilters.length > 0) {
        items = this.applyPostFetchFilters(items, postFetchFilters);
      }
      
      // Apply sorting if specified
      if (query.sorting && query.sorting.length > 0) {
        items = this.applySorting(items, query.sorting);
      }

      return {
        success: true,
        data: {
          items,
          pageInfo: {
            hasNextPage: !!result.LastEvaluatedKey,
            nextCursor: result.LastEvaluatedKey ? this.encodeCursor(result.LastEvaluatedKey) : undefined,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "DynamoDB query failed",
      };
    }
  }

  private buildFilterExpression(filters: QuerySpec["filters"]) {
    // Build DynamoDB FilterExpression dynamically
    // Map QuerySpec operators to DynamoDB operators
    // Return { expression, names, values }
  }

  private encodeCursor(key: Record<string, any>): string {
    return Buffer.from(JSON.stringify(key)).toString("base64");
  }

  private decodeCursor(cursor: string): Record<string, any> {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
  }

  // Implement create, update, delete similarly...
}
```

### 8.2 Update Data Source Instances

**File**: `src/server/data-sources/instances.ts`

```typescript
import { DynamoDBDataSource } from "./dynamodb.data-source";
import { DummyDataSource } from "./dummy.data-source";
import { generateDummyUsers, generateDummyLocations, generateDummyGroups } from "./dummy-data";
import type { User, Location, Group } from "~/lib/schemas/db";

/**
 * Toggle between dummy and DynamoDB by changing instantiation
 */
const USE_DYNAMODB = process.env.USE_DYNAMODB === "true";

/**
 * User data source
 */
export const usersDataSource = USE_DYNAMODB
  ? new DynamoDBDataSource<User>("aolfclub-entities", "User")
  : new DummyDataSource<User>(generateDummyUsers(100));

/**
 * Location data source
 */
export const locationsDataSource = USE_DYNAMODB
  ? new DynamoDBDataSource<Location>("aolfclub-entities", "Location")
  : new DummyDataSource<Location>(generateDummyLocations(10));

/**
 * Group data source
 */
export const groupsDataSource = USE_DYNAMODB
  ? new DynamoDBDataSource<Group>("aolfclub-entities", "Group")
  : new DummyDataSource<Group>(generateDummyGroups(20));
```

**No service or API code changes required!** Just update the instantiation in one file.

### Environment Variable

```bash
# .env
USE_DYNAMODB=false  # Development with dummy data
# USE_DYNAMODB=true # Production with DynamoDB
```

### Migration Checklist
- [ ] Create `DynamoDBDataSource<T>` class
- [ ] Update `instances.ts` with conditional instantiation
- [ ] Add environment variable check
- [ ] Test with dummy data first (`USE_DYNAMODB=false`)
- [ ] Test with DynamoDB (`USE_DYNAMODB=true`)
- [ ] **Zero changes required** in services, APIs, or UI components

---

## Development Workflow

### Setup
```bash
# Install dependencies
pnpm install

# Add TanStack Table for SolidJS
pnpm add @tanstack/solid-table

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start
```

### Testing Each Phase

**Phase 1-3:**
```bash
# Create a test script
# src/server/test-query.ts
import { queryResource } from "./services/query.service";

const result = await queryResource("users", {
  filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
  sorting: [],
  pagination: { pageSize: 10, pageIndex: 0 }
});

console.log(result);
```

**Phase 4-7:**
```bash
# Test in browser
pnpm run dev
# Navigate to /users or /locations
# Verify queries, sorting, pagination, mutations work
```

---

## Key Guidelines

### Canonical QuerySpec Rules ⚖️
- ✅ **Use `sorting`** (array) — NEVER `sort` (singular)
- ✅ **Use `pageSize` + `pageIndex`** — NEVER `limit` or `offset`
- ✅ **Compute offset**: `offset = pageIndex × pageSize` in  implementation
- ✅ **Generic TField**: Always use `QuerySpec<TField>`, `DataSource<T, TField>`
- ❌ **No mode field** in pagination — mode is implicit (cursor vs offset determined by presence of cursor field)

### Filter Operator Execution Strategy 🔍
- **All operators are supported** (eq, neq, contains, startsWith, endsWith, gt, lt, gte, lte, in)
- **DataSources decide HOW to execute**:
  - `InMemoryDataSource`: Executes all operators in-memory
  - `DynamoDBDataSource`: Push-down capable operators (eq, gt, lt, gte, lte, in) to DynamoDB; post-fetch others (contains, startsWith, endsWith, neq)
  - DataSources MAY reject unsupported operators in strict mode
- ❌ **Do NOT remove operators from FilterOperator**
- ✅ **Document execution capabilities** per DataSource implementation

### DO ✅
- Keep domain logic framework-agnostic
- Use `ApiResult<T>` for all service/action responses
- Define `QuerySpec<TField>` as the universal query language with generic types
- Use `CollectionQueryController` for all collection UIs
- Follow SolidStart `query()` and `action()` patterns
- Start with dummy data, migrate to DynamoDB later
- **Use explicit data source instantiation** (no resolver/registry pattern)
- Services directly import data source instances (`usersDataSource`, `locationsDataSource`)
- Swap data sources by changing one file (`instances.ts`)
- **Use TanStack Table** for table views with server-side filtering/sorting
- **Implement responsive design** - Cards for mobile, Table for desktop
- Use `ResponsiveCollectionView` for automatic layout switching
- **TanStack types stay inside CollectionTable** — controller uses QuerySpec only
- **Reuse Solid UI components** from https://www.solid-ui.com/ for all UI primitives
- Import Solid UI components from `~/components/ui/*`

### DON'T ❌
- Import SolidJS in `src/lib/schemas`
- Import DynamoDB in UI components
- Import TanStack types outside of `CollectionTable` component
- Hardcode data source logic in routes
- Skip validation with Zod schemas
- Forget to call `controller.refresh()` after mutations
- Create resolver/registry patterns (keep it simple with direct imports)
- Implement client-side filtering/sorting (use server-side with TanStack Table)
- Hardcode mobile vs desktop layouts (use responsive components)
- **Use `sort` (singular)** — always use `sorting` (array)
- **Use `limit` or `offset`** — always use `pageSize` + `pageIndex`
- **Add `mode` field to pagination** — it's implicit based on cursor presence
- **Remove operators from FilterOperator** — document execution strategies instead
- **Create custom UI primitives** — use Solid UI components (Button, Dialog, Table, Card, Badge, Input, etc.)
- **Install shadcn/ui React version** — use Solid UI (SolidJS port) from solid-ui.com

---

## Questions to Answer Before Starting

1. **Entity Types**: What entities do you need? (User, Location, Group, Role, Page, Task, etc.)
2. **Dummy Data**: How many dummy records per entity? (10 locations, 100 users, etc.)
3. **UI Priority**: Which UI should be built first? (Table, Cards, or List?)
4. **Authentication**: Use real OAuth or mock session for now?
5. **Deployment**: Will you deploy to Vercel, AWS, or locally for now?

---

## Files to Create (Checklist)

**Phase 1: Domain & Contracts**
- [ ] `src/lib/types.ts`
- [ ] `src/lib/schemas/query/query-spec.schema.ts`
- [ ] `src/lib/schemas/query/query-result.schema.ts`
- [ ] `src/lib/schemas/query/index.ts`
- [ ] `src/lib/schemas/db/types.ts`
- [ ] `src/lib/schemas/db/user.schema.ts`
- [ ] `src/lib/schemas/db/location.schema.ts`
- [ ] `src/lib/schemas/db/index.ts`

**Phase 2: Dummy DataSource**
- [ ] `src/server/data-sources/data-source.interface.ts`
- [ ] `src/server/data-sources/dummy.data-source.ts`
- [ ] `src/server/data-sources/dummy-data/users.ts`
- [ ] `src/server/data-sources/dummy-data/locations.ts`
- [ ] `src/server/data-sources/dummy-data/index.ts`

**Phase 3: Explicit Instantiation**
- [ ] `src/server/data-sources/instances.ts`
- [ ] `src/server/data-sources/index.ts`

**Phase 4: Server Functions**
- [ ] `src/server/services/users.service.ts`
- [ ] `src/server/services/locations.service.ts`
- [ ] `src/server/services/index.ts`
- [ ] `src/server/api/users.ts`
- [ ] `src/server/api/locations.ts`
- [ ] `src/server/api/index.ts`

**Phase 5: CollectionQueryController**
- [ ] `src/lib/controllers/types.ts`
- [ ] `src/lib/controllers/use-collection-query-controller.ts`
- [ ] `src/lib/controllers/index.ts`

**Phase 6: UI Abstractions**
- [ ] `src/components/collection/hooks/useMediaQuery.ts`
- [ ] `src/components/collection/types.ts`
- [ ] `src/components/collection/CollectionTable.tsx`
- [ ] `src/components/collection/CollectionCards.tsx`
- [ ] `src/components/collection/CollectionList.tsx`
- [ ] `src/components/collection/ResponsiveCollectionView.tsx`
- [ ] `src/components/collection/index.ts`

**Phase 7: Mutations**
- [ ] Update `src/server/services/users.service.ts` with create/update/delete
- [ ] Update `src/server/services/locations.service.ts` with create/update/delete
- [ ] Update `src/server/api/users.ts` with actions
- [ ] Update `src/server/api/locations.ts` with actions
- [ ] Update `src/server/data-sources/dummy.data-source.ts` with mutations

---

## Example Routes

**Users Page**: `src/routes/(protected)/users.tsx`
```tsx
import { createCollectionQueryController } from "~/lib/controllers";
import { queryUsersQuery } from "~/server/api/users";
import { ResponsiveCollectionView } from "~/components/collection";
import { createColumnHelper } from "@tanstack/solid-table";
import type { User, UserField } from "~/lib/schemas/db";
import { Badge } from "~/components/ui/badge";

// Define TanStack Table columns
const columnHelper = createColumnHelper<User>();

const userColumns = [
  columnHelper.accessor("displayName", {
    header: "Name",
    cell: (info) => <span class="font-medium">{info.getValue()}</span>,
    enableSorting: true,
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => <span class="text-gray-600">{info.getValue()}</span>,
    enableSorting: true,
  }),
  columnHelper.accessor("userType", {
    header: "Type",
    cell: (info) => <Badge>{info.getValue()}</Badge>,
    enableSorting: true,
  }),
  columnHelper.accessor("isAdmin", {
    header: "Admin",
    cell: (info) => (info.getValue() ? "✓" : ""),
    enableSorting: false,
  }),
];

export default function UsersPage() {
  const controller = createCollectionQueryController<User, UserField>({
    queryFn: (spec) => queryUsersQuery(spec),
    initialQuery: { 
      filters: [], 
      sorting: [],
      pagination: { pageSize: 20, pageIndex: 0 } 
    },
  });

  return (
    <div class="p-4">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Users</h1>
        <button class="px-4 py-2 bg-blue-600 text-white rounded">
          Add User
        </button>
      </div>

      {/* Responsive: Cards on mobile, Table on desktop */}
      <ResponsiveCollectionView
        controller={controller}
        columns={userColumns}
        getId={(u) => u.id}
        renderCard={(user, isSelected) => (
          <div class={`p-4 border rounded-lg shadow-sm ${isSelected ? "border-blue-500 bg-blue-50" : ""}`}>
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-bold text-lg">{user.displayName}</h3>
              <Badge>{user.userType}</Badge>
            </div>
            <p class="text-sm text-gray-600 mb-1">{user.email}</p>
            {user.isAdmin && (
              <span class="text-xs text-blue-600 font-medium">Admin</span>
            )}
          </div>
        )}
        selectable={true}
        breakpoint="(min-width: 768px)"
      />
    </div>
  );
}
```

**Locations Page**: `src/routes/(protected)/locations.tsx`
```tsx
import { createCollectionQueryController } from "~/lib/controllers";
import { queryLocationsQuery } from "~/server/api/locations";
import { ResponsiveCollectionView } from "~/components/collection";
import { createColumnHelper } from "@tanstack/solid-table";
import type { Location, LocationField } from "~/lib/schemas/db";

const columnHelper = createColumnHelper<Location>();

const locationColumns = [
  columnHelper.accessor("code", {
    header: "Code",
    cell: (info) => <span class="font-mono font-bold">{info.getValue()}</span>,
    enableSorting: true,
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
    enableSorting: true,
  }),
  columnHelper.accessor("city", {
    header: "City",
    cell: (info) => info.getValue() ?? "-",
    enableSorting: true,
  }),
  columnHelper.accessor("state", {
    header: "State",
    cell: (info) => info.getValue() ?? "-",
    enableSorting: true,
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
    cell: (info) => (
      <span class={info.getValue() ? "text-green-600" : "text-gray-400"}>
        {info.getValue() ? "Active" : "Inactive"}
      </span>
    ),
    enableSorting: false,
  }),
];

export default function LocationsPage() {
  const controller = createCollectionQueryController<Location, LocationField>({
    queryFn: (spec) => queryLocationsQuery(spec),
    initialQuery: { 
      filters: [], 
      sorting: [],
      pagination: { pageSize: 12, pageIndex: 0 } 
    }
  });

  return (
    <div class="p-4">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Locations</h1>
        <button class="px-4 py-2 bg-blue-600 text-white rounded">
          Add Location
        </button>
      </div>

      <ResponsiveCollectionView
        controller={controller}
        columns={locationColumns}
        getId={(l) => l.id}
        renderCard={(location, isSelected) => (
          <div class={`p-4 border rounded-lg ${isSelected ? "border-blue-500 bg-blue-50" : ""}`}>
            <div class="flex items-start justify-between mb-2">
              <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-mono rounded">
                {location.code}
              </span>
              <span class={location.isActive ? "text-green-600 text-xs" : "text-gray-400 text-xs"}>
                {location.isActive ? "● Active" : "○ Inactive"}
              </span>
            </div>
            <h3 class="font-semibold text-lg mb-1">{location.name}</h3>
            <p class="text-sm text-gray-600">
              {location.city && location.state ? `${location.city}, ${location.state}` : "Location details"}
            </p>
            {location.address && (
              <p class="text-xs text-gray-500 mt-2">{location.address}</p>
            )}
          </div>
        )}
        selectable={false}
      />
    </div>
  );
}
```

---

## Final Notes

This prompt is designed to be **copy-paste ready** for an AI coding assistant. Each phase builds on the previous, ensuring:
- ✅ No framework leakage
- ✅ Explicit data source instantiation (no resolver magic)
- ✅ Type safety with Zod
- ✅ SolidStart best practices
- ✅ **Solid UI components** from https://www.solid-ui.com/ for all UI primitives
- ✅ **TanStack Table** for advanced table features
- ✅ **Responsive design** - Cards for mobile, Table for desktop
- ✅ Dummy data first, DynamoDB later
- ✅ Reusable UI components
- ✅ One controller → many UIs (ResponsiveCollectionView)

**Key Architecture Decisions:**

1. **Canonical QuerySpec**: Use `QuerySpec<TField>` as the universal query language with strict rules:
   - ✅ `sorting` (array) not `sort` (singular)
   - ✅ `pageSize` + `pageIndex` not `limit` / `offset`
   - ✅ Offset computed as `pageIndex × pageSize` in implementations
   - ✅ No `mode` field — cursor vs offset determined by cursor presence

2. **TanStack Table Isolation**: TanStack types (`SortingState`, `ColumnFiltersState`, `PaginationState`) exist ONLY in `CollectionTable` component. Controller uses `QuerySpec` directly. Table reads from QuerySpec and writes back via controller methods (`setSorting`, `setPagination`, etc.).

3. **Filter Operator Strategy**: All operators supported (eq, neq, contains, startsWith, endsWith, gt, lt, gte, lte, in). DataSources decide execution strategy:
   - Push-down to storage when possible (DynamoDB: eq, gt, lt, gte, lte, in)
   - Post-fetch in-memory when needed (contains, startsWith, endsWith, neq)
   - Never remove operators — document capabilities per implementation

4. **Immutable Data Flow**: `QueryResult<T>` uses `readonly T[]` for items to prevent accidental mutation and encourage immutable patterns throughout the UI layer.

5. **Responsive by Default**: Use `ResponsiveCollectionView` component that automatically switches between:
   - **Mobile (< 768px)**: Card grid layout
   - **Desktop (≥ 768px)**: TanStack Table with full features

6. **Server-Side Operations**: All filtering, sorting, and pagination happens on the server. TanStack Table operates in "manual" mode and syncs its state TO `QuerySpec` via controller methods (internal to `CollectionTable`).

7. **Single Source of Truth**: The `CollectionQueryController` manages all state. UI components are pure presentational layers that read from and write to the controller.

8. **Query as Data**: `QuerySpec` represents queries as declarative data structures, not behavior. This enables universal querying across different data sources without coupling to specific implementations.

9. **Solid UI Components**: Always reuse UI primitives from Solid UI (https://www.solid-ui.com/). Import from `~/components/ui/*`. Only create custom components for domain-specific abstractions that COMPOSE Solid UI primitives.

Start with Phase 1 and work sequentially. Test after each phase. Good luck! 🚀
