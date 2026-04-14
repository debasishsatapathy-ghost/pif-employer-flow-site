/**
 * Certified Layout Recipes — Single Source of Truth
 *
 * Maps human-readable recipe names to GridView layout codes.
 * parseDSL imports this map for runtime resolution.
 *
 * ⚠️  Keep in sync with glass-prompt.md "The 10 Certified Layout Recipes" section.
 *     If you add/remove/rename a recipe here, update the prompt too.
 *
 * Recipe name → layout code:
 *   person-deep-dive     → v:1-3        (4 cards)
 *   incident-review      → m:hero-sidebar (4 cards)
 *   ops-dashboard        → m:dashboard  (6 cards)
 *   financial-overview   → 1-2-3        (6 cards)
 *   competitive-analysis → v:2-2        (4 cards)
 *   board-prep           → 3x3          (9 cards)
 *   product-showcase     → m:hero-sidebar (4 cards)
 *   risk-assessment      → m:t-layout   (4 cards)
 *   timeline-actions     → v:2-2        (4 cards)
 *   kpi-scan             → 1-3-3        (7 cards)
 */

export const CERTIFIED_LAYOUT_MAP: Record<string, string> = {
    'person-deep-dive':     'v:1-3',
    'incident-review':      'm:hero-sidebar',
    'ops-dashboard':        'm:dashboard',
    'financial-overview':   '1-2-3',
    'competitive-analysis': 'v:2-2',
    'board-prep':           '3x3',
    'product-showcase':     'm:hero-sidebar',
    'risk-assessment':      'm:t-layout',
    'timeline-actions':     'v:2-2',
    'kpi-scan':             '1-3-3',
};
