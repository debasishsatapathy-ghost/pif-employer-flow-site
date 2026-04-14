import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

const STATUS_DOT: Record<string, string> = {
    good: '#22c55e', bad: '#ff4040', watch: '#b45309',
};
const TREND_ARROW: Record<string, string> = { up: '▲', down: '▼', flat: '—' };
const TREND_CLR: Record<string, string> = { up: '#22c55e', down: '#ff4040', flat: '#6b7280' };

interface KPIItem {
    label: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'flat';
    status?: 'good' | 'bad' | 'watch';
}

interface KPIStripProps {
    items: KPIItem[];
}

export const KPIStrip: React.FC<KPIStripProps> = ({ items = [] }) => {
    const { visible, overflow } = clampList(items, 8);
    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-6">
                {visible.map((kpi, i) => (
                    <div key={i} className="flex flex-col gap-0.5 min-w-[80px] sm:min-w-[100px] md:flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-1">
                            {kpi.status && (
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                        backgroundColor: STATUS_DOT[kpi.status] || STATUS_DOT.good,
                                        ...(kpi.status === 'bad' ? { animation: 'blink-dot 1.2s ease-in-out infinite' } : {}),
                                    }}
                                />
                            )}
                            <span className="font-data text-base md:text-base uppercase tracking-[0.12em] truncate" style={{ color: `${getColor(85)}` }}>
                                {kpi.label}
                            </span>
                        </div>
                        <div className="font-hero text-xl md:text-2xl lg:text-3xl leading-none truncate" style={{ color: `${getColor(90)}` }}>
                            {kpi.value}
                        </div>
                        {kpi.trend && kpi.change && (
                            <div className="font-data text-base leading-tight font-semibold truncate" style={{ color: TREND_CLR[kpi.trend] }}>
                                {TREND_ARROW[kpi.trend]} {kpi.change}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <OverflowPill count={overflow} label="more KPIs" />
        </div>
    );
};

export default KPIStrip;
