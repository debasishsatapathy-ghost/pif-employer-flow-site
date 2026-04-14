import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface OverflowPillProps {
    count: number;
    label?: string; // e.g. "metrics", "items", "rows"
}

/**
 * OverflowPill — Subtle "+N more" indicator shown when a card's list is clamped.
 * Only renders when count > 0.
 */
export const OverflowPill: React.FC<OverflowPillProps> = ({ count, label = 'more' }) => {
    if (count <= 0) return null;
    return (
        <div className="flex justify-center mt-1 shrink-0">
            <span
                className="font-data text-base md:text-base uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${getColor(3)}`, color: `${getColor(70)}`, border: `1px solid ${getColor(6)}` }}
            >
                +{count} {label}
            </span>
        </div>
    );
};

export default OverflowPill;
