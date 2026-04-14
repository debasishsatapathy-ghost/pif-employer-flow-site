import React from 'react';
import { getIcon } from '@/utils/getIcon';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

// Legacy inline SVG paths — fallback for certified slides that use these short names
const ICON_PATHS: Record<string, string> = {
    warning: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    info: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v4m0 4h.01',
    success: 'M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z',
    fire: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
    target: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z',
    chart: 'M3 3v18h18M7 16v-4m4 4V8m4 8v-6m4 6v-2',
    globe: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z',
    lightning: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

function renderIcon(icon: string, clr: string) {
    // 1. Try full Lucide icon library first (1000+ icons)
    const LucideIcon = getIcon(icon);
    if (LucideIcon) {
        return <LucideIcon size={28} color={clr} strokeWidth={1.5} className="shrink-0" />;
    }
    // 2. Try legacy inline SVG paths
    const path = ICON_PATHS[icon];
    if (path) {
        return (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="shrink-0" style={{ maxWidth: 28, maxHeight: 28 }}>
                <path d={path} />
            </svg>
        );
    }
    // 3. Fallback: first letter
    return <span className="font-data text-xl" style={{ color: clr }}>{icon[0]?.toUpperCase()}</span>;
}


interface CalloutCardProps {
    icon?: string;
    value?: string;
    label?: string;
    body?: string;
    subtitle?: string;
    color?: string;
}

export const CalloutCard: React.FC<CalloutCardProps> = ({ icon, value, label, body, subtitle, color = C }) => (
    <div className="flex flex-col items-center justify-center h-full text-center gap-1.5 px-4">
        {icon && renderIcon(icon, color)}
        {value && <div className="font-hero text-2xl md:text-3xl lg:text-4xl leading-tight" style={{ color }}>{value}</div>}
        {label && <div className="font-data text-base md:text-base uppercase tracking-[0.15em]" style={{ color: `${getColor(85)}` }}>{label}</div>}
        {body && <p className="font-voice text-base md:text-base leading-relaxed max-w-md line-clamp-5" style={{ color: `${getColor(88)}` }}>{body}</p>}
        {subtitle && <p className="font-data text-sm md:text-sm tracking-wider mt-1" style={{ color: `${getColor(65)}` }}>{subtitle}</p>}
    </div>
);

export default CalloutCard;
