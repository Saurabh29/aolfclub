/**
 * Seed data for dummy (in-memory) data sources.
 *
 * Used when USE_DUMMY_DATA=true — lets you develop the UI without DynamoDB.
 * All IDs are fixed ULIDs so cross-entity references stay consistent.
 */

import type { User } from "~/lib/schemas/domain";
import type { Lead } from "~/lib/schemas/domain";
import type { Member } from "~/lib/schemas/domain";
import type { Location } from "~/lib/schemas/domain";
import type { Task } from "~/lib/schemas/domain";

// ── Fixed IDs ──────────────────────────────────────────────────────────────

const LOC1 = "01J100000000000000000000A1";
const LOC2 = "01J100000000000000000000A2";

const USER_ADMIN = "01J100000000000000000000B1";
const USER_TEACHER = "01J100000000000000000000B2";
const USER_VOL1 = "01J100000000000000000000B3";
const USER_VOL2 = "01J100000000000000000000B4";

const ts1 = "2025-01-15T10:00:00.000Z";
const ts2 = "2025-02-20T14:30:00.000Z";

// ── Locations ──────────────────────────────────────────────────────────────

export const dummyLocations: Location[] = [
  {
    id: LOC1,
    slug: "bangalore-south",
    name: "Bangalore South Centre",
    description: "Art of Living centre in South Bangalore",
    address: "21st Main Road, HSR Layout",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    countryCode: "IN",
    zipCode: "560102",
    isActive: true,
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: LOC2,
    slug: "bangalore-north",
    name: "Bangalore North Centre",
    description: "Art of Living centre in North Bangalore",
    address: "5th Cross, Hebbal",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    countryCode: "IN",
    zipCode: "560024",
    isActive: true,
    createdAt: ts1,
    updatedAt: ts1,
  },
];

// ── Users ──────────────────────────────────────────────────────────────────

export const dummyUsers: User[] = [
  {
    id: USER_ADMIN,
    email: "admin@example.com",
    displayName: "Priya Sharma",
    phone: "+919876543210",
    activeLocationId: LOC1,
    activeRole: "ADMIN",
    isAdmin: true,
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: USER_TEACHER,
    email: "teacher@example.com",
    displayName: "Rajesh Kumar",
    phone: "+919876543211",
    activeLocationId: LOC1,
    activeRole: "TEACHER",
    isAdmin: false,
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: USER_VOL1,
    email: "volunteer1@example.com",
    displayName: "Anita Desai",
    phone: "+919876543212",
    activeLocationId: LOC1,
    activeRole: "VOLUNTEER",
    isAdmin: false,
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: USER_VOL2,
    email: "volunteer2@example.com",
    displayName: "Suresh Patel",
    phone: "+919876543213",
    activeLocationId: LOC2,
    activeRole: "VOLUNTEER",
    isAdmin: false,
    createdAt: ts1,
    updatedAt: ts1,
  },
];

// ── Leads ──────────────────────────────────────────────────────────────────

export const dummyLeads: Lead[] = [
  {
    id: "01J100000000000000000000C1",
    locationId: LOC1,
    displayName: "Arjun Mehta",
    phone: "+919800000001",
    email: "arjun@example.com",
    interestedPrograms: ["Happiness Program"],
    lastInterestLevel: "High",
    totalCallCount: 3,
    lastCallDate: "2025-01-10T09:00:00.000Z",
    nextFollowUpDate: "2025-01-20T09:00:00.000Z",
    lastNotes: "Very interested, needs schedule confirmation",
    tags: ["Callback Requested"],
    createdAt: ts1,
    updatedAt: ts2,
  },
  {
    id: "01J100000000000000000000C2",
    locationId: LOC1,
    displayName: "Meera Iyer",
    phone: "+919800000002",
    interestedPrograms: ["Art Excel", "Happiness Program"],
    lastInterestLevel: "Medium",
    totalCallCount: 1,
    lastCallDate: "2025-01-12T11:00:00.000Z",
    tags: ["No WhatsApp"],
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: "01J100000000000000000000C3",
    locationId: LOC1,
    displayName: "Vikram Singh",
    phone: "+919800000003",
    interestedPrograms: ["Sahaj Samadhi"],
    lastInterestLevel: "Low",
    totalCallCount: 2,
    tags: [],
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: "01J100000000000000000000C4",
    locationId: LOC2,
    displayName: "Kavitha Nair",
    phone: "+919800000004",
    email: "kavitha@example.com",
    interestedPrograms: ["Happiness Program"],
    lastInterestLevel: "High",
    totalCallCount: 0,
    tags: [],
    createdAt: ts2,
    updatedAt: ts2,
  },
  {
    id: "01J100000000000000000000C5",
    locationId: LOC2,
    displayName: "Ravi Krishnan",
    phone: "+919800000005",
    interestedPrograms: ["Youth Empowerment Seminar"],
    totalCallCount: 1,
    lastCallDate: "2025-02-18T16:00:00.000Z",
    lastNotes: "Call back after exams",
    tags: ["DND"],
    createdAt: ts2,
    updatedAt: ts2,
  },
];

