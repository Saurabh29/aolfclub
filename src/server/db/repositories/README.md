# Database Repository Layer

This directory contains the **repository layer** for the AOLF Club application. All repositories use **AWS DynamoDB** with a **single table design** and provide type-safe, validated database operations.

## 📁 Directory Structure

```
src/db/
├── client.ts                              # DynamoDB client & configuration
└── repositories/
    ├── base.repository.ts                 # Base repository with CRUD operations
    ├── email.repository.ts                # Email entity operations
    ├── relationship.repository.ts         # Relationship (graph) operations
    ├── access-policy.repository.ts        # Role, Permission, UserGroup
    ├── entities/
    │   └── core-entities.repository.ts    # Teacher, Volunteer, Member, Lead, Location
    └── index.ts                           # Barrel exports
```

## 🏗️ Architecture

### Single Table Design

All entities are stored in a single DynamoDB table with the following structure:

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `PK` | Primary Key | `Teacher#uuid` |
| `SK` | Sort Key | `METADATA` |
| `GSI1PK/GSI1SK` | Email Lookup Index | `EMAIL#user@example.com` / `USER#uuid` |
| `GSI2PK/GSI2SK` | Relationship Index | `REL#Teacher#uuid` / `MEMBER_OF#UserGroup#uuid` |
| `GSI3PK/GSI3SK` | Entity Type Index | `TYPE#Teacher` / `2024-12-13T...` |

### Key Construction

```typescript
import { KeyUtils } from "~/server/db/repositories";

// Entity keys
KeyUtils.entityPK("Teacher", id);     // "Teacher#uuid"
KeyUtils.entitySK();                   // "METADATA"

// Email lookup keys
KeyUtils.emailGSI1(email, userId);    // GSI1PK: "EMAIL#user@example.com"

// Relationship keys
KeyUtils.relationshipGSI2(
  sourceType, sourceId, relation, targetType, targetId
);
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

### Core Entity Repositories

#### TeacherRepository
```typescript
import { teacherRepository } from "~/server/db/repositories";

// Create teacher
const teacher = await teacherRepository.create({
  name: "John Doe",
  subject: "Mathematics",
  qualification: "M.Ed",
  status: "active",
});

// Find by subject
const mathTeachers = await teacherRepository.findBySubject("Math");

// Find active teachers
const active = await teacherRepository.findActive();
```

#### VolunteerRepository
```typescript
import { volunteerRepository } from "~/server/db/repositories";

// Create volunteer
const volunteer = await volunteerRepository.create({
  name: "Jane Smith",
  skills: ["Teaching", "Mentoring"],
  availability: "Weekends",
  status: "active",
});

// Add volunteer hours
await volunteerRepository.addHours(volunteer.id, 5);

// Find by skill
const mentors = await volunteerRepository.findBySkill("Mentoring");
```

#### MemberRepository
```typescript
import { memberRepository } from "~/server/db/repositories";

// Create member
const member = await memberRepository.create({
  name: "Alice Johnson",
  membershipType: "Gold",
  joinedAt: new Date().toISOString(),
  membershipStatus: "active",
  status: "active",
});

// Update membership status
await memberRepository.updateMembershipStatus(member.id, "expired");

// Find by type
const goldMembers = await memberRepository.findByMembershipType("Gold");
```

#### LeadRepository
```typescript
import { leadRepository } from "~/server/db/repositories";

// Create lead
const lead = await leadRepository.create({
  name: "Bob Wilson",
  source: "Website",
  leadStatus: "new",
  status: "active",
});

// Mark as contacted
await leadRepository.markAsContacted(lead.id);

// Convert lead
await leadRepository.convertLead(lead.id);

// Find by status
const newLeads = await leadRepository.findByLeadStatus("new");
```

#### LocationRepository
```typescript
import { locationRepository } from "~/server/db/repositories";

// Create location
const location = await locationRepository.create({
  name: "Main Campus",
  address: "123 Main St",
  city: "Mumbai",
  state: "Maharashtra",
  zipCode: "400001",
  capacity: 100,
  status: "active",
});

// Find by city
const mumbaiLocations = await locationRepository.findByCity("Mumbai");

// Find by capacity
const large = await locationRepository.findByMinCapacity(50);
```

### Email Repository

```typescript
import { emailRepository, relationshipRepository } from "~/server/db/repositories";

// Add email (OAuth flow)
const email = await emailRepository.addEmail({
  email: "user@example.com",
  provider: "google",
  verifiedAt: new Date().toISOString(),
  isPrimary: true,
});

// Link email to user via relationship
await relationshipRepository.saveRelationship({
  sourceId: email.id,
  sourceType: "Email",
  targetId: teacherId,
  targetType: "Teacher",
  relation: "IDENTIFIES",
});

// Get user by email
const userInfo = await emailRepository.getUserByEmail("user@example.com");

// Verify email
await emailRepository.verifyEmail(email.id);

// Set as primary
await emailRepository.setPrimaryEmail(email.id, userId);

