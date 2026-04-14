import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const STATUS_DOT: Record<string, string> = { good: '#22c55e', bad: '#ff4040', watch: '#b45309' };

interface PersonCardProps {
    name: string;
    title?: string;
    company?: string;
    metric?: string;
    metricLabel?: string;
    status?: 'good' | 'bad' | 'watch';
    detail?: string;
    bio?: string;
    traits?: string | string[];
}

export const PersonCard: React.FC<PersonCardProps> = ({
    name, title, company, metric, metricLabel, status, detail, bio, traits: rawTraits = [],
}) => {
    // Normalize — AI sometimes sends a comma-separated string instead of string[]
    const traits: string[] = Array.isArray(rawTraits)
        ? rawTraits
        : typeof rawTraits === 'string' && rawTraits.length > 0
            ? rawTraits.split(',').map(s => s.trim()).filter(Boolean)
            : [];
    return (
    <div className="flex items-center h-full overflow-hidden gap-4 md:gap-6 p-1">
        {/* Left: Avatar + Identity */}
        <div className="flex flex-col items-center shrink-0 gap-1.5 min-w-[80px]">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getColor(8)}` }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={`${getColor(88)}`} strokeWidth={1.5} strokeLinecap="round">
                    <circle cx={12} cy={8} r={4} />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
            </div>
            <div className="text-center">
                <div className="font-data text-base md:text-base font-bold leading-tight" style={{ color: `${getColor(90)}` }}>{name}</div>
                {title && <div className="font-data text-base md:text-base uppercase tracking-wider" style={{ color: `${getColor(70)}` }}>{title}</div>}
                {company && (
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${getColor(38)}` }} />
                        <span className="font-data text-base md:text-base font-bold" style={{ color: `${getColor(88)}` }}>{company}</span>
                    </div>
                )}
            </div>
        </div>

        {/* Right: Metric + Detail + Bio + Traits */}
        <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden gap-1.5 min-w-0">
            {metric && (
                <div className="flex items-center gap-2">
                    {status && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_DOT[status] }} />}
                    <span className="font-hero text-xl md:text-2xl" style={{ color: `${getColor(90)}` }}>{metric}</span>
                    {metricLabel && <span className="font-data text-base uppercase tracking-wider" style={{ color: `${getColor(70)}` }}>{metricLabel}</span>}
                </div>
            )}
            {detail && <p className="font-voice text-base md:text-base leading-relaxed line-clamp-2" style={{ color: `${getColor(70)}` }}>{detail}</p>}
            {bio && <p className="font-voice text-base md:text-base leading-relaxed line-clamp-2" style={{ color: `${getColor(70)}` }}>{bio}</p>}
            {traits.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5 overflow-hidden">
                    {traits.slice(0, 4).map((t, i) => (
                        <span key={i} className="font-data text-base uppercase px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${getColor(3)}`, color: `${getColor(70)}` }}>{t}</span>
                    ))}
                </div>
            )}
        </div>
    </div>
);
};

export default PersonCard;
