---
name: agent-communication
description: "Use when the client asks to communicate with the voice agent — tellAgent, informAgent, askAgent, agentSay RPC methods. Triggers on: 'call tell_agent', 'use informAgent', 'send message to agent', 'notify the agent', 'ask the agent', 'update agent context', 'make the agent say', 'agent say'."
---

# Agent Communication Patterns — Mobeus Platform

Three RPC methods for client-side code to communicate with the voice agent.
When a client says "call tell_agent", "use inform_agent", "call ask_agent", etc.,
use the patterns below to implement it correctly.

---

## Overview

| Method | Chat bar | Response | LLM | Purpose |
|--------|----------|----------|-----|---------|
| `tellAgent` | User bubble visible | Yes | Yes | User action appears in chat + agent responds |
| `informAgent` | Nothing | No | No | Silently update agent context, no response |
| `askAgent` | Nothing | Yes | Yes | Trigger agent response, no user bubble shown |
| `agentSay` | Nothing | Yes (exact text) | No | Direct TTS — agent speaks exact phrase, no LLM |

---

## Frontend: How to Call (TypeScript / React)

All three are available on the Zustand store `useVoiceSessionStore`:

```tsx
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

// Inside a component:
const { tellAgent, informAgent, askAgent } = useVoiceSessionStore();

// or snake_case aliases work too:
const { tell_agent, inform_agent, ask_agent } = useVoiceSessionStore();
```

### tellAgent — user message appears in chat + triggers response

```tsx
// Shows a user chat bubble with the message, then agent responds out loud.
// Use for button clicks, form submissions, or anything the user "said".
await tellAgent('I want to schedule an appointment');
```

### informAgent — silent context injection, no response

```tsx
// Adds a system message to the agent's context without triggering a response.
// Nothing appears in the chat bar. Use for page navigations, state changes,
// or background context the agent should know about.
await informAgent('User navigated to the pricing page.');
await informAgent('Cart total is now $142.00 with 3 items.');
```

### askAgent — silent trigger, agent responds (via LLM)

```tsx
// Like informAgent: no user bubble in chat bar.
// Like tellAgent: agent DOES generate a spoken/text response.
// The message goes through the LLM, so the agent interprets and responds naturally.
await askAgent('The user has been idle for 30 seconds. Offer assistance.');
await askAgent('A form validation error occurred. Let the user know gently.');
```

### agentSay — direct TTS, no LLM

```tsx
// Agent speaks the EXACT phrase provided — no LLM interpretation.
// Goes straight to TTS, bypassing the language model entirely.
// Fastest option. Use for pre-written messages, notifications, or UI-driven speech.
await agentSay('Your order has been confirmed. Thank you!');
await agentSay('Welcome back! Click any product to learn more.');
```

---

## Direct RPC (without the store)

If you are not using the Zustand store, call LiveKit RPC directly:

```ts
import { Room } from 'livekit-client';

async function callAgent(room: Room, method: string, message: string) {
  const agent = [...room.remoteParticipants.values()]
    .find(p => p.identity.startsWith('agent'));
  if (!agent) return;

  const response = await room.localParticipant.performRpc({
    destinationIdentity: agent.identity,
    method,                              // see accepted names below
    payload: JSON.stringify({ message }),
  });
  return JSON.parse(response);
}

// All accepted method name formats:
callAgent(room, 'tellAgent',   message);  // or 'tell_agent'  or 'tell-agent'
callAgent(room, 'informAgent', message);  // or 'inform_agent' or 'inform-agent'
callAgent(room, 'askAgent',    message);  // or 'ask_agent'   or 'ask-agent'
callAgent(room, 'agentSay',    message);  // or 'agent_say'   or 'agent-say'
```

---

## Payload Schema

All three methods accept the same JSON payload:

```json
{ "message": "string — the text to send to the agent" }
```

All three return:

```json
{ "success": true }
// or on error:
{ "success": false, "error": "reason" }
```

---

## Backend: How It Works (Python — agent/main.py)

```
tellAgent   → session.generate_reply(instructions="The user clicked a UI element and said: {message}")
               (no user message added to chat_ctx — the UI adds the chat bubble client-side)

informAgent → current_agent.chat_ctx.add_message(role="system", content="[Context Update] {message}")
               current_agent.update_chat_ctx(chat_ctx)
               (no generate_reply call — context is updated silently)

askAgent    → session.generate_reply(instructions=message)
               (instructions are ephemeral — not stored in chat history — so no user bubble appears)

agentSay    → session.say(phrase, add_to_chat_ctx=False)
               (direct TTS — no LLM, no chat context — agent speaks the exact text)
```

---

## Naming Convention

Each RPC method is registered under **three aliases**. Any of these will work:

| Canonical | snake_case | kebab-case |
|-----------|-----------|------------|
| `tellAgent` | `tell_agent` | `tell-agent` |
| `informAgent` | `inform_agent` | `inform-agent` |
| `askAgent` | `ask_agent` | `ask-agent` |
| `agentSay` | `agent_say` | `agent-say` |

---

## Decision Guide

```
Does a user bubble need to appear in the chat bar?
  YES → tellAgent("What the user said or did")
  NO  →
    Does the agent need to respond (speak/reply)?
      YES →
        Should the agent interpret the message via LLM?
          YES → askAgent("What to trigger the agent with")
          NO  → agentSay("Exact phrase for the agent to speak")
      NO  → informAgent("Background context for the agent")
```

---

## Common Mistakes

- **Do NOT call `tellAgent` for background events** (page loads, timers, navigation).
  Use `informAgent` or `askAgent` for those. `tellAgent` is for user-initiated actions.

- **Do NOT call `askAgent` when you only want to update context** without the agent
  speaking. Use `informAgent` — it's silent on both sides.

- **The `message` field is required and must be non-empty.** All three handlers return
  `{ success: false, error: "Empty message" }` if the string is blank after trimming.

- **Snake_case aliases (`tell_agent`, `inform_agent`, `ask_agent`) are real methods**
  on the Zustand store — they forward directly to the camelCase versions. You can
  destructure them from the store just like `tellAgent`.

---

## Debugging

Enable observability mode in the browser console to see all agent communication:

```js
window.observability = true
```

All `tellAgent`, `informAgent`, `askAgent`, and `agentSay` calls will be logged with color-coded, collapsible console groups showing the message, response, and metadata. Disable with `window.observability = false`. Zero overhead when off.
