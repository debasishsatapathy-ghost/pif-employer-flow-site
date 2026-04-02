import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

const URGENCY_STYLE: Record<string, { color: string; bg: string }> = {
    critical: { color: '#ffffff', bg: '#ff4040' },
    high: { color: '#ffffff', bg: '#f59e0b' },
    normal: { color: '#ffffff', bg: '#38bdf8' },
};

interface Option {
    label: string;
    recommender?: string;
    recommended?: boolean;
}

interface DecisionCardProps {
    title?: string;
    subject: string;
    urgency?: 'critical' | 'high' | 'normal';
    deadline?: string;
    consequence?: string;
    options?: Option[];
    owner?: string;
    source?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
    title,
    subject,
    urgency = 'normal',
    deadline,
    consequence,
    options = [],
    owner,
    source,
}) => {
    const style = URGENCY_STYLE[urgency] || URGENCY_STYLE.normal;
    const { visible, overflow } = clampList(options, 3);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-1" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}

            {/* Subject */}
            <div className="font-data text-base md:text-base font-bold leading-tight mb-1" style={{ color: C }}>
                {subject}
            </div>

            {/* Urgency + Deadline Row */}
            <div className="flex items-center gap-2 mb-2">
                <span
                    className="font-data text-base md:text-base uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                    style={{ backgroundColor: style.bg, color: style.color }}
                >
                    {urgency}
                </span>
                {deadline && (
                    <span className="font-data text-base md:text-base" style={{ color: `${getColor(85)}` }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5 mr-0.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>{deadline}
                    </span>
                )}
            </div>

            {/* Options */}
            {visible.length > 0 && (
                <div className="flex flex-col gap-1 mb-2 flex-1 min-h-0 overflow-hidden">
                    {visible.map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            {opt.recommended ? (
                                <span className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M9 12l2 2 4-4" /></svg>
                                </span>
                            ) : (
                                <span className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                            )}
                            <span className="font-data text-base md:text-base leading-tight" style={{ color: C }}>
                                {opt.label}
                            </span>
                            {opt.recommender && (
                                <span className="font-voice text-base italic" style={{ color: `${getColor(60)}` }}>
                                    — {opt.recommender}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <OverflowPill count={overflow} label="more options" />

            {/* Consequence */}
            {consequence && (
                <div className="font-voice text-base md:text-base leading-tight mt-auto pt-1 border-t" style={{ color: `${getColor(85)}`, borderColor: `${getColor(8)}` }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5 mr-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>{consequence}
                </div>
            )}

            {/* Footer: owner + source */}
            {(owner || source) && (
                <div className="font-data text-base md:text-base mt-1 flex gap-2" style={{ color: `${getColor(70)}` }}>
                    {owner && <span>Owner: {owner}</span>}
                    {source && <span>Source: {source}</span>}
                </div>
            )}
        </div>
    );
};

export default DecisionCard;
