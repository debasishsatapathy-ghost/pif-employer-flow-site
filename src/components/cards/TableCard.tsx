import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface TableCardProps {
    title?: string;
    headers: string[];
    rows: string[][];
    highlights?: number[];
}

export const TableCard: React.FC<TableCardProps> = ({ title, headers = [], rows: rawRows = [], highlights = [] }) => {
    // Normalize rows — AI sometimes sends { cells: string[] } objects instead of string[][]
    const rows: string[][] = rawRows.map((row: any) =>
        Array.isArray(row) ? row : Array.isArray(row?.cells) ? row.cells : []
    );
    const { visible, overflow } = clampList(rows, 6);
    const highlightSet = new Set(highlights);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && (
                <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex-1 overflow-auto table-scroll-container min-h-0">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="font-data text-base md:text-base uppercase tracking-wider py-1.5 pr-2 border-b font-bold"
                                    style={{ color: `${getColor(70)}`, borderColor: `${getColor(10)}` }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, ri) => (
                            <tr key={ri} style={highlightSet.has(ri) ? { backgroundColor: `${getColor(3)}` } : {}}>
                                {row.map((cell, ci) => (
                                    <td key={ci}
                                        className={`font-data text-base md:text-base py-1.5 pr-2 border-b ${ci === 0 ? 'font-bold' : 'font-medium'}`}
                                        style={{ color: ci === 0 ? C : `${getColor(88)}`, borderColor: `${getColor(4)}` }}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <OverflowPill count={overflow} label="rows" />
        </div>
    );
};

export default TableCard;
