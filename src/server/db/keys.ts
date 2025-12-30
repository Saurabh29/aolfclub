/**
 * Keys - Helper object for generating PK/SK values.
 *
 * Centralizes key generation to ensure consistency across the codebase.
 * All DynamoDB operations should use these helpers.
 *
 * PK/SK Patterns (Single-Table Design):
 *
 * ENTITIES (Nodes):
 * - EmailIdentity:      PK = "EMAIL#<email>",              SK = "META"
 * - User:               PK = "USER#<userId>",              SK = "META"
 * - Location:           PK = "LOCATION#<locationId>",      SK = "META"
 * - LocationCodeLookup: PK = "LOCATION_CODE#<code>",       SK = "META"
 * - UserGroup:          PK = "GROUP#<groupId>",            SK = "META"
 * - Role:               PK = "ROLE#<roleName>",            SK = "META"
 * - Page:               PK = "PAGE#<pageName>",            SK = "META"
 *
 * RELATIONSHIPS (Edges):
 * - User→Location:      PK = "USER#<userId>",              SK = "LOCATION#<locationId>"
 * - Location→User:      PK = "LOCATION#<locationId>",      SK = "USER#<userId>"
 * - User→Group:         PK = "USER#<userId>",              SK = "GROUP#<groupId>"
 * - Group→User:         PK = "GROUP#<groupId>",            SK = "USER#<userId>"
 * - Group→Role:         PK = "GROUP#<groupId>",            SK = "ROLE#<roleName>"
 * - Role→Page:          PK = "ROLE#<roleName>",            SK = "PAGE#<pageName>"
 */
export const Keys = {
	// ===========================================================================
	// ENTITY KEYS (PK for nodes)
	// ===========================================================================

	/**
	 * Generate PK for an EmailIdentity item.
	 * @param email - User's email address
	 * @returns PK in format "EMAIL#<email>"
	 */
	emailPK: (email: string): string => `EMAIL#${email.toLowerCase()}`,

	/**
	 * Generate PK for a User item.
	 * @param userId - ULID of the user
	 * @returns PK in format "USER#<userId>"
	 */
	userPK: (userId: string): string => `USER#${userId}`,

	// ===========================================================================
	// SK VALUES
	// ===========================================================================

	/**
	 * Generate SK for entity META items.
	 * @returns "META" literal
	 */
	metaSK: (): "META" => "META" as const,
};
