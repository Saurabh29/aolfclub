# OAuth Login Flow Implementation

## Overview

Implemented complete OAuth login flow that creates User and Email entities when a user logs in for the first time via GitHub or Google.

## Implementation Details

### 1. Email Repository (`src/server/db/repositories/email.repository.ts`)

Created `EmailRepository` that manages email entities with:

**Dual-Item Pattern:**

- Entity item: `PK: Email#<id>, SK: METADATA` (standard entity storage)
- Lookup item: `PK: EMAIL#<address>, SK: METADATA` (fast email address lookup)

**Key Methods:**

- `create(data)` - Creates both entity and lookup items atomically using `TransactWriteCommand`
- `findByEmail(email)` - Looks up email by address using `EMAIL#<address>` pattern
- `findByUserId(userId)` - Finds all emails for a user via relationships
- `findPrimaryByUserId(userId)` - Gets the primary email for a user
- `setPrimary(userId, emailId)` - Sets one email as primary, others as non-primary
- `verify(emailId)` - Marks email as verified
- `remove(emailId)` - Soft deletes email by setting status to "removed"

### 2. Updated Relationship Schema (`src/lib/schemas/db/relationship.schema.ts`)

Added bidirectional USER-EMAIL relationships:

```typescript
HAS_EMAIL: {
  allowedSources: ["User"] as const,
  allowedTargets: ["Email"] as const,
}
```

### 3. Auth Callback Implementation (`src/server/auth/index.ts`)

#### signIn Callback

When a user signs in via OAuth:

1. **Check if email exists** using `emailRepository.findByEmail()`
2. **If existing:** Allow login (user has logged in before)
3. **If new user:**
   - Create User entity with `status: "pending_assignment"` and `userType: null`
   - Create Email entity with provider info (github/google), auto-verified
   - Create bidirectional relationships:
     - `USER → EMAIL` (HAS_EMAIL)
     - `EMAIL → USER` (IDENTIFIES)

#### jwt Callback

Enriches JWT token with user ID:

- Looks up email by address
- Finds associated user via `IDENTIFIES` relationship
- Adds `userId` to token for session

#### session Callback

Enriches session with user data:

- Fetches full user entity by ID from token
- Adds `id`, `userType`, and `status` to session
- Available in client via `useAuth()` hook

## Data Flow

### First-Time OAuth Login

```
1. User clicks "Sign in with GitHub/Google"
2. OAuth provider redirects back with user data
3. signIn callback:
   ├─ Extract email from OAuth response
   ├─ Check if email exists (findByEmail)
   └─ If NEW:
      ├─ Create User: id=<ulid>, status="pending_assignment", userType=null
      ├─ Create Email: id=<ulid>, email=<address>, provider="github", verified=true
      └─ Create relationships (atomic transaction):
         ├─ PK: USER#<userId>, SK: EMAIL#<emailId> (HAS_EMAIL)
         └─ PK: EMAIL#<emailId>, SK: USER#<userId> (IDENTIFIES)
4. jwt callback: Add userId to token
5. session callback: Add user data to session
```

### Returning User Login

```
1. User clicks "Sign in with GitHub/Google"
2. OAuth provider redirects back
3. signIn callback:
   ├─ Extract email from OAuth response
   ├─ Check if email exists (findByEmail)
   └─ If EXISTS: return true (allow login)
4. jwt callback: Look up userId from email
5. session callback: Fetch user data and add to session
```

## DynamoDB Schema

### User Entity

```
PK: USER#<userId>
SK: METADATA
{
  id: <ulid>,
  entityType: "User",
  name: "John Doe",
  email: null, // NOT stored on User
  imageUrl: "https://...",
  userType: null, // Assigned by admin later
  status: "pending_assignment",
  createdAt: "2025-12-15T...",
  updatedAt: "2025-12-15T..."
}
```

### Email Entity (Dual Items)

**Entity Item:**

```
PK: Email#<emailId>
SK: METADATA
{
  id: <ulid>,
  entityType: "Email",
  email: "john@example.com",
  provider: "github",
  verifiedAt: "2025-12-15T...",
  isPrimary: true,
  status: "active",
  createdAt: "2025-12-15T...",
  updatedAt: "2025-12-15T..."
}
```

