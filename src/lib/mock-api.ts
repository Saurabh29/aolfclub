// ============================================================================
// ENUMS & TYPES
// ============================================================================

export const UserRole = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  VOLUNTEER: "Volunteer",
  MEMBER: "Member",
  LEAD: "Lead",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const LeadSource = {
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  CAMPAIGN: "Campaign",
  UNKNOWN: "Unknown",
} as const;

export type LeadSource = typeof LeadSource[keyof typeof LeadSource];

export type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: typeof UserRole[keyof typeof UserRole];
  programsDone: string[]; // For Members
  programsWant: string[]; // For Members
  enableLogin: boolean;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
};

export type Lead = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  leadSource: typeof LeadSource[keyof typeof LeadSource];
  programsWant: string[]; // Leads only have "want to do"
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// MOCK DATABASES
// ============================================================================

export const MOCK_USERS: User[] = [
  {
    id: "user-1",
    fullName: "John Admin",
    email: "john@example.com",
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
    email: "sarah@example.com",
    phone: "555-0102",
    role: UserRole.TEACHER,
    programsDone: [],
    programsWant: [],
    enableLogin: true,
    createdAt: "2025-01-16T10:00:00Z",
    updatedAt: "2025-01-16T10:00:00Z",
  },
  {
    id: "user-3",
    fullName: "Mike Volunteer",
    email: "mike@example.com",
    phone: "555-0103",
    role: UserRole.VOLUNTEER,
    programsDone: [],
    programsWant: [],
    enableLogin: true,
    createdAt: "2025-01-17T10:00:00Z",
    updatedAt: "2025-01-17T10:00:00Z",
  },
  {
    id: "user-4",
    fullName: "Emma Member",
    email: "emma@example.com",
    phone: "555-0104",
    role: UserRole.MEMBER,
    programsDone: ["HP", "MY"],
    programsWant: ["Sahaj", "VTP"],
    enableLogin: false,
    createdAt: "2025-01-18T10:00:00Z",
    updatedAt: "2025-01-18T10:00:00Z",
  },
  {
    id: "user-5",
    fullName: "Alex Member",
    email: "alex@example.com",
    phone: "555-0105",
    role: UserRole.MEMBER,
    programsDone: ["UY"],
    programsWant: ["AMP", "Coding Club"],
    enableLogin: false,
    createdAt: "2025-01-19T10:00:00Z",
    updatedAt: "2025-01-19T10:00:00Z",
  },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: "lead-1",
    fullName: "David Prospect",
    phone: "555-0201",
    email: "david@example.com",
    leadSource: LeadSource.WALK_IN,
    programsWant: ["HP", "MY"],
    notes: "Interested in basketball program",
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
    notes: "Referred by Emma",
    createdAt: "2025-01-21T10:00:00Z",
    updatedAt: "2025-01-21T10:00:00Z",
  },
];

// ============================================================================
// MOCK API FUNCTIONS
// ============================================================================

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    await delay();
    return [...MOCK_USERS];
  },
  
  getById: async (id: string): Promise<User | null> => {
    await delay();
    return MOCK_USERS.find(u => u.id === id) || null;
  },
  
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
  
  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    await delay();
    const index = MOCK_USERS.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    MOCK_USERS[index] = {
      ...MOCK_USERS[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return MOCK_USERS[index];
  },
  
  delete: async (id: string): Promise<boolean> => {
    await delay();
    const index = MOCK_USERS.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    MOCK_USERS.splice(index, 1);
    return true;
  },
  
  bulkDelete: async (ids: string[]): Promise<number> => {
    await delay();
    let count = 0;
    ids.forEach(id => {
      const index = MOCK_USERS.findIndex(u => u.id === id);
      if (index !== -1) {
        MOCK_USERS.splice(index, 1);
        count++;
      }
    });
    return count;
  },
};

export const leadsApi = {
  getAll: async (): Promise<Lead[]> => {
    await delay();
    return [...MOCK_LEADS];
  },
  
  getById: async (id: string): Promise<Lead | null> => {
    await delay();
    return MOCK_LEADS.find(l => l.id === id) || null;
  },
  
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
  
  update: async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
    await delay();
    const index = MOCK_LEADS.findIndex(l => l.id === id);
    if (index === -1) return null;
    
    MOCK_LEADS[index] = {
      ...MOCK_LEADS[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return MOCK_LEADS[index];
  },
  
  delete: async (id: string): Promise<boolean> => {
    await delay();
    const index = MOCK_LEADS.findIndex(l => l.id === id);
    if (index === -1) return false;
    
    MOCK_LEADS.splice(index, 1);
    return true;
  },
};
