import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const SEV_CLR: Record<string, { bg: string; border: string; text: string }> = {
    critical: { bg: '#b91c1c10', border: '#ff4040', text: '#ff4040' },
    warning: { bg: '#b4530910', border: '#b45309', text: '#b45309' },
    info: { bg: '#60a5fa10', border: '#60a5fa', text: '#60a5fa' },
    resolved: { bg: '#0a7c4210', border: '#22c55e', text: '#22c55e' },
};

interface IncidentEvent { time: string; description: string; }

interface IncidentCardProps {
    severity: 'critical' | 'warning' | 'info' | 'resolved';
    title: string;
    summary?: string;
    timeline?: IncidentEvent[];
    impact?: string;
    resolution?: string;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ severity, title, summary, timeline = [], impact, resolution }) => {
    const sev = SEV_CLR[severity] || SEV_CLR.info;
    const { visible: visibleTimeline, overflow } = clampList(timeline, 4);
    return (
        <div className="flex flex-col h-full gap-2 rounded-sm p-2 border-l-2" style={{ backgroundColor: sev.bg, borderColor: sev.border }}>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sev.border, ...(severity === 'critical' ? { animation: 'blink-dot 1.2s ease-in-out infinite' } : {}) }} />
                <span className="font-data text-base uppercase tracking-wider font-bold" style={{ color: sev.text }}>{severity}</span>
            </div>
            <h3 className="font-data text-base md:text-base font-bold" style={{ color: `${getColor(90)}` }}>{title}</h3>
            {summary && <p className="font-voice text-base md:text-base leading-relaxed" style={{ color: `${getColor(85)}` }}>{summary}</p>}
            {visibleTimeline.length > 0 && (
                <div className="space-y-1 ml-1">
                    {visibleTimeline.map((t, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="font-data text-base md:text-base shrink-0 mt-0.5 font-bold" style={{ color: sev.text }}>{t.time}</span>
                            <span className="font-voice text-base md:text-base leading-tight" style={{ color: `${getColor(85)}` }}>{t.description}</span>
                        </div>
                    ))}
                </div>
            )}
            <OverflowPill count={overflow} label="more" />
            {impact && (
                <div className="font-data text-base md:text-base px-2 py-1 rounded-sm" style={{ backgroundColor: `${getColor(2)}`, color: `${getColor(85)}` }}>
                    Impact: {impact}
                </div>
            )}
            {resolution && <div className="font-data text-base italic" style={{ color: sev.text }}>Resolution: {resolution}</div>}
        </div>
    );
};

export default IncidentCard;
