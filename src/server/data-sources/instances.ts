import { DummyTaskDataSource } from "./task.data-source";
import { DynamoDBLocationDataSource } from "./dynamo-location.data-source";
import { UsersDataSource } from "./users.data-source";
import { MembersDataSource } from "./members.data-source";
import { LeadsDataSource } from "./leads.data-source";

/**
 * Export explicit data source instances.
 *
 * usersDataSource   — volunteer/agent Users (log in via email)
 * membersDataSource — enrolled Members (mobile-unique, no auth)
 * leadsDataSource   — prospect Leads (mobile-unique, no auth)
 */
export const usersDataSource = new UsersDataSource();
export const membersDataSource = new MembersDataSource();
export const leadsDataSource = new LeadsDataSource();
export const locationsDataSource = new DynamoDBLocationDataSource();
export const tasksDataSource = new DummyTaskDataSource();
