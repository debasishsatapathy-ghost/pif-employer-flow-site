/**
 * parseDSL — Pipe-delimited card DSL parser
 * v2.0 · playground branch
 *
 * DSL format replaces the JSON cards array inside navigateToSection props.
 * ~80% fewer tokens than JSON. Parser is transparent to GridView — output
 * is identical shape to what JSON-based cards produce.
 *
 * SUPPORTED CARD TYPES (22):
 *   Flat:      stat · callout · person-card · relationship-card
 *              incident-card · info-card · country-card
 *   Container: kpi-strip · metric-list · bullet-list · alert · timeline
 *              checklist · pipeline · ranked-list · bar-chart · donut
 *              waterfall · line-chart · org-roster · delegation-card
 *              decision-card · data-cluster
 *
 * JSON FALLBACK (too complex for flat DSL):
 *   table · comparison-table · heatmap · risk-matrix
 *   stacked-bar · image-card
 *
 * ITEM PREFIXES:
 *   kpi · metric · bullet · alert-item · event · check · stage · rank
 *   bar · slice · fall · point · member · delegate · option · dmetric
 */

export { type CardDef } from '@/types/cards';
import type { CardDef } from '@/types/cards';

export interface ParsedDSL {
    layout?: string;
    badge?: string;
    cards: CardDef[];
}

// ── Sentinels — fuzzy regex tolerates spaces, casing, and markdown fences ────
// Handles: ===CARDS===, === CARDS ===, ===cards===, ```===CARDS===```, etc.
const SENTINEL_START_RE = /={3}\s*CARDS\s*={3}/i;
const SENTINEL_END_RE   = /={3}\s*END\s*={3}/i;

// ── Placeholder normalizer ───────────────────────────────────────────────────
// — / - / _ / empty → undefined so component default props kick in
function n(s: string | undefined): string | undefined {
    if (s === undefined) return undefined;
    const t = s.trim();
    return (t === '—' || t === '-' || t === '_' || t === '') ? undefined : t;
}

// Bool helper: "true" → true, anything else → false
function b(s: string | undefined): boolean {
    return n(s)?.toLowerCase() === 'true';
}

// Safe float: returns 0 on NaN
function f(s: string | undefined): number {
    return parseFloat(n(s) ?? '0') || 0;
}

