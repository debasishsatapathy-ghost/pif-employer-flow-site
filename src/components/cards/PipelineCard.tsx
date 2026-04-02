import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
const STAGE_STATUS_CLR: Record<string, string> = { complete: '#22c55e', active: '#60a5fa', pending: `${getColor(25)}` };

interface PipelineStage { label: string; status: 'complete' | 'active' | 'pending'; detail?: string; duration?: string; }

interface PipelineCardProps {
    title?: string;
    stages: PipelineStage[];
}

export const PipelineCard: React.FC<PipelineCardProps> = ({ title, stages = [] }) => {
    const { visible, overflow } = clampList(stages, 5);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            <div className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden space-y-0">
                {visible.map((s, i) => {
                    const clr = STAGE_STATUS_CLR[s.status] || STAGE_STATUS_CLR.pending;
                    const isLast = i === visible.length - 1;
                    return (
                        <div key={i} className="flex gap-2">
                            <div className="flex flex-col items-center">
                                <span className="w-3 h-3 rounded-full border-2 shrink-0" style={{
                                    borderColor: clr,
                                    backgroundColor: s.status === 'complete' ? clr : s.status === 'active' ? `${clr}30` : 'transparent',
                                }}>
                                    {s.status === 'complete' && (
                                        <svg viewBox="0 0 12 12" className="w-full h-full"><path d="M3 6l2 2 4-4" fill="none" stroke="white" strokeWidth={2} /></svg>
                                    )}
                                </span>
                                {!isLast && <span className="w-px flex-1 min-h-[12px]" style={{ backgroundColor: `${getColor(13)}` }} />}
                            </div>
                            <div className="pb-1.5 min-w-0">
                                <div className="font-data text-base md:text-base font-bold" style={{ color: s.status === 'pending' ? `${getColor(60)}` : C }}>{s.label}</div>
                                {s.detail && <div className="font-voice text-base md:text-base leading-tight" style={{ color: `${getColor(70)}` }}>{s.detail}</div>}
                                {s.duration && <span className="font-data text-base px-1 py-0.5 rounded-sm" style={{ backgroundColor: `${clr}15`, color: clr }}>{s.duration}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <OverflowPill count={overflow} label="more" />
        </div>
    );
};

export default PipelineCard;
