# Database Repository Layer

This document describes the repository layer for AOLF Club. All repositories use **AWS DynamoDB** with a **single table design (NO GSI)** and provide type-safe, validated database operations.

## 📁 Directory Structure

```
src/server/db/
├── client.ts                          # DynamoDB client & configuration
└── repositories/
    ├── base.repository.ts             # Base repository with CRUD operations
    ├── email.repository.ts            # Email entity operations
    ├── relationship.repository.ts     # Relationship (graph) operations
    ├── access-policy.repository.ts    # Role, Permission, UserGroup
    ├── core-entities.repository.ts    # User, Location
    └── index.ts                       # Barrel exports
```

## 🏗️ Architecture

### Single Table Design (No GSI)

All entities are stored in a single DynamoDB table without Global Secondary Indexes:

| Attribute | Purpose                        | Example                        |
| --------- | ------------------------------ | ------------------------------ |
| `PK`      | Primary Key                    | `User#uuid`                    |
| `SK`      | Sort Key                       | `METADATA` or relationship key |
| No GSI    | All queries use PK/SK patterns | `begins_with(SK, "GROUP#")`    |

### Key Construction

```typescript
import { KeyUtils } from "~/server/db/repositories";

// Entity keys
KeyUtils.entityPK("User", id); // "User#uuid"
KeyUtils.entitySK(); // "METADATA"
```

### Email Lookup Pattern (No GSI)

```typescript
// Direct item access instead of GSI query
PK: "EMAIL#user@example.com";
SK: "USER";
// Contains: userId field for identity resolution
```

## 📦 Repositories

### Base Repository

All repositories extend `BaseRepository` which provides:

- ✅ `create(data)` - Create new entity
- ✅ `getById(id)` - Get entity by ID
- ✅ `getByIdOrThrow(id)` - Get or throw EntityNotFoundError
- ✅ `update(id, updates)` - Update entity
- ✅ `softDelete(id)` - Mark as deleted
- ✅ `hardDelete(id)` - Permanent removal
- ✅ `list(options)` - List all entities (paginated)
- ✅ `batchGet(ids)` - Batch get by IDs
- ✅ `exists(id)` - Check existence

### User Repository

The `UserRepository` handles all user types (teacher, volunteer, member, guest, admin) in a single entity.

```typescript
import { userRepository } from "~/server/db/repositories";

// Create user (OAuth flow)
const user = await userRepository.create({
  name: "John Doe",
  email: "john@example.com",
  userType: null, // Assigned by admin later
  status: "pending_assignment",
});

// Create user (CSV import flow)
const teacher = await userRepository.create({
  name: "Jane Smith",
  email: "jane@example.com",
  userType: "teacher",
  status: "active",
  teacherData: {
    subject: "Mathematics",
    qualification: "M.Ed",
  },
});

// Find by user type
const teachers = await userRepository.findByUserType("teacher");
const volunteers = await userRepository.findByUserType("volunteer");

// Find by status
const pending = await userRepository.findPending();
const active = await userRepository.findActive();

// Assign user type (after OAuth login)
await userRepository.assignUserType(userId, "teacher");

// Update status
await userRepository.updateStatus(userId, "inactive");
```

### Location Repository

```typescript
import { locationRepository } from "~/server/db/repositories";
```

// Create location
const location = await locationRepository.create({
locationId: ulid(),
name: "Main Campus",
address: "123 Main St",
city: "Mumbai",
state: "Maharashtra",
capacity: 100,
});

// Find by city
const mumbaiLocations = await locationRepository.findByCity("Mumbai");

// Find by state
const maharashtraLocations = await locationRepository.findByState("Maharashtra");

// Find by capacity
const largeLocations = await locationRepository.findByMinCapacity(50);

````

### Email Repository

```typescript
import { emailRepository } from "~/server/db/repositories";

// Email lookup pattern (No GSI - direct item access)
// Creates: PK="EMAIL#user@example.com", SK="USER", userId="..."

// Find user by email (OAuth callback)
const emailLookup = await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `EMAIL#${email}`,
    SK: "USER"
  }
}));

if (emailLookup.Item) {
  const userId = emailLookup.Item.userId;
  // Get user metadata
  const user = await userRepository.getById(userId);
}
````

### Relationship Repository

The relationship repository handles many-to-many relationships without GSI using bidirectional items.

```typescript
import { relationshipRepository } from "~/server/db/repositories";

// Add user to group (bidirectional)
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

// Query user's groups
const groups = await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": `USER#${userId}`,
    ":sk": "GROUP#"
  }
}));

// Query group's users
const users = await docClient.send(new QueryCommand({
  TableName: TABLE_NAME,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": `GROUP#${groupId}`,
    ":sk": "USER#"
  }
}));
);