// ── Schema table ─────────────────────────────────────────────────────────────
// Pipe counts used by the prompt to help the model self-validate.
export const DSL_SCHEMA: Record<string, { pipeCount: number; fields: string[] }> = {
    // Flat cards
    'stat':              { pipeCount: 6, fields: ['label','value','trend','status','subtitle','change'] },
    'callout':           { pipeCount: 4, fields: ['icon','value','label','body'] },
    'person-card':       { pipeCount: 6, fields: ['name','title','metric','metricLabel','status','detail'] },
    'relationship-card': { pipeCount: 8, fields: ['name','role','sentiment','trajectory','lastContact','daysSince','actionNeeded','riskLevel'] },
    'incident-card':     { pipeCount: 5, fields: ['severity','title','summary','impact','resolution'] },
    'info-card':         { pipeCount: 5, fields: ['icon','title','body','cta','ctaPhrase'] },
    'country-card':      { pipeCount: 7, fields: ['country','flag','revenue','employees','politicalRisk','relationshipHealth','keyContact'] },
    // Container headers
    'kpi-strip':         { pipeCount: 0, fields: [] },
    'metric-list':       { pipeCount: 1, fields: ['title'] },
    'bullet-list':       { pipeCount: 1, fields: ['title'] },
    'alert':             { pipeCount: 1, fields: ['title'] },
    'timeline':          { pipeCount: 1, fields: ['title'] },
    'checklist':         { pipeCount: 1, fields: ['title'] },
    'pipeline':          { pipeCount: 1, fields: ['title'] },
    'ranked-list':       { pipeCount: 2, fields: ['title','unit'] },
    'bar-chart':         { pipeCount: 2, fields: ['title','unit'] },
    'donut':             { pipeCount: 3, fields: ['title','centerLabel','centerValue'] },
    'waterfall':         { pipeCount: 2, fields: ['title','unit'] },
    'line-chart':        { pipeCount: 2, fields: ['title','unit'] },
    'org-roster':        { pipeCount: 1, fields: ['title'] },
    'delegation-card':   { pipeCount: 1, fields: ['title'] },
    'decision-card':     { pipeCount: 6, fields: ['title','subject','urgency','deadline','consequence','owner'] },
    'data-cluster':      { pipeCount: 1, fields: ['title'] },
    // Item lines
    'kpi':         { pipeCount: 5, fields: ['label','value','change','trend','status'] },
    'metric':      { pipeCount: 4, fields: ['label','value','delta','status'] },
    'bullet':      { pipeCount: 2, fields: ['text','status'] },
    'alert-item':  { pipeCount: 3, fields: ['severity','title','detail'] },
    'event':       { pipeCount: 3, fields: ['date','title','impact'] },
    'check':       { pipeCount: 3, fields: ['text','status','detail'] },
    'stage':       { pipeCount: 4, fields: ['label','status','detail','duration'] },
    'rank':        { pipeCount: 4, fields: ['label','value','displayValue','change'] },
    'bar':         { pipeCount: 3, fields: ['label','value','previousValue'] },
    'slice':       { pipeCount: 3, fields: ['label','percent','color'] },
    'fall':        { pipeCount: 3, fields: ['label','value','isTotal'] },
    'point':       { pipeCount: 2, fields: ['label','value'] },
    'member':      { pipeCount: 3, fields: ['name','role','badge'] },
    'delegate':    { pipeCount: 5, fields: ['task','owner','status','eta','detail'] },
    'option':      { pipeCount: 3, fields: ['label','recommender','recommended'] },
    'dmetric':     { pipeCount: 5, fields: ['label','value','trend','change','status'] },
    // ── New types (formerly "JSON fallback") ──
    'image-card':        { pipeCount: 3, fields: ['imageUrl','caption','subtitle'] },
    'calendar':          { pipeCount: 1, fields: ['title'] },
    'cal-event':         { pipeCount: 5, fields: ['title','date','time','duration','status'] },
    'risk-matrix':       { pipeCount: 1, fields: ['title'] },
    'risk':              { pipeCount: 3, fields: ['label','likelihood','impact'] },
    'stacked-bar':       { pipeCount: 2, fields: ['title','unit'] },
    'sbar':              { pipeCount: 4, fields: ['group','label','value','color'] },
    'table':             { pipeCount: 2, fields: ['title','headers (semicolon-delimited)'] },
    'trow':              { pipeCount: -1, fields: ['val1','val2','...'] },
    'comparison-table':  { pipeCount: 2, fields: ['title','headers (semicolon-delimited)'] },
    'crow':              { pipeCount: -1, fields: ['val1','val2','...'] },
    'heatmap':           { pipeCount: 2, fields: ['title','cols (semicolon-delimited)'] },
    'hrow':              { pipeCount: -1, fields: ['rowLabel','val1','val2','...'] },
};

// ── Container → item prefix map ───────────────────────────────────────────────
const CONTAINER_ITEM_PREFIXES: Record<string, string> = {
    'kpi-strip':       'kpi',
    'metric-list':     'metric',
    'bullet-list':     'bullet',
    'alert':           'alert-item',
    'timeline':        'event',
    'checklist':       'check',
    'pipeline':        'stage',
    'ranked-list':     'rank',
    'bar-chart':       'bar',
    'donut':           'slice',
    'waterfall':       'fall',
    'line-chart':      'point',
    'org-roster':      'member',
    'delegation-card': 'delegate',
    'decision-card':   'option',
    'data-cluster':    'dmetric',
    // New types
    'calendar':          'cal-event',
    'risk-matrix':       'risk',
    'stacked-bar':       'sbar',
    'table':             'trow',
    'comparison-table':  'crow',
    'heatmap':           'hrow',
};

const CONTAINER_TYPES   = new Set(Object.keys(CONTAINER_ITEM_PREFIXES));
const ALL_ITEM_PREFIXES = new Set(Object.values(CONTAINER_ITEM_PREFIXES));
const FLAT_TYPES        = new Set([
    'stat', 'callout', 'person-card', 'relationship-card',
    'incident-card', 'info-card', 'country-card', 'image-card',
]);

