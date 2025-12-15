# DynamoDB Single Table Design (No GSI)

## Overview
This document describes the single table design for AOLF Club without using Global Secondary Indexes (GSI). All access patterns are supported through clever PK/SK patterns and relationship items.

## Permission Model
```
User → UserGroup → Role → Permission
```

- **Users** belong to one or more **UserGroups**
- **UserGroups** have one or more **Roles**
- **Roles** have one or more **Permissions**

## Access Patterns Required

1. Get user by ID (after OAuth login)
2. Get user by email (during OAuth callback)
3. Get all groups for a user
4. Get all users in a group
5. Get all roles for a group
6. Get all groups with a specific role
7. Get all permissions for a role
8. Check if user has specific permission (derived query)

## Table Schema

### Primary Keys
- **PK** (Partition Key): Primary identifier
- **SK** (Sort Key): Secondary identifier or relationship type

### Entity Types

#### 1. User Metadata
```typescript
{
  PK: "USER#<userId>",
  SK: "METADATA",
  entityType: "User",
  id: "<userId>",
  name: "John Doe",
  email: "john@example.com",  // Not a key, just an attribute
  userType: "teacher",        // teacher|volunteer|member|guest|admin
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `GetItem` with `PK=USER#<userId>, SK=METADATA`

---

#### 2. Email Lookup (Inverted Index Pattern)
```typescript
{
  PK: "EMAIL#<email>",
  SK: "USER",
  entityType: "EmailLookup",
  email: "john@example.com",
  userId: "<userId>",
  provider: "google",         // google|github|microsoft
  verified: true,
  createdAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `GetItem` with `PK=EMAIL#john@example.com, SK=USER`
**Purpose:** Lookup user during OAuth login without GSI

---

#### 3. User → Group Relationship (Forward)
```typescript
{
  PK: "USER#<userId>",
  SK: "GROUP#<groupId>",
  entityType: "UserGroupMembership",
  userId: "<userId>",
  groupId: "<groupId>",
  joinedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `Query` with `PK=USER#<userId>` and `SK begins_with GROUP#`
**Purpose:** Get all groups a user belongs to

---

#### 4. Group → User Relationship (Reverse)
```typescript
{
  PK: "GROUP#<groupId>",
  SK: "USER#<userId>",
  entityType: "GroupUserMembership",
  groupId: "<groupId>",
  userId: "<userId>",
  joinedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `Query` with `PK=GROUP#<groupId>` and `SK begins_with USER#`
**Purpose:** Get all users in a group

---

#### 5. Group Metadata
```typescript
{
  PK: "GROUP#<groupId>",
  SK: "METADATA",
  entityType: "UserGroup",
  id: "<groupId>",
  name: "Teachers - Downtown Center",
  description: "All teachers at downtown location",
  locationId: "<locationId>",  // Optional: location-specific groups
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `GetItem` with `PK=GROUP#<groupId>, SK=METADATA`

---

#### 6. Group → Role Relationship
```typescript
{
  PK: "GROUP#<groupId>",
  SK: "ROLE#<roleId>",
  entityType: "GroupRoleAssignment",
  groupId: "<groupId>",
  roleId: "<roleId>",
  assignedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `Query` with `PK=GROUP#<groupId>` and `SK begins_with ROLE#`
**Purpose:** Get all roles for a group

---

#### 7. Role → Group Relationship (Reverse - Optional)
```typescript
{
  PK: "ROLE#<roleId>",
  SK: "GROUP#<groupId>",
  entityType: "RoleGroupAssignment",
  roleId: "<roleId>",
  groupId: "<groupId>",
  assignedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `Query` with `PK=ROLE#<roleId>` and `SK begins_with GROUP#`
**Purpose:** Get all groups with a specific role (useful for admin queries)

---

#### 8. Role Metadata
```typescript
{
  PK: "ROLE#<roleId>",
  SK: "METADATA",
  entityType: "Role",
  id: "<roleId>",
  name: "admin",              // admin|teacher|volunteer|member|guest
  description: "Full system access",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `GetItem` with `PK=ROLE#<roleId>, SK=METADATA`

---

#### 9. Role → Permission Relationship
```typescript
{
  PK: "ROLE#<roleId>",
  SK: "PERMISSION#<permissionId>",
  entityType: "RolePermission",
  roleId: "<roleId>",
  permissionId: "<permissionId>",
  grantedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `Query` with `PK=ROLE#<roleId>` and `SK begins_with PERMISSION#`
**Purpose:** Get all permissions for a role

---

#### 10. Permission Metadata
```typescript
{
  PK: "PERMISSION#<permissionId>",
  SK: "METADATA",
  entityType: "Permission",
  id: "<permissionId>",
  name: "locations:read",
  resource: "locations",      // locations|users|tasks|leads
  action: "read",             // read|write|delete|manage
  description: "Can view all locations",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

**Query Pattern:** `GetItem` with `PK=PERMISSION#<permissionId>, SK=METADATA`

---

## Example Queries

### 1. OAuth Login - Find User by Email
```typescript
import { GetCommand } from "@aws-sdk/lib-dynamodb";

const result = await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `EMAIL#${email}`,
    SK: "USER"
  }
}));