**Lookup Item (for fast email lookup):**

```
PK: EMAIL#john@example.com
SK: METADATA
{
  ... (same data as entity item)
}
```

### Relationships (Bidirectional)

**USER → EMAIL:**

```
PK: USER#<userId>
SK: EMAIL#<emailId>
{
  id: <ulid>,
  entityType: "Relationship",
  sourceType: "User",
  sourceId: <userId>,
  relation: "HAS_EMAIL",
  targetType: "Email",
  targetId: <emailId>,
  createdAt: "2025-12-15T...",
  updatedAt: "2025-12-15T..."
}
```

**EMAIL → USER:**

```
PK: EMAIL#<emailId>
SK: USER#<userId>
{
  id: <ulid>,
  entityType: "Relationship",
  sourceType: "Email",
  sourceId: <emailId>,
  relation: "IDENTIFIES",
  targetType: "User",
  targetId: <userId>,
  createdAt: "2025-12-15T...",
  updatedAt: "2025-12-15T..."
}
```

## Access Patterns

### 1. Login by Email

```typescript
// Fast lookup using EMAIL# pattern
const email = await emailRepository.findByEmail("john@example.com");

// Find user via relationship
const relationships = await relationshipRepository.findFromSource(
  "Email",
  email.id,
  "IDENTIFIES",
);
const userId = relationships[0].targetId;
const user = await userRepository.getById(userId);
```

### 2. Get User's Emails

```typescript
// Query: PK: USER#<id>, SK begins_with EMAIL#
const emails = await emailRepository.findByUserId(userId);
```

### 3. Get User's Primary Email

```typescript
const primaryEmail = await emailRepository.findPrimaryByUserId(userId);
```

## User Status Lifecycle

### OAuth User

1. **Login:** User created with `status: "pending_assignment"`, `userType: null`
2. **Admin Review:** Admin views pending users list
3. **Assignment:** Admin assigns `userType: "teacher"` and adds to UserGroup
4. **Activation:** Status changes to `"active"` when userType is assigned
5. **Access:** User can now access features based on permissions

### CSV Import User

1. **Import:** User created with `userType: "teacher"`, `status: "active"`
2. **Group Assignment:** Admin adds to UserGroup(s) for permissions
3. **Access:** Immediate access based on assigned groups/roles

## Next Steps

### Admin UI Needed

- [ ] Create "Pending Users" page listing OAuth users awaiting assignment
- [ ] Add user type assignment form (teacher/volunteer/member/guest/admin)
- [ ] Add user group assignment interface
- [ ] Show user status and last login

### Permission System

- [ ] Implement `hasPermission(userId, resource, action)` helper
- [ ] Add middleware to check permissions on protected routes
- [ ] Cache permission checks in session/Redis for performance

### Email Management UI

- [ ] Allow users to add/remove email addresses
- [ ] Email verification flow for non-OAuth emails
- [ ] Set primary email selector

## Testing

### Manual Testing

1. Start dev server: `pnpm run dev`
2. Navigate to: `http://localhost:3000/api/auth/signin`
3. Click "Sign in with GitHub" or "Sign in with Google"
4. Check DynamoDB Local to verify:
   - User entity created
   - Email entity created (both items)
   - Relationships created (bidirectional)

### Database Queries

```bash
# View user
aws dynamodb query \
  --table-name aolfclub-entities \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#<userId>"}}' \
  --endpoint-url http://localhost:8000

# View email lookup
aws dynamodb query \
  --table-name aolfclub-entities \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"EMAIL#john@example.com"}}' \
  --endpoint-url http://localhost:8000
```

## Files Modified/Created

### Created

- `src/server/db/repositories/email.repository.ts` - Email entity repository

### Modified

- `src/server/auth/index.ts` - OAuth callbacks with user/email creation
- `src/server/db/repositories/index.ts` - Export EmailRepository
- `src/lib/schemas/db/relationship.schema.ts` - Add HAS_EMAIL relationship

---

**OAuth Flow Complete** ✅ - Users are automatically created on first login with email lookup support!
