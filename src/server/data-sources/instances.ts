import { DummyDataSource } from "./dummy.data-source";
import { generateDummyUsers, generateDummyLocations } from "./dummy-data";
import type { User, UserField, Location, LocationField } from "~/lib/schemas/domain";

/**
 * Generate dummy data once at module load
 */
const dummyUsers = generateDummyUsers(100);
const dummyLocations = generateDummyLocations(20);

/**
 * Export explicit data source instances
 * 
 * Benefits:
 * ✅ Simple and direct - no registry/resolver magic
 * ✅ Easy to import exactly what you need
 * ✅ Type-safe - TypeScript knows the exact type
 * ✅ Easy to swap implementations (just change the instantiation)
 */
export const usersDataSource = new DummyDataSource<User, UserField>(dummyUsers);
export const locationsDataSource = new DummyDataSource<Location, LocationField>(dummyLocations);

/**
 * Later, to migrate to DynamoDB, just change the instantiation:
 * 
 * export const usersDataSource = new DynamoDBDataSource<User, UserField>("aolfclub-entities", "User");
 * 
 * No other code changes needed!
 */
