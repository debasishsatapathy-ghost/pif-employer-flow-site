import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const TREND_CLR: Record<string, string> = { up: '#22c55e', down: '#ff4040', flat: '#6b7280' };

interface ClusterMetric { label: string; value: string; trend?: 'up' | 'down' | 'flat'; change?: string; }

interface DataClusterCardProps {
    title?: string;
    metrics: ClusterMetric[];
}

export const DataClusterCard: React.FC<DataClusterCardProps> = ({ title, metrics = [] }) => (
    <div className="flex flex-col h-full overflow-hidden">
        {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 content-center">
            {metrics.map((m, i) => (
                <div key={i} className="text-center p-1.5 rounded-sm" style={{ backgroundColor: `${getColor(2)}` }}>
                    <div className="font-data text-base md:text-base uppercase tracking-wider" style={{ color: `${getColor(85)}` }}>{m.label}</div>
                    <div className="font-hero text-base md:text-lg leading-tight" style={{ color: `${getColor(90)}` }}>{m.value}</div>
                    {m.trend && m.change && (
                        <div className="font-data text-base md:text-base font-bold" style={{ color: TREND_CLR[m.trend] }}>
                            {m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '—'} {m.change}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

export default DataClusterCard;
