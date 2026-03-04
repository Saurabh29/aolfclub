import { ulid } from "ulid";
import type { User, InterestLevel } from "~/lib/schemas/domain";

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
 * Generate realistic dummy users for testing
 */
export function generateDummyUsers(count: number): User[] {
  const users: User[] = [];
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Isaac", "Julia", "Kevin", "Laura", "Michael", "Nina", "Oscar", "Patricia"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson"];
  const userTypes: Array<User["userType"]> = ["MEMBER", "LEAD"];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    const createdDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    const userType = userTypes[i % userTypes.length];
    const isMember = userType === "MEMBER";
    
    // Program tracking
    const programsDone = isMember && Math.random() > 0.3
      ? AVAILABLE_PROGRAMS.slice(0, Math.floor(Math.random() * 3) + 1)
      : [];
    
    const interestedPrograms = Math.random() > 0.2
      ? AVAILABLE_PROGRAMS.slice(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3) + 3)
      : [];
    
    // Call history (70% have been called at least once)
    const hasBeenCalled = Math.random() > 0.3;
    const totalCallCount = hasBeenCalled ? Math.floor(Math.random() * 5) + 1 : 0;
    
    const lastCallDate = hasBeenCalled
      ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    
    const lastInterestLevel = hasBeenCalled
      ? INTEREST_LEVELS[Math.floor(Math.random() * INTEREST_LEVELS.length)]
      : undefined;
    
    // 50% of called leads have follow-up scheduled
    const hasFollowUp = hasBeenCalled && Math.random() > 0.5;
    const nextFollowUpDate = hasFollowUp
      ? new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    
    const lastNotes = hasBeenCalled && Math.random() > 0.5
      ? [
          "Interested but needs more time to decide",
          "Wants to enroll after March",
          "Budget constraint, follow up in 2 weeks",
          "Very enthusiastic, send course details",
          "Not interested right now",
          "Already enrolled elsewhere",
        ][Math.floor(Math.random() * 6)]
      : undefined;
    
    users.push({
      id: ulid(),
      email,
      displayName: `${firstName} ${lastName}`,
      userType,
      isAdmin: i === 0, // First user is admin
      image: i % 3 === 0 ? `https://i.pravatar.cc/150?u=${email}` : undefined,
      phone: i % 2 === 0 ? `+1${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}` : undefined,
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
      
      // Program tracking
      memberSince: isMember ? createdDate.toISOString() : undefined,
      programsDone,
      interestedPrograms,
      
      // Call history
      lastCallDate,
      lastInterestLevel,
      nextFollowUpDate,
      lastNotes,
      totalCallCount,
    });
  }
  
  return users;
}