// Check existence
const exists = await relationshipRepository.relationshipExists(
  teacherId,
  "Teacher",
  locationId,
  "Location",
  "TEACHES_AT"
);

// Delete relationship
await relationshipRepository.deleteRelationship(rel.id);
```

### Access Policy Repositories

#### RoleRepository

```typescript
import { roleRepository } from "~/server/db/repositories";

// Create role
const role = await roleRepository.create({
  name: "admin",
  description: "Administrator with full access",
  status: "active",
});

// Get by name
const adminRole = await roleRepository.getByName("admin");

// Find active roles
const activeRoles = await roleRepository.findActive();
```

````

### Access Policy Repositories

#### RoleRepository
```typescript
import { roleRepository } from "~/server/db/repositories";

// Create role
const role = await roleRepository.create({
  name: "admin",
  description: "Full system access"
});

// Find active roles
const activeRoles = await roleRepository.findActive();
````

#### PermissionRepository

```typescript
import { permissionRepository } from "~/server/db/repositories";

// Create permission
const permission = await permissionRepository.create({
  name: "locations:write",
  resource: "locations",
  action: "write",
});

// Find by resource
const locationPerms = await permissionRepository.findByResource("locations");

// Find by action
const writePerms = await permissionRepository.findByAction("write");
```

#### UserGroupRepository

```typescript
import { userGroupRepository } from "~/server/db/repositories";

// Create user group
const group = await userGroupRepository.create({
  name: "Downtown Teachers",
  description: "Teachers at downtown location",
});

// Find active groups
const activeGroups = await userGroupRepository.findActive();
```

## 🔌 Usage Patterns

### Error Handling

```typescript
import {
  EntityNotFoundError,
  ValidationError,
  DatabaseError,
} from "~/server/db/repositories";

try {
  const user = await userRepository.getByIdOrThrow(id);
} catch (error) {
  if (error instanceof EntityNotFoundError) {
    console.error("User not found:", error.message);
  } else if (error instanceof ValidationError) {
    console.error("Validation failed:", error.errors);
  } else if (error instanceof DatabaseError) {
    console.error("Database error:", error.code, error.message);
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
DYNAMODB_TABLE_NAME=aolfclub-entities
AWS_REGION=us-east-1

# Optional (for local development)
NODE_ENV=development
DYNAMODB_ENDPOINT=http://localhost:8000
```

### Local DynamoDB Setup

For local development, use DynamoDB Local:

```bash
# Run DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# Create table (NO GSI version)
aws dynamodb create-table \
  --table-name aolfclub-entities \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

## 🧪 Testing

```bash
# Test DynamoDB connection
pnpm db:test
```

```typescript
import { userRepository } from "~/server/db/repositories";

// Example test
describe("UserRepository", () => {
  it("should create and retrieve user", async () => {
    const user = await userRepository.create({
      name: "Test User",
      email: "test@example.com",
      userType: "teacher",
      status: "active",
    });

    const retrieved = await userRepository.getById(user.id);
    expect(retrieved).toEqual(user);
  });

  it("should find pending users", async () => {
    await userRepository.create({
      name: "Pending User",
      email: "pending@example.com",
      userType: null,
      status: "pending_assignment",
    });

    const pending = await userRepository.findPending();
    expect(pending.items.length).toBeGreaterThan(0);
  });
});
```

## 📊 Performance Considerations

### Without GSI

- ✅ **Lower Cost**: No GSI storage or write costs (~40% savings)
- ✅ **Faster Writes**: No GSI propagation delay
- ✅ **Simpler Schema**: One index to manage
- ⚠️ **Permission Checks**: Require 3-4 queries (cache with Redis/session)
- ⚠️ **Email Lookups**: Must know exact email (no fuzzy search)

### Optimization Strategies

1. **Cache permission results** - Store in session/Redis for 5-10 minutes
2. **Batch operations** - Use `batchGet()` for multiple entities (up to 100)
3. **Pagination** - Always use `limit` and `lastEvaluatedKey` for large datasets
4. **Bidirectional relationships** - Stored twice for efficient queries both ways
5. **Connection pooling** - DynamoDB client handles automatically

## 🔒 Security

- ✅ All operations validated with Zod schemas
- ✅ Soft delete prevents accidental data loss
- ✅ Atomic transactions for relationship operations
- ✅ IAM roles control DynamoDB access

## 📚 Additional Resources

- [Database Schema](DYNAMODB_SCHEMA_NO_GSI.md) - Complete single table design without GSI
- [Permission System](PERMISSION_SYSTEM_EXAMPLES.md) - Permission checking examples
- [User Workflows](USER_CREATION_WORKFLOWS.md) - OAuth and CSV import patterns
- [AWS DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)
- [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)

---

**Repository Layer Complete** ✅ - Type-safe, validated, single-table design without GSI!
