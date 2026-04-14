import React, { useState, useEffect, useRef } from 'react';
import { SlideLayout } from '@/components/layout/SlideLayout';
import { useIsMobile } from '@/hooks/useIsMobile';
import { resolveFooters } from '@/utils/footerResolver';
import { informTele } from '@/utils/informTele';
import type { CardDef } from '@/types/cards';
import {
    // Core Data (9)
    KPIStrip, BarChart, DonutChart, LineChart, TableCard,
    MetricList, AlertCard, StatCard, CalloutCard,
    // Data Visualization (4)
    HeatmapCard, TimelineCard, WaterfallCard, StackedBarCard,
    // People & Org (2)
    PersonCard, OrgRoster,
    // Rich Content (4)
    ChecklistCard, InfoCard, BulletListCard, ImageCard,
    // Comparison (2)
    ComparisonTable, RankedListCard,
    // Operational (3)
    IncidentCard, PipelineCard, RiskMatrixCard,
    // Executive Action (2)
    DecisionCard, DelegationCard,
    // Cross-Domain Intelligence (4)
    RelationshipCard, CountryCard, DataClusterCard, CalendarCard,
} from '@/components/cards';

/* ═══════════════════════════════════════════════════════════
   GridView — Composable Grid Template (30 Card Types)
   
   A single template that accepts a layout code and an array
   of card definitions. The tele fills it dynamically for any
   executive perspective (CTO, CMO, CFO, HR, GC, AI, etc.).
   ═══════════════════════════════════════════════════════════ */

/* ═══ Types ═══ */

interface GridViewProps {
    badge?: string;
    layout?: string; // e.g. '2x3', '1-2', '3x2'
    cards?: CardDef[];
    maxRows?: number; // default 3 — certified slides can opt into 4
    onLogoClick?: () => void;
}

/* ═══ Card Renderer — 30 Card Types ═══ */

const CARD_MAP: Record<string, React.FC<any>> = {
    // Core Data (9)
    'kpi-strip': KPIStrip,
    'bar-chart': BarChart,
    'donut': DonutChart,
    'line-chart': LineChart,
    'table': TableCard,
    'metric-list': MetricList,
    'alert': AlertCard,
    'stat': StatCard,
    'callout': CalloutCard,
    // Data Visualization (4)
    'heatmap': HeatmapCard,
    'timeline': TimelineCard,
    'waterfall': WaterfallCard,
    'stacked-bar': StackedBarCard,
    // People & Organization (2)
    'person-card': PersonCard,
    'org-roster': OrgRoster,
    // Rich Content (4)
    'checklist': ChecklistCard,
    'info-card': InfoCard,
    'bullet-list': BulletListCard,
    'image-card': ImageCard,
    // Comparison (2)
    'comparison-table': ComparisonTable,
    'ranked-list': RankedListCard,
    // Operational (3)
    'incident-card': IncidentCard,
    'pipeline-card': PipelineCard,
    'pipeline': PipelineCard,       // alias — parseDSL emits 'pipeline', not 'pipeline-card'
    'risk-matrix': RiskMatrixCard,
    // Executive Action (2)
    'decision-card': DecisionCard,
    'delegation-card': DelegationCard,
    // Cross-Domain Intelligence (4)
    'relationship-card': RelationshipCard,
    'country-card': CountryCard,
    'data-cluster': DataClusterCard,
    'calendar': CalendarCard,
    // Aliases — common hallucinated type names
    'profile-roster': OrgRoster,
    'area-chart': LineChart,
    'progress': BarChart,
};

/* ═══ Card Size Tiers — flex-grow weights for row height distribution ═══ */

const CARD_SIZE: Record<string, number> = {
    // sm (compact) — strip only → flex-grow: 1
    'kpi-strip': 1,
    // md (standard) — stats, lists, moderate content → flex-grow: 2
    'stat': 2, 'callout': 2,
    'image-card': 2, 'person-card': 2,
    'alert': 2, 'metric-list': 2,
    'bullet-list': 2, 'info-card': 2,
    'data-cluster': 2, 'checklist': 2, 'org-roster': 2,
    'pipeline-card': 2, 'ranked-list': 2,
    'timeline': 2, 'calendar': 2,
    // lg (expansive) — charts, tables, maps → flex-grow: 3
    'bar-chart': 3, 'donut': 3, 'line-chart': 3, 'table': 3,
    'heatmap': 3, 'waterfall': 3, 'stacked-bar': 3,
    'comparison-table': 3, 'incident-card': 3, 'risk-matrix': 3,
    // Executive Action
    'decision-card': 2, 'delegation-card': 2,
    // Cross-Domain Intelligence
    'relationship-card': 2, 'country-card': 2,
};

