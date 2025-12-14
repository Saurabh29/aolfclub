import type { User, Lead } from "~/lib/schemas/ui/user.schema";
import { UserRole, LeadSource, UserSchema, LeadSchema } from "~/lib/schemas/ui/user.schema";
import type { Task, Attachment } from "~/lib/schemas/ui/task.schema";
import { TaskStatus, TaskPriority, TaskRecurrence, TaskSchema } from "~/lib/schemas/ui/task.schema";
import type { Location } from "~/lib/schemas/ui/location.schema";
import { LocationSchema } from "~/lib/schemas/ui/location.schema";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a UUID v4 compatible string
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// MOCK DATABASES
// ============================================================================

/**
 * Mock Users Database
 */
export const MOCK_USERS: User[] = [
  {
    id: "user-1",
    fullName: "John Admin",
    email: "john.admin@example.com",
    phone: "555-0101",
    role: UserRole.ADMIN,
    programsDone: [],
    programsWant: [],
    enableLogin: true,
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "user-2",
    fullName: "Sarah Teacher",
    email: "sarah.teacher@example.com",
    phone: "555-0102",
    role: UserRole.TEACHER,
    programsDone: [],
    programsWant: ["HP", "MY"],
    enableLogin: true,
    createdAt: "2025-01-16T10:00:00Z",
    updatedAt: "2025-01-16T10:00:00Z",
  },
  {
    id: "user-3",
    fullName: "Mike Volunteer",
    email: "mike.volunteer@example.com",
    phone: "555-0103",
    role: UserRole.VOLUNTEER,
    programsDone: [],
    programsWant: ["Sahaj", "VTP"],
    enableLogin: true,
    createdAt: "2025-01-17T10:00:00Z",
    updatedAt: "2025-01-17T10:00:00Z",
  },
  {
    id: "user-4",
    fullName: "Emma Member",
    email: "emma.member@example.com",
    phone: "555-0104",
    role: UserRole.MEMBER,
    programsDone: ["HP", "MY"],
    programsWant: ["UY", "AMP"],
    enableLogin: false,
    createdAt: "2025-01-18T10:00:00Z",
    updatedAt: "2025-01-18T10:00:00Z",
  },
  {
    id: "user-5",
    fullName: "Alex Member",
    email: "alex.member@example.com",
    phone: "555-0105",
    role: UserRole.MEMBER,
    programsDone: ["Sahaj"],
    programsWant: ["VTP", "MY"],
    enableLogin: false,
    createdAt: "2025-01-19T10:00:00Z",
    updatedAt: "2025-01-19T10:00:00Z",
  },
];

/**
 * Mock Leads Database
 */
export const MOCK_LEADS: Lead[] = [
  {
    id: "lead-1",
    fullName: "David Prospect",
    phone: "555-0201",
    email: "david@example.com",
    leadSource: LeadSource.WALK_IN,
    rating: 4,
    lastContact: "2025-11-25T10:00:00Z",
    nextFollowUp: "2025-12-05T14:00:00Z",
    programsWant: ["HP", "MY"],
    notes: "Interested in HP and MY programs",
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2025-01-20T10:00:00Z",
  },
  {
    id: "lead-2",
    fullName: "Lisa Interested",
    phone: "555-0202",
    email: "",
    leadSource: LeadSource.REFERRAL,
    rating: 5,
    lastContact: "2025-11-28T15:00:00Z",
    nextFollowUp: "2025-12-02T11:00:00Z",
    programsWant: ["Sahaj"],
    notes: "Referred by Emma Member",
    createdAt: "2025-01-21T10:00:00Z",
    updatedAt: "2025-01-21T10:00:00Z",
  },
  {
    id: "lead-3",
    fullName: "Tom Campaign",
    phone: "555-0203",
    email: "tom@example.com",
    leadSource: LeadSource.CAMPAIGN,
    rating: 3,
    lastContact: "2025-11-29T12:00:00Z",
    programsWant: ["UY", "AMP"],
    notes: "Responded to email campaign",
    createdAt: "2025-01-22T10:00:00Z",
    updatedAt: "2025-01-22T10:00:00Z",
  },
];

