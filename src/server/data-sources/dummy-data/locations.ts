import { ulid } from "ulid";
import type { Location } from "~/lib/schemas/domain";

/**
 * Generate realistic dummy locations for testing
 */
export function generateDummyLocations(count: number): Location[] {
  const locations: Location[] = [];
  const cities = [
    { name: "Seattle", state: "WA", zip: 98101 },
    { name: "Portland", state: "OR", zip: 97201 },
    { name: "San Francisco", state: "CA", zip: 94102 },
    { name: "Los Angeles", state: "CA", zip: 90001 },
    { name: "Denver", state: "CO", zip: 80201 },
    { name: "Austin", state: "TX", zip: 73301 },
    { name: "Chicago", state: "IL", zip: 60601 },
    { name: "Boston", state: "MA", zip: 2101 },
  ];
  
  for (let i = 0; i < count; i++) {
    const cityIndex = i % cities.length;
    const city = cities[cityIndex];
    
    const createdDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    locations.push({
      id: ulid(),
      code: `LOC${String(i + 1).padStart(3, '0')}`,
      name: `${city.name} Community Center ${i + 1}`,
      address: `${100 + i} Main Street`,
      city: city.name,
      state: city.state,
      zipCode: String(city.zip + i),
      isActive: i % 10 !== 9, // 90% active, 10% inactive
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    });
  }
  
  return locations;
}