function getRowWeight(rowCards: CardDef[]): number {
    if (rowCards.length === 0) return 2;
    // ?? 2 ensures unknown card types don't produce NaN
    const raw = Math.max(...rowCards.map(c => CARD_SIZE[c.type] ?? 2));
    return isNaN(raw) ? 2 : raw;
}

// Module-level dedup set for renderCard (prevents repeated informTele for same unknown type within a single render batch)
let _reportedUnknownTypes = new Set<string>();

/** Clamp weights so no content row gets more than 2× the height of the smallest content row.
 *  Excludes compact rows (weight 1 = kpi-strip) since they use flex: 0 0 auto. */
function clampRowWeights(weights: number[]): number[] {
    if (weights.length <= 1) return weights;
    const contentWeights = weights.filter(w => w > 1);
    if (contentWeights.length === 0) return weights;
    const minW = Math.min(...contentWeights);
    return weights.map(w => w <= 1 ? w : Math.min(w, minW * 2));
}

function renderCard(card: CardDef, index: number) {
    const Component = CARD_MAP[card.type];
    if (!Component) {
        console.warn(`[GridView] Unknown card type: ${card.type}`);
        return null;
    }
    // ── Card props resolution: supports both flat and nested formats ──
    // Flat (new, preferred):   { type, span?, label, value, ... }
    // Nested (old, certified): { type, span?, props: { label, value, ... } }
    // Strategy: merge both — nestedProps as base, flatProps override.
    // Certified slides use nested; LLM should use flat (saves ~3 tokens/card).
    const { type: _t, span: _s, borderless: _b, props: nestedProps, ...flatProps } = card;
    const effectiveProps = { ...(nestedProps || {}), ...flatProps };
    const content = <Component key={index} {...effectiveProps} />;
    // Card types that always render without the glass box wrapper
    const BORDERLESS = new Set(['kpi-strip']);
    // These card types get the glass border + bg but NO internal padding (flush fill)
    const FLUSH_ROUNDED = new Set(['image-card', 'alert']);
    if (BORDERLESS.has(card.type) || card.borderless) return content;
    if (FLUSH_ROUNDED.has(card.type)) {
        return (
            <div className="h-full overflow-hidden" style={{
                background: 'var(--theme-card-bg)',
                border: '1px solid var(--theme-card-border)',
                borderRadius: '0.75rem',
                backdropFilter: 'blur(var(--theme-card-blur))',
                animation: 'card-enter 0.5s ease both',
                animationDelay: `${index * 100}ms`,
            }}>
                {content}
            </div>
        );
    }
    return (
        <div className="card-glass h-full" style={{ animationDelay: `${index * 100}ms` }}>
            {content}
        </div>
    );
}

/* ═══ Layout Engine ═══ */

/**
 * Best-fit hybrid layout for a given card count.
 * Ranked by visual balance — returned when the requested layout doesn't match card count.
 */
const HYBRID_LAYOUTS: Record<number, string> = {
    1: '1',
    2: '1-1',
    3: '1-2',
    4: '1-3',
    5: '2-3',
    6: '1-2-3',
    7: '1-3-3',
    8: '2-3-3',
    9: '3-3-3',
};

/* ═══ Mosaic Templates ═══
 * Named CSS Grid Area templates for mixed-size tile layouts.
 * LLM sends layout: "m:hero-sidebar" → engine returns the grid definition.
 */
interface MosaicDef {
    areas: string;      // CSS grid-template-areas value
    columns: string;    // CSS grid-template-columns value
    rowsDef: string;    // CSS grid-template-rows value
    slots: number;      // expected card count
}

