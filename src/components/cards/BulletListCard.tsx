import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const STATUS_DOT: Record<string, string> = { good: '#22c55e', bad: '#ff4040', watch: '#b45309', info: '#60a5fa' };

interface BulletItem { text: string; status?: string; }

interface BulletListCardProps {
    title?: string;
    items: BulletItem[];
}

export const BulletListCard: React.FC<BulletListCardProps> = ({ title, items = [] }) => {
    const { visible, overflow } = clampList(items, 5);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            <ul className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden space-y-1.5 overflow-auto">
                {visible.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: item.status ? (STATUS_DOT[item.status] || `${getColor(25)}`) : `${getColor(25)}` }} />
                        <span className="font-voice text-base md:text-base leading-relaxed" style={{ color: `${getColor(85)}` }}>{item.text}</span>
                    </li>
                ))}
            </ul>
            <OverflowPill count={overflow} label="more" />
        </div>
    );
};

export default BulletListCard;
