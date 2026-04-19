import { TasksDataSource } from "./tasks.data-source";
import { DynamoDBLocationDataSource } from "./dynamo-location.data-source";
import { UsersDataSource } from "./users.data-source";
import { MembersDataSource } from "./members.data-source";
import { LeadsDataSource } from "./leads.data-source";
import { DummyDataSource } from "./dummy.data-source";
import { DummyLocationDataSource } from "./dummy-data/dummy-location.data-source";
import { dummyUsers, dummyLeads, dummyMembers, dummyLocations, dummyTasks } from "./dummy-data";
import type { User, UserField } from "~/lib/schemas/domain";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { Member, MemberField } from "~/lib/schemas/domain";
import type { Task, TaskField } from "~/lib/schemas/domain";

/**
 * Set USE_DUMMY_DATA=true to run the app with in-memory seed data
 * instead of DynamoDB. Useful for UI development without a database.
 */
const useDummy = process.env.USE_DUMMY_DATA === "true";

export const usersDataSource = useDummy
  ? new DummyDataSource<User, UserField>(dummyUsers)
  : new UsersDataSource();

export const membersDataSource = useDummy
  ? new DummyDataSource<Member, MemberField>(dummyMembers)
  : new MembersDataSource();

export const leadsDataSource = useDummy
  ? new DummyDataSource<Lead, LeadField>(dummyLeads)
  : new LeadsDataSource();

export const locationsDataSource = useDummy
  ? new DummyLocationDataSource(dummyLocations)
  : new DynamoDBLocationDataSource();

export const tasksDataSource = useDummy
  ? new DummyDataSource<Task, TaskField>(dummyTasks)
  : new TasksDataSource();
