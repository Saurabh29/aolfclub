/**
 * ARCHITECTURAL BOUNDARIES - ENFORCED BY TYPESCRIPT
 *
 * This document explains how type safety prevents cross-boundary violations
 *
 * ## Layer Separation
 *
 * ```
 * UI Layer (src/lib/schemas/ui/)
 *   ↓ can import
 * Action Layer (src/server/actions/, src/server/services/)
 *   ↓ can import
 * Repository Layer (src/server/db/repositories/)
 *   ↓ can import
 * DB Schema Layer (src/lib/schemas/db/)
 * ```
 *
 * ## Rules (Enforced by TypeScript)
 *
 * ❌ **FORBIDDEN**:
 * - UI importing DB schemas directly
 * - DB schemas importing UI schemas
 * - Repositories accepting plain objects without types
 *
 * ✅ **ALLOWED**:
 * - Actions importing repository input types
 * - Actions importing UI schemas
 * - Repositories exporting input types
 *
 * ## How It Catches Errors
 *
 * ### Example 1: Missing Field in DB Schema
 *
 * ```typescript
 * // DB Schema adds required field
 * export const LocationSchema = z.object({
 *   // ... existing fields
 *   country: z.string(), // NEW REQUIRED FIELD
 * });
 *
 * // Action file will get compile error:
 * const dbInput: CreateLocationInput = {
 *   name: form.name,
 *   address: form.address,
 *   status: "active",
 * };
 * // ❌ Error: Property 'country' is missing in type
 * ```
 *
 * ### Example 2: Wrong Type Passed to Repository
 *
 * ```typescript
 * // Try to pass UI form directly to repository
 * await createLocationRepo(formData);
 * // ❌ Error: Type 'AddLocationForm' is not assignable to type 'CreateLocationInput'
 * //    Property 'locationId' does not exist in type 'CreateLocationInput'
 * ```
 *
 * ### Example 3: UI Trying to Access DB Schema
 *
 * ```typescript
 * // In UI component
 * import { LocationSchema } from "~/lib/schemas/db/location.schema";
 * // ✅ This is technically allowed but creates tight coupling
 * // Better: UI should only know about its own schemas
 * ```
 *
 * ## Benefits
 *
 * 1. **Compile-time safety**: Schema changes break builds immediately
 * 2. **Clear contracts**: Repository input types define the API
 * 3. **No runtime overhead**: Pure TypeScript, zero cost
 * 4. **Maintainability**: Changes propagate through type system
 * 5. **Documentation**: Types serve as living documentation
 *
 * ## Implementation Pattern
 *
 * ### 1. DB Schema (Source of Truth)
 * ```typescript
 * // src/lib/schemas/db/location.schema.ts
 * export const LocationSchema = z.object({
 *   PK: z.string(),
 *   SK: z.literal("META"),
 *   locationId: z.string(),
 *   name: z.string(),
 *   status: z.enum(["active", "inactive"]),
 *   // ... other fields
 * });
 * ```
 *
 * ### 2. Repository (Exports Input Type)
 * ```typescript
 * // src/server/db/repositories/location.repository.ts
 * export type CreateLocationInput = CreateInput<typeof LocationSchema, "locationId">;
 *
 * export async function createLocation(input: CreateLocationInput): Promise<Location> {
 *   // Implementation
 * }
 * ```
 *
 * ### 3. Action (Transforms UI → Repository)
 * ```typescript
 * // src/server/actions/locations.ts
 * import { type CreateLocationInput } from "~/server/db/repositories";
 * import type { AddLocationForm } from "~/lib/schemas/ui/location.schema";
 *
 * export async function createLocation(formData: AddLocationForm) {
 *   // Transform - TypeScript checks this assignment
 *   const dbInput: CreateLocationInput = {
 *     name: formData.name,
 *     address: formData.address,
 *     status: "active",
 *   };
 *
 *   return await createLocationRepo(dbInput);
 * }
 * ```
 *
 * ### 4. UI (Only Knows UI Schema)
 * ```typescript
 * // src/routes/(protected)/locations.tsx
 * import type { AddLocationForm } from "~/lib/schemas/ui/location.schema";
 * import { createLocation } from "~/server/actions/locations";
 *
 * const formData: AddLocationForm = { /* ... */ };
 * await createLocation(formData);
 * ```
 *
 * ## Alternative: Mapper Functions (NOT RECOMMENDED)
 *
 * Previously, we had mapper functions like:
 * ```typescript
 * function mapLocationFormToDbInput(form: AddLocationForm): CreateLocationInput {
 *   return { ... };
 * }
 * ```
 *
 * **Why inline transformation is better:**
 * - One less layer of indirection
 * - TypeScript checks happen at usage site (easier to debug)
 * - Simpler code, less maintenance
 * - Mappers are only useful when reused multiple times
 *
 * ## Testing Type Safety
 *
 * To verify type safety is working:
 *
 * 1. Add a required field to DB schema
 * 2. Run `pnpm run build` or check in VSCode
 * 3. Should see TypeScript errors in action files
 * 4. Fix by adding field to transformation
 *
 * Example test:
 * ```typescript
 * // In LocationSchema, add:
 * country: z.string().min(1),
 *
 * // Run build → Error in locations.ts:
 * // Property 'country' is missing in type
 * ```
 */