const MOSAIC_TEMPLATES: Record<string, MosaicDef> = {
    'hero-sidebar': {
        areas: '"hero side1" "hero side2" "hero side3"',
        columns: '2fr 1fr',
        rowsDef: '1fr 1fr 1fr',
        slots: 4,
    },
    'hero-footer': {
        areas: '"hero hero hero" "a b c"',
        columns: '1fr 1fr 1fr',
        rowsDef: '2fr 1fr',
        slots: 4,
    },
    'cinema': {
        areas: '"hero hero" "a b"',
        columns: '1fr 1fr',
        rowsDef: '2fr 1fr',
        slots: 3,
    },
    'split': {
        areas: '"left right"',
        columns: '1fr 1fr',
        rowsDef: '1fr',
        slots: 2,
    },
    't-layout': {
        areas: '"wide wide wide" "tall a a" "tall b b"',
        columns: '1fr 1fr 1fr',
        rowsDef: 'auto 1fr 1fr',
        slots: 4,
    },
    'quad-focus': {
        areas: '"focus focus side1" "focus focus side2" "bot1 bot2 side2"',
        columns: '1fr 1fr 1fr',
        rowsDef: '1fr 1fr 1fr',
        slots: 5,
    },
    'magazine': {
        areas: '"tall1 wide wide" "tall1 sm1 sm2"',
        columns: '1fr 1fr 1fr',
        rowsDef: '1fr 1fr',
        slots: 5,
    },
    'dashboard': {
        areas: '"kpi kpi kpi" "med1 med2 med2" "sm1 sm2 sm3"',
        columns: '1fr 1fr 1fr',
        rowsDef: 'auto 1fr 1fr',
        slots: 6,
    },
};

/** Layout mode: how cards are arranged */
type LayoutMode = 'row' | 'vertical' | 'mosaic';

interface ParsedLayout {
    mode: LayoutMode;
    gridClass: string;
    isHybrid: boolean;
    rows: number[];
    clampCount?: number;
    resolvedLayout?: string;
    // Vertical mode
    cols?: number[];
    // Mosaic mode
    mosaicTemplate?: MosaicDef;
    mosaicName?: string;
}

/**
 * Parses layout code into CSS grid classes.
 *
 * MODE PREFIXES:
 *   (none)  → Row mode (default) — cards fill horizontal rows
 *   "v:"    → Vertical mode — cards stack in columns left-to-right
 *   "m:"    → Mosaic mode — named CSS Grid Area template
 *
 * Row-mode layouts:
 *   Simple grids: "CxR" → C columns, R rows
 *   Hybrid layouts: "A-B-C" → row A has A cols, row B has B cols, …
 *
 * AUTO-DOWNGRADE: if slot count ≠ cardCount, the engine silently picks
 * the best-fit row layout. The mismatch is reported to the Tele.
 */
