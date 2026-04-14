import type { CardDef } from '@/types/cards';

/**
 * LayoutProps — The contract every custom layout component must accept.
 *
 * A layout receives ALL the scene data and renders the full content area.
 * It can use the cards array however it wants (or ignore it entirely and
 * use custom fields via the `meta` bag).
 *
 * Layouts replace GridView — they are NOT cards inside a grid.
 */
export interface LayoutProps {
    /** Array of card definitions from the DSL */
    cards: CardDef[];
    /** Scene badge text (e.g. "Q1 Report") */
    badge?: string;
    /** The raw layout string (e.g. "layout:hero") */
    layout?: string;
    /** Max rows hint (from GridView, may not apply to custom layouts) */
    maxRows?: number;
    /** Arbitrary metadata from extra DSL directives */
    meta?: Record<string, string>;
}
