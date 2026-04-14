import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const STATUS_SVG: Record<string, { path: string; clr: string }> = {
    done: { path: 'M9 12l2 2 4-4', clr: '#22c55e' },
    pending: { path: 'M12 6a6 6 0 100 12 6 6 0 000-12z', clr: '#b45309' },
    failed: { path: 'M18 6L6 18M6 6l12 12', clr: '#ff4040' },
    blocked: { path: 'M5 3h14v14H5z', clr: '#6b7280' },
};

interface CheckItem { text: string; status: 'done' | 'pending' | 'failed' | 'blocked'; detail?: string; }

interface ChecklistCardProps {
    title?: string;
    items: CheckItem[];
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({ title, items = [] }) => {
    const { visible, overflow } = clampList(items, 6);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            <div className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden overflow-auto space-y-1">
                {visible.map((item, i) => {
                    const st = STATUS_SVG[item.status] || STATUS_SVG.pending;
                    return (
                        <div key={i} className="flex items-start gap-2 py-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={st.clr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                                <path d={st.path} />
                            </svg>
                            <div className="min-w-0">
                                <div className="font-data text-base md:text-base leading-tight" style={{ color: item.status === 'done' ? `${getColor(60)}` : C, textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>
                                    {item.text}
                                </div>
                                {item.detail && <div className="font-voice text-base leading-tight mt-0.5" style={{ color: `${getColor(85)}` }}>{item.detail}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <OverflowPill count={overflow} label="more" />
            <div className="font-data text-base mt-2" style={{ color: `${getColor(70)}` }}>
                {items.filter(i => i.status === 'done').length}/{items.length} complete
            </div>
        </div>
    );
};

export default ChecklistCard;
