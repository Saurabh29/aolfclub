import { DummyDataSource } from "./dummy.data-source";
import { DummyTaskDataSource } from "./task.data-source";
import { DummyLocationDataSource } from "./location.data-source";
import { generateDummyUsers } from "./dummy-data";
import type { User, UserField } from "~/lib/schemas/domain";

/**
 * Generate dummy data once at module load
 */
const dummyUsers = generateDummyUsers(100);

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
export const locationsDataSource = new DummyLocationDataSource();
export const tasksDataSource = new DummyTaskDataSource();

/**
 * Later, to migrate to DynamoDB, just change the instantiation:
 *
 * export const usersDataSource = new DynamoDBDataSource<User, UserField>("aolfclub-entities", "User");
 *
 * No other code changes needed!
 */
