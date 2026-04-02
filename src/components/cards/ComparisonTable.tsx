import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const CELL_CLR: Record<string, string> = { good: '#22c55e', bad: '#ff4040', watch: '#b45309', neutral: `${getColor(60)}` };

interface ComparisonTableProps {
    title?: string;
    headers: string[];
    rows: { cells: string[]; highlights?: number[] }[];
    statusCols?: number[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ title, headers = [], rows = [], statusCols = [] }) => {
    const { visible, overflow } = clampList(rows, 5);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            <div className="flex-1 overflow-auto table-scroll-container">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="font-data text-base md:text-base uppercase tracking-wider px-2 py-1.5 text-left border-b" style={{ color: `${getColor(85)}`, borderColor: `${getColor(8)}` }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, ri) => (
                            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'transparent' : `${getColor(1)}` }}>
                                {(row.cells || []).map((cell, ci) => {
                                    const isHighlight = row.highlights?.includes(ci);
                                    return (
                                        <td key={ci} className="font-data text-base md:text-base px-2 py-1.5 border-b" style={{
                                            color: isHighlight ? C : `${getColor(88)}`,
                                            fontWeight: ci === 0 || isHighlight ? 700 : 400,
                                            borderColor: `${getColor(3)}`,
                                        }}>
                                            {cell}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <OverflowPill count={overflow} label="rows" />
        </div>
    );
};

export default ComparisonTable;
