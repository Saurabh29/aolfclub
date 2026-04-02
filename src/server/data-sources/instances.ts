import { DummyTaskDataSource } from "./task.data-source";
import { DummyLocationDataSource } from "./location.data-source";
import { DummyDataSource } from "./dummy.data-source";
import { generateDummyUsers, generateDummyLeads, generateDummyMembers } from "./dummy-data";
import type { User, UserField } from "~/lib/schemas/domain";
import type { Lead, LeadField } from "~/lib/schemas/domain";
import type { Member, MemberField } from "~/lib/schemas/domain";

/**
 * Export explicit data source instances.
 *
 * usersDataSource   — volunteer/agent Users (log in via email)
 * membersDataSource — enrolled Members (mobile-unique, no auth)
 * leadsDataSource   — prospect Leads (mobile-unique, no auth)
 * 
 * All configured to use dummy (in-memory) data sources for development.
 */
export const usersDataSource = new DummyDataSource<User, UserField>(generateDummyUsers(20));
export const membersDataSource = new DummyDataSource<Member, MemberField>(generateDummyMembers(15));
export const leadsDataSource = new DummyDataSource<Lead, LeadField>(generateDummyLeads(30));
export const locationsDataSource = new DummyLocationDataSource();
export const tasksDataSource = new DummyTaskDataSource();
