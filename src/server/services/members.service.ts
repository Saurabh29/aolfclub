import { membersDataSource } from "../data-sources/instances";
import { createCollectionService } from "./create-collection-service";
import type { Member, MemberField } from "~/lib/schemas/domain";

/**
 * Members Service - Uses generic collection service factory
 */
const service = createCollectionService<Member, MemberField>(membersDataSource);

export const queryMembers = service.query;
export const getMemberById = service.getById;
export const getMemberCount = service.getCount;
