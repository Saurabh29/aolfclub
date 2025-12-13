# Validated Card List System

Complete type-safe card list components with Zod schema validation for SolidJS.

## 📦 Components

### 1. GenericCardList (Generic/Flexible)
A fully generic component that accepts any data type and custom render functions.

**Use when:**
- You have existing data structures
- You need maximum flexibility
- You want custom rendering logic

```tsx
import GenericCardList from "~/components/GenericCardList";

<GenericCardList
  items={stores}
  getId={(store) => store.id}
  renderHeader={(store) => (
    <div>
      <h3>{store.name}</h3>
      <p>{store.location}</p>
    </div>
  )}
  renderContent={(store) => (
    <div>Revenue: ${store.revenue}</div>
  )}
  onItemClick={(store) => console.log(store)}
  actions={[
    { label: "Edit", icon: <EditIcon />, onClick: handleEdit },
    { label: "Delete", icon: <DeleteIcon />, onClick: handleDelete },
  ]}
/>
```

### 2. StructuredCardList (Schema-Validated)
A structured component using validated ComponentUnion schemas for consistent, type-safe cards.

**Use when:**
- You want built-in component types (metrics, badges, labels, etc.)
- You need runtime validation
- You want consistent UI patterns

```tsx
import StructuredCardList from "~/components/StructuredCardList";
import type { CardItem } from "~/lib/schemas/ui/card.schema";

const cards: CardItem[] = [
  {
    id: "card-1",
    header: { title: "Revenue Dashboard", subtitle: "Q4 2025" },
    components: [
      {
        type: "metric",
        data: { label: "Total", value: "$125K", variant: "success" }
      },
      {
        type: "badge",
        data: { label: "Active", variant: "success" }
      }
    ],
    actions: [...],
    onClick: (card) => console.log(card)
  }
];

<StructuredCardList cards={cards} />
```

## 🔒 Zod Schemas

### Component Types

All schemas are in `src/schemas/card.schema.ts`:

#### MetricComponent
```typescript
{
  type: "metric",
  data: {
    label: string,
    value: string | number,
    variant?: "default" | "primary" | "success" | "warning" | "error" | "info",
    icon?: JSX.Element
  }
}
```

#### BadgeComponent
```typescript
{
  type: "badge",
  data: {
    label: string,
    variant?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info",
    size?: "sm" | "md" | "lg"
  }
}
```

#### LabelComponent
```typescript
{
  type: "label",
  data: {
    key: string,
    value: string,
    orientation?: "horizontal" | "vertical"
  }
}
```

#### ListItemComponent
```typescript
{
  type: "list",
  data: {
    items: string[],
    ordered?: boolean,
    icon?: JSX.Element
  }
}
```

#### IconCardComponent
```typescript
{
  type: "iconCard",
  data: {
    icon: JSX.Element,
    title: string,
    description?: string,
    variant?: "default" | "primary" | "success" | "warning" | "error" | "info"
  }
}
```

#### CustomComponent
```typescript
{
  type: "custom",
  data: {
    render: (data: any) => JSX.Element,
    props?: Record<string, any>
  }
}
```

### Type Inference

All TypeScript types are inferred from Zod schemas:

```typescript
import { z } from "zod";
import { 
  MetricComponentSchema,
  type MetricComponent 
} from "~/lib/schemas/ui/card.schema";

// Type is automatically inferred
export type MetricComponent = z.infer<typeof MetricComponentSchema>;
```

## 🎯 Runtime Validation

Both components validate props at runtime:

```typescript
// In GenericCardList.tsx
try {
  GenericCardListPropsSchema.parse(props);
} catch (error) {
  console.error("Validation error:", error);
  throw new Error("Invalid props provided");
}
```

## 📊 Examples

### Store Performance Cards
See: `src/routes/validated-cards.tsx`

```typescript
const storeCards: CardItem[] = [
  {
    id: "store-1",
    header: {
      title: "Downtown Seattle Store",
      subtitle: "Premium Location"
    },
    components: [
      {
        type: "metric",
        data: {
          label: "Monthly Revenue",
          value: "$125,000",
          variant: "success",
          icon: <DollarIcon />
        }
      } satisfies MetricComponent,
      {
        type: "badge",
        data: {
          label: "Active",
          variant: "success"
        }
      } satisfies BadgeComponent
    ],
    actions: [
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: (card) => alert(`Edit: ${card.header.title}`)
      }
    ]
  }
];

<StructuredCardList cards={storeCards} />
```

### Grid Configuration

Both components support custom grid layouts:

```typescript
<StructuredCardList
  cards={cards}
  gridConfig={{
    cols: { 
      sm: 1,  // 1 column on small screens
      md: 2,  // 2 columns on medium screens
      lg: 3,  // 3 columns on large screens
      xl: 4   // 4 columns on extra large screens
    },
    gap: "gap-6"
  }}
/>
```

## 🚀 Adding New Component Types

1. Create schema in `src/schemas/card.schema.ts`:

```typescript
export const NewComponentSchema = ComponentBaseSchema.extend({
  type: z.literal("newType"),
  data: z.object({
    // Your fields here
  }),
});

export type NewComponent = z.infer<typeof NewComponentSchema>;
```

2. Add to ComponentUnionSchema:

```typescript
export const ComponentUnionSchema = z.discriminatedUnion("type", [
  MetricComponentSchema,
  // ... other schemas
  NewComponentSchema,  // Add here
]);
```

3. Create renderer in `src/components/StructuredCardList.tsx`:

```typescript
function NewComponentRenderer(props: { component: NewComponent }) {
  return <div>{/* Render logic */}</div>;
}

// Add to ComponentRenderer Switch
<Match when={props.component.type === "newType" && props.component as NewComponent}>
  {(comp) => <NewComponentRenderer component={comp()} />}
</Match>
```

## 🔍 Validation Benefits

1. **Type Safety**: Full TypeScript inference from schemas
2. **Runtime Checks**: Fails fast on invalid data
3. **Self-Documenting**: Schemas serve as documentation
4. **Refactoring Safety**: Change schema, TypeScript finds all issues
5. **API Integration**: Validate data from external sources

## 📝 Best Practices

1. Always use `satisfies` for type checking component data:
   ```typescript
   { type: "metric", data: {...} } satisfies MetricComponent
   ```

2. Validate external data before passing to components:
   ```typescript
   const validatedCards = CardItemSchema.array().parse(apiData);
   ```

3. Use discriminated unions for exhaustive type checking
4. Keep schemas close to components they validate
5. Export both schemas and inferred types

## 🎨 Styling

- Use Tailwind CSS classes via `className` prop on any component
- All components support `cardClass` and `listClass` for global styling
- Component-level `className` for individual customization

## 📚 See Also

- `/cards` - Original GenericCardList examples
- `/validated-cards` - StructuredCardList with validation examples
- `src/schemas/card.schema.ts` - All Zod schemas
- `src/components/GenericCardList.tsx` - Generic component
- `src/components/StructuredCardList.tsx` - Structured component
