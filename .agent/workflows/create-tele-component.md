# Workflow: Create a New Card or Layout Component

## Purpose
Create a new **card** (rendered inside GridView) or a new **layout** (replaces GridView entirely) for the DSL-driven scene system.

## Architecture Overview

The scene system has two rendering paths:

```
DSL text → parseDSL.ts → SceneData → SceneManager.tsx
                                          ↓
                              ┌─────── layout resolver ───────┐
                              │                               │
                    LAYOUT|layout:<name>              LAYOUT|2x3, 1-2, etc.
                              │                               │
                        LAYOUT_MAP                        GridView
                     (custom layout)                   (card grid)
                              │                               │
                     Full-page renderer              CARD_MAP → cards
```

1. The AI agent generates **pipe-delimited DSL** text
2. `parseDSL.ts` parses into `SceneData` (cards array + layout string + metadata)
3. `SceneManager.tsx` checks the layout string:
   - If it starts with `layout:` → looks up `LAYOUT_MAP` in `src/components/layouts/index.ts`
   - Otherwise → renders `GridView` with standard grid/mosaic/vertical layouts

**Cards** live inside GridView. **Layouts** replace GridView entirely.

---

## Part A: Creating a New Card

Cards are individual visual units rendered inside GridView cells.

### Prerequisites
- Card name: PascalCase for file/export, kebab-case for DSL type
- Data fields the card will display
- Is it a **flat card** (single line of pipe fields) or **container card** (header + child items)?

### Steps

#### 1. Create the component file

**Location**: `src/components/cards/{ComponentName}.tsx`

**Key conventions** (match existing cards exactly):
- Use CSS custom properties for theming: `var(--theme-chart-line)` for accent color
- Use `color-mix()` helper for opacity: `color-mix(in srgb, var(--theme-chart-line) 80%, transparent)`
- Use `font-data` class for data/labels, `font-voice` for body text
- Export as both named and default export
- Define a typed props interface (NOT a generic `data` bag)

**Template for a flat card:**
```tsx
import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface MyCardProps {
    label: string;
    value: string;
    detail?: string;
}

export const MyCard: React.FC<MyCardProps> = ({ label, value, detail }) => (
    <div className="flex flex-col h-full justify-start gap-1.5">
        <h3 className="font-data text-base font-bold" style={{ color: getColor(90) }}>{label}</h3>
        <p className="font-data text-2xl font-bold" style={{ color: C }}>{value}</p>
        {detail && (
            <p className="font-voice text-sm leading-relaxed" style={{ color: getColor(70) }}>{detail}</p>
        )}
    </div>
);

export default MyCard;
```

**Template for a container card** (with child items):
```tsx
import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface MyListItem {
    name: string;
    value: string;
}

interface MyListCardProps {
    title?: string;
    items: MyListItem[];
}

export const MyListCard: React.FC<MyListCardProps> = ({ title, items }) => (
    <div className="flex flex-col h-full gap-2">
        {title && <h3 className="font-data text-base font-bold" style={{ color: getColor(90) }}>{title}</h3>}
        <div className="flex flex-col gap-1">
            {items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1"
                     style={{ borderBottom: `1px solid ${getColor(8)}` }}>
                    <span className="font-voice text-sm" style={{ color: getColor(80) }}>{item.name}</span>
                    <span className="font-data text-sm font-semibold" style={{ color: C }}>{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

export default MyListCard;
```

#### 2. Register in index.ts

Open `src/components/cards/index.ts` and add a named export:

```ts
export { MyCard } from './MyCard';
```

#### 3. Register in GridView.tsx

Open `src/components/cards/GridView.tsx` and make **three changes**:

**a) Add the import** (at the top, in the appropriate category group):
```ts
import { ..., MyCard } from '@/components/cards';
```

**b) Add to `CARD_MAP`** (maps the DSL type string → component):
```ts
'my-card': MyCard,
```

**c) Add to `CARD_SIZE`** (determines row height weight):
```ts
// Size tiers:
//   1 = compact (strip-like, no vertical space needed)
//   2 = standard (stats, lists, moderate content)
//   3 = expansive (charts, tables, maps)
'my-card': 2,
```