// ── Members ────────────────────────────────────────────────────────────────

export const dummyMembers: Member[] = [
  {
    id: "01J100000000000000000000D1",
    locationId: LOC1,
    displayName: "Sunita Rao",
    phone: "+919700000001",
    email: "sunita@example.com",
    memberSince: "2023-06-01T00:00:00.000Z",
    programsDone: ["Happiness Program", "Sahaj Samadhi"],
    interestedPrograms: ["Silence Retreat"],
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: "01J100000000000000000000D2",
    locationId: LOC1,
    displayName: "Amit Joshi",
    phone: "+919700000002",
    memberSince: "2024-01-15T00:00:00.000Z",
    programsDone: ["Happiness Program"],
    interestedPrograms: ["Art Excel"],
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: "01J100000000000000000000D3",
    locationId: LOC1,
    displayName: "Lakshmi Venkat",
    phone: "+919700000003",
    memberSince: "2024-08-20T00:00:00.000Z",
    programsDone: ["Happiness Program", "Art Excel"],
    interestedPrograms: [],
    createdAt: ts1,
    updatedAt: ts2,
  },
  {
    id: "01J100000000000000000000D4",
    locationId: LOC2,
    displayName: "Deepak Hegde",
    phone: "+919700000004",
    email: "deepak@example.com",
    memberSince: "2024-03-10T00:00:00.000Z",
    programsDone: ["Happiness Program"],
    interestedPrograms: ["Sahaj Samadhi"],
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: "01J100000000000000000000D5",
    locationId: LOC2,
    displayName: "Pallavi Gowda",
    phone: "+919700000005",
    memberSince: "2024-11-01T00:00:00.000Z",
    programsDone: ["Happiness Program", "Youth Empowerment Seminar"],
    interestedPrograms: [],
    createdAt: ts2,
    updatedAt: ts2,
  },
];

// ── Tasks ──────────────────────────────────────────────────────────────────

export const dummyTasks: Task[] = [
  {
    id: "01J100000000000000000000E1",
    locationId: LOC1,
    name: "January Follow-Up Calls",
    objective: "Re-engage leads from the Happiness Program intro session",
    deadline: "2025-02-01T23:59:59.000Z",
    targetUserType: "LEAD",
    contactFilterSpec: JSON.stringify({ filters: [], sorting: [], pagination: { pageSize: 50, pageIndex: 0 } }),
    matchedContactIds: ["01J100000000000000000000C1", "01J100000000000000000000C2", "01J100000000000000000000C3"],
    selectedAgentIds: [USER_VOL1],
    assignmentMode: "PreAssigned",
    assignments: [
      {
        agentId: USER_VOL1,
        contactIds: ["01J100000000000000000000C1", "01J100000000000000000000C2", "01J100000000000000000000C3"],
        assignedAt: ts1,
      },
    ],
    contactPoolIds: [],
    status: "Active",
    createdBy: USER_ADMIN,
    createdAt: ts1,
    updatedAt: ts1,
  },
  {
    id: "01J100000000000000000000E2",
    locationId: LOC2,
    name: "Member Check-In Calls",
    objective: "Check on members for upcoming Silence Retreat interest",
    targetUserType: "MEMBER",
    contactFilterSpec: JSON.stringify({ filters: [], sorting: [], pagination: { pageSize: 50, pageIndex: 0 } }),
    matchedContactIds: ["01J100000000000000000000D4", "01J100000000000000000000D5"],
    selectedAgentIds: [USER_VOL2],
    assignmentMode: "LeadPool",
    assignments: [],
    contactPoolIds: ["01J100000000000000000000D4", "01J100000000000000000000D5"],
    status: "Draft",
    createdBy: USER_TEACHER,
    createdAt: ts2,
    updatedAt: ts2,
  },
];