/**
 * Mock Tasks Database
 */
export const MOCK_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Prepare HP Session Materials",
    description: "Create and organize all materials needed for the upcoming Happiness Program session including worksheets, presentation slides, and participant handouts.",
    assignedTo: ["user-2"], // Sarah Teacher
    dueDate: "2025-12-05T10:00:00Z",
    priority: TaskPriority.HIGH,
    attachments: [],
    recurrence: TaskRecurrence.NONE,
    assignedLeads: ["lead-1", "lead-2"],
    assignedParticipants: ["user-4"],
    status: TaskStatus.IN_PROGRESS,
    createdBy: "user-1",
    createdAt: "2025-11-25T10:00:00Z",
    updatedAt: "2025-11-28T14:30:00Z",
  },
  {
    id: "task-2",
    title: "Follow up with new leads",
    description: "Contact all leads from last week's campaign to gauge interest and schedule introductory calls.",
    assignedTo: ["user-3"], // Mike Volunteer
    dueDate: "2025-12-02T17:00:00Z",
    priority: TaskPriority.MEDIUM,
    attachments: [],
    recurrence: TaskRecurrence.WEEKLY,
    assignedLeads: ["lead-3"],
    assignedParticipants: [],
    status: TaskStatus.TO_DO,
    createdBy: "user-1",
    createdAt: "2025-11-27T09:00:00Z",
    updatedAt: "2025-11-27T09:00:00Z",
  },
  {
    id: "task-3",
    title: "Monthly Member Check-ins",
    description: "Reach out to all active members to discuss their progress, answer questions, and collect feedback on programs.",
    assignedTo: ["user-2", "user-3"], // Sarah Teacher, Mike Volunteer
    dueDate: "2025-12-15T18:00:00Z",
    priority: TaskPriority.LOW,
    attachments: [],
    recurrence: TaskRecurrence.MONTHLY,
    assignedLeads: [],
    assignedParticipants: ["user-4", "user-5"],
    status: TaskStatus.TO_DO,
    createdBy: "user-1",
    createdAt: "2025-11-20T10:00:00Z",
    updatedAt: "2025-11-20T10:00:00Z",
  },
];

// ============================================================================
// MOCK API FUNCTIONS
// ============================================================================

/**
 * Simulates API delay
 */