// ── Item parsers ──────────────────────────────────────────────────────────────
function parseItem(prefix: string, fields: string[]): Record<string, any> | null {
    switch (prefix) {
        case 'kpi': {
            const [label, value, change, trend, status] = fields;
            return { label: n(label), value: n(value), change: n(change), trend: n(trend), status: n(status) };
        }
        case 'metric': {
            // Fix #6: lenient 3-pipe detection.
            // Model sends metric|Label|Value|watch (3 pipes) → "watch" lands in delta slot, status=undefined, no dot.
            // If 3 fields and field[2] is a known status word, auto-shift: delta=undefined, status=field[2].
            const VALID_STATUSES = new Set(['good', 'bad', 'watch', 'info', 'neutral']);
            let [label, value, delta, status] = fields;
            if (fields.length === 3 && VALID_STATUSES.has((fields[2] ?? '').toLowerCase().trim())) {
                delta  = undefined as any;
                status = fields[2];
            }
            return { label: n(label) ?? '', value: n(value) ?? '', change: n(delta), status: n(status) };
        }
        case 'bullet': {
            const [text, status] = fields;
            return { text: n(text) ?? '', status: n(status) };
        }
        case 'alert-item': {
            const [severity, title, ...rest] = fields;
            return { severity: n(severity) ?? 'info', title: n(title) ?? '', detail: n(rest.join('|')) ?? '' };
        }
        case 'event': {
            const [date, title, ...rest] = fields;
            return { date: n(date) ?? '', title: n(title) ?? '', impact: n(rest.join('|')) };
        }
        case 'check': {
            const [text, status, ...rest] = fields;
            return { text: n(text) ?? '', status: n(status) ?? 'pending', detail: n(rest.join('|')) };
        }
        case 'stage': {
            const [label, status, detail, duration] = fields;
            return { label: n(label) ?? '', status: n(status) ?? 'pending', detail: n(detail), duration: n(duration) };
        }
        case 'rank': {
            const [label, valueStr, displayValue, change] = fields;
            return { label: n(label) ?? '', value: f(valueStr), displayValue: n(displayValue), change: n(change) };
        }
        case 'bar': {
            const [label, valueStr, prevStr] = fields;
            const item: Record<string, any> = { label: n(label) ?? '', value: f(valueStr) };
            if (n(prevStr)) item.previousValue = f(prevStr);
            return item;
        }
        case 'slice': {
            const [label, percentStr, color] = fields;
            const item: Record<string, any> = { label: n(label) ?? '', percent: f(percentStr) };
            if (n(color)) item.color = n(color);
            return item;
        }
        case 'fall': {
            const [label, valueStr, isTotalStr] = fields;
            const item: Record<string, any> = { label: n(label) ?? '', value: f(valueStr) };
            if (b(isTotalStr)) item.isTotal = true;
            return item;
        }
        case 'point': {
            const [label, valueStr] = fields;
            // If label is a plain number, treat as unlabelled data point
            const lbl = n(label);
            const val = f(valueStr !== undefined ? valueStr : label);
            if (lbl && isNaN(Number(lbl))) {
                return { label: lbl, value: val };
            }
            // No label — just the numeric value (label field is the value)
            return { value: n(valueStr) !== undefined ? val : f(label) };
        }
        case 'member': {
            const [name, role, badge] = fields;
            const item: Record<string, any> = { name: n(name) ?? '', role: n(role) ?? '' };
            if (n(badge)) item.badge = n(badge);
            return item;
        }
        case 'delegate': {
            const [task, owner, status, eta, ...rest] = fields;
            return {
                task: n(task) ?? '',
                owner: n(owner) ?? '',
                status: n(status) ?? 'waiting',
                eta: n(eta),
                detail: n(rest.join('|')),
            };
        }
        case 'option': {
            const [label, recommender, recommended] = fields;
            const item: Record<string, any> = { label: n(label) ?? '' };
            if (n(recommender)) item.recommender = n(recommender);
            if (b(recommended)) item.recommended = true;
            return item;
        }
        case 'dmetric': {
            const [label, value, trend, change, status] = fields;
            return { label: n(label) ?? '', value: n(value) ?? '', trend: n(trend), change: n(change), status: n(status) };
        }
        case 'cal-event': {
            const [title, date, time, duration, status] = fields;
            return { title: n(title) ?? '', date: n(date), time: n(time), duration: n(duration), status: n(status) };
        }
        case 'risk': {
            const [label, likelihood, impact] = fields;
            return { label: n(label) ?? '', likelihood: n(likelihood) ?? 'medium', impact: n(impact) ?? 'medium' };
        }
        case 'sbar': {
            const [group, label, valueStr, color] = fields;
            const item: Record<string, any> = { group: n(group) ?? '', label: n(label) ?? '', value: f(valueStr) };
            if (n(color)) item.color = n(color);
            return item;
        }
        case 'trow': {
            // All fields are cell values — return as array
            return { cells: fields.map(f => n(f) ?? '') };
        }
        case 'crow': {
            // Same as trow — comparison-table rows
            return { cells: fields.map(f => n(f) ?? '') };
        }
        case 'hrow': {
            // First field = row label, rest = cell values
            const [rowLabel, ...vals] = fields;
            return { rowLabel: n(rowLabel) ?? '', values: vals.map(v => f(v)) };
        }
        default:
            return null;
    }
}

