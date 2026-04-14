// Re-export canonical CardDef from types/cards.ts (used by parseDSL + GridView)
export type { CardDef } from './cards';
import type { CardDef } from './cards';

export interface ComponentTemplate {
  id: string;
  name: string;
  type: string;
  schema: Record<string, unknown>;
  defaultData: Record<string, unknown>;
  uiConfig: Record<string, unknown>;
  isActive?: boolean;
  version?: number;
}

export interface SessionDefaults {
  avatarEnabled: boolean;
  avatarVisible: boolean;
  micMuted: boolean;
  volumeMuted: boolean;
  avatarAvailable?: boolean;
}

// Scene system types

export interface SceneData {
  id: string;             // Unique scene ID
  badge?: string;         // Context label
  title?: string;         // Main heading
  subtitle?: string;      // Subheading
  layout?: string;        // Layout code: "2x3", "1-2-3", etc.
  cards?: CardDef[];      // Array of card definitions
  maxRows?: number;       // Max rows (default 3)
  footerLeft?: string;    // Footer left text
  footerRight?: string;   // Footer right text
  timestamp: Date;        // When this scene was set
}
