import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const STATUS_DOT: Record<string, string> = {
    good: '#22c55e',
    bad: '#ff4040',
    critical: '#ff4040',   // alias — Tele often sends 'critical' instead of 'bad'
    watch: '#f59e0b',
    neutral: 'rgba(255,255,255,0.25)',
};


interface MetricItem {
    label: string;
    value: string;
    status?: 'good' | 'bad' | 'watch' | 'critical' | 'neutral';
    change?: string;
}


interface MetricListProps {
    title?: string;
    items: MetricItem[];
}

export const MetricList: React.FC<MetricListProps> = ({ title, items = [] }) => {
    const { visible, overflow } = clampList(items, 6);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex flex-col gap-1 flex-1 justify-start min-h-0 overflow-hidden">
                {visible.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-[30%] shrink-0">
                            {/* Always render dot — neutral grey when no status given */}
                            <span className="w-2 h-2 rounded-full shrink-0 flex-shrink-0"
                                style={{
                                    backgroundColor: STATUS_DOT[m.status ?? ''] ?? STATUS_DOT.neutral,
                                    ...(m.status === 'bad' || m.status === 'critical' ? { animation: 'blink-dot 1.2s ease-in-out infinite' } : {}),
                                }} />

                            <span className="font-data text-base md:text-base uppercase tracking-wider font-bold truncate" style={{ color: `${getColor(88)}` }}>
                                {m.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-data text-base md:text-base font-bold truncate" style={{ color: `${getColor(90)}` }}>
                                {m.value}
                            </span>
                            {m.change && (
                                <span className="font-data text-base font-bold truncate" style={{ color: `${getColor(85)}` }}>
                                    {m.change}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <OverflowPill count={overflow} label="more" />
        </div>
    );
};

export default MetricList;
