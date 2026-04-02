import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

const BAR_COLORS = [
    ['#60a5fa', '#3b82f6'],  // blue
    ['#34d399', '#10b981'],  // emerald
    ['#fbbf24', '#f59e0b'],  // amber
    ['#a78bfa', '#8b5cf6'],  // violet
    ['#f87171', '#ef4444'],  // red
    ['#38bdf8', '#0ea5e9'],  // sky
    ['#fb923c', '#f97316'],  // orange
    ['#2dd4bf', '#14b8a6'],  // teal
];

interface Bar {
    label: string;
    value: number;
    previousValue?: number;
}

interface BarChartProps {
    title?: string;
    bars: Bar[];
    unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ title, bars: rawBars = [], unit }) => {
    // Normalize — AI sometimes sends a single object instead of array
    const bars: Bar[] = (Array.isArray(rawBars) ? rawBars : [rawBars]).map((b: any) => ({
        ...b,
        value: typeof b.value === 'number' ? b.value : parseFloat(b.value) || 0,
    }));
    const { visible, overflow } = clampList(bars, 6);
    const maxRaw = Math.max(...bars.map(b => b.value));
    const max = maxRaw > 0 ? maxRaw : 1;
    const isEmpty = bars.length === 0 || maxRaw === 0;

    const fmt = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
        return n.toLocaleString();
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex flex-col gap-1 flex-1 justify-center min-h-0 overflow-hidden">
                {isEmpty ? (
                    <div className="flex items-center justify-center h-full" style={{ color: getColor(30) }}>
                        <span className="font-data text-base uppercase tracking-wider">No data</span>
                    </div>
                ) : visible.map((bar, i) => {
                    const pct = (bar.value / max) * 100;
                    const delta = bar.previousValue ? bar.value - bar.previousValue : null;
                    return (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="font-data text-base md:text-base w-14 sm:w-16 text-left truncate font-bold" style={{ color: `${getColor(85)}` }}>
                                {bar.label}
                            </span>
                            <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ backgroundColor: `${getColor(5)}` }}>
                                <div
                                    className="h-full rounded-sm transition-all duration-700"
                                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${BAR_COLORS[i % BAR_COLORS.length][0]}, ${BAR_COLORS[i % BAR_COLORS.length][1]})` }}
                                />
                            </div>
                            <span className="font-data text-base font-bold min-w-[36px] sm:min-w-[48px] text-right" style={{ color: `${getColor(90)}` }}>
                                {fmt(bar.value)}{unit ? ` ${unit}` : ''}
                            </span>
                            {delta !== null && delta !== 0 && (
                                <span className="font-data text-base font-bold min-w-[32px] sm:min-w-[40px]" style={{ color: delta > 0 ? '#22c55e' : '#ff4040' }}>
                                    {delta > 0 ? '+' : ''}{fmt(delta)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <OverflowPill count={overflow} label="more" />
        </div>
    );
};

export default BarChart;
