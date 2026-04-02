import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

const RISK_CLR: Record<string, { bg: string; text: string }> = {
    low: { bg: '#22c55e18', text: '#22c55e' },
    medium: { bg: '#b4530918', text: '#b45309' },
    high: { bg: '#ff404018', text: '#ff4040' },
};

const HEALTH_CLR: Record<string, string> = {
    strong: '#22c55e',
    watch: '#b45309',
    'at-risk': '#ff4040',
};

interface CountryCardProps {
    country: string;
    flag?: string;
    revenue?: string;
    employees?: string;
    factories?: string[];
    politicalRisk?: 'low' | 'medium' | 'high';
    tradeExposure?: string;
    currency?: string;
    hedgedPercent?: number;
    relationshipHealth?: 'strong' | 'watch' | 'at-risk';
    keyContact?: string;
}

export const CountryCard: React.FC<CountryCardProps> = ({
    country,
    flag,
    revenue,
    employees,
    factories: factoriesRaw = [] as string | string[],
    politicalRisk = 'medium',
    tradeExposure,
    currency,
    hedgedPercent,
    relationshipHealth = 'strong',
    keyContact,
}) => {
    // Defensive coerce — AI sometimes sends a string instead of string[]
    const factories: string[] = Array.isArray(factoriesRaw)
        ? factoriesRaw
        : typeof factoriesRaw === 'string' && factoriesRaw.length > 0
            ? [factoriesRaw]
            : [];
    const risk = RISK_CLR[politicalRisk] || RISK_CLR.medium;
    const healthColor = HEALTH_CLR[relationshipHealth] || HEALTH_CLR.strong;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header: Flag + Country + Risk */}
            <div className="flex items-center gap-2 mb-2">
                {flag && <span className="text-xl shrink-0">{flag}</span>}
                <h3 className="font-data text-base md:text-base font-bold uppercase tracking-[0.12em] flex-1" style={{ color: `${getColor(90)}` }}>
                    {country}
                </h3>
                <span className="font-data text-base uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                    style={{ backgroundColor: risk.bg, color: risk.text }}>
                    {politicalRisk} risk
                </span>
            </div>

            {/* Key Metrics - 2×2 compact grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                {revenue && (
                    <div>
                        <div className="font-data text-base uppercase tracking-wider" style={{ color: `${getColor(45)}` }}>Revenue</div>
                        <div className="font-data text-base font-bold" style={{ color: `${getColor(90)}` }}>{revenue}</div>
                    </div>
                )}
                {employees && (
                    <div>
                        <div className="font-data text-base uppercase tracking-wider" style={{ color: `${getColor(45)}` }}>Employees</div>
                        <div className="font-data text-base font-bold" style={{ color: `${getColor(90)}` }}>{employees}</div>
                    </div>
                )}
                {currency && (
                    <div>
                        <div className="font-data text-base uppercase tracking-wider" style={{ color: `${getColor(45)}` }}>Currency</div>
                        <div className="font-data text-base font-bold" style={{ color: `${getColor(90)}` }}>
                            {currency}
                            {hedgedPercent !== undefined && (
                                <span className="font-data text-base font-normal ml-1" style={{ color: `${getColor(55)}` }}>
                                    ({hedgedPercent}% hedged)
                                </span>
                            )}
                        </div>
                    </div>
                )}
                {/* Relationship Health */}
                <div>
                    <div className="font-data text-base uppercase tracking-wider" style={{ color: `${getColor(45)}` }}>Relationship</div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: healthColor }} />
                        <span className="font-data text-base font-bold capitalize" style={{ color: healthColor }}>
                            {relationshipHealth?.replace('-', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Factories */}
            {factories.length > 0 && (
                <div className="mb-1">
                    <div className="font-data text-base uppercase tracking-wider mb-0.5" style={{ color: `${getColor(45)}` }}>Factories</div>
                    <div className="flex flex-wrap gap-1">
                        {factories.slice(0, 3).map((f, i) => (
                            <span key={i} className="font-data text-base px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${getColor(5)}`, color: `${getColor(75)}` }}>
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Trade Exposure */}
            {tradeExposure && (
                <div className="font-voice text-base leading-tight mt-auto pt-1 border-t" style={{ color: `${getColor(60)}`, borderColor: `${getColor(8)}` }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5 mr-0.5"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    {tradeExposure}
                </div>
            )}

            {/* Key Contact */}
            {keyContact && (
                <div className="font-data text-base mt-1" style={{ color: `${getColor(40)}` }}>
                    Key contact: {keyContact}
                </div>
            )}
        </div>
    );
};

export default CountryCard;
