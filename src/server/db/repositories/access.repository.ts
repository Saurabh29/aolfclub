/**
 * Access Repository
 *
 * CANONICAL ACCESS-CHECK FUNCTION.
 *
 * This is the single source of truth for page-level access control.
 * When page gating is wired in, all authorization flows through here.
 *
 * Algorithm:
 *   1. Query all groups the user belongs to in the specified location
 *   2. For each group, query its assigned roles
 *   3. For each role, check the Role→Page permission edge
 *   4. Return true if ANY role has ALLOW — fail-closed (false on error or no match)
 */

import { getGroupsForUser } from "./user-group.repository";
import { getRolesForGroup, canRoleAccessPage } from "./permission.repository";

/**
 * Check if a user can access a page in a specific location.
 *
 * Not yet wired into route middleware — backend is ready for when enforcement is needed.
 *
 * @param userId     - ULID of the user
 * @param locationId - ULID of the location context
 * @param pageName   - Route slug to check (e.g. "/leads", "/members")
 */
export async function canUserAccessPage(
  userId: string,
  locationId: string,
  pageName: string
): Promise<boolean> {
  try {
    // Step 1: get user's groups in this location
    const userGroups = await getGroupsForUser(userId, locationId);
    if (userGroups.length === 0) return false;

    // Step 2: collect all distinct roles from those groups
    const roleSet = new Set<string>();
    for (const group of userGroups) {
      const roles = await getRolesForGroup(group.groupId);
      roles.forEach((r) => roleSet.add(r));
    }
    if (roleSet.size === 0) return false;

    // Step 3: return true as soon as ANY role allows the page
    for (const roleName of roleSet) {
      if (await canRoleAccessPage(roleName, pageName)) return true;
    }

    return false;
  } catch {
    // Fail closed: deny on any error
    return false;
  }
}
