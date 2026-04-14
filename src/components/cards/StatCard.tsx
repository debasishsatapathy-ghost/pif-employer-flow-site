import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const STATUS_DOT: Record<string, string> = {
    good: '#22c55e', bad: '#ff4040', watch: '#b45309',
};
const TREND_ARROW: Record<string, string> = { up: '▲', down: '▼', flat: '—' };
const TREND_CLR: Record<string, string> = { up: '#22c55e', down: '#ff4040', flat: '#6b7280' };

interface StatCardProps {
    label: string;
    value: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'flat';
    change?: string;
    status?: 'good' | 'bad' | 'watch';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, trend, change, status }) => (
    <div className="flex flex-col items-center justify-center h-full text-center gap-1">
        <div className="flex items-center gap-1.5">
            {status && (
                <span className="w-2.5 h-2.5 rounded-full"
                    style={{
                        backgroundColor: STATUS_DOT[status] || STATUS_DOT.good,
                        ...(status === 'bad' ? { animation: 'blink-dot 1.2s ease-in-out infinite' } : {}),
                    }} />
            )}
            <span className="font-data text-base md:text-base uppercase tracking-[0.15em]" style={{ color: `${getColor(70)}` }}>
                {label}
            </span>
        </div>
        <div className="font-hero text-3xl md:text-4xl lg:text-5xl leading-none" style={{ color: `${getColor(90)}` }}>
            {value}
        </div>
        {subtitle && (
            <p className="font-voice text-base md:text-base leading-tight mt-1 line-clamp-2" style={{ color: `${getColor(70)}` }}>
                {subtitle}
            </p>
        )}
        {trend && change && (
            <div className="font-data text-base font-semibold mt-0.5" style={{ color: TREND_CLR[trend] }}>
                {TREND_ARROW[trend]} {change}
            </div>
        )}
    </div>
);

export default StatCard;
