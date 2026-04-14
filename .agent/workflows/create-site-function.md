# Workflow: Create a New Site Function

## Purpose
Create a new **site function** — a frontend function that the voice agent can call via RPC during a conversation. Site functions let the agent control the website (change themes, scroll, navigate, toggle UI, fetch data, etc.).

## Architecture Overview

```
Agent (Python, LiveKit Cloud)
  │
  │ call_site_function(name="myFunc", args_json='{"key":"val"}')
  │
  ▼
LiveKit RPC "callSiteFunction"
  │
  ▼
Frontend (voice-session-store.ts)
  │
  │ window.__siteFunctions["myFunc"]({ key: "val" })
  │
  ▼
src/site-functions/myFunc.ts  ← default export function
  │
  │ return { success: true, result: ... }
  │
  ▼
Agent receives result as tool output
```

### Key files
| File | Role |
|------|------|
| `src/site-functions/{name}.ts` | Function implementation |
| `src/site-functions/register.ts` | Manifest + window registration |
| `src/components/voice/VoiceSessionProvider.tsx` | Calls `registerSiteFunctions()` on init |
| `src/lib/stores/voice-session-store.ts` | RPC handler `callSiteFunction` |

### How it works end-to-end
1. Developer creates a function file and adds it to the manifest in `register.ts`
2. `VoiceSessionProvider` calls `registerSiteFunctions()` on mount → installs functions on `window.__siteFunctions`
3. When a GitHub-connected site pushes, the discovery service scans `register.ts`, extracts metadata, and upserts to the database
4. For hosted (non-repo) sites, admin creates the function entry manually via the admin panel
5. On session creation, active site functions are included in dispatch metadata
6. Agent gets a `call_site_function` tool + prompt guidance listing available functions
7. Agent calls the tool → RPC fires → frontend executes → result returned to agent

---

## Steps

### 1. Create the function file

**Location**: `src/site-functions/{functionName}.ts`

**Naming**: camelCase filename matching the function name (e.g., `scrollToSection.ts`)

**Template**:

```typescript
/**
 * {functionName} — {one-line description}
 *
 * @param args.{param1} - {description}
 * @param args.{param2} - {description}
 *
 * Registered as window.__siteFunctions.{functionName}
 * The voice agent can call this via the callSiteFunction RPC.
 */
export default function {functionName}(
  args: { {param1}: {type1}; {param2}?: {type2} }
): { success: boolean; [key: string]: any } {
  const { {param1}, {param2} = {defaultValue} } = args;

  // ── Validate inputs ──────────────────────────────
  // Return early with { success: false } on invalid input
  // The agent sees this result — make error messages descriptive

  // ── Implementation ───────────────────────────────
  // DOM manipulation, localStorage, fetch calls, state changes, etc.
  // This runs in the browser — full access to document, window, etc.

  // ── Return result ────────────────────────────────
  // ALWAYS return an object with { success: boolean }
  // Include relevant data the agent might need to tell the user
  return { success: true, {param1} };
}
```

**Rules**:
- **Default export only** — the discovery service and `register.ts` expect `export default function`
- **Single args object** — always `(args: { ... })`, not positional parameters
- **Return `{ success: boolean }`** — the agent checks this to know if the call worked
- **Include descriptive data** in the return — the agent uses it to respond to the user
- **Handle errors gracefully** — wrap DOM/network calls in try/catch, return `{ success: false, error: "..." }`
- **No imports from the app** — site functions are standalone. Import from libraries or use `window`/`document` directly
- **Synchronous or async** — both work. Async functions are awaited by the RPC handler

### 2. Register in the manifest

**File**: `src/site-functions/register.ts`

Add the import and manifest entry:

```typescript
// At the top, add the import:
import {functionName} from './{functionName}';

// In siteFunctionManifest, add the entry:
export const siteFunctionManifest: Record<string, SiteFunctionEntry> = {
  // ... existing entries ...

  {functionName}: {
    fn: {functionName},
    description: '{Agent-facing description — be specific about what this does and when to use it}',
    schema: {
      type: 'object',
      properties: {
        {param1}: {
          type: '{json-schema-type}',
          description: '{What this parameter controls}',
        },
        {param2}: {
          type: '{json-schema-type}',
          enum: ['{val1}', '{val2}'],  // Use enum for fixed choices
          description: '{What this parameter controls}',
        },
      },
      required: ['{param1}'],  // Only truly required params
    },
    defaults: { {param2}: '{defaultValue}' },  // Optional: defaults for omitted args
  },
};
```

**Manifest field rules**:
- `fn` — reference to the imported function (not a string)
- `description` — **MANDATORY**. This is what the agent reads to decide when to call the function. Be specific: "Switch the website theme between light, dark, or system preference" is better than "Change theme"
- `schema` — JSON Schema for parameters. Optional but strongly recommended. Without it, the agent has to guess the argument format
- `defaults` — Default values for optional parameters. Applied by the frontend when the agent omits them

### 3. Verify registration

After adding the function, verify it works:

1. **Build check**: `npm run build` — TypeScript will catch type errors
2. **Runtime check**: Open the site, open browser console, run:
   ```javascript
   // Should list your function
   Object.keys(window.__siteFunctions)

   // Test it directly
   window.__siteFunctions.{functionName}({ {param1}: {testValue} })
   ```
3. **Agent check**: Start a voice session, ask the agent to use the function

### 4. Database entry (for hosted sites without GitHub)