// ── Flat card parser ──────────────────────────────────────────────────────────
function parseFlatCard(type: string, fields: string[], span?: 'full'): CardDef | null {
    const card: CardDef = { type };
    if (span) card.span = span;

    switch (type) {
        case 'stat': {
            const [label, value, trend, status, subtitle, change] = fields;
            return Object.assign(card, { label: n(label), value: n(value), trend: n(trend), status: n(status), subtitle: n(subtitle), change: n(change) });
        }
        case 'callout': {
            const [icon, value, label, ...rest] = fields;
            return Object.assign(card, { icon: n(icon), value: n(value), label: n(label), body: n(rest.join('|')) });
        }
        case 'person-card': {
            const [name, title, metric, metricLabel, status, ...rest] = fields;
            return Object.assign(card, { name: n(name) ?? '', title: n(title), metric: n(metric), metricLabel: n(metricLabel), status: n(status), detail: n(rest.join('|')) });
        }
        case 'relationship-card': {
            const [name, role, sentiment, trajectory, lastContact, daysSinceStr, actionNeeded, riskLevel] = fields;
            const item: CardDef = Object.assign(card, { name: n(name) ?? '', role: n(role), sentiment: n(sentiment) ?? 'watch', trajectory: n(trajectory), lastContact: n(lastContact), actionNeeded: n(actionNeeded), riskLevel: n(riskLevel) });
            if (n(daysSinceStr)) item.daysSince = parseInt(n(daysSinceStr) ?? '0', 10);
            return item;
        }
        case 'incident-card': {
            const [severity, title, summary, impact, ...rest] = fields;
            return Object.assign(card, { severity: n(severity) ?? 'info', title: n(title) ?? '', summary: n(summary), impact: n(impact), resolution: n(rest.join('|')) });
        }
        case 'info-card': {
            const [icon, title, body, cta, ctaPhrase] = fields;
            return Object.assign(card, { icon: n(icon), title: n(title) ?? '', body: n(body) ?? '', cta: n(cta), ctaPhrase: n(ctaPhrase) });
        }
        case 'country-card': {
            const [country, flag, revenue, employees, politicalRisk, relationshipHealth, keyContact] = fields;
            return Object.assign(card, { country: n(country) ?? '', flag: n(flag), revenue: n(revenue), employees: n(employees), politicalRisk: n(politicalRisk), relationshipHealth: n(relationshipHealth), keyContact: n(keyContact) });
        }
        case 'image-card': {
            const [imageUrl, caption, subtitle] = fields;
            return Object.assign(card, { imageUrl: n(imageUrl), caption: n(caption), subtitle: n(subtitle) });
        }
        default:
            return null;
    }
}

// ── Container extra metadata ──────────────────────────────────────────────────
// Some containers store more than just title/unit in their header line.
interface ContainerMeta {
    title?: string;
    unit?: string;
    centerLabel?: string;
    centerValue?: string;
    subject?: string;
    urgency?: string;
    deadline?: string;
    consequence?: string;
    owner?: string;
    headers?: string[];  // table, comparison-table, heatmap column headers
}

