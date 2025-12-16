/**
 * REPOSITORY EXPORTS (ReBAC Design)
 *
 * Single-table DynamoDB repositories
 * NO GSIs | Query-driven | Location-scoped operations
 */

// User
export * from "./user.repository";

// Location
export * from "./location.repository";

// Role & Page
export * from "./role-page.repository";

// Access Control (ReBAC)
export * from "./access.repository";

// Email Identity (OAuth)
export * from "./email-identity.repository";