const delay = (ms: number = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Users API
 */
export const usersApi = {
  /**
   * Get all users
   */
  getAll: async (): Promise<User[]> => {
    await delay();
    return [...MOCK_USERS];
  },

  /**
   * Get user by ID
   */
  getById: async (id: string): Promise<User | null> => {
    await delay();
    return MOCK_USERS.find((u) => u.id === id) || null;
  },

  /**
   * Create new user
   */
  create: async (user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> => {
    await delay();
    
    // Validate input
    const validated = UserSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(user);
    
    const newUser: User = {
      ...validated,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_USERS.push(newUser);
    return newUser;
  },

  /**
   * Update existing user
   */
  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    await delay();
    const index = MOCK_USERS.findIndex((u) => u.id === id);
    if (index === -1) return null;

    // Validate partial updates
    const validated = UserSchema.partial().omit({ id: true, createdAt: true, updatedAt: true }).parse(updates);

    MOCK_USERS[index] = {
      ...MOCK_USERS[index],
      ...validated,
      updatedAt: new Date().toISOString(),
    };
    return MOCK_USERS[index];
  },

  /**
   * Delete user
   */
  delete: async (id: string): Promise<boolean> => {
    await delay();
    const index = MOCK_USERS.findIndex((u) => u.id === id);
    if (index === -1) return false;

    MOCK_USERS.splice(index, 1);
    return true;
  },

  /**
   * Bulk delete users
   */
  bulkDelete: async (ids: string[]): Promise<number> => {
    await delay();
    let count = 0;
    ids.forEach((id) => {
      const index = MOCK_USERS.findIndex((u) => u.id === id);
      if (index !== -1) {
        MOCK_USERS.splice(index, 1);
        count++;
      }
    });
    return count;
  },

  /**
   * Search users by name, email, or phone
   */
  search: async (query: string): Promise<User[]> => {
    await delay();
    const lowerQuery = query.toLowerCase();
    return MOCK_USERS.filter(
      (u) =>
        u.fullName.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery) ||
        u.phone.includes(lowerQuery)
    );
  },
};

/**
 * Leads API
 */
export const leadsApi = {
  /**
   * Get all leads
   */
  getAll: async (): Promise<Lead[]> => {
    await delay();
    return [...MOCK_LEADS];
  },

  /**
   * Get lead by ID
   */
  getById: async (id: string): Promise<Lead | null> => {
    await delay();
    return MOCK_LEADS.find((l) => l.id === id) || null;
  },

  /**
   * Create new lead
   */
  create: async (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead> => {
    await delay();
    
    // Validate input
    const validated = LeadSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(lead);
    
    const newLead: Lead = {
      ...validated,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_LEADS.push(newLead);
    return newLead;
  },

  /**
   * Update existing lead
   */
  update: async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
    await delay();
    const index = MOCK_LEADS.findIndex((l) => l.id === id);
    if (index === -1) return null;

    // Validate partial updates
    const validated = LeadSchema.partial().omit({ id: true, createdAt: true, updatedAt: true }).parse(updates);

    MOCK_LEADS[index] = {
      ...MOCK_LEADS[index],
      ...validated,
      updatedAt: new Date().toISOString(),
    };
    return MOCK_LEADS[index];
  },

  /**
   * Delete lead
   */
  delete: async (id: string): Promise<boolean> => {
    await delay();
    const index = MOCK_LEADS.findIndex((l) => l.id === id);
    if (index === -1) return false;

    MOCK_LEADS.splice(index, 1);
    return true;
  },
};

/**
 * Export users as CSV
 */
export const exportUsersCSV = (): string => {
  const headers = ["Name", "Email", "Phone", "Role", "Programs Done", "Programs Want", "Enable Login"];
  const rows = MOCK_USERS.map((u) => [
    u.fullName,
    u.email,
    u.phone,
    u.role,
    u.programsDone.join("; "),
    u.programsWant.join("; "),
    u.enableLogin ? "Yes" : "No",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================================
// TASKS API
// ============================================================================

/**
 * Tasks API
 */
export const tasksApi = {
  /**
   * Get all tasks
   */
  getAll: async (): Promise<Task[]> => {
    await delay();
    return [...MOCK_TASKS];
  },

  /**
   * Get task by ID
   */
  getById: async (id: string): Promise<Task | null> => {
    await delay();
    return MOCK_TASKS.find((t) => t.id === id) || null;
  },

  /**
   * Create new task (Step 1)
   */
  create: async (task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> => {
    await delay();
    
    // Validate input
    const validated = TaskSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(task);
    
    const newTask: Task = {
      ...validated,
      id: generateId(),
      status: TaskStatus.DRAFT, // Starts as draft until participants assigned
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_TASKS.push(newTask);
    return newTask;
  },

  /**
   * Update existing task
   */
  update: async (id: string, updates: Partial<Task>): Promise<Task | null> => {
    await delay();
    const index = MOCK_TASKS.findIndex((t) => t.id === id);
    if (index === -1) return null;

    // Validate partial updates
    const validated = TaskSchema.partial().omit({ id: true, createdAt: true, updatedAt: true }).parse(updates);

    MOCK_TASKS[index] = {
      ...MOCK_TASKS[index],
      ...validated,
      updatedAt: new Date().toISOString(),
    };
    return MOCK_TASKS[index];
  },

  /**
   * Assign participants/leads to task (Step 2)
   */
  assignParticipants: async (
    taskId: string,
    leads: string[],
    participants: string[]
  ): Promise<Task | null> => {
    await delay();
    const index = MOCK_TASKS.findIndex((t) => t.id === taskId);
    if (index === -1) return null;

    MOCK_TASKS[index] = {
      ...MOCK_TASKS[index],
      assignedLeads: [...MOCK_TASKS[index].assignedLeads, ...leads],
      assignedParticipants: [...MOCK_TASKS[index].assignedParticipants, ...participants],
      status: TaskStatus.TO_DO, // Move from DRAFT to TO_DO after assignments
      updatedAt: new Date().toISOString(),
    };
    return MOCK_TASKS[index];
  },

  /**
   * Update task status (for Kanban board)
   */
  updateStatus: async (taskId: string, status: TaskStatus): Promise<Task | null> => {
    await delay();
    const index = MOCK_TASKS.findIndex((t) => t.id === taskId);
    if (index === -1) return null;

    const updates: Partial<Task> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === TaskStatus.COMPLETED) {
      updates.completedAt = new Date().toISOString();
    }

    MOCK_TASKS[index] = {
      ...MOCK_TASKS[index],
      ...updates,
    };
    return MOCK_TASKS[index];
  },

  /**
   * Delete task
   */
  delete: async (id: string): Promise<boolean> => {
    await delay();
    const index = MOCK_TASKS.findIndex((t) => t.id === id);
    if (index === -1) return false;

    MOCK_TASKS.splice(index, 1);
    return true;
  },

  /**
   * Search tasks by title or description
   */
  search: async (query: string): Promise<Task[]> => {
    await delay();
    const lowerQuery = query.toLowerCase();
    return MOCK_TASKS.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Filter tasks by status
   */
  getByStatus: async (status: TaskStatus): Promise<Task[]> => {
    await delay();
    return MOCK_TASKS.filter((t) => t.status === status);
  },

  /**
   * Filter tasks by assigned user (Teacher/Volunteer)
   */
  getByAssignedUser: async (userId: string): Promise<Task[]> => {
    await delay();
    return MOCK_TASKS.filter((t) => t.assignedTo.includes(userId));
  },

  /**
   * Filter tasks by priority
   */
  getByPriority: async (priority: TaskPriority): Promise<Task[]> => {
    await delay();
    return MOCK_TASKS.filter((t) => t.priority === priority);
  },

  /**
   * Add attachment to task
   */
  addAttachment: async (taskId: string, attachment: Attachment): Promise<Task | null> => {
    await delay();
    const index = MOCK_TASKS.findIndex((t) => t.id === taskId);
    if (index === -1) return null;

    MOCK_TASKS[index] = {
      ...MOCK_TASKS[index],
      attachments: [...MOCK_TASKS[index].attachments, attachment],
      updatedAt: new Date().toISOString(),
    };
    return MOCK_TASKS[index];
  },

  /**
   * Remove attachment from task
   */
  removeAttachment: async (taskId: string, attachmentId: string): Promise<Task | null> => {
    await delay();
    const index = MOCK_TASKS.findIndex((t) => t.id === taskId);
    if (index === -1) return null;

    MOCK_TASKS[index] = {
      ...MOCK_TASKS[index],
      attachments: MOCK_TASKS[index].attachments.filter((a) => a.id !== attachmentId),
      updatedAt: new Date().toISOString(),
    };
    return MOCK_TASKS[index];
  },
};

// ============================================================================
// LOCATIONS API
// ============================================================================

/**
 * Locations API - DEPRECATED
 * Use server functions from ~/server/actions/locations instead:
 * - getLocations()
 * - getLocationById(id)
 * - createLocation(formData)
 * - updateLocation(id, formData)
 * - deleteLocation(id)
 */
