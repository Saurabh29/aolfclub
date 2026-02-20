import { ulid } from "ulid";
import type { User } from "~/lib/schemas/domain";

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
    
    users.push({
      id: ulid(),
      email,
      displayName: `${firstName} ${lastName}`,
      userType: userTypes[i % userTypes.length],
      isAdmin: i === 0, // First user is admin
      image: i % 3 === 0 ? `https://i.pravatar.cc/150?u=${email}` : undefined,
      phone: i % 2 === 0 ? `+1${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}` : undefined,
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    });
  }
  
  return users;
}
