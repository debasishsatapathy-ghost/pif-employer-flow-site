import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface WaterfallSegment {
    label: string;
    value: number;
    isTotal?: boolean;
}

interface WaterfallCardProps {
    title?: string;
    segments: WaterfallSegment[];
    unit?: string;
}

export const WaterfallCard: React.FC<WaterfallCardProps> = ({ title, segments = [], unit = '' }) => {
    if (segments.length === 0) return null;

    const fmt = (n: number) => {
        const abs = Math.abs(n);
        if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
        if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
        return n.toString();
    };

    // Compute running totals
    let running = 0;
    const items = segments.map(s => {
        if (s.isTotal) {
            return { ...s, runningBefore: 0, runningAfter: running };
        }
        const before = running;
        running += s.value;
        return { ...s, runningBefore: before, runningAfter: running };
    });

    const maxVal = Math.max(...items.map(i => Math.max(Math.abs(i.runningBefore), Math.abs(i.runningAfter))), 1);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>
            )}
            <div className="flex flex-col gap-1.5 flex-1 justify-center min-h-0 overflow-hidden">
                {items.map((item, i) => {
                    const isPositive = item.value >= 0;
                    const isTotal = item.isTotal;
                    const barColor = isTotal ? '#60a5fa' : isPositive ? '#22c55e' : '#ff4040';
                    const pct = Math.abs(isTotal ? item.runningAfter : item.value) / maxVal * 60;
                    const sign = isTotal ? '' : isPositive ? '+' : '';

                    return (
                        <div key={i} className="flex items-center gap-2">
                            {/* Label */}
                            <span className="font-data text-base w-20 sm:w-24 text-left truncate font-bold uppercase" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                {item.label}
                            </span>
                            {/* Bar */}
                            <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: barColor, opacity: 0.85 }}
                                />
                            </div>
                            {/* Value */}
                            <span className="font-data text-base font-bold min-w-[52px] text-right" style={{ color: barColor }}>
                                {sign}{unit}{fmt(item.value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WaterfallCard;