if (result.Item) {
  const userId = result.Item.userId;
  // Now get user metadata
  const user = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: "METADATA"
    }
  }));
}
```

### 2. Get All Groups for a User
```typescript
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

const result = await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": `USER#${userId}`,
    ":sk": "GROUP#"
  }
}));

const groupIds = result.Items.map(item => item.groupId);
```

### 3. Get All Roles for User's Groups
```typescript
// Step 1: Get user's groups
const groupMemberships = await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": `USER#${userId}`,
    ":sk": "GROUP#"
  }
}));

// Step 2: Get roles for each group (parallel)
const rolePromises = groupMemberships.Items.map(membership =>
  docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `GROUP#${membership.groupId}`,
      ":sk": "ROLE#"
    }
  }))
);

const roleResults = await Promise.all(rolePromises);
const roleIds = roleResults.flatMap(r => r.Items.map(item => item.roleId));
```

### 4. Check if User Has Permission
```typescript
// Step 1: Get user's groups
const groups = await getUserGroups(userId);

// Step 2: Get all roles for those groups
const roles = await Promise.all(
  groups.map(g => getGroupRoles(g.groupId))
).then(results => results.flat());

// Step 3: Get all permissions for those roles
const permissions = await Promise.all(
  roles.map(r => getRolePermissions(r.roleId))
).then(results => results.flat());

// Step 4: Check if permission exists
const hasPermission = permissions.some(p => 
  p.resource === "locations" && p.action === "write"
);
```

### 5. Get All Users in a Group
```typescript
const result = await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": `GROUP#${groupId}`,
    ":sk": "USER#"
  }
}));

const userIds = result.Items.map(item => item.userId);

// Batch get user metadata
const users = await batchGetUsers(userIds);
```

## Write Patterns

### Add User to Group (2 writes for bidirectional lookup)
```typescript
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

await docClient.send(new TransactWriteCommand({
  TransactItems: [
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `GROUP#${groupId}`,
          entityType: "UserGroupMembership",
          userId,
          groupId,
          joinedAt: new Date().toISOString()
        }
      }
    },
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `GROUP#${groupId}`,
          SK: `USER#${userId}`,
          entityType: "GroupUserMembership",
          groupId,
          userId,
          joinedAt: new Date().toISOString()
        }
      }
    }
  ]
}));
```

### Assign Role to Group (2 writes)
```typescript
await docClient.send(new TransactWriteCommand({
  TransactItems: [
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `GROUP#${groupId}`,
          SK: `ROLE#${roleId}`,
          entityType: "GroupRoleAssignment",
          groupId,
          roleId,
          assignedAt: new Date().toISOString()
        }
      }
    },
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `ROLE#${roleId}`,
          SK: `GROUP#${groupId}`,
          entityType: "RoleGroupAssignment",
          roleId,
          groupId,
          assignedAt: new Date().toISOString()
        }
      }
    }
  ]
}));
```

## Performance Considerations

### Without GSI Trade-offs:
✅ **Pros:**
- Lower cost (no GSI writes/storage)
- Simpler table structure
- Better write performance (no GSI propagation delay)

⚠️ **Cons:**
- Email lookup requires knowing exact email (no partial matching)
- Permission checks require multiple queries (3-4 round trips)
- No scan-free way to list all users by type

### Optimization Strategies:

1. **Cache Permission Checks:**
   ```typescript
   // Cache user permissions in session/Redis for 5-10 minutes
   const permissions = await getUserPermissions(userId); // Expensive
   await redis.set(`perms:${userId}`, JSON.stringify(permissions), 'EX', 600);
   ```

2. **Denormalize Common Queries:**
   ```typescript
   // Store computed permissions on user metadata
   {
     PK: "USER#<userId>",
     SK: "METADATA",
     // ... other fields
     cachedPermissions: ["locations:read", "locations:write"], // Updated on role changes
     permissionsCachedAt: "2024-01-01T00:00:00Z"
   }
   ```

3. **Batch Operations:**
   ```typescript
   // Use BatchGetItem for fetching multiple metadata items
   const roles = await batchGetRoles(roleIds);
   const permissions = await batchGetPermissions(permissionIds);
   ```

## Migration from GSI Design

If you currently have GSI1/GSI2/GSI3, you can migrate by:

1. **Remove GSI attributes** (`GSI1PK`, `GSI1SK`, etc.)
2. **Add Email Lookup items** as separate records
3. **Add reverse relationship items** (Group→User, Role→Group)
4. **Update KeyUtils** to remove GSI helper functions
5. **Update repositories** to use PK/SK queries instead of GSI queries

## Summary

This design achieves all access patterns without GSI by:
- Using **Email → User lookup items** (PK=EMAIL#..., SK=USER)
- Using **bidirectional relationship items** (User→Group + Group→User)
- Leveraging **SK prefixes** for efficient queries (begins_with)
- Using **transactions** to maintain consistency

**Total Items per User with 1 Group, 1 Role:**
- 1 User metadata
- 1 Email lookup
- 2 User-Group relationships (forward + reverse)
- 2 Group-Role relationships (forward + reverse)
- N Role-Permission relationships

This results in more items but eliminates GSI costs and complexity.
