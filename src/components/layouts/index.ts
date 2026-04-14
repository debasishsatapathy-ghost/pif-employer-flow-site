/**
 * Layout Registry
 *
 * Custom layouts are full-page renderers that replace GridView entirely.
 * They receive the same SceneData (cards, badge, title, etc.) but can
 * arrange content however they want — hero sections, split panes, forms,
 * landing pages, etc.
 *
 * To use a custom layout, the DSL sets LAYOUT|layout:<name>
 * e.g. LAYOUT|layout:hero or LAYOUT|layout:split-detail
 *
 * GridView grid layouts (2x3, 1-2-3, v:2-1, m:hero-sidebar) still work
 * and are handled by GridView as before.
 */

import type { LayoutProps } from './types';
import { HeroLayout } from './HeroLayout';

// ── Layout Map ──────────────────────────────────────────────────────────────
// Maps layout name → React component. Add new layouts here.
// Names are kebab-case, matched case-insensitively.

export const LAYOUT_MAP: Record<string, React.FC<LayoutProps>> = {
    'hero': HeroLayout,
    // Add more custom layouts here:
    // 'split-detail': SplitDetailLayout,
    // 'landing':      LandingLayout,
};

export type { LayoutProps } from './types';