function parseContainerHeader(type: string, fields: string[]): ContainerMeta {
    switch (type) {
        case 'donut':
            return { title: n(fields[0]), centerLabel: n(fields[1]), centerValue: n(fields[2]) };
        case 'bar-chart':
        case 'waterfall':
        case 'line-chart':
        case 'ranked-list':
            return { title: n(fields[0]), unit: n(fields[1]) };
        case 'decision-card':
            return {
                title:       n(fields[0]),
                subject:     n(fields[1]),
                urgency:     n(fields[2]),
                deadline:    n(fields[3]),
                consequence: n(fields[4]),
                owner:       n(fields[5]),
            };
        case 'table':
        case 'comparison-table':
        case 'heatmap': {
            // Second field is semicolon-delimited headers/columns
            const title = n(fields[0]);
            const headerStr = n(fields[1]) ?? '';
            const headers = headerStr.split(';').map(h => h.trim()).filter(Boolean);
            return { title, headers };
        }
        case 'stacked-bar':
            return { title: n(fields[0]), unit: n(fields[1]) };
        default:
            return { title: n(fields[0]) };
    }
}

// ── Container flusher ─────────────────────────────────────────────────────────
function flushContainer(
    type: string,
    meta: ContainerMeta,
    items: Record<string, any>[],
    span: 'full' | undefined,
    cards: CardDef[]
): void {
    if (type !== 'kpi-strip' && items.length === 0) return;
    const card: CardDef = { type };
    if (span) card.span = span;
    if (meta.title) card.title = meta.title;

    switch (type) {
        case 'kpi-strip':
            card.items = items;
            break;
        case 'metric-list':
        case 'bullet-list':
        case 'checklist':
        case 'data-cluster':
            card.items = type === 'data-cluster' ? undefined : items;
            if (type === 'data-cluster') card.metrics = items;
            else card.items = items;
            break;
        case 'alert':
            card.alerts = items;
            break;
        case 'timeline':
            card.events = items;
            break;
        case 'pipeline':
            card.stages = items;
            break;
        case 'ranked-list':
            if (meta.unit) card.unit = meta.unit;
            card.items = items;
            break;
        case 'bar-chart':
            if (meta.unit) card.unit = meta.unit;
            card.bars = items;
            break;
        case 'donut':
            if (meta.centerLabel) card.centerLabel = meta.centerLabel;
            if (meta.centerValue) card.centerValue = meta.centerValue;
            card.segments = items;
            break;
        case 'waterfall':
            if (meta.unit) card.unit = meta.unit;
            card.segments = items;
            break;
        case 'line-chart': {
            if (meta.unit) card.unit = meta.unit;
            // If items have labels → { label: value } object; else → number[]
            const hasLabels = items.some(i => i.label !== undefined);
            if (hasLabels) {
                card.data = Object.fromEntries(items.map(i => [i.label ?? '', i.value]));
            } else {
                card.data = items.map(i => i.value);
            }
            break;
        }
        case 'org-roster':
            card.members = items;
            break;
        case 'delegation-card':
            card.items = items;
            break;
        case 'decision-card':
            if (meta.subject)     card.subject     = meta.subject;
            if (meta.urgency)     card.urgency     = meta.urgency;
            if (meta.deadline)    card.deadline    = meta.deadline;
            if (meta.consequence) card.consequence = meta.consequence;
            if (meta.owner)       card.owner       = meta.owner;
            card.options = items;
            break;
        case 'calendar':
            card.events = items;
            break;
        case 'risk-matrix':
            card.risks = items;
            break;
        case 'stacked-bar': {
            if (meta.unit) card.unit = meta.unit;
            // Group sbar items by their 'group' field → StackedGroup[]
            const groupMap = new Map<string, { label: string; value: number; color?: string }[]>();
            for (const item of items) {
                const groupLabel = item.group ?? 'default';
                if (!groupMap.has(groupLabel)) groupMap.set(groupLabel, []);
                const segment: any = { label: item.label, value: item.value };
                if (item.color) segment.color = item.color;
                groupMap.get(groupLabel)!.push(segment);
            }
            card.groups = Array.from(groupMap.entries()).map(([label, segments]) => ({ label, segments }));
            break;
        }
        case 'table': {
            if (meta.headers) card.headers = meta.headers;
            card.rows = items.map(i => i.cells);
            break;
        }
        case 'comparison-table': {
            if (meta.headers) card.headers = meta.headers;
            card.rows = items.map(i => ({ cells: i.cells }));
            break;
        }
        case 'heatmap': {
            const cols = meta.headers ?? [];
            card.cols = cols;
            card.rows = items.map(i => i.rowLabel);
            card.cells = items.map(i =>
                i.values.map((v: number, ci: number) => ({
                    label: cols[ci] ?? '',
                    value: v,
                }))
            );
            break;
        }
    }

    cards.push(card);
}

