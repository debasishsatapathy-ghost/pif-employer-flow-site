import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface RankedItem { label: string; value: number; displayValue?: string; change?: string; }

interface RankedListCardProps {
    title?: string;
    items: RankedItem[];
    unit?: string;
}

export const RankedListCard: React.FC<RankedListCardProps> = ({ title, items = [], unit }) => {
    const { visible, overflow } = clampList(items, 5);
    const max = Math.max(...items.map(i => i.value), 1);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            <div className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden space-y-1.5 overflow-auto">
                {visible.map((item, i) => {
                    const pct = (item.value / max) * 100;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <span className="font-data text-base font-bold w-4 text-right shrink-0" style={{ color: `${getColor(70)}` }}>#{i + 1}</span>
                            <span className="font-data text-base md:text-base w-20 truncate font-bold" style={{ color: `${getColor(70)}` }}>{item.label}</span>
                            <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ backgroundColor: `${getColor(5)}` }}>
                                <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${getColor(88)}, ${getColor(38)})` }} />
                            </div>
                            <span className="font-data text-base font-bold min-w-[40px] text-right shrink-0" style={{ color: `${getColor(90)}` }}>
                                {item.displayValue || item.value.toLocaleString()}{unit ? ` ${unit}` : ''}
                            </span>
                            {item.change && (
                                <span className="font-data text-base font-bold min-w-[32px] text-right" style={{ color: item.change.startsWith('+') ? '#22c55e' : '#ff4040' }}>
                                    {item.change}
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

export default RankedListCard;
