import React, { useId } from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface LineChartProps {
    title?: string;
    data: number[];
    labels?: string[];
    color?: string;
    unit?: string;
}

export const LineChart: React.FC<LineChartProps> = ({ title, data: rawData = [], labels: rawLabels, color = `${getColor(88)}`, unit }) => {
    const gradId = useId().replace(/:/g, '_'); // unique per instance
    // Normalize: if AI sends data as an object { "2024": 0.05, ... }, convert to array
    let data: number[];
    let labels: string[] | undefined;
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
        const entries = Object.entries(rawData as Record<string, number>);
        labels = entries.map(([k]) => k);
        data = entries.map(([, v]) => Number(v) || 0);
    } else {
        data = Array.isArray(rawData) ? rawData : [];
        labels = rawLabels;
    }
    if (data.length < 2) return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base uppercase tracking-[0.12em] mb-2" style={{ color: getColor(90) }}>{title}</h3>}
            <div className="flex-1 flex items-center justify-center" style={{ color: getColor(30) }}>
                <span className="font-data text-base uppercase tracking-wider">No trend data</span>
            </div>
        </div>
    );
    const mn = Math.min(...data);
    const mx = Math.max(...data);
    const range = mx - mn || 1;
    const w = 200, h = 60;

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - mn) / range) * (h - 8) - 4;
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,${h} ${points} ${w},${h}`;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden min-h-0">
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full flex-1" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id={`lg_${gradId}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.40" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                    <line x1="0" y1={h} x2={w} y2={h} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                    {/* Area fill */}
                    <polygon points={areaPoints} fill={`url(#lg_${gradId})`} />
                    {/* Line */}
                    <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Data dots */}
                    {data.map((v, i) => {
                        const x = (i / (data.length - 1)) * w;
                        const y = h - ((v - mn) / range) * (h - 8) - 4;
                        return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />;
                    })}
                </svg>
                {/* Labels row */}
                {labels && labels.length > 0 && (
                    <div className="flex justify-between mt-1">
                        {labels.map((l, i) => (
                            <span key={i} className="font-data text-base md:text-base uppercase" style={{ color: `${getColor(85)}` }}>
                                {l}
                            </span>
                        ))}
                    </div>
                )}
                {/* Min/Max annotation */}
                <div className="flex justify-between mt-1">
                    <span className="font-data text-base font-medium" style={{ color: `${getColor(85)}` }}>
                        {mn.toLocaleString()}{unit ? ` ${unit}` : ''}
                    </span>
                    <span className="font-data text-base font-bold" style={{ color: `${getColor(90)}` }}>
                        {mx.toLocaleString()}{unit ? ` ${unit}` : ''}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LineChart;