If this is a hosted site (no GitHub repo), create the site function entry in the admin panel:

1. Go to `/admin/websites/{websiteId}` → Site Functions section
2. Click "Add Site Function"
3. Fill in:
   - **Name**: exact camelCase name matching `window.__siteFunctions` key
   - **Description**: same as manifest description
   - **Schema**: paste the JSON schema from the manifest
4. Save and ensure it's active

For GitHub-connected sites, this happens automatically via the discovery service on push.

---

## Examples

### Example: Scroll to a section

```typescript
// src/site-functions/scrollToSection.ts
/**
 * scrollToSection — Scroll the page to a named section.
 *
 * @param args.sectionId - The HTML id of the section to scroll to
 * @param args.behavior - 'smooth' or 'instant' scroll behavior
 */
export default function scrollToSection(
  args: { sectionId: string; behavior?: 'smooth' | 'instant' }
): { success: boolean; sectionId: string; error?: string } {
  const { sectionId, behavior = 'smooth' } = args;

  const element = document.getElementById(sectionId);
  if (!element) {
    return { success: false, sectionId, error: `Section "${sectionId}" not found on page` };
  }

  element.scrollIntoView({ behavior, block: 'start' });
  return { success: true, sectionId };
}
```

Manifest entry:
```typescript
scrollToSection: {
  fn: scrollToSection,
  description: 'Scroll the page to a specific section by its HTML id. Use when the user asks to see a particular part of the page.',
  schema: {
    type: 'object',
    properties: {
      sectionId: { type: 'string', description: 'The HTML id attribute of the target section' },
      behavior: { type: 'string', enum: ['smooth', 'instant'], description: 'Scroll animation style' },
    },
    required: ['sectionId'],
  },
  defaults: { behavior: 'smooth' },
},
```

### Example: Open a modal or panel

```typescript
// src/site-functions/openPanel.ts
/**
 * openPanel — Open a named UI panel or modal.
 *
 * @param args.panel - The panel identifier to open
 */
export default function openPanel(
  args: { panel: string }
): { success: boolean; panel: string; error?: string } {
  const { panel } = args;

  // Dispatch a custom event that your app's components listen for
  const event = new CustomEvent('open-panel', { detail: { panel } });
  window.dispatchEvent(event);

  return { success: true, panel };
}
```

### Example: Fetch and return data

```typescript
// src/site-functions/getCartItems.ts
/**
 * getCartItems — Return the current shopping cart contents.
 * The agent can use this to discuss cart items with the user.
 */
export default async function getCartItems(): Promise<{
  success: boolean;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
}> {
  try {
    const response = await fetch('/api/cart');
    if (!response.ok) {
      return { success: false, items: [], total: 0 };
    }
    const data = await response.json();
    return { success: true, items: data.items, total: data.total };
  } catch {
    return { success: false, items: [], total: 0 };
  }
}
```

Manifest entry (no parameters needed):
```typescript
getCartItems: {
  fn: getCartItems,
  description: 'Get the current shopping cart contents including item names, quantities, prices, and total. Use this when the user asks about their cart.',
  schema: { type: 'object', properties: {} },
},
```

---

## Common Patterns

### Reading data (no DOM change)
Functions can read state and return it to the agent without modifying anything. Useful for "what's in my cart", "what page am I on", "how many items selected", etc.

### DOM manipulation
Functions can add/remove classes, change attributes, scroll, show/hide elements. The result should confirm what changed.

### Custom events
For complex state changes that your app's React components manage, dispatch a `CustomEvent` and have your components listen for it. This keeps the site function decoupled from React internals.

### Async / network calls
Functions can be async. The RPC handler `await`s the result. Keep timeouts reasonable — the agent is waiting for the result before responding to the user.

### Validation
Always validate inputs before acting. Return `{ success: false, error: "descriptive message" }` so the agent can tell the user what went wrong.

---

## Checklist

- [ ] Created `src/site-functions/{functionName}.ts` with default export
- [ ] Added import to `src/site-functions/register.ts`
- [ ] Added manifest entry with `fn`, `description`, and `schema`
- [ ] `description` is specific and agent-friendly
- [ ] `schema` has proper `type`, `properties`, and `required`
- [ ] Function returns `{ success: boolean, ... }`
- [ ] Function handles errors (try/catch for DOM/network)
- [ ] `npm run build` succeeds
- [ ] Tested in browser console via `window.__siteFunctions.{name}({args})`
- [ ] (GitHub sites) Pushed to repo — discovery service will auto-detect
- [ ] (Hosted sites) Added entry in admin panel → Site Functions section

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Agent says "Unknown site function" | Function not active in DB or not in dispatch metadata | Check admin panel → Site Functions → ensure isActive=true |
| Function not on `window.__siteFunctions` | Missing from manifest or `registerSiteFunctions()` not called | Check register.ts import + manifest entry |
| Agent doesn't know the function exists | Not in dispatch metadata | Verify session creation route includes siteFunctions |
| "Needs Review" badge in admin | Source code changed after initial discovery | Click "Accept Source Values" in admin |
| Schema validation error in discovery | Missing description or invalid schema format | Ensure description is non-empty, schema is valid JSON Schema |
| Function works in console but not via agent | RPC handler error | Check browser console for "RPC callSiteFunction error" |
| Async function hangs | No timeout, waiting on failed network call | Add `AbortController` with timeout to fetch calls |