#### 4. Add DSL parsing support in parseDSL.ts

Open `src/utils/parseDSL.ts` and make these changes:

**a) Add to `DSL_SCHEMA`** (defines pipe count and field names):

For a **flat card** (all fields on one line):
```ts
'my-card': { pipeCount: 3, fields: ['label','value','detail'] },
```

For a **container card** (header + item lines):
```ts
'my-list': { pipeCount: 1, fields: ['title'] },
```

**b) Add parser case in `parseLine()`**:

For a **flat card**, add a case in the flat-card section:
```ts
case 'my-card': {
    const [label, value, detail] = rest;
    cards.push({ type: 'my-card', label: n(label)!, value: n(value)!, detail: n(detail) });
    break;
}
```

For a **container card**, add:
- A header case that sets `currentContainer`:
```ts
case 'my-list': {
    const [title] = rest;
    currentContainer = { type: 'my-list', title: n(title), items: [] };
    cards.push(currentContainer);
    break;
}
```
- An item prefix case (e.g., `myitem`) in the item-prefix section:
```ts
case 'myitem': {
    const [name, value] = rest;
    if (currentContainer?.type === 'my-list') {
        currentContainer.items.push({ name: n(name)!, value: n(value)! });
    }
    break;
}
```

#### 5. Verify

Run `npm run build` to confirm no TypeScript errors.

### Card Checklist
- [ ] File created in `src/components/cards/`
- [ ] Named + default export
- [ ] Typed props interface (not generic `data` object)
- [ ] Uses CSS custom properties for theme (`var(--theme-chart-line)`, `color-mix()`)
- [ ] Uses `font-data` / `font-voice` font classes
- [ ] Added to `src/components/cards/index.ts`
- [ ] Added to `CARD_MAP` in `GridView.tsx`
- [ ] Added to `CARD_SIZE` in `GridView.tsx`
- [ ] Added to `DSL_SCHEMA` in `parseDSL.ts`
- [ ] Parser case added in `parseLine()` in `parseDSL.ts`
- [ ] No additional npm dependencies
- [ ] `npm run build` passes

---

## Part B: Creating a New Layout

Layouts are full-page renderers that **replace GridView entirely**. Use layouts when:
- You need a completely different page structure (hero, split pane, form, landing page)
- The grid system doesn't fit the content (single large visualization, narrative flow)
- You want custom responsive breakpoints or animations

### Prerequisites
- Layout name: PascalCase for file/export, kebab-case for DSL directive
- Know what content the layout expects (it receives `cards[]` from the DSL)

### Steps

#### 1. Create the layout component file

**Location**: `src/components/layouts/{LayoutName}.tsx`

**Contract**: The component receives `LayoutProps`:
```ts
interface LayoutProps {
    cards: CardDef[];           // All cards from the DSL
    badge?: string;             // Scene badge text
    layout?: string;            // Raw layout string
    maxRows?: number;           // Max rows hint
    meta?: Record<string, string>;  // Extra DSL directives
}
```

**Template:**
```tsx
import React from 'react';
import type { LayoutProps } from './types';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) =>
    `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

/**
 * MyLayout — Description of what this layout does.
 *
 * DSL usage:
 *   LAYOUT|layout:my-layout
 *   stat|Headline|Value|trend|status|subtitle|change
 *   info-card|icon|Title|Body|CTA
 *
 * Convention: First card = primary content, remaining = secondary sections.
 */