// ── Certified Layout Recipes → layout code mapping ───────────────────────────
// Imported from single source of truth. Also documented in glass-prompt.md.
import { CERTIFIED_LAYOUT_MAP } from '@/data/certifiedLayoutRecipes';

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseDSL(raw: string): ParsedDSL {
    // 1. Extract block between sentinels — fuzzy regex (see SENTINEL_START_RE / SENTINEL_END_RE).
    // Graceful degradation: if sentinels not found, try to parse the whole string as DSL content.
    const startMatch = SENTINEL_START_RE.exec(raw);
    const endMatch   = SENTINEL_END_RE.exec(raw);
    const startIdx   = startMatch ? startMatch.index + startMatch[0].length : -1;
    const endIdx     = endMatch   ? endMatch.index : -1;
    const content = (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx)
        ? raw.slice(startIdx, endIdx)
        : raw;

    // 2. Clean lines
    const lines = content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));

    const result: ParsedDSL = { cards: [] };

    // 3. Container accumulator
    let containerType: string | null    = null;
    let containerMeta: ContainerMeta   = {};
    let containerSpan: 'full' | undefined;
    let containerItems: Record<string, any>[] = [];

    const flush = () => {
        if (containerType) {
            flushContainer(containerType, containerMeta, containerItems, containerSpan, result.cards);
        }
        containerType  = null;
        containerMeta  = {};
        containerSpan  = undefined;
        containerItems = [];
    };

    for (const line of lines) {
        // Meta directives
        if (line.startsWith('layout:')) { result.layout = line.slice('layout:'.length).trim(); continue; }
        if (line.startsWith('badge:'))  { result.badge  = line.slice('badge:'.length).trim();  continue; }

        // Certified layout recipes → resolve to layout code
        if (line.startsWith('certified-layout:')) {
            const recipeName = line.slice('certified-layout:'.length).trim();
            const recipeLayout = CERTIFIED_LAYOUT_MAP[recipeName];
            if (recipeLayout) {
                result.layout = recipeLayout;
            } else {
                // Unknown recipe — log it, let GridView auto-layout handle fallback
                console.warn(`[parseDSL] Unknown certified layout: "${recipeName}"`);
            }
            continue;
        }

        // Optional span prefix
        let effectiveLine = line;
        let hasSpan = false;
        if (line.startsWith('span:')) {
            effectiveLine = line.slice('span:'.length);
            hasSpan = true;
        }

        const parts  = effectiveLine.split('|');
        const prefix = parts[0].toLowerCase().trim();
        const fields = parts.slice(1);

        // Item line for active container
        if (containerType
            && ALL_ITEM_PREFIXES.has(prefix)
            && CONTAINER_ITEM_PREFIXES[containerType] === prefix) {
            const item = parseItem(prefix, fields);
            if (item) containerItems.push(item);
            continue;
        }

        // Flat card
        if (FLAT_TYPES.has(prefix)) {
            flush();
            const card = parseFlatCard(prefix, fields, hasSpan ? 'full' : undefined);
            if (card) result.cards.push(card);
            continue;
        }

        // Container header
        if (CONTAINER_TYPES.has(prefix)) {
            flush();
            containerType  = prefix;
            containerMeta  = parseContainerHeader(prefix, fields);
            containerSpan  = hasSpan ? 'full' : undefined;
            containerItems = [];
            continue;
        }

        // Unknown — inform tele so the model knows what was lost
        console.warn(`[parseDSL] Unknown type: "${prefix}" — line skipped`);
    }

    flush();

    // After parsing, report any dropped lines to the model
    const allKnownTypes = new Set([...FLAT_TYPES, ...CONTAINER_TYPES, ...ALL_ITEM_PREFIXES,
        'layout', 'badge', 'certified-layout', 'span']);
    // Check was already done inline — the informTele fires from GridView for rendering issues.
    // Here we just return the clean result.
    return result;
}
