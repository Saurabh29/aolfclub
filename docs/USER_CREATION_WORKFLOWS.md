# User Creation Workflows

## Overview
Users can be created through two paths:
1. **OAuth Login** - User type unknown initially
2. **CSV Import** - User type known upfront

## Approach: Single Flexible User Entity

### Why This Approach?
✅ No entity type migration needed  
✅ Simple status transitions  
✅ Permission system works immediately  
✅ One table query pattern for all users  
✅ Type-specific data stored in nested objects  

## Workflow 1: OAuth Login (Type Unknown)

### Step 1: User Logs In with OAuth
```typescript
// src/server/auth/callbacks.ts

export async function handleOAuthSignIn({ user, account, profile }) {
  const email = user.email;
  
  // Check if email already exists
  const emailLookup = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `EMAIL#${email}`,
      SK: "USER"
    }
  }));
  
  if (emailLookup.Item) {
    // User already exists - return existing userId
    return emailLookup.Item.userId;
  }
  
  // Create new user with pending status
  const userId = ulid();
  const now = new Date().toISOString();
  
  // Create user entity
  const newUser = {
    id: userId,
    entityType: "User",
    name: user.name || email.split('@')[0],
    email: email, // Store for display, not used as key
    imageUrl: user.image,
    userType: null, // Will be assigned by admin
    status: "pending_assignment", // Waiting for admin
    createdAt: now,
    updatedAt: now
  };
  
  // Atomic write: User + Email lookup
  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: "METADATA",
            ...newUser
          }
        }
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `EMAIL#${email}`,
            SK: "USER",
            entityType: "EmailLookup",
            email: email,
            userId: userId,
            provider: account.provider, // "google" | "github"
            verified: true,
            createdAt: now
          }
        }
      }
    ]
  }));
  
  return userId;
}
```

### Step 2: User Sees "Pending Approval" Screen
```tsx
// src/routes/(protected)/dashboard.tsx

export default function Dashboard() {
  const session = useSession();
  const [user] = createResource(() => getUser(session()?.user?.id));
  
  return (
    <Show when={user()?.status === "pending_assignment"}>
      <Alert variant="info">
        <AlertTitle>Account Pending Approval</AlertTitle>
        <AlertDescription>
          Your account has been created successfully. 
          Please wait for an administrator to assign your role and permissions.
          You will receive an email once your account is activated.
        </AlertDescription>
      </Alert>
    </Show>
  );
}
```

### Step 3: Admin Assigns User Type and Group
```typescript
// src/server/actions/users.ts
"use server";

export async function assignUserType(
  userId: string, 
  userType: "teacher" | "volunteer" | "member" | "guest" | "admin",
  groupIds: string[],
  typeSpecificData?: {
    teacherData?: { subject?: string; qualification?: string };
    volunteerData?: { skills?: string[]; availability?: string };
    memberData?: { membershipType?: string };
  }
) {
  "use server";
  
  // Step 1: Update user with type and status
  const updateExpression = 
    "SET #userType = :userType, #status = :status, #updatedAt = :updatedAt";
  
  const expressionAttributeNames = {
    "#userType": "userType",
    "#status": "status",
    "#updatedAt": "updatedAt"
  };
  
  const expressionAttributeValues = {
    ":userType": userType,
    ":status": "active",
    ":updatedAt": new Date().toISOString()
  };
  
  // Add type-specific data if provided
  if (userType === "teacher" && typeSpecificData?.teacherData) {
    updateExpression += ", #teacherData = :teacherData";
    expressionAttributeNames["#teacherData"] = "teacherData";
    expressionAttributeValues[":teacherData"] = typeSpecificData.teacherData;
  }
  
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: "METADATA"
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));
  
  // Step 2: Assign user to groups (bidirectional)
  const joinedAt = new Date().toISOString();
  
  for (const groupId of groupIds) {
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
              joinedAt
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
              joinedAt
            }
          }
        }
      ]
    }));
  }
  
  // Step 3: Send email notification (optional)
  await sendWelcomeEmail(userId, userType);
  
  return { success: true };
}
```

## Workflow 2: CSV Import (Type Known)

### CSV Format
```csv
email,name,userType,phone,subject,qualification,skills,membershipType
john@example.com,John Doe,teacher,555-0101,Mathematics,M.Ed,,
jane@example.com,Jane Smith,volunteer,555-0102,,,Teaching;Mentoring,
bob@example.com,Bob Wilson,member,555-0103,,,,Gold
```

### Import Handler
```typescript
// src/server/actions/import.ts
"use server";

import { parse } from "csv-parse/sync";

