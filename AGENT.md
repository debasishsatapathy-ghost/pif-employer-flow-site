# Voice AI Platform — Client Website Agent Guide

> **For coding agents** (Claude Code, Cursor, Copilot, etc.) working on client websites built from this template.

---

## Architecture Overview

This is a **client website** deployed on the Voice AI Platform. It has a persistent voice overlay powered by LiveKit that lets a voice AI agent control the UI — showing components, navigating pages, and collecting form data.

**Key concepts:**
- The **voice agent** (Python, runs server-side) controls the UI by calling `show_component(templateType, data)`
- The **DynamicComponentRenderer** resolves `templateType` to a React component via the **component registry**
- Components live in `src/components/tele-components/` and are auto-registered
- The agent sends JSON data; the component renders it visually

---

## Directory Structure

```
src/
├── components/
│   ├── tele-components/              ← Voice-renderable components (THE MAIN LIBRARY)
│   │   ├── component-registry.ts     ← Registry mapping type → component
│   │   ├── types.ts                  ← TeleComponentProps interface
│   │   ├── index.ts                  ← Public exports
│   │   ├── BarChart.tsx              ← Example: data visualization
│   │   ├── Form.tsx                  ← Example: interactive form
│   │   ├── ProductCard.tsx           ← Example: content display
│   │   └── ...                       ← More built-in components
│   ├── voice/                        ← Voice infrastructure (DO NOT MODIFY)
│   │   ├── DynamicComponentRenderer.tsx  ← Resolves type → component
│   │   ├── AgentComponentSlot.tsx    ← Renders agent-pushed components
│   │   ├── VoiceOverlay.tsx          ← Persistent voice panel
│   │   ├── VoiceConnectButton.tsx    ← Connect button
│   │   └── VoiceSessionProvider.tsx  ← LiveKit session provider
│   ├── ui/                           ← shadcn/ui primitives
│   ├── Header.tsx                    ← Site header
│   └── Footer.tsx                    ← Site footer
├── app/                              ← Next.js pages
├── lib/
│   ├── stores/voice-session-store.ts ← Zustand store (DO NOT MODIFY)
│   └── utils.ts                      ← Utility functions
└── types/index.ts                    ← Shared TypeScript types
```

---

## Creating a New Tele-Component

### Step 1: Create the component file

Create `src/components/tele-components/MyWidget.tsx`:

```tsx
'use client';

import { TeleComponentProps } from './types';

/**
 * MyWidget — Brief description of what this component renders.
 *
 * Props (via data):
 *   title: string           — Main heading
 *   items: Array<{ ... }>   — The data items
 *   showXYZ?: boolean       — Optional config (default: true)
 */
export default function MyWidget({ data, accentColor = '#2563eb', onAction }: TeleComponentProps) {
  const title = data.title as string | undefined;
  const items: Array<{ label: string; value: number }> = Array.isArray(data.items) ? data.items : [];

  if (items.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      {/* Render your component */}
    </div>
  );
}
```

### Step 2: Register it in the registry

Add one line to `src/components/tele-components/component-registry.ts`:

```ts
reg('MyWidget', () => import('./MyWidget'));
```

That's it. The DynamicComponentRenderer will now resolve `template.type === 'MyWidget'` to your component.

### Step 3: Register the template in the database

The component discovery service automatically scans for new components on `git push` and creates ComponentTemplate records. If manually registering, create a template with:
- `type`: `'MyWidget'` (must match the filename exactly)
- `schema`: JSON Schema for the props
- `defaultData`: Default values for all props
- `description`: What the component does (used by the voice agent to decide when to show it)

---

## Component Conventions (MUST FOLLOW)

### 1. File & naming
- **Filename**: PascalCase, matching `template.type` exactly (e.g. `BarChart.tsx` → type `"BarChart"`)
- **Location**: `src/components/tele-components/`
- **Export**: `export default function ComponentName`

### 2. Props interface
All components receive `TeleComponentProps`:
```ts
interface TeleComponentProps {
  data: Record<string, any>;     // Merged template defaults + agent data
  accentColor?: string;           // Theme color (default: #2563eb)
  onAction?: (phrase: string) => void;  // Send action back to voice agent
}
```

Extract typed fields from `data` at the top of the component:
```ts
const title = data.title as string | undefined;
const items: MyItem[] = Array.isArray(data.items) ? data.items : [];
```

### 3. Defensive rendering
- Always handle missing/empty data gracefully
- Return `null` if essential data is missing
- Default arrays to `[]`, booleans to sensible defaults
- Never crash on unexpected data shapes

### 4. Styling
- Use Tailwind CSS classes only (no CSS modules, no styled-components)
- Use `accentColor` prop for theme-aware colors via `style={{ color: accentColor }}`
- Keep components responsive (mobile-first with `md:` / `lg:` breakpoints)
- Use `text-muted-foreground` for secondary text

### 5. Interactivity
- Use `onAction?.(phrase)` to send user interactions back to the voice agent
- For forms, use the `useVoiceSessionStore` `submitForm` function
- The agent receives the action phrase and can respond conversationally

### 6. Documentation
- Add a JSDoc comment at the top of the component listing all props with types and descriptions
- Use the `Props (via data):` format (see existing components for examples)

### 7. No external dependencies
- Built-in components must use ONLY: React, Tailwind, and the voice session store
- No additional npm packages (keeps bundle size minimal)
- SVG-based charts preferred over chart libraries

---

## Built-in Component Types

| Category | Components |
|----------|-----------|
| **Data Viz** | BarChart, LineChart, PieChart, StatsRow, ProgressTracker |
| **Content** | ProductCard, InfoCards, ImageGallery, QuoteCallout, FAQ, MediaContent |
| **Interactive** | Form, ComparisonTable, Quiz, Checklist |
| **Layout** | HeroSplit, Timeline, CarouselCards, TrioColumns, ProcessFlow |
| **Specialized** | ProfileRoster, StatusList, NumberedList, MeetingScheduler |

---

## How the Voice Agent Uses Components

The Python voice agent has tools to control the UI:

```python
# Agent decides to show a chart
show_component("BarChart", {
    "title": "Monthly Revenue",
    "bars": [
        {"label": "Jan", "value": 12000},
        {"label": "Feb", "value": 15000},
    ],
    "unit": "$"
})
```

The flow:
1. Agent calls `show_component` → RPC to frontend
2. Frontend receives `{templateType: "BarChart", data: {...}}`
3. `DynamicComponentRenderer` looks up "BarChart" in registry
4. Lazy-loads and renders `BarChart.tsx` with the data
5. Component appears in the `AgentComponentSlot` on the page

---

## DO NOT MODIFY

These files are platform infrastructure. Changes will break the voice session:

- `src/components/voice/*` — Voice overlay & session management
- `src/lib/stores/voice-session-store.ts` — Zustand store
- `src/components/voice/DynamicComponentRenderer.tsx` — Only modify if adding new resolution logic
- `src/types/index.ts` — Core type definitions

---

## Quick Reference: Adding a Component

```bash
# 1. Create the component
touch src/components/tele-components/MyWidget.tsx

# 2. Write it following TeleComponentProps interface
# 3. Add to registry:
#    reg('MyWidget', () => import('./MyWidget'));

# 4. Push to Git → discovery service auto-registers the template
git add -A && git commit -m "Add MyWidget tele-component" && git push
```