export const MyLayout: React.FC<LayoutProps> = ({ cards, badge }) => {
    if (!cards || cards.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-white/40 font-data">
                No content
            </div>
        );
    }

    const primary = cards[0];
    const secondary = cards.slice(1);

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Primary section */}
            <div className="flex-shrink-0 p-8 text-center">
                <h1 className="text-4xl font-hero font-bold" style={{ color: 'white' }}>
                    {primary.label || primary.title || primary.name || 'Untitled'}
                </h1>
                {primary.value && (
                    <p className="text-5xl font-hero font-black mt-4" style={{ color: C }}>
                        {primary.value}
                    </p>
                )}
            </div>

            {/* Secondary sections */}
            {secondary.length > 0 && (
                <div className="flex-1 grid grid-cols-2 gap-4 overflow-auto">
                    {secondary.map((card, i) => (
                        <div
                            key={i}
                            className="p-5 rounded-xl"
                            style={{
                                background: 'var(--theme-card-bg)',
                                border: '1px solid var(--theme-card-border)',
                            }}
                        >
                            <h3 className="font-data text-base font-bold" style={{ color: getColor(90) }}>
                                {card.title || card.label || card.name}
                            </h3>
                            <p className="font-voice text-sm mt-2" style={{ color: getColor(60) }}>
                                {card.body || card.detail || card.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyLayout;
```

#### 2. Register in layouts/index.ts

Open `src/components/layouts/index.ts` and add:

```ts
import { MyLayout } from './MyLayout';

// In LAYOUT_MAP:
'my-layout': MyLayout,
```

#### 3. No changes needed in parseDSL.ts or GridView.tsx

Layouts are resolved in `SceneManager.tsx` which imports `LAYOUT_MAP`. The DSL parser already passes the layout string through — `LAYOUT|layout:my-layout` becomes `layout: "layout:my-layout"` in the parsed output, and SceneManager extracts the name after `layout:`.

#### 4. Verify

Run `npm run build` to confirm no TypeScript errors.

### Layout Checklist
- [ ] File created in `src/components/layouts/`
- [ ] Implements `LayoutProps` interface from `./types`
- [ ] Named + default export
- [ ] Uses CSS custom properties for theme
- [ ] Uses `font-data` / `font-voice` / `font-hero` font classes
- [ ] Added to `LAYOUT_MAP` in `src/components/layouts/index.ts`
- [ ] Handles empty cards gracefully
- [ ] No additional npm dependencies
- [ ] `npm run build` passes

---

## DSL Format Reference

The DSL uses pipe-delimited lines wrapped in sentinels:

```
===CARDS===
LAYOUT|2x3
BADGE|Dashboard Title
stat|Revenue|$4.2M|↑12%|green|Q1 2026|+$450K
kpi-strip
  kpi|Users|12,450|↑8%
  kpi|Revenue|$1.2M|↑15%
info-card|chart|Performance|System running at peak efficiency|View Details
===END===
```

### Layout Directive Values

| Layout value | Renderer | Description |
|-------------|----------|-------------|
| `2x3` | GridView | 2 columns × 3 rows |
| `1-2-3` | GridView | Row 1: 1 col, Row 2: 2 cols, Row 3: 3 cols |
| `v:2-1` | GridView | Vertical columns: left 2 rows, right 1 |
| `m:hero-sidebar` | GridView | Mosaic CSS Grid template |
| `layout:hero` | HeroLayout | Full-page hero with feature tiles |
| `layout:my-custom` | LAYOUT_MAP | Any registered custom layout |

**Rules:**
- `LAYOUT|layout:<name>` → custom layout from LAYOUT_MAP
- `LAYOUT|<anything-else>` → GridView interprets it as grid/mosaic/vertical
- No LAYOUT directive → GridView auto-layout
- Parser is **case-insensitive** for all type names

### Card DSL
- First field = card type (kebab-case)
- Remaining fields = pipe-separated, positional
- Container cards have indented child lines with item prefix
- `—` or `-` for empty/placeholder fields

## Common Patterns

### Icons (SVG path-based)
Cards that support icons use a string key mapped to `ICON_PATHS` in the component.
Available: factory, car, battery, robot, chart, globe, shield, brain, bolt, fire, gear, people, money, rocket, sun.

### Responsive sizing
GridView handles all layout for cards. Cards should use `h-full` and flex to fill their cell.
Layouts have full control over their responsive behavior.

### Theme colors
```tsx
const C = 'var(--theme-chart-line)';                    // solid accent
const getColor = (opacity: number) =>
    `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
// Usage:
// getColor(90) — near-opaque text
// getColor(50) — mid-opacity
// getColor(10) — subtle background
// getColor(5)  — very faint bg
```
