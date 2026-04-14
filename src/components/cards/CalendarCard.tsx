/**
 * CalendarCard — List of scheduled time slots or events.
 * Accepts an `events` array with title, date, time, duration, status.
 */

import React from 'react';
import { CalendarDays, Clock, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

const STATUS_STYLE: Record<string, { color: string; label: string; Icon: React.FC<any> }> = {
    confirmed:  { color: '#22c55e', label: 'Confirmed',  Icon: CheckCircle2 },
    tentative:  { color: '#f59e0b', label: 'Tentative',  Icon: AlertCircle  },
    cancelled:  { color: '#ef4444', label: 'Cancelled',  Icon: AlertCircle  },
    pending:    { color: '#f59e0b', label: 'Pending',    Icon: Circle       },
    default:    { color: '#ffffff60', label: '',          Icon: Circle       },
};

interface CalendarEvent {
    title: string;
    date?: string;
    time?: string;
    duration?: string;
    status?: string;
    note?: string;
}

interface CalendarCardProps {
    title?: string;
    events?: CalendarEvent[];
}

export const CalendarCard: React.FC<CalendarCardProps> = ({
    title,
    events = [],
}) => {
    return (
        <div className="flex flex-col h-full gap-1.5 overflow-hidden">
            {title && (
                <h3 className="font-data text-base uppercase tracking-[0.12em] font-bold shrink-0"
                    style={{ color: `${getColor(90)}` }}>
                    {title}
                </h3>
            )}
            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto min-h-0">
                {events.map((ev, i) => {
                    const st = STATUS_STYLE[ev.status || 'default'] ?? STATUS_STYLE.default;
                    const isCancelled = ev.status === 'cancelled';
                    return (
                        <div
                            key={i}
                            className="flex items-start gap-2 py-1.5 border-b last:border-b-0"
                            style={{ borderColor: `${getColor(8)}`, opacity: isCancelled ? 0.4 : 1 }}
                        >
                            {/* Status dot */}
                            <span className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />

                            <div className="flex-1 min-w-0">
                                {/* Title */}
                                <div className={`font-data text-base font-bold leading-tight truncate ${isCancelled ? 'line-through' : ''}`}
                                    style={{ color: `${getColor(90)}` }}>
                                    {ev.title}
                                </div>

                                {/* Date + Time + Duration */}
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    {ev.date && (
                                        <span className="flex items-center gap-1 font-data text-sm tracking-wider"
                                            style={{ color: `${getColor(55)}` }}>
                                            <CalendarDays size={9} /> {ev.date}
                                        </span>
                                    )}
                                    {ev.time && (
                                        <span className="flex items-center gap-1 font-data text-sm tracking-wider"
                                            style={{ color: `${getColor(55)}` }}>
                                            <Clock size={9} /> {ev.time}{ev.duration ? ` · ${ev.duration}` : ''}
                                        </span>
                                    )}
                                </div>

                                {ev.note && (
                                    <div className="font-voice text-sm italic mt-0.5 leading-snug"
                                        style={{ color: `${getColor(35)}` }}>
                                        {ev.note}
                                    </div>
                                )}
                            </div>

                            {/* Status badge */}
                            {st.label && (
                                <span className="font-data text-sm px-1.5 py-0.5 rounded shrink-0"
                                    style={{ color: st.color, backgroundColor: `${st.color}15` }}>
                                    {st.label}
                                </span>
                            )}
                        </div>
                    );
                })}
                {events.length === 0 && (
                    <div className="font-data text-sm" style={{ color: `${getColor(30)}` }}>
                        No slots scheduled
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarCard;
