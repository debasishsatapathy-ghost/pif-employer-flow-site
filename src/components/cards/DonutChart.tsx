import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface Segment {
    label: string;
    percent: number;
    previousPercent?: number;
    color?: string;
}

interface DonutChartProps {
    title?: string;
    segments: Segment[];
    centerLabel?: string;
    centerValue?: string;
}

const defaultColors = [C, '#ef4444', '#6b7280', '#9ca3af', '#d1d5db'];

export const DonutChart: React.FC<DonutChartProps> = ({ title, segments: rawSegments = [], centerLabel, centerValue }) => {
    // Normalize — clamp percents so they always sum to exactly 100
    const total = rawSegments.reduce((s, seg) => s + (Number(seg.percent) || 0), 0);
    const segments: Segment[] = rawSegments.map(seg => ({
        ...seg,
        percent: total > 0 ? (Number(seg.percent) || 0) * 100 / total : 0,
    }));
    const r = 50, cx = 60, cy = 60, sw = 12;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex-1 flex items-center min-h-0 overflow-hidden justify-center gap-4 min-h-0 overflow-hidden">
                <svg viewBox="0 0 120 120" className="h-full max-h-[140px] w-auto shrink-0">
                    {segments.map((seg, i) => {
                        const dash = (seg.percent / 100) * circ;
                        const gap = circ - dash;
                        const el = (
                            <circle
                                key={i}
                                cx={cx} cy={cy} r={r}
                                fill="none"
                                stroke={seg.color || defaultColors[i % defaultColors.length]}
                                strokeWidth={sw}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={-offset}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        );
                        offset += dash;
                        return el;
                    })}
                    {(centerValue || centerLabel) && (
                        <>
                            {centerValue && (
                                <text x={cx} y={centerLabel ? cy - 4 : cy} textAnchor="middle" dominantBaseline="central"
                                    className="font-hero text-base" fill={`${getColor(90)}`} fontWeight="bold">
                                    {centerValue}
                                </text>
                            )}
                            {centerLabel && (
                                <text x={cx} y={centerValue ? cy + 10 : cy} textAnchor="middle" dominantBaseline="central"
                                    className="font-data" fontSize="6" fill={`${getColor(85)}`} letterSpacing="0.1em">
                                    {centerLabel.toUpperCase()}
                                </text>
                            )}
                        </>
                    )}
                </svg>
                {/* Legend — right side */}
                <div className="flex flex-col gap-1.5">
                    {segments.map((seg, i) => {
                        const delta = seg.previousPercent != null ? +(seg.percent - seg.previousPercent).toFixed(1) : null;
                        return (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color || defaultColors[i % defaultColors.length] }} />
                                <span className="font-data text-base md:text-base uppercase tracking-wider font-medium whitespace-nowrap" style={{ color: `${getColor(88)}` }}>
                                    {seg.label} {seg.percent}%
                                    {delta !== null && delta !== 0 && (
                                        <span className="ml-0.5 font-bold" style={{ color: delta > 0 ? '#22c55e' : '#ff4040' }}>
                                            ({delta > 0 ? '+' : ''}{delta})
                                        </span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DonutChart;