function parseLayout(layout: string, cardCount: number, maxRows: number = 3): ParsedLayout {

    // ── MOSAIC MODE: "m:hero-sidebar" ──
    if (layout.startsWith('m:')) {
        const templateName = layout.slice(2);
        const template = MOSAIC_TEMPLATES[templateName];
        if (template) {
            // Auto-downgrade if card count doesn't match mosaic slots
            if (cardCount > 0 && cardCount !== template.slots) {
                const bestLayout = HYBRID_LAYOUTS[cardCount] ?? (cardCount >= 9 ? '3-3-3' : '1-2-3');
                const bestRows = bestLayout.split('-').map(Number);
                return { mode: 'row', gridClass: '', isHybrid: true, rows: bestRows, resolvedLayout: bestLayout };
            }
            return {
                mode: 'mosaic',
                gridClass: '',
                isHybrid: false,
                rows: [],
                mosaicTemplate: template,
                mosaicName: templateName,
            };
        }
        // Unknown mosaic name — inform and fall back to row mode
        informTele(
            `[MOSAIC NOT FOUND] layout:"${layout}" — template "${templateName}" does not exist. ` +
            `Valid mosaic names: ${Object.keys(MOSAIC_TEMPLATES).join(', ')}. ` +
            `Falling back to auto row layout.`
        );
        // Fall through to row auto-detect below
    }

    // ── VERTICAL MODE: "v:2-1-3" ──
    if (layout.startsWith('v:')) {
        const colSpec = layout.slice(2);
        let cols = colSpec.split('-').map(Number).filter(n => n > 0);
        if (cols.length === 0) cols = [cardCount]; // single column fallback
        const expectedCount = cols.reduce((a, b) => a + b, 0);

        // Auto-downgrade if card count doesn't match
        if (cardCount > 0 && cardCount !== expectedCount) {
            // Try to redistribute into same number of columns
            const numCols = cols.length;
            const perCol = Math.floor(cardCount / numCols);
            const remainder = cardCount % numCols;
            cols = Array.from({ length: numCols }, (_, i) => perCol + (i < remainder ? 1 : 0));
        }

        return {
            mode: 'vertical',
            gridClass: '',
            isHybrid: false,
            rows: [],
            cols,
            resolvedLayout: `v:${cols.join('-')}`,
        };
    }

    // ── ROW MODE (default) ──

    // Hybrid layout: "1-2", "2-1", "1-2-1", etc.
    if (layout.includes('-')) {
        let rows = layout.split('-').map(Number);
        // Hard-clamp to maxRows
        if (rows.length > maxRows) {
            const overflow = rows.slice(maxRows - 1).reduce((a, b) => a + b, 0);
            rows = [...rows.slice(0, maxRows - 1), overflow];
        }
        const expectedCount = rows.reduce((a, b) => a + b, 0);

        // AUTO-DOWNGRADE: if card count doesn't match, silently pick best-fit
        if (cardCount > 0 && cardCount !== expectedCount) {
            const bestLayout = HYBRID_LAYOUTS[cardCount] ?? (cardCount >= 9 ? '3-3-3' : '1-2-3');
            const bestRows = bestLayout.split('-').map(Number);
            return { mode: 'row', gridClass: '', isHybrid: true, rows: bestRows, resolvedLayout: bestLayout };
        }

        return { mode: 'row', gridClass: '', isHybrid: true, rows };
    }

    // Simple grid: "CxR"
    const match = layout.match(/^(\d)x(\d)$/);
    if (match) {
        const cols = parseInt(match[1]);
        const rows = parseInt(match[2]);
        const colClass = cols === 1 ? 'grid-cols-1'
            : cols === 2 ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        const clampCount = cols * rows;
        return { mode: 'row', gridClass: colClass, isHybrid: false, rows: [], clampCount };
    }

    // Fallback: auto-detect based on card count
    const autoCols = cardCount <= 2 ? 1 : cardCount <= 4 ? 2 : 3;
    const colClass = autoCols === 1 ? 'grid-cols-1'
        : autoCols === 2 ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return { mode: 'row', gridClass: colClass, isHybrid: false, rows: [], clampCount: undefined };
}

/* ═══ Main Component ═══ */

const C = '#443e44';

/* ═══ Skeleton Shimmer — 250ms loading state ═══ */
const CardSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
    <div
        className="h-full rounded-xl overflow-hidden"
        style={{
            background: 'var(--theme-card-bg, rgba(255,255,255,0.04))',
            border: '1px solid var(--theme-card-border, rgba(255,255,255,0.06))',
            animationDelay: `${delay}ms`,
        }}
    >
        <div className="h-full w-full animate-pulse" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
    </div>
);

