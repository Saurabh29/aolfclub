import { DummyTaskDataSource } from "./task.data-source";
import { DynamoDBLocationDataSource } from "./dynamo-location.data-source";
import { UsersDataSource } from "./users.data-source";

/**
 * Export explicit data source instances.
 *
 * usersDataSource   — all users (MEMBER + LEAD), used for admin/members pages
 * leadsDataSource   — only LEAD users, used for /leads page and task contact filtering
 * membersDataSource — only MEMBER users, used for member-only task filtering
 */
export const usersDataSource = new UsersDataSource();
export const leadsDataSource = new UsersDataSource("LEAD");
export const membersDataSource = new UsersDataSource("MEMBER");
export const locationsDataSource = new DynamoDBLocationDataSource();
export const tasksDataSource = new DummyTaskDataSource();
