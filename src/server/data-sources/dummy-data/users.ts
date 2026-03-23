import { ulid } from "ulid";
import type { User } from "~/lib/schemas/domain";
import type { Lead, InterestLevel } from "~/lib/schemas/domain";
import type { Member } from "~/lib/schemas/domain";

// Available programs in the system
const AVAILABLE_PROGRAMS = [
  "Yoga 101",
  "Advanced Yoga",
  "Teacher Training",
  "Meditation Basics",
  "Holistic Wellness",
  "Pranayama Workshop",
  "Ayurveda Fundamentals",
];

const INTEREST_LEVELS: InterestLevel[] = ["High", "Medium", "Low", "Not_Interested"];

/**
 * Generate realistic dummy volunteers (Users) for testing.
 * Users are app users who log in — they have email, no program or call-tracking fields.
 */
export function generateDummyUsers(count: number): User[] {
  const users: User[] = [];
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Isaac", "Julia", "Kevin", "Laura", "Michael", "Nina", "Oscar", "Patricia"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson"];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    const createdDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

    users.push({
      id: ulid(),
      email,
      displayName: `${firstName} ${lastName}`,
      isAdmin: i === 0,
      image: i % 3 === 0 ? `https://i.pravatar.cc/150?u=${email}` : undefined,
      phone: i % 2 === 0 ? `+1${String(Math.floor(Math.random() * 10000000000)).padStart(10, "0")}` : undefined,
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    });
  }

  return users;
}

/**
 * Generate realistic dummy Leads (prospects) for testing.
 */
export function generateDummyLeads(count: number): Lead[] {
  const leads: Lead[] = [];
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Isaac", "Julia"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];

    const createdDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

    const hasBeenCalled = Math.random() > 0.3;
    const totalCallCount = hasBeenCalled ? Math.floor(Math.random() * 5) + 1 : 0;

    leads.push({
      id: ulid(),
      displayName: `${firstName} ${lastName}`,
      phone: `+1${String(Math.floor(Math.random() * 10000000000)).padStart(10, "0")}`,
      email: Math.random() > 0.5 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` : undefined,
      interestedPrograms: Math.random() > 0.2
        ? AVAILABLE_PROGRAMS.slice(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3) + 2)
        : [],
      lastCallDate: hasBeenCalled
        ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      lastInterestLevel: hasBeenCalled
        ? INTEREST_LEVELS[Math.floor(Math.random() * INTEREST_LEVELS.length)]
        : undefined,
      nextFollowUpDate: hasBeenCalled && Math.random() > 0.5
        ? new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      lastNotes: hasBeenCalled && Math.random() > 0.5 ? "Interested but needs more time." : undefined,
      totalCallCount,
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    });
  }

  return leads;
}

/**
 * Generate realistic dummy Members for testing.
 */
export function generateDummyMembers(count: number): Member[] {
  const members: Member[] = [];
  const firstNames = ["Kevin", "Laura", "Michael", "Nina", "Oscar", "Patricia", "Quinn", "Ruth"];
  const lastNames = ["Wilson", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore"];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];

    const createdDate = new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

    members.push({
      id: ulid(),
      displayName: `${firstName} ${lastName}`,
      phone: `+1${String(Math.floor(Math.random() * 10000000000)).padStart(10, "0")}`,
      email: Math.random() > 0.5 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` : undefined,
      memberSince: createdDate.toISOString(),
      programsDone: AVAILABLE_PROGRAMS.slice(0, Math.floor(Math.random() * 3) + 1),
      interestedPrograms: Math.random() > 0.3
        ? AVAILABLE_PROGRAMS.slice(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3) + 2)
        : [],
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    });
  }

  return members;
}
