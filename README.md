# AOLF Club - Multi-Tenant Location Management System

A modern web application built with SolidJS for managing educational centers with multi-tenant support, OAuth authentication, and role-based access control.

## 🚀 Features

- **OAuth Authentication** - GitHub & Google login
- **Multi-Tenant Architecture** - Location-specific access control
- **Role-Based Permissions** - User → Group → Role → Permission hierarchy
- **Flexible User Management** - Support for both OAuth and CSV import workflows
- **AWS DynamoDB Backend** - Single table design without GSI for cost efficiency
- **Type-Safe Schemas** - Zod validation for both database and UI layers
- **Google Places Integration** - Location autocomplete and geocoding (optional)

## 🏗️ Tech Stack

- **Frontend**: SolidJS (reactive UI), SolidStart (meta-framework)
- **Styling**: Tailwind CSS v4, solid-ui component library
- **Backend**: SolidStart server actions, AWS DynamoDB
- **Authentication**: @solid-mediakit/auth with Auth.js
- **Validation**: Zod schemas
- **Build**: Vinxi

## 📋 Prerequisites

- Node.js ≥22
- pnpm (package manager)
- AWS Account with DynamoDB access (or DynamoDB Local for development)

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# AWS DynamoDB
DYNAMODB_TABLE_NAME=aolfclub-entities
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# For local development (optional)
DYNAMODB_ENDPOINT=http://localhost:8000
NODE_ENV=development

# OAuth Providers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Auth.js
AUTH_SECRET=your_random_secret_key

# Google Places API (optional)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 4. Build for Production

```bash
pnpm build
pnpm start
```

## 📚 Documentation

All documentation is located in the `docs/` folder:

- **[Database Schema](docs/DYNAMODB_SCHEMA_NO_GSI.md)** - DynamoDB single table design without GSI
- **[Permission System](docs/PERMISSION_SYSTEM_EXAMPLES.md)** - Permission checking and examples
- **[User Workflows](docs/USER_CREATION_WORKFLOWS.md)** - OAuth and CSV import user creation
- **[Database Repositories](docs/DATABASE_REPOSITORIES.md)** - Repository layer documentation
- **[Google Places Setup](docs/GOOGLE_PLACES_SETUP.md)** - Location autocomplete configuration
- **[AI Agent Guide](.github/copilot-instructions.md)** - Comprehensive development guide

## 🗄️ Database Architecture

### Single Table Design (No GSI)

All entities are stored in one DynamoDB table using composite keys:

- **Primary Keys**: `PK: "EntityType#uuid"` + `SK: "METADATA"`
- **Email Lookup**: `PK: "EMAIL#email"` + `SK: "USER"` (no GSI needed)
- **Relationships**: Bidirectional items for many-to-many relationships
- **Queries**: Use `begins_with(SK, "PREFIX#")` for one-to-many

### Entity Types

- **User** - All user types (teacher, volunteer, member, guest, admin)
- **Location** - Educational centers
- **UserGroup** - Logical grouping of users
- **Role** - System roles (admin, teacher, volunteer, member, guest)
- **Permission** - Granular permissions (resource:action)
- **Email** - Email-to-user identity mapping
- **Relationship** - Generic graph edges

## 🔐 Permission System

### Hierarchy

```
User → UserGroup → Role → Permission
```

### User Creation Workflows

#### 1. OAuth Login (Type Unknown)

```typescript
{
  userType: null,              // Assigned by admin later
  status: "pending_assignment" // Waiting for activation
}
```

#### 2. CSV Import (Type Known)

```typescript
{
  userType: "teacher",         // Known from CSV
  status: "active",            // Immediately active
  teacherData: {               // Type-specific data
    subject: "Mathematics",
    qualification: "M.Ed"
  }
}
```

## 🧪 Testing

### Database Connection Test

```bash
pnpm db:test
```

### Run DynamoDB Local (for development)

See [Database Repositories](docs/DATABASE_REPOSITORIES.md) for setup instructions.

## 📁 Project Structure

```
aolfclub/
├── .github/
│   └── copilot-instructions.md   # AI agent development guide
├── docs/                          # All documentation
│   ├── DYNAMODB_SCHEMA_NO_GSI.md
│   ├── PERMISSION_SYSTEM_EXAMPLES.md
│   ├── USER_CREATION_WORKFLOWS.md
│   ├── DATABASE_REPOSITORIES.md
│   └── GOOGLE_PLACES_SETUP.md
├── public/                        # Static assets
├── src/
│   ├── app.css                    # Global styles
│   ├── app.tsx                    # Root component
│   ├── components/                # UI components
│   │   ├── ui/                    # solid-ui components
│   │   └── *.tsx
│   ├── hooks/                     # Custom hooks
│   ├── lib/
│   │   ├── schemas/               # Zod schemas
│   │   │   ├── db/                # Database schemas
│   │   │   └── ui/                # Form/UI schemas
│   │   └── utils.ts               # Utility functions
│   ├── routes/                    # File-based routing
│   │   ├── (protected)/           # Auth-required routes
│   │   ├── api/                   # API endpoints
│   │   └── *.tsx
│   └── server/
│       ├── actions/               # Server actions
│       ├── auth/                  # OAuth configuration
│       └── db/
│           ├── client.ts          # DynamoDB client
│           └── repositories/      # Data access layer
├── app.config.ts                  # SolidStart config
├── tailwind.config.js             # Tailwind config
├── tsconfig.json                  # TypeScript config
└── package.json
```

## 🎨 UI Components

The project uses [solid-ui](https://www.solid-ui.com/) component library built on Kobalte.

### Installing New Components

```bash
pnpx solidui-cli@latest add <component-name>
```

### Available Components

Button, Card, Dialog, Input, Select, Table, Badge, Avatar, Dropdown, Tabs, and more...

## 🔧 Common Tasks

### Adding a New Entity Type

1. Create DB schema in `src/lib/schemas/db/`
2. Create UI schema in `src/lib/schemas/ui/`
3. Add to `AllEntityTypeSchema` in `base.schema.ts`
4. Create repository in `src/server/db/repositories/`
5. Create server actions in `src/server/actions/`
6. Create UI page with `createResource` for data loading

### Creating Server Actions

```typescript
"use server"; // File-level directive

export async function myAction(input: UISchema) {
  "use server"; // Function-level directive

  // 1. Validate input
  const validated = UISchema.parse(input);

  // 2. Transform to DB entity
  const entity = { ...validated, id: ulid(), ... };

  // 3. Validate entity
  DBSchema.parse(entity);

  // 4. Save via repository
  await repository.create(entity);

  return { success: true, data: entity };
}
```

## 🤝 Contributing

This is a proof-of-concept project. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- Built with [SolidJS](https://www.solidjs.com/)
- UI components from [solid-ui](https://www.solid-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
