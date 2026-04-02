import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface HeatmapCell {
    label: string;
    value: number;
    displayValue?: string;
}

interface HeatmapCardProps {
    title?: string;
    rows: string[];
    cols: string[];
    cells: HeatmapCell[][];
    minColor?: string;
    maxColor?: string;
}

export const HeatmapCard: React.FC<HeatmapCardProps> = ({
    title, rows = [], cols = [], cells = [], minColor = 'rgba(30, 40, 60, 0.3)', maxColor = C,
}) => {
    const flat = cells.flat();
    if (flat.length === 0) return null;
    const min = Math.min(...flat.map(c => c.value));
    const max = Math.max(...flat.map(c => c.value));
    const range = max - min || 1;

    const interpolate = (val: number) => {
        const t = (val - min) / range;
        return `color-mix(in srgb, ${maxColor} ${Math.round(t * 100)}%, ${minColor})`;
    };

    const getTextColor = (val: number) => {
        const t = (val - min) / range;
        return t > 0.5 ? '#1a1a2e' : '#ffffff';
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex-1 overflow-auto table-scroll-container min-h-0">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th />
                            {cols.map((c, i) => (
                                <th key={i} className="font-data text-base md:text-base uppercase tracking-wider px-1 py-1 text-center" style={{ color: `${getColor(85)}` }}>
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri}>
                                <td className="font-data text-base md:text-base uppercase tracking-wider pr-2 py-1 text-left whitespace-nowrap font-bold" style={{ color: `${getColor(85)}` }}>
                                    {row}
                                </td>
                                {(cells[ri] || []).map((cell, ci) => (
                                    <td key={ci} className="px-1 py-1 text-center rounded-sm" style={{ backgroundColor: interpolate(cell.value) }}>
                                        <span className="font-data text-base font-bold" style={{ color: getTextColor(cell.value) }}>
                                            {cell.displayValue || cell.value}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HeatmapCard;