export const GridView: React.FC<GridViewProps> = ({
    badge,
    layout = '2x2',
    cards = [],
    maxRows = 3,
    onLogoClick,
}) => {
    const isMobile = useIsMobile();
    const { mode, gridClass, isHybrid, rows, clampCount, resolvedLayout, cols, mosaicTemplate, mosaicName } = parseLayout(layout, cards.length, maxRows);

    // For CxR simple grids, clip cards to exactly cols×rows to prevent viewport overflow
    const displayCards = clampCount != null ? cards.slice(0, clampCount) : cards;

    // Layout mismatch validation — moved to useEffect to avoid side effects during render
    // Uses a ref so the same layout:count combo doesn't fire repeatedly, but resets when layout/cards change
    const lastReportedMismatchRef = useRef<string>('');

    useEffect(() => {
        const currentKey = `${layout}:${cards.length}`;
        if (currentKey === lastReportedMismatchRef.current) return;

        // Hybrid layout mismatch
        if (isHybrid && rows.length > 0 && cards.length > 0) {
            const originalRows = layout.includes('-') ? layout.split('-').map(Number) : rows;
            const expectedCount = originalRows.reduce((a, b) => a + b, 0);
            if (cards.length !== expectedCount) {
                lastReportedMismatchRef.current = currentKey;
                informTele(
                    `[LAYOUT MISMATCH — AUTO-FIXED] layout:"${layout}" expects ${expectedCount} card(s) ` +
                    `but received ${cards.length}. ` +
                    `The grid auto-adjusted to "${resolvedLayout ?? layout}" to avoid blank holes. ` +
                    `Next time: send exactly ${HYBRID_LAYOUTS[cards.length] ? `layout:"${HYBRID_LAYOUTS[cards.length]}"` : `${cards.length} cards`} ` +
                    `to match your card count. Layout card counts: 1→"1x1", 2→"1-1", 3→"1-2", 4→"1-3", 5→"2-3", 6→"1-2-3", 7→"1-3-3", 8→"2-3-3", 9→"3x3".`
                );
            }
        }

        // Simple CxR grid mismatch
        if (!isHybrid && clampCount != null && cards.length > 0 && cards.length !== clampCount) {
            lastReportedMismatchRef.current = currentKey;
            const diff = cards.length - clampCount;
            informTele(
                `[LAYOUT MISMATCH] layout:"${layout}" is a ${clampCount}-slot grid but received ${cards.length} card(s). ` +
                (diff < 0
                    ? `${Math.abs(diff)} slot(s) will appear as BLANK HOLES. ` +
                      `Fix: add ${Math.abs(diff)} more card(s), or switch to a smaller layout.`
                    : `${diff} card(s) are SILENTLY DROPPED. ` +
                      `Fix: remove ${diff} card(s) or switch to a larger layout.`)
            );
        }

        // Unknown card type validation
        const unknownTypes = cards
            .map(c => c.type)
            .filter(t => !CARD_MAP[t])
            .filter((t, i, arr) => arr.indexOf(t) === i); // unique
        if (unknownTypes.length > 0) {
            // Clear and reset so new slides can re-report
            _reportedUnknownTypes = new Set<string>(unknownTypes);
            informTele(
                `[UNKNOWN CARD TYPE] ${unknownTypes.map(t => `"${t}"`).join(', ')} — rendered as blank slot(s). ` +
                `Check spelling. Valid: stat, callout, kpi-strip, metric-list, bullet-list, ` +
                `bar-chart, donut, timeline, checklist, pipeline, ranked-list, person-card, alert, ` +
                `info-card, table, incident-card, relationship-card, country-card, image-card.`
            );
        }
    }, [layout, cards.length, isHybrid, rows, clampCount, resolvedLayout]);

    const [showSkeleton, setShowSkeleton] = useState(true);
    const { left: footerLeft, right: footerRight } = resolveFooters(badge);
    const cardsKey = useRef(displayCards.map(c => c.type).join(','));

    useEffect(() => {
        // When cards change, show skeleton for 250ms
        const newKey = displayCards.map(c => c.type).join(',');
        if (newKey !== cardsKey.current) {
            cardsKey.current = newKey;
            setShowSkeleton(true);
        }
        const timer = setTimeout(() => setShowSkeleton(false), 250);
        return () => clearTimeout(timer);
    }, [displayCards]);

    /* ═══ EMPTY CARDS GUARD (fix #10) ═══ */
    if (displayCards.length === 0) {
        return (
            <SlideLayout badge={badge} footerLeft={footerLeft || ''} footerRight={footerRight || ''} onLogoClick={onLogoClick}>
                <div className="flex-1 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    <span className="font-data text-base uppercase tracking-widest">Awaiting data…</span>
                </div>
            </SlideLayout>
        );
    }

    /* ═══ MOBILE: Single-column scrollable stack ═══ */
    if (isMobile) {
        return (
            <SlideLayout
                badge={badge}
                footerLeft={footerLeft || ""}
                footerRight={footerRight || ""}
                onLogoClick={onLogoClick}
            >
                <div className="relative flex flex-col gap-3 pb-4">
                    {/* Nav-pending skeleton overlay — always in DOM, shown via body.tele-nav-pending CSS */}
                    <div
                        className="nav-skeleton-overlay absolute inset-0 z-20 flex flex-col gap-3"
                        style={{ pointerEvents: 'none' }}
                    >
                        {displayCards.map((card, i) => (
                            <div key={`${card.type}-${i}`} className="w-full" style={{ minHeight: '120px' }}>
                                <CardSkeleton delay={i * 40} />
                            </div>
                        ))}
                    </div>
                    {showSkeleton
                        ? displayCards.map((card, i) => (
                            <div key={`${card.type}-${i}`} className="w-full" style={{ minHeight: '120px' }}>
                                <CardSkeleton delay={i * 50} />
                            </div>
                        ))
                        : displayCards.map((card, i) => (
                            <div key={`${card.type}-${i}`} className="w-full" style={{ minHeight: card.type === 'kpi-strip' ? 'auto' : '120px' }}>
                                {renderCard(card, i)}
                            </div>
                        ))
                    }
                </div>
            </SlideLayout>
        );
    }

    /* ═══ DESKTOP RENDER ═══ */

    /* ── Render helper: Vertical columns ── */
    const renderVerticalLayout = () => {
        if (!cols || cols.length === 0) return null;
        let cardIndex = 0;
        let globalIndex = 0;
        const colGroups = cols.map(count => {
            const group = displayCards.slice(cardIndex, cardIndex + count);
            cardIndex += count;
            return group;
        });
        return (
            <div
                className="flex-1 grid gap-3 md:gap-4 min-h-0"
                style={{
                    gridTemplateColumns: cols.map(() => '1fr').join(' '),
                    gridTemplateRows: '1fr',
                    height: '100%',
                }}
            >
                {colGroups.map((colCards, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-3 md:gap-4 min-h-0 h-full">
                        {colCards.map((card, ci) => {
                            const seqIndex = globalIndex++;
                            return (
                                <div key={`${card.type}-${ci}`} className="min-h-0 flex-1">
                                    {renderCard(card, seqIndex)}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Render helper: Mosaic grid areas ── */
    const renderMosaicLayout = () => {
        if (!mosaicTemplate) return null;
        // Extract unique area names in order from the areas string
        const areaNames = mosaicTemplate.areas
            .replace(/"/g, '')
            .split(/\s+/)
            .filter((v, i, a) => a.indexOf(v) === i); // unique, in order
        return (
            <div
                className="flex-1 min-h-0"
                style={{
                    display: 'grid',
                    gridTemplateAreas: mosaicTemplate.areas,
                    gridTemplateColumns: mosaicTemplate.columns,
                    gridTemplateRows: mosaicTemplate.rowsDef,
                    gap: 'clamp(0.75rem, 1vw, 1rem)',
                    height: '100%',
                }}
            >
                {areaNames.map((areaName, i) => {
                    const card = displayCards[i];
                    if (!card) return <div key={areaName} style={{ gridArea: areaName }} />;
                    return (
                        <div
                            key={`${card.type}-${i}`}
                            className="min-h-0 h-full"
                            style={{ gridArea: areaName }}
                        >
                            {renderCard(card, i)}
                        </div>
                    );
                })}
            </div>
        );
    };

    /* ── Render helper: Row layout (existing hybrid + simple) ── */
    const renderRowLayout = () => {
        if (isHybrid) {
            return (
                <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
                    {(() => {
                        let cardIndex = 0;
                        let globalIndex = 0;
                        const allRowCards = rows.map(colCount => {
                            const rc = displayCards.slice(cardIndex, cardIndex + colCount);
                            cardIndex += colCount;
                            return rc;
                        });
                        const rawWeights = allRowCards.map(rc => getRowWeight(rc));
                        const clampedWeights = clampRowWeights(rawWeights);

                        return allRowCards.map((rowCards, rowIndex) => {
                            if (rowCards.length === 0) return null;

                            const effectiveCols = Math.min(rows[rowIndex], rowCards.length);
                            const colCls = effectiveCols === 1 ? 'grid-cols-1'
                                : effectiveCols === 2 ? 'grid-cols-1 md:grid-cols-2'
                                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

                            const rowWeight = clampedWeights[rowIndex];

                            const isCompactRow = rowCards.every(c => c.type === 'kpi-strip');
                            const isSemiCompact = !isCompactRow && rowCards.every(c =>
                                (c.type === 'callout' || c.type === 'stat') &&
                                !c.props?.body && !c.props?.subtitle
                            );
                            const flexStyle = isCompactRow
                                ? '0 0 auto'
                                : isSemiCompact
                                    ? '1 1 0%'
                                    : `${rowWeight} 1 0%`;

                            return (
                                <div key={rowIndex} className={`grid ${colCls} gap-3 md:gap-4 min-h-0`}
                                    style={{ flex: flexStyle }}>
                                    {rowCards.map((card, ci) => {
                                        const useFullSpan = card.span === 'full' && rowCards.length === 1;
                                        const seqIndex = globalIndex++;
                                        return (
                                            <div
                                                key={`${card.type}-${ci}`}
                                                className={`min-h-0 h-full ${useFullSpan ? 'col-span-full' : ''}`}
                                            >
                                                {renderCard(card, seqIndex)}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        });
                    })()}
                </div>
            );
        }
        // Simple grid layout
        return (
            <div className={`grid ${gridClass} gap-3 md:gap-4 flex-1 min-h-0`}
                style={{ gridAutoRows: '1fr', alignItems: 'stretch' }}>
                {displayCards.map((card, i) => (
                    <div
                        key={`${card.type}-${i}`}
                        className={`min-h-0 h-full ${card.span === 'full' ? 'col-span-full' : ''}`}
                    >
                        {renderCard(card, i)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <SlideLayout
            badge={badge}
            footerLeft={footerLeft || ""}
            footerRight={footerRight || ""}
            onLogoClick={onLogoClick}
        >
            <div className="relative grid-container flex flex-col h-full gap-3 md:gap-4">

                {/* ── Nav-pending skeleton overlay ── */}
                <div
                    className="nav-skeleton-overlay absolute inset-0 z-20 flex flex-col gap-3 md:gap-4"
                    style={{ pointerEvents: 'none' }}
                >
                    {isHybrid ? (
                        rows.map((colCount, rowIndex) => {
                            const colCls = colCount === 1 ? 'grid-cols-1'
                                : colCount === 2 ? 'grid-cols-1 md:grid-cols-2'
                                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
                            const rowCards = displayCards.slice(
                                rows.slice(0, rowIndex).reduce((a, b) => a + b, 0),
                                rows.slice(0, rowIndex).reduce((a, b) => a + b, 0) + colCount
                            );
                            if (rowCards.length === 0) return null;
                            return (
                                <div key={rowIndex} className={`grid ${colCls} gap-3 md:gap-4 min-h-0 flex-1`}>
                                    {rowCards.map((card, ci) => (
                                        <div key={`${card.type}-${ci}`} className="min-h-0 h-full">
                                            <CardSkeleton delay={(rowIndex * 3 + ci) * 40} />
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    ) : (
                        <div className={`grid ${gridClass} gap-3 md:gap-4 flex-1 min-h-0`}
                            style={{ gridAutoRows: '1fr', alignItems: 'stretch' }}>
                            {displayCards.map((card, i) => (
                                <div key={`${card.type}-${i}`} className={`min-h-0 h-full ${card.span === 'full' ? 'col-span-full' : ''}`}>
                                    <CardSkeleton delay={i * 40} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showSkeleton ? (
                    <div className={`grid ${gridClass} gap-3 md:gap-4 flex-1 min-h-0`}
                        style={{ gridAutoRows: '1fr', alignItems: 'stretch' }}>
                        {displayCards.map((card, i) => (
                            <div key={`${card.type}-${i}`} className={`min-h-0 h-full ${card.span === 'full' ? 'col-span-full' : ''}`}>
                                <CardSkeleton delay={i * 50} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {mode === 'vertical' && renderVerticalLayout()}
                        {mode === 'mosaic' && renderMosaicLayout()}
                        {mode === 'row' && renderRowLayout()}
                    </>
                )}
            </div>
        </SlideLayout>
    );
};

export default GridView;