export async function importUsersFromCSV(csvContent: string, groupId: string) {
  "use server";
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[]
  };
  
  for (const record of records) {
    try {
      const email = record.email.trim().toLowerCase();
      const userType = record.userType as "teacher" | "volunteer" | "member" | "guest";
      
      // Check if user already exists
      const emailLookup = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `EMAIL#${email}`, SK: "USER" }
      }));
      
      if (emailLookup.Item) {
        // Update existing user
        const userId = emailLookup.Item.userId;
        
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: "METADATA" },
          UpdateExpression: 
            "SET #userType = :userType, #status = :status, #phone = :phone, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#userType": "userType",
            "#status": "status",
            "#phone": "phone",
            "#updatedAt": "updatedAt"
          },
          ExpressionAttributeValues: {
            ":userType": userType,
            ":status": "active",
            ":phone": record.phone,
            ":updatedAt": new Date().toISOString()
          }
        }));
        
        results.updated++;
      } else {
        // Create new user
        const userId = ulid();
        const now = new Date().toISOString();
        
        const user = {
          id: userId,
          entityType: "User",
          name: record.name,
          email: email,
          phone: record.phone,
          userType: userType, // Known from CSV
          status: "active", // Immediately active
          createdAt: now,
          updatedAt: now
        };
        
        // Add type-specific data
        if (userType === "teacher") {
          user.teacherData = {
            subject: record.subject,
            qualification: record.qualification
          };
        } else if (userType === "volunteer") {
          user.volunteerData = {
            skills: record.skills ? record.skills.split(';') : []
          };
        } else if (userType === "member") {
          user.memberData = {
            membershipType: record.membershipType
          };
        }
        
        // Create user + email lookup + group assignment
        await docClient.send(new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: TABLE_NAME,
                Item: { PK: `USER#${userId}`, SK: "METADATA", ...user }
              }
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  PK: `EMAIL#${email}`,
                  SK: "USER",
                  entityType: "EmailLookup",
                  email,
                  userId,
                  provider: "csv_import",
                  verified: false,
                  createdAt: now
                }
              }
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  PK: `USER#${userId}`,
                  SK: `GROUP#${groupId}`,
                  entityType: "UserGroupMembership",
                  userId,
                  groupId,
                  joinedAt: now
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
                  joinedAt: now
                }
              }
            }
          ]
        }));
        
        results.created++;
      }
      
      // Send email invitation
      await sendInvitationEmail(email, userType);
      
    } catch (error) {
      results.errors.push(`${record.email}: ${error.message}`);
    }
  }
  
  return { success: true, ...results };
}
```

## Comparison: OAuth vs CSV Import

| Aspect | OAuth Login | CSV Import |
|--------|-------------|------------|
| **userType** | `null` initially | Known upfront |
| **status** | `pending_assignment` | `active` immediately |
| **Email verified** | `true` (OAuth provider) | `false` (needs verification) |
| **Group assignment** | Admin assigns later | Assigned during import |
| **Type-specific data** | Added by admin | Imported from CSV |
| **First login** | Can login but limited access | Receives invitation email |

## Permission Strategy

### Route Guard for Pending Users
```typescript
// src/middleware/auth.ts

export function requireActiveUser() {
  return async (event) => {
    const session = await getSession(event);
    
    if (!session?.user?.id) {
      throw redirect("/login");
    }
    
    const user = await getUserById(session.user.id);
    
    if (user.status === "pending_assignment") {
      throw redirect("/pending-approval");
    }
    
    if (user.status === "suspended") {
      throw redirect("/suspended");
    }
    
    return user;
  };
}
```

### Default Guest Permissions
```typescript
// Option: Auto-assign guest group for OAuth users

export async function handleOAuthSignIn({ user, account }) {
  // ... create user ...
  
  // Optionally assign to default "Guest" group
  const guestGroup = await getGroupByName("Guest");
  
  if (guestGroup) {
    await assignUserToGroup(userId, guestGroup.id);
    
    // Update status to active since they have a group
    await updateUserStatus(userId, "active");
  }
}
```

## Admin UI Flow

### Pending Users List
```tsx
// src/routes/(protected)/admin/pending-users.tsx

export default function PendingUsers() {
  const [users] = createResource(getPendingUsers);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each={users()}>
          {(user) => (
            <TableRow>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
              <TableCell>
                <Button onClick={() => openAssignDialog(user)}>
                  Assign Role
                </Button>
              </TableCell>
            </TableRow>
          )}
        </For>
      </TableBody>
    </Table>
  );
}
```

## Best Practices

1. **Always Create Email Lookup**: Even for CSV imports, create the `EMAIL#...` lookup item for consistency
2. **Use Transactions**: Ensure user + email + group assignments are atomic
3. **Status Transitions**: `pending_assignment` → `active` → `inactive` → `suspended`
4. **Default to Least Privilege**: OAuth users have no permissions until assigned to a group
5. **Email Verification**: OAuth emails are pre-verified, CSV emails need verification flow
6. **Type Safety**: Use Zod schemas to validate CSV data before import
7. **Idempotent Imports**: Check for existing users and update rather than error
8. **Audit Trail**: Store `createdBy` and `assignedBy` for compliance

## Migration from Old Schema

If you have existing Teacher/Volunteer/Member entities:

```typescript
// Migration script
async function migrateToFlexibleUserEntity() {
  const oldEntityTypes = ["Teacher", "Volunteer", "Member", "Lead"];
  
  for (const entityType of oldEntityTypes) {
    const items = await scanByEntityType(entityType);
    
    for (const item of items) {
      const userId = item.id;
      
      // Create new User entity
      const newUser = {
        PK: `USER#${userId}`,
        SK: "METADATA",
        id: userId,
        entityType: "User",
        name: item.name,
        userType: entityType.toLowerCase(),
        status: "active",
        // Move type-specific data to nested object
        [`${entityType.toLowerCase()}Data`]: {
          // Extract relevant fields
        },
        createdAt: item.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      // Write new format, delete old
      await migrateEntity(item, newUser);
    }
  }
}
```

## Summary

✅ **Use single `User` entity** with `userType` field  
✅ **OAuth users** start with `status: "pending_assignment"`  
✅ **CSV users** get `status: "active"` immediately  
✅ **Type-specific data** stored in nested objects (`teacherData`, `volunteerData`, etc.)  
✅ **Permissions** based on UserGroup membership, not userType  
✅ **Email lookup** always created for both flows  

This approach is flexible, scalable, and avoids entity type migrations.
