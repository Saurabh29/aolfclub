# AI Coding Agent Instructions

## Project Overview
This is a **SolidStart** application using SolidJS with file-based routing, Tailwind CSS v4, and pnpm package management. SolidStart is Solid's meta-framework (similar to Next.js for React) with SSR/SSG capabilities powered by Vinxi.

## Architecture & Key Patterns

### Framework Stack
- **SolidJS** (reactive UI library with fine-grained reactivity using signals)
- **SolidStart** (`@solidjs/start`) for SSR/routing/meta-framework features
- **Vinxi** as the build tool and dev server
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **TypeScript** with `jsxImportSource: "solid-js"`

### Routing
File-based routing in `src/routes/`:
- `index.tsx` → `/` (home page)
- `about.tsx` → `/about`
- `[...404].tsx` → catch-all 404 handler (bracket syntax for dynamic/catch-all routes)

Navigation uses `<A>` component from `@solidjs/router`, NOT standard `<a>` for SPA routing.

### Entry Points
- **Client**: `src/entry-client.tsx` mounts `<StartClient />` to DOM
- **Server**: `src/entry-server.tsx` exports handler with `<StartServer />` and HTML document template
- **Root**: `src/app.tsx` defines app shell with `<Router>`, `<Nav>`, and `<Suspense>` wrapper

### Styling System
Uses **Tailwind CSS v4** with:
- CSS variables for design tokens in `src/app.css` (`:root` with `--background`, `--primary`, etc.)
- `tailwind.config.cjs` extends theme with semantic color system (primary, secondary, destructive, info, success, warning, error)
- Dark mode via variant: `[.dark &]` and `[data-kb-theme="dark"] &`
- `cn()` utility in `src/lib/utils.ts` combines `clsx` and `tailwind-merge` for conditional class merging

**Example pattern** (see `src/components/Counter.tsx`):
```tsx
class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300"
```

### Component Patterns
- Use **SolidJS signals** for reactivity: `createSignal()` not `useState()`
- Components are functions returning JSX (no FC wrapper)
- Use `class` not `className` in JSX
- Import path alias `~/*` maps to `src/*` (configured in tsconfig.json)

**Example** (see `src/components/Counter.tsx`):
```tsx
const [count, setCount] = createSignal(0);
<button onClick={() => setCount(count() + 1)}>Clicks: {count()}</button>
```

### UI Component Infrastructure
- `ui.config.json` configures shadcn-like UI component generation
- Components alias: `~/components/ui` (empty currently, but setup for component library)
- Utils alias: `~/lib/utils`

## Developer Workflow

### Commands (pnpm-based)
```bash
pnpm dev      # Start dev server (Vinxi)
pnpm build    # Build for production
pnpm start    # Run production build
```

### Requirements
- **Node.js ≥22** (specified in package.json engines)
- Use **pnpm** not npm/yarn (pnpm-lock.yaml present)

### Adding New Routes
Create `.tsx` files in `src/routes/`:
- Export default component function
- Use `<A>` for internal navigation
- Dynamic routes use bracket syntax: `[id].tsx`

### State Management
- Local state: `createSignal()`, `createMemo()`, `createEffect()`
- Props are getters in SolidJS - access with `props.value()` if reactive, or destructure carefully
- Context: use `createContext` from "solid-js"

### Active Path Detection
Pattern from `src/components/Nav.tsx`:
```tsx
const location = useLocation();
const active = (path: string) => path == location.pathname ? "border-sky-600" : "border-transparent";
```

## Critical Conventions

1. **JSX Syntax**: Use `class` not `className`, `for` not `htmlFor`
2. **Imports**: Always use `~/` path alias for src imports
3. **Reactivity**: Signals are functions - call `count()` to read, `setCount(value)` to write
4. **SSR-Safe**: Components may render on server - avoid direct DOM access in component body
5. **File Routing**: Route files must export default component, organize by file structure not config

## Testing & Debugging
No test setup currently configured. Dev server runs on default Vinxi port with HMR enabled.

## External Dependencies
- `class-variance-authority` + `tailwindcss-animate` suggest UI component library setup
- No backend/API routes configured yet (SolidStart supports server functions via "server" directive)