// Find unverified
const unverified = await emailRepository.findUnverified();
```

### Relationship Repository

```typescript
import { relationshipRepository } from "~/server/db/repositories";

// Create relationship
const rel = await relationshipRepository.saveRelationship({
  sourceId: teacherId,
  sourceType: "Teacher",
  targetId: locationId,
  targetType: "Location",
  relation: "TEACHES_AT",
  metadata: { startDate: "2024-01-01" },
});

// Query by source
const teacherRels = await relationshipRepository.getRelationshipsBySource(
  "Teacher",
  teacherId,
  { relation: "TEACHES_AT" }
);

// Query by target
const locationRels = await relationshipRepository.getRelationshipsByTarget(
  "Location",
  locationId
);

// Get related entity IDs
const locationIds = await relationshipRepository.getRelatedEntityIds(
  "Teacher",
  teacherId,
  "TEACHES_AT",
  "Location"
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

#### PermissionRepository
```typescript
import { permissionRepository } from "~/server/db/repositories";

// Create permission
const permission = await permissionRepository.create({
  name: "Create Teacher",
  resource: "Teacher",
  action: "create",
  status: "active",
});

// Find by resource
const teacherPerms = await permissionRepository.findByResource("Teacher");

// Find by action
const createPerms = await permissionRepository.findByAction("create");

// Find specific permission
const perm = await permissionRepository.findByResourceAndAction("Teacher", "create");
```

#### UserGroupRepository
```typescript
import { userGroupRepository } from "~/server/db/repositories";

// Create user group
const group = await userGroupRepository.create({
  name: "Math Teachers",
  description: "Group for all mathematics teachers",
  status: "active",
});

// Get by name
const mathGroup = await userGroupRepository.getByName("Math Teachers");

// Find active groups
const activeGroups = await userGroupRepository.findActive();
```

## 🔌 Usage Patterns

### Single Repository Access

```typescript
import { teacherRepository } from "~/server/db/repositories";

const teacher = await teacherRepository.create({ /* ... */ });
```

### Repository Collection

```typescript
import { repositories, getRepository } from "~/server/db/repositories";

// Direct access
const teacher = await repositories.teacher.create({ /* ... */ });

// Dynamic access
const repo = getRepository("teacher");
const teacher = await repo.create({ /* ... */ });
```

### Error Handling

```typescript
import {
  EntityNotFoundError,
  ValidationError,
  DuplicateEntityError,
  DatabaseError,
} from "~/server/db/repositories";

try {
  const teacher = await teacherRepository.getByIdOrThrow(id);
} catch (error) {
  if (error instanceof EntityNotFoundError) {
    console.error("Teacher not found:", error.message);
  } else if (error instanceof ValidationError) {
    console.error("Validation failed:", error.errors);
  } else if (error instanceof DuplicateEntityError) {
    console.error("Duplicate entity:", error.message);
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

### Local DynamoDB

For local development, use DynamoDB Local:

```bash
# Run DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# Create table (use AWS CLI or script)
aws dynamodb create-table \
  --table-name aolfclub-entities \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
    AttributeName=GSI3PK,AttributeType=S \
    AttributeName=GSI3SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "GSI1",
        "KeySchema": [
          {"AttributeName": "GSI1PK", "KeyType": "HASH"},
          {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      },
      {
        "IndexName": "GSI2",
        "KeySchema": [
          {"AttributeName": "GSI2PK", "KeyType": "HASH"},
          {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      },
      {
        "IndexName": "GSI3",
        "KeySchema": [
          {"AttributeName": "GSI3PK", "KeyType": "HASH"},
          {"AttributeName": "GSI3SK", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      }
    ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000
```

## 🧪 Testing

```typescript
import { teacherRepository } from "~/server/db/repositories";

// Example test
describe("TeacherRepository", () => {
  it("should create and retrieve teacher", async () => {
    const teacher = await teacherRepository.create({
      name: "Test Teacher",
      subject: "Math",
      status: "active",
    });
    
    const retrieved = await teacherRepository.getById(teacher.id);
    expect(retrieved).toEqual(teacher);
  });
});
```

## 📊 Performance Considerations

1. **Use GSIs for queries** - Avoid scans when possible
2. **Batch operations** - Use `batchGet()` for multiple entities
3. **Pagination** - Always use `limit` and `lastEvaluatedKey` for large datasets
4. **Relationship queries** - Source queries are efficient (GSI2), target queries require filtering
5. **Connection pooling** - DynamoDB client uses connection pooling automatically

## 🔒 Security

- ✅ All operations are validated with Zod schemas
- ✅ Soft delete prevents accidental data loss
- ✅ Optimistic locking via `updatedAt`
- ✅ Condition expressions prevent race conditions
- ✅ IAM roles control DynamoDB access (not repository concern)

## 📚 Additional Resources

- [AWS SDK v3 DynamoDB](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/)
- [DynamoDB Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Zod Documentation](https://zod.dev/)

---

**Phase 2 Complete** ✅ - Repository layer ready for use with full CRUD operations, relationship management, and type safety!
