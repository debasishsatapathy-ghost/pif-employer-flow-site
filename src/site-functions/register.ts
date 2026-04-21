/**
 * Site Functions Registration
 *
 * Registers all site functions on window.__siteFunctions so the voice agent
 * can invoke them via the callSiteFunction RPC.
 *
 * Convention:
 * - Each .ts file in src/site-functions/ (except register.ts, index.ts, types.ts)
 *   exports a default function
 * - The filename (camelCase) becomes the function name on window.__siteFunctions
 * - Functions receive (args: Record<string, any>) and return any
 *
 * Manifest:
 * - Each entry in `siteFunctionManifest` provides metadata alongside the function
 * - `description` is MANDATORY — used as the agent tool description
 * - `schema` is optional — JSON Schema for the function's parameters
 * - `defaults` is optional — default argument values when not provided by agent
 * - The discovery service extracts this manifest on deployment for validation
 */

import setTheme from './setTheme';
import showHiringOptions from './showHiringOptions';
import getHiringOptionResponse from './getHiringOptionResponse';
import suppressResponse from './suppressResponse';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SiteFunctionEntry = {
  /** The function implementation */
  fn: (args: any) => any;
  /** MANDATORY: Agent-facing description of what this function does */
  description: string;
  /** Optional: JSON Schema describing the function's input parameters */
  schema?: Record<string, any>;
  /** Optional: Default values for parameters when not provided by the agent */
  defaults?: Record<string, any>;
};

// ─── Manifest ───────────────────────────────────────────────────────────────

/**
 * Site function manifest — the single source of truth for all registered functions.
 *
 * Each key is the camelCase function name that the agent will use to call it.
 * The discovery service reads this manifest on deployment to extract metadata
 * and validate schemas.
 */
export const siteFunctionManifest: Record<string, SiteFunctionEntry> = {
  setTheme: {
    fn: setTheme,
    description:
      'Switch the website theme between light, dark, or system preference',
    schema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'system'],
          description: 'The theme to apply',
        },
      },
      required: ['theme'],
    },
    defaults: { theme: 'system' },
  },

  showHiringOptions: {
    fn: showHiringOptions,
    description:
      'Display hiring assistant option bubbles in the employer hiring overlay popup. ' +
      'Call this FIRST (before speaking) when the [HIRING_ASSISTANT] context is active — ' +
      'both on initial greeting and after responding to each option selection. ' +
      'Returns disableNewResponseCreation:true (HARD STOP).',
    schema: {
      type: 'object',
      properties: {
        options: {
          type: 'array',
          description: 'List of option bubbles to display',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Display label for the bubble' },
              value: { type: 'string', description: 'Optional machine-readable value' },
            },
            required: ['label'],
          },
        },
      },
      required: ['options'],
    },
    defaults: {
      options: [
        { label: 'Hiring Metrics',  value: 'hiring-metrics' },
        { label: 'Best Applicants', value: 'best-applicants' },
        { label: 'Market Trends',   value: 'market-trends' },
      ],
    },
  },

  getHiringOptionResponse: {
    fn: getHiringOptionResponse,
    description:
      'Get the scripted spoken response for a hiring dashboard option selection. ' +
      'Call this FIRST (before speaking) when [HIRING_ASSISTANT] user selects an option. ' +
      'The result contains a speakText field — speak that text VERBATIM, then call showHiringOptions.',
    schema: {
      type: 'object',
      properties: {
        option: {
          type: 'string',
          enum: ['hiring-metrics', 'best-applicants', 'market-trends'],
          description: 'The option value selected by the employer',
        },
      },
      required: ['option'],
    },
    defaults: { option: 'hiring-metrics' },
  },

  suppressResponse: {
    fn: suppressResponse,
    description:
      'Signals this agent turn is complete with no spoken response. ' +
      'Returns disableNewResponseCreation:true (HARD STOP). ' +
      'Call this when the agent role requires complete silence ' +
      '(e.g. [HOME_ASSISTANT_SILENT] context on the home dashboard).',
    schema: { type: 'object', properties: {} },
    defaults: {},
  },
};

// ─── Window registration ────────────────────────────────────────────────────

// Extend window type
declare global {
  interface Window {
    __siteFunctions: Record<string, (args: any) => any>;
  }
}

/**
 * Register all site functions on window.__siteFunctions.
 * Call this once on app initialization (e.g., in VoiceSessionProvider or layout).
 *
 * Only the `fn` from each manifest entry is registered on the window —
 * metadata (description, schema, defaults) is used by the discovery service,
 * not at runtime.
 */
export function registerSiteFunctions() {
  if (typeof window === 'undefined') return;

  window.__siteFunctions = {};
  for (const [name, entry] of Object.entries(siteFunctionManifest)) {
    window.__siteFunctions[name] = entry.fn;
  }
}
