# Permission System - Data Flow Examples

## Example 1: OAuth Login Flow

```
1. User logs in with email: "john@example.com"
   
2. Lookup user by email:
   Query: PK = "EMAIL#john@example.com", SK = "USER"
   Result: { userId: "01ABC123...", email: "john@example.com", provider: "google" }
   
3. Get user metadata:
   Query: PK = "USER#01ABC123...", SK = "METADATA"
   Result: { id: "01ABC123...", name: "John Doe", userType: "teacher", ... }
   
4. Session created with userId
```

## Example 2: Check Permission for Page Access

```
Goal: Check if user can access "/locations" page (requires "locations:read" permission)

Step 1: Get user's groups
Query: PK = "USER#01ABC123...", SK begins_with "GROUP#"
Result: [
  { userId: "01ABC123...", groupId: "01GRP001..." },
  { userId: "01ABC123...", groupId: "01GRP002..." }
]

Step 2: Get roles for each group (parallel)
Query 1: PK = "GROUP#01GRP001...", SK begins_with "ROLE#"
Query 2: PK = "GROUP#01GRP002...", SK begins_with "ROLE#"
Result: [
  { groupId: "01GRP001...", roleId: "01ROLE01..." },  // "teacher" role
  { groupId: "01GRP002...", roleId: "01ROLE02..." }   // "member" role
]

Step 3: Get permissions for each role (parallel)
Query 1: PK = "ROLE#01ROLE01...", SK begins_with "PERMISSION#"
Query 2: PK = "ROLE#01ROLE02...", SK begins_with "PERMISSION#"
Result: [
  { roleId: "01ROLE01...", permissionId: "01PERM01..." },  // "locations:read"
  { roleId: "01ROLE01...", permissionId: "01PERM02..." },  // "locations:write"
  { roleId: "01ROLE02...", permissionId: "01PERM03..." }   // "tasks:read"
]

Step 4: Get permission metadata (batch)
BatchGet: [
  { PK: "PERMISSION#01PERM01...", SK: "METADATA" },
  { PK: "PERMISSION#01PERM02...", SK: "METADATA" },
  { PK: "PERMISSION#01PERM03...", SK: "METADATA" }
]
Result: [
  { id: "01PERM01...", name: "locations:read", resource: "locations", action: "read" },
  { id: "01PERM02...", name: "locations:write", resource: "locations", action: "write" },
  { id: "01PERM03...", name: "tasks:read", resource: "tasks", action: "read" }
]

Step 5: Check if permission exists
hasPermission = permissions.some(p => p.resource === "locations" && p.action === "read")
Result: TRUE ✅
```

## Example 3: Admin Assigns User to Group

```
Goal: Add user "jane@example.com" to group "Downtown Teachers"

Step 1: Lookup user by email
Query: PK = "EMAIL#jane@example.com", SK = "USER"
Result: { userId: "01USER02..." }

Step 2: Add bidirectional relationship (transaction)
TransactWrite:
  Item 1: {
    PK: "USER#01USER02...",
    SK: "GROUP#01GRP001...",
    entityType: "UserGroupMembership",
    userId: "01USER02...",
    groupId: "01GRP001...",
    joinedAt: "2024-12-15T10:30:00Z"
  }
  Item 2: {
    PK: "GROUP#01GRP001...",
    SK: "USER#01USER02...",
    entityType: "GroupUserMembership",
    groupId: "01GRP001...",
    userId: "01USER02...",
    joinedAt: "2024-12-15T10:30:00Z"
  }

Result: User assigned to group with atomic bidirectional relationship ✅
```

## Example 4: Get All Users in a Group (Admin View)

