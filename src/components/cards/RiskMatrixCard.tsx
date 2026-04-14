import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const RISK_CLR = ['#22c55e', '#b45309', '#ff4040'];

interface RiskItem { label: string; likelihood: number; impact: number; }

interface RiskMatrixCardProps {
    title?: string;
    risks: RiskItem[];
}

export const RiskMatrixCard: React.FC<RiskMatrixCardProps> = ({ title, risks: rawRisks = [] }) => {
    // Normalize — AI sometimes sends likelihood/impact as "high"/"medium"/"low" strings
    const LEVEL: Record<string, number> = { low: 0, medium: 1, med: 1, high: 2 };
    const toNum = (v: any): number =>
        typeof v === 'number' ? v : LEVEL[String(v).toLowerCase()] ?? 0;
    const risks: RiskItem[] = (Array.isArray(rawRisks) ? rawRisks : []).map(r => ({
        ...r,
        likelihood: toNum(r.likelihood),
        impact: toNum(r.impact),
    }));
    const labels = { y: ['High', 'Med', 'Low'], x: ['Low', 'Med', 'High'] };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            {risks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center" style={{ color: getColor(30) }}>
                    <span className="font-data text-base uppercase tracking-wider">No risks on record</span>
                </div>
            ) : (
            <div className="flex-1 flex items-center min-h-0 overflow-hidden justify-center min-h-0 overflow-hidden">
                <div className="flex gap-1 w-full h-full max-h-full">
                    {/* Y-axis labels */}
                    <div className="flex flex-col justify-around items-end pr-0.5 shrink-0">
                        <span className="font-data text-base uppercase" style={{ color: 'rgba(255,255,255,0.90)' }}>High</span>
                        <span className="font-data text-base uppercase" style={{ color: 'rgba(255,255,255,0.90)' }}>Med</span>
                        <span className="font-data text-base uppercase" style={{ color: 'rgba(255,255,255,0.90)' }}>Low</span>
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="grid grid-cols-3 gap-0.5 flex-1">
                            {[2, 1, 0].map(row => (
                                [0, 1, 2].map(col => {
                                    const cellRisk = row + col;
                                    const bg = cellRisk <= 1 ? `${RISK_CLR[0]}35` : cellRisk <= 2 ? `${RISK_CLR[1]}40` : `${RISK_CLR[2]}40`;
                                    const borderClr = cellRisk <= 1 ? `${RISK_CLR[0]}40` : cellRisk <= 2 ? `${RISK_CLR[1]}50` : `${RISK_CLR[2]}50`;
                                    const cellRisks = risks.filter(r => r.impact === col && r.likelihood === row);
                                    return (
                                        <div key={`${row}-${col}`} className="rounded-sm flex flex-col items-center justify-center gap-0.5 p-1 border" style={{ backgroundColor: bg, borderColor: borderClr }}>
                                            {cellRisks.map((r, i) => (
                                                <span key={i} className="font-data text-base md:text-base text-center leading-tight truncate w-full font-bold" style={{ color: '#ffffff' }}>{r.label}</span>
                                            ))}
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                        {/* X-axis labels */}
                        <div className="flex justify-between mt-0.5 px-1 shrink-0">
                            <span className="font-data text-base uppercase" style={{ color: 'rgba(255,255,255,0.90)' }}>Low</span>
                            <span className="font-data text-base uppercase" style={{ color: 'rgba(255,255,255,0.90)' }}>Med</span>
                            <span className="font-data text-base uppercase" style={{ color: 'rgba(255,255,255,0.90)' }}>High</span>
                        </div>
                        <div className="text-center shrink-0">
                            <span className="font-data text-base uppercase tracking-wider" style={{ color: `${getColor(70)}` }}>Impact →</span>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default RiskMatrixCard;
