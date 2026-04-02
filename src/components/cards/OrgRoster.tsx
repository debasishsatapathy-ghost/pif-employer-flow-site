import React from 'react';
import { clampList } from '@/utils/clampList';
import { OverflowPill } from './OverflowPill';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface OrgMember { name: string; role: string; badge?: string; }

interface OrgRosterProps {
    title?: string;
    members?: OrgMember[];
    profiles?: OrgMember[]; // alias — tele sometimes sends this instead of members
}

export const OrgRoster: React.FC<OrgRosterProps> = ({ title, members, profiles }) => {
    const items = members || profiles || [];
    const { visible, overflow } = clampList(items, 6);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {title && <h3 className="font-data text-base md:text-base uppercase tracking-[0.12em] mb-2 shrink-0" style={{ color: `${getColor(90)}` }}>{title}</h3>}
            <div className="flex-1 grid grid-cols-3 gap-2 content-center overflow-hidden">
                {visible.map((m, i) => {
                    const firstName = m.name.split(' ')[0];
                    const shortRole = m.role.length > 22 ? m.role.slice(0, 20) + '…' : m.role;
                    return (
                        <div key={i} className="flex flex-col items-center text-center gap-1.5 min-w-0 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* First name as badge */}
                            <span className="font-data text-base font-bold px-3 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.95)' }}>
                                {firstName}
                            </span>
                            {/* Role */}
                            <div className="font-data text-base leading-tight truncate w-full" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                {shortRole}
                            </div>
                            {/* Badge (metric) */}
                            {m.badge && (
                                <span className="font-data text-base whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.50)' }}>
                                    {m.badge}
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

export default OrgRoster;
