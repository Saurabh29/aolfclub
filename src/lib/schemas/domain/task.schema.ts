import { z } from "zod";
import type { QuerySpec } from "../query";
import type { UserField } from "./user.schema";

/**
 * Assignment mode for tasks
 */
export const AssignmentModeEnum = z.enum([
	"PreAssigned",      // Manager assigns specific leads to agents
	"LeadPool",         // Agents self-select from pool
	"Hybrid",           // Mix of pre-assigned + pool
]);
export type AssignmentMode = z.infer<typeof AssignmentModeEnum>;

/**
 * Task status
 */
export const TaskStatusEnum = z.enum([
	"Draft",            // Being created
	"Active",           // Agents can work on it
	"Paused",           // Temporarily stopped
	"Completed",        // All leads processed
	"Cancelled",        // Terminated
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

/**
 * Individual contact assignment to an agent.
 * "Contact" = the person being called, regardless of whether they are a Lead or Member.
 */
export const LeadAssignmentSchema = z.object({
	agentId: z.ulid(),
	contactIds: z.array(z.ulid()),
	assignedAt: z.iso.datetime(),
});
export type LeadAssignment = z.infer<typeof LeadAssignmentSchema>;

/**
 * Call Task entity
 * Represents a call campaign with filtered contacts (leads OR members) and assigned agents.
 * A task exclusively targets one userType — never a mix.
 */
export const TaskSchema = z.object({
	id: z.ulid(),
	
	// Task definition (Step 0)
	name: z.string().min(1),
	objective: z.string().optional(),
	deadline: z.iso.datetime().optional(),
	targetCallsPerAgent: z.number().int().positive().optional(),
	
	// Who is being called (Step 0 — set once, never mixed)
	targetUserType: z.enum(["LEAD", "MEMBER"]),

	// Contact filtering (Step 1)
	// Store as JSON string since QuerySpec is complex
	contactFilterSpec: z.string(), // JSON.stringify(QuerySpec<UserField>)
	matchedContactIds: z.array(z.ulid()), // Cached result of filter
	
	// Team selection (Step 2)
	selectedAgentIds: z.array(z.ulid()),
	
	// Assignment strategy (Step 3)
	assignmentMode: AssignmentModeEnum,
	assignments: z.array(LeadAssignmentSchema).default([]),
	maxLeadsPerAgent: z.number().int().positive().optional(),
	contactPoolIds: z.array(z.ulid()).default([]), // Unassigned contacts for pool mode
	
	// Metadata
	status: TaskStatusEnum.default("Draft"),
	createdBy: z.ulid(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * TaskField - Type-safe field names for Task entity
 */
export type TaskField = keyof Task;

/**
 * Create task request (from wizard)
 */
export const CreateTaskRequestSchema = z.object({
	name: z.string().min(1),
	objective: z.string().optional(),
	deadline: z.iso.datetime().optional(),
	targetCallsPerAgent: z.number().int().positive().optional(),
	targetUserType: z.enum(["LEAD", "MEMBER"]),
	contactFilterSpec: z.string(),
	matchedContactIds: z.array(z.ulid()),
	selectedAgentIds: z.array(z.ulid()).min(1),
	assignmentMode: AssignmentModeEnum,
	assignments: z.array(LeadAssignmentSchema).default([]),
	maxLeadsPerAgent: z.number().int().positive().optional(),
	contactPoolIds: z.array(z.ulid()).default([]),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