```
Goal: Admin wants to see all members of "Downtown Teachers" group

Step 1: Query group's users
Query: PK = "GROUP#01GRP001...", SK begins_with "USER#"
Result: [
  { groupId: "01GRP001...", userId: "01USER01..." },
  { groupId: "01GRP001...", userId: "01USER02..." },
  { groupId: "01GRP001...", userId: "01USER03..." }
]

Step 2: Get user metadata (batch)
BatchGet: [
  { PK: "USER#01USER01...", SK: "METADATA" },
  { PK: "USER#01USER02...", SK: "METADATA" },
  { PK: "USER#01USER03...", SK: "METADATA" }
]
Result: [
  { id: "01USER01...", name: "John Doe", email: "john@example.com", userType: "teacher" },
  { id: "01USER02...", name: "Jane Smith", email: "jane@example.com", userType: "teacher" },
  { id: "01USER03...", name: "Bob Wilson", email: "bob@example.com", userType: "volunteer" }
]
```

## Example 5: Seed Initial Roles and Permissions

```typescript
// Create roles
const adminRole = await roleRepository.create({
  name: "admin",
  description: "Full system access"
});

const teacherRole = await roleRepository.create({
  name: "teacher",
  description: "Can manage students and content"
});

const volunteerRole = await roleRepository.create({
  name: "volunteer",
  description: "Limited access to help with tasks"
});

// Create permissions
const permissions = [
  { name: "locations:read", resource: "locations", action: "read" },
  { name: "locations:write", resource: "locations", action: "write" },
  { name: "locations:delete", resource: "locations", action: "delete" },
  { name: "users:read", resource: "users", action: "read" },
  { name: "users:write", resource: "users", action: "write" },
  { name: "tasks:read", resource: "tasks", action: "read" },
  { name: "tasks:write", resource: "tasks", action: "write" },
];

const createdPermissions = await Promise.all(
  permissions.map(p => permissionRepository.create(p))
);

// Assign permissions to admin role (all permissions)
await Promise.all(
  createdPermissions.map(p => 
    relationshipRepository.saveRelationship({
      PK: `ROLE#${adminRole.id}`,
      SK: `PERMISSION#${p.id}`,
      entityType: "RolePermission",
      roleId: adminRole.id,
      permissionId: p.id
    })
  )
);

// Assign limited permissions to teacher role
const teacherPermissions = createdPermissions.filter(p => 
  p.resource !== "users" || p.action === "read"
);

await Promise.all(
  teacherPermissions.map(p => 
    relationshipRepository.saveRelationship({
      PK: `ROLE#${teacherRole.id}`,
      SK: `PERMISSION#${p.id}`,
      entityType: "RolePermission",
      roleId: teacherRole.id,
      permissionId: p.id
    })
  )
);
```

## Performance Optimization: Caching Strategy

```typescript
// middleware/auth.ts
import { cache } from "~/server/cache"; // Redis or in-memory

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  // Check cache first
  const cached = await cache.get(`permissions:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query from DynamoDB (3-4 queries)
  const groups = await getUserGroups(userId);
  const roles = await Promise.all(groups.map(g => getGroupRoles(g.groupId))).then(r => r.flat());
  const permissions = await Promise.all(roles.map(r => getRolePermissions(r.roleId))).then(p => p.flat());

  // Cache for 5 minutes
  await cache.set(`permissions:${userId}`, JSON.stringify(permissions), 'EX', 300);

  return permissions;
}

export function hasPermission(permissions: Permission[], resource: string, action: string): boolean {
  return permissions.some(p => p.resource === resource && p.action === action);
}

// Usage in route guard
export async function requirePermission(userId: string, resource: string, action: string) {
  const permissions = await getUserPermissions(userId);
  
  if (!hasPermission(permissions, resource, action)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
}
```

## Table Item Count Example

For a system with:
- 100 users
- 10 groups
- 5 roles
- 20 permissions
- Average user in 2 groups
- Average group has 2 roles
- Average role has 10 permissions

**Total Items:**
- Users: 100 (metadata)
- Emails: 100 (lookup items)
- User-Group: 200 × 2 = 400 (bidirectional)
- Groups: 10 (metadata)
- Group-Role: 20 × 2 = 40 (bidirectional)
- Roles: 5 (metadata)
- Role-Permission: 50 (forward only, no need for reverse)
- Permissions: 20 (metadata)

**Total: ~725 items**

With GSI, you'd have the same items but pay for GSI storage/writes. Without GSI, you save ~40% on storage costs.
