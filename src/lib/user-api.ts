import type { User, Lead } from "~/schemas/user.schema";
import { UserRole, LeadSource } from "~/schemas/user.schema";

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
    programsWant: ["UY", "AMP"],
    notes: "Responded to email campaign",
    createdAt: "2025-01-22T10:00:00Z",
    updatedAt: "2025-01-22T10:00:00Z",
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
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
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

    MOCK_USERS[index] = {
      ...MOCK_USERS[index],
      ...updates,
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
    const newLead: Lead = {
      ...lead,
      id: `lead-${Date.now()}`,
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

    MOCK_LEADS[index] = {
      ...MOCK_LEADS[index],
      ...updates,
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
