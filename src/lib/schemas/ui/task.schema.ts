import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Task Priority Levels
 */
export const TaskPriority = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

/**
 * Task Status
 */
export const TaskStatus = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  DRAFT: "Draft", // Before Step 2 is completed
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * Task Recurrence Options
 */
export const TaskRecurrence = {
  NONE: "None",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
} as const;

export type TaskRecurrence =
  (typeof TaskRecurrence)[keyof typeof TaskRecurrence];

/**
 * Attachment type
 */
export const AttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number(), // in bytes
  uploadedAt: z.string(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

// ============================================================================
// TASK SCHEMA
// ============================================================================

/**
 * Main Task Schema
 */
export const TaskSchema = z.object({
  id: z.string(),

  // Step 1 Fields
  title: z.string().min(3, "Task title is required (minimum 3 characters)"),
  description: z
    .string()
    .min(10, "Task description is required (minimum 10 characters)"),
  assignedTo: z
    .array(z.string())
    .min(1, "At least one Teacher or Volunteer must be assigned"), // User IDs
  dueDate: z.string(), // ISO date string
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
  attachments: z.array(AttachmentSchema).default([]),
  recurrence: z
    .enum([
      TaskRecurrence.NONE,
      TaskRecurrence.DAILY,
      TaskRecurrence.WEEKLY,
      TaskRecurrence.MONTHLY,
    ])
    .default(TaskRecurrence.NONE),

  // Step 2 Fields (populated after assignment)
  assignedLeads: z.array(z.string()).default([]), // Lead IDs
  assignedParticipants: z.array(z.string()).default([]), // User IDs (Members only)

  // Metadata
  status: z
    .enum([
      TaskStatus.DRAFT,
      TaskStatus.TO_DO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ])
    .default(TaskStatus.DRAFT),

  createdBy: z.string(), // User ID of creator
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Step 1 - Create Task Form Schema
 */
export const CreateTaskFormSchema = z.object({
  title: z.string().min(3, "Task title is required (minimum 3 characters)"),
  description: z
    .string()
    .min(10, "Task description is required (minimum 10 characters)"),
  assignedTo: z
    .array(z.string())
    .min(1, "Please assign at least one Teacher or Volunteer"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
  recurrence: z
    .enum([
      TaskRecurrence.NONE,
      TaskRecurrence.DAILY,
      TaskRecurrence.WEEKLY,
      TaskRecurrence.MONTHLY,
    ])
    .default(TaskRecurrence.NONE),
  // Attachments handled separately via file upload
});

export type CreateTaskForm = z.infer<typeof CreateTaskFormSchema>;

/**
 * Step 2 - Assign Participants/Leads Form Schema
 */
export const AssignParticipantsFormSchema = z.object({
  taskId: z.string(),
  assignedLeads: z.array(z.string()).default([]),
  assignedParticipants: z.array(z.string()).default([]),
});

export type AssignParticipantsForm = z.infer<
  typeof AssignParticipantsFormSchema
>;

/**
 * Update Task Status Schema
 */
export const UpdateTaskStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum([
    TaskStatus.TO_DO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
  ]),
});

export type UpdateTaskStatus = z.infer<typeof UpdateTaskStatusSchema>;
