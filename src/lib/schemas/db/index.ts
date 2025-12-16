/**
 * DATABASE SCHEMAS (ReBAC Design)
 *
 * Single-table DynamoDB design for Relationship-Based Access Control
 * NO GSIs | Query-driven | Location-scoped operations
 */

// Core entities
export * from "./user.schema";
export * from "./location.schema";
export * from "./role.schema";
export * from "./page.schema";

// Relationship items
export * from "./user-location-role.schema";
export * from "./role-page-access.schema";
