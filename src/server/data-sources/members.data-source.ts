/**
 * Members Data Source (DynamoDB-backed)
 *
 * Extends LocationScopedDataSource for enrolled Member entities.
 * All shared CRUD logic lives in the base class.
 */

import { Keys } from "~/server/db/client";
import { LocationScopedDataSource } from "./location-scoped.data-source";
import type { Member, MemberField } from "~/lib/schemas/domain";
import {
  createMember,
  getMemberById,
  getMemberByPhoneInLocation,
  updateMember,
  deleteMember,
  getMembersByLocation,
} from "~/server/db/repositories/member.repository";
import type { CreateMemberInput } from "~/server/db/repositories/member.repository";

export class MembersDataSource extends LocationScopedDataSource<Member, MemberField, CreateMemberInput> {
  constructor() {
    super(
      {
        create: createMember,
        getById: getMemberById,
        getByLocation: getMembersByLocation,
        update: updateMember,
        delete: deleteMember,
        getByPhoneInLocation: getMemberByPhoneInLocation,
      },
      Keys.memberPK,
      Keys.metaSK()
    );
  }
}
