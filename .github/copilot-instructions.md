# AI Coding Agent Instructions

## Project Overview

This is a **SolidJS + SolidStart** application with **Tailwind CSS v4** and a custom design system. SolidStart is the meta-framework for SolidJS (similar to Next.js for React), powered by Vinxi for bundling and development.

**Key Stack:**
- SolidJS v1.9+ (reactive primitives, signals, JSX)
- SolidStart v1.1+ (file-based routing, SSR)
- Tailwind CSS v4 (using `@tailwindcss/vite`, `@theme` directive)
- pnpm (package manager)
- TypeScript (JSX preserved, compiled by Vinxi)
- Node.js >=22

## Architecture & Routing

### File-Based Routing
Routes live in [src/routes/](src/routes/). File names map directly to URLs:
- [src/routes/index.tsx](src/routes/index.tsx) → `/`
- [src/routes/about.tsx](src/routes/about.tsx) → `/about`  
- [src/routes/[...404].tsx](src/routes/[...404].tsx) → catch-all 404 page

The app root in [src/app.tsx](src/app.tsx) wraps routes with shared layout (`<Nav />`) and uses `<FileRoutes />` for automatic route registration.

### Component Structure
- **Route components:** Live in `src/routes/`, export default function
- **Shared components:** [src/components/](src/components/) (e.g., [Counter.tsx](src/components/Counter.tsx), [Nav.tsx](src/components/Nav.tsx))
- **UI components:** [src/components/ui/](src/components/ui/) (currently empty, configured via [ui.config.json](ui.config.json) for future shadcn-solid integration)

## SolidJS Conventions

### Reactivity Pattern
Use **signals** for reactive state. Always call signals as functions to read values:

```tsx
import { createSignal } from "solid-js";

const [count, setCount] = createSignal(0);
console.log(count()); // Read with ()
setCount(count() + 1); // Update
```

### JSX Differences from React
- Use `class` instead of `className`
- Event handlers use lowercase: `onClick`, `onInput`
- No virtual DOM diffing - updates are surgically precise via signals

### Navigation
Use `<A>` component from `@solidjs/router` for client-side navigation (not `<a>`):

```tsx
import { A } from "@solidjs/router";

<A href="/about">About</A> // Client-side
<a href="/external">External</a> // Full page reload
```

## Styling & Design System

### Tailwind CSS v4
Uses the new `@theme` directive in [src/app.css](src/app.css) instead of `tailwind.config.cjs` for theme customization. Both files exist for legacy compatibility.

**CSS Variables Pattern:**
Design tokens use HSL + CSS variables for theming:

```css
@theme {
  --color-primary: hsl(var(--primary));
}

:root {
  --primary: 240 5.9% 10%;
}

.dark {
  --primary: 0 0% 98%;
}
```

Apply in components: `class="text-primary bg-primary"`

### Dark Mode
Configured for dual-selector: `.dark` class AND `[data-kb-theme="dark"]` attribute (Kobalte UI library compatibility).

### Utility Helper
[src/lib/utils.ts](src/lib/utils.ts) exports `cn()` for conditional class merging:

```tsx
import { cn } from "~/lib/utils";

<div class={cn("base-class", condition && "conditional-class")} />
```

## Path Aliases

Configured in [tsconfig.json](tsconfig.json):
- `~/` → [src/](src/) directory
- Import example: `import Nav from "~/components/Nav"`

[ui.config.json](ui.config.json) adds:
- `components` alias → `~/components/ui`
- `utils` alias → `~/lib/utils`

## Development Workflow

### Commands (use pnpm)
```bash
pnpm run dev    # Start dev server (Vinxi)
pnpm run build  # Production build
pnpm start      # Run production build
```

### Dev Server Behavior
- Runs on Vinxi (Vite-based)
- Tailwind CSS processed via `@tailwindcss/vite` plugin (see [app.config.ts](app.config.ts))
- Hot module replacement for instant updates
- Uses Node.js >=22 (strict engine requirement)

## Critical Patterns

### When Adding New Routes
1. Create `[name].tsx` in [src/routes/](src/routes/)
2. Export default function component
3. No manual route registration needed - `<FileRoutes />` handles it

### When Adding Components
- Use signals for local state
- Extract reusable logic to custom signals/effects
- Follow existing file structure: components in [src/components/](src/components/)

### When Styling
- Prefer Tailwind utilities over custom CSS
- Use `cn()` utility for conditional classes
- Reference design tokens from [src/app.css](src/app.css) CSS variables

## Dependencies

Key packages (see [package.json](package.json)):
- `@solidjs/start` - Meta-framework
- `@solidjs/router` - Routing
- `vinxi` - Build tool
- `tailwindcss` + `@tailwindcss/vite` - Styling (v4)
- `clsx` + `tailwind-merge` - Class name utilities
- `class-variance-authority` - Component variant patterns
- `tailwindcss-animate` - Animation utilities

## Common Gotchas

1. **Always call signals:** `count()` not `count`
2. **Use `<A>` not `<a>`** for internal navigation
3. **JSX uses `class`** not `className`
4. **Tailwind v4 syntax:** Uses `@import "tailwindcss"` and `@theme` (different from v3)
5. **pnpm only:** Package manager enforced by lockfile

## Future Considerations

[ui.config.json](ui.config.json) suggests planned integration with shadcn-solid or similar UI component library (currently [src/components/ui/](src/components/ui/) is empty).
