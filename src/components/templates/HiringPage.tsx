/**
 * Hiring dashboard – exact match to design screenshot.
 *
 * Grid:
 * ┌──────────────────────────┬──────────────┬──────────────┬──────────────────┐
 * │ Pipeline                 │ Avg. time    │ Avg. skill   │                  │
 * │ (col-span-2)             │ to match     │ readiness    │  Upcoming        │
 * ├──────────────────────────┴──────────────┴──────────────┤  Interviews      │
 * │ Hiring intelligence (col-span-2)  │ Job Postings (col-span-2)    (right   │
 * │                                    │                   │  full-height     │
 * └────────────────────────────────────┴───────────────────┴──────────────────┘
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  MoreVertical,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserPlus,
  UserCheck,
  AlertCircle,
  DollarSign,
  Plus,
  Star,
  MessageCircle,
  Sparkles,
  Pencil,
  Users,
  ArrowDown,
  Clock,
  LogOut,
} from "lucide-react";
import {
  type JobPostingResponse,
  type MockJobResponse,
} from "@/lib/employerApi";
/* ── palette ─────────────────────────────────────────────────────────────── */
const CARD = { background: "rgba(255,255,255,0.045)" };

/* ── pipeline ────────────────────────────────────────────────────────────── */
const ROLES = ["Cloud Engineer", "Senior AI Developer"];
const BAR = [
  { label: "Interview",   color: "#1dc558", pct: 26 },
  { label: "Shortlisted", color: "#3689ff", pct: 46 },
  { label: "Screened",    color: "#9e36ff", pct: 23 },
  { label: "Rejected",    color: "#393940", pct: 5 },
];

/* ── hiring intelligence ─────────────────────────────────────────────────── */
const INTEL = [
  {
    icon: "down" as const, iconColor: "#f97316",
    title: "Pipeline dropoff",
    body: "Based on May's data, candidates were 15% more likely to drop out of the process when waiting over 7 days between interviews.",
    cta: "Review schedule",
  },
  {
    icon: "up" as const, iconColor: "#1ed25e",
    title: "AI readiness in Jeddah",
    body: "Artificial intelligence graduates in Jeddah are showing a 5% higher skill readiness score than those in Riyadh.",
    noAction: "No action required.",
  },
  {
    icon: "up" as const, iconColor: "#f97316",
    title: "AI Developer compensation",
    body: "A talent shortage has seen wage demands increase by 12% this quarter.",
    noteLink: "2 listings",
    noteRest: " have fallen below the range.",
    cta: "Update salary range",
  },
];

/* ── job postings ────────────────────────────────────────────────────────── */
type Visual =
  | { t: "grid";    color: string; rows: number; cols: number; total?: number }
  | { t: "squares"; color: string; n: number }
  | { t: "avatars"; n: number }
  | { t: "grid-mixed"; rows: number; cols: number };  /* blue + 1 orange */

interface Metric {
  num: string; label: string; visual: Visual;
  sub?: string; subIcon?: "plus"|"check"|"warn"|"people"|"clock"|"exit"; subColor?: string;
}

/* dot colors per position — matches Figma progress dots exactly */
const JOBS: {
  title: string; metaParts: string[]; status: string;
  dots: string[];
  left: Metric; right: Metric;
}[] = [
  {
    title: "Senior AI Developer",
    metaParts: ["Engineering", "Jeddah", "2 days ago"],
    status: "Screening",
    dots: ["#1dc558", "#71717b", "#71717b", "#71717b"],
    left: {
      num: "8", label: "screened applicants",
      visual: { t: "squares", color: "#3689ff", n: 8 }, // rendered as mixed row inline
      sub: "5 shortlisted", subIcon: "people", subColor: "rgba(255,255,255,0.45)",
    },
    right: {
      num: "13", label: "talent pool",
      visual: { t: "grid", color: "#9e36ff", rows: 2, cols: 8, total: 13 },
      sub: "8 new suggestions", subIcon: "people", subColor: "rgba(255,255,255,0.45)",
    },
  },
  {
    title: "Cloud Engineer",
    metaParts: ["Engineering", "Remote", "4 days ago"],
    status: "Interviewing",
    dots: ["#a5e8bc", "#a5e8bc", "#1dc558", "#71717b"],
    left: {
      num: "6", label: "interviews booked",
      visual: { t: "avatars", n: 6 },
      sub: "2 recently accepted", subIcon: "clock", subColor: "#4ade80",
    },
    right: {
      num: "17", label: "shortlisted",
      visual: { t: "grid-mixed", rows: 2, cols: 9 },
      sub: "1 dropped out", subIcon: "exit", subColor: "#f97316",
    },
  },
];

/* ── interviews ──────────────────────────────────────────────────────────── */
const IVWS = [
  { name: "Sara Khalid",  role: "Senior AI Developer", type: "In-person", day: "Today",    clockTime: "10:00", ampm: "AM", avatar: "/sara-khalid.png" },
  { name: "Rayan Tosan",  role: "Senior AI Developer", type: "In-person", day: "Today",    clockTime: "11:00", ampm: "AM", avatar: "https://ui-avatars.com/api/?name=Rayan+Tosan&background=2e5e50&color=fff&size=80" },
  { name: "Rayan Tosan",  role: "Senior AI Developer", type: "In-person", day: "Tomorrow", clockTime: "9:30",  ampm: "AM", avatar: "https://ui-avatars.com/api/?name=Rayan+T&background=2e5e50&color=fff&size=80" },
];

/* ── calendar ────────────────────────────────────────────────────────────── */
// Screenshot shows June 1 in the Sunday (last) column.
// Row 1: May 25-30 (grayed) | June 1
// Row 6: June 30 | July 1-6 (grayed)
const CAL_HEADS = ["M", "T", "W", "T", "F", "S", "S"];
const CAL: { d: number; other?: true }[] = [
  {d:25,other:true},{d:26,other:true},{d:27,other:true},{d:28,other:true},{d:29,other:true},{d:30,other:true},{d:1},
  {d:2},{d:3},{d:4},{d:5},{d:6},{d:7},{d:8},
  {d:9},{d:10},{d:11},{d:12},{d:13},{d:14},{d:15},
  {d:16},{d:17},{d:18},{d:19},{d:20},{d:21},{d:22},
  {d:23},{d:24},{d:25},{d:26},{d:27},{d:28},{d:29},
  {d:30},{d:1,other:true},{d:2,other:true},{d:3,other:true},{d:4,other:true},{d:5,other:true},{d:6,other:true},
];
const TODAY_D = 12;

/* ── small helpers ───────────────────────────────────────────────────────── */


function Card({ className = "", style = {}, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ ...CARD, ...style }}>
      {children}
    </div>
  );
}

function StatusDots({ dots }: { dots: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {dots.map((color, i) => (
        <span key={i} className="size-3 rounded-full flex-shrink-0" style={{ background: color }} />
      ))}
    </div>
  );
}

// Figma exact: W 11.90425px × H 11.90425px, border-radius 3.968px
const DOT_SIZE = 11.904;
const DOT_RADIUS = 3.968;
const DOT_GAP = 3.968;
const dotStyle = (bg: string): React.CSSProperties => ({
  width: DOT_SIZE, height: DOT_SIZE,
  borderRadius: DOT_RADIUS,
  background: bg,
  flexShrink: 0,
});

function VisualBlock({ v }: { v: Visual }) {
  if (v.t === "grid") {
    const total = v.total ?? (v.rows * v.cols);
    return (
      <div className="flex flex-col" style={{ gap: DOT_GAP }}>
        {Array.from({ length: v.rows }).map((_, row) => {
          const rowStart = row * v.cols;
          const rowEnd = Math.min(rowStart + v.cols, total);
          if (rowStart >= total) return null;
          return (
            <div key={row} className="flex" style={{ gap: DOT_GAP }}>
              {Array.from({ length: rowEnd - rowStart }).map((_, i) => (
                <span key={i} style={dotStyle(v.color)} />
              ))}
            </div>
          );
        })}
      </div>
    );
  }
  if (v.t === "squares") {
    return (
      <div className="flex" style={{ gap: DOT_GAP }}>
        {[...Array(5)].map((_,i) => <span key={i} style={dotStyle("#3689ff")} />)}
        {[...Array(3)].map((_,i) => <span key={i} style={dotStyle("#9e36ff")} />)}
      </div>
    );
  }
  if (v.t === "avatars") {
    const bg = ["#a5e5e8","#ffbfbf","#a5e8bc","#d7a5e8","#afd0ff","#ffdabf"];
    return (
      <div className="flex" style={{ gap: 0 }}>
        {Array.from({ length: v.n }).map((_, i) => (
          <div
            key={i}
            className="rounded-full flex items-center justify-center text-[10px] font-bold text-white/80 flex-shrink-0"
            style={{ width: 40, height: 40, background: bg[i % bg.length], border: "2px solid rgba(15,20,28,0.85)", marginLeft: i === 0 ? 0 : -10, zIndex: v.n - i }}
          />
        ))}
      </div>
    );
  }
  /* grid-mixed: shortlisted — row1: 6 green + 3 blue, row2: 7 blue + 1 orange */
  return (
    <div className="flex flex-col" style={{ gap: DOT_GAP }}>
      <div className="flex" style={{ gap: DOT_GAP }}>
        {[...Array(6)].map((_,i) => <span key={i} style={dotStyle("#1dc558")} />)}
        {[...Array(3)].map((_,i) => <span key={i} style={dotStyle("#3689ff")} />)}
      </div>
      <div className="flex" style={{ gap: DOT_GAP }}>
        {[...Array(7)].map((_,i) => <span key={i} style={dotStyle("#3689ff")} />)}
        <span style={dotStyle("#ff6b00")} />
      </div>
    </div>
  );
}

function SubRow({ sub, icon, color }: { sub: string; icon?: "plus"|"check"|"warn"|"people"|"clock"|"exit"; color?: string }) {
  const Ic = icon === "people" ? Users : icon === "plus" ? UserPlus : icon === "clock" ? Clock : icon === "exit" ? LogOut : icon === "check" ? UserCheck : AlertCircle;
  return (
    <div className="flex items-start gap-1">
      {icon && <Ic size={20} className="flex-shrink-0" style={{ color: color ?? "rgba(255,255,255,0.6)" }} />}
      <span className="text-[14px] font-normal leading-5 text-white">{sub}</span>
    </div>
  );
}

function MetricCard({ m }: { m: Metric }) {
  return (
    <div
      className="flex-1 flex flex-col justify-between min-w-0 rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)", padding: 12 }}
    >
      {/* top: number + label row, then visual dots — gap-2 (8px) between */}
      <div className="flex flex-col gap-2 items-start flex-shrink-0">
        <div className="flex gap-2 items-end">
          <span className="font-semibold" style={{ color: "#f4f4f5", fontSize: 32, lineHeight: "40px" }}>{m.num}</span>
          <div className="flex items-center justify-center" style={{ paddingBottom: 3 }}>
            <span className="font-normal whitespace-nowrap" style={{ color: "#d4d4d8", fontSize: 14, lineHeight: "20px" }}>{m.label}</span>
          </div>
        </div>
        <VisualBlock v={m.visual} />
      </div>
      {/* bottom: sub-label, pinned to bottom by justify-between */}
      {m.sub && <SubRow sub={m.sub} icon={m.subIcon} color={m.subColor} />}
    </div>
  );
}

function DetailedJobCard({ job, onClick }: { job: typeof JOBS[0]; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`flex flex-col gap-3 flex-1 min-h-0 overflow-hidden w-full text-left${onClick ? " transition-opacity hover:opacity-90 active:opacity-75" : ""}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        padding: 16,
        borderRadius: 12,
      }}
    >
      {/* Header: gap-1 (4px) between title row and meta row */}
      <div className="flex flex-col gap-1 flex-shrink-0 w-full">
        {/* Title + status dots/label */}
        <div className="flex items-center justify-between w-full">
          <p className="text-base font-semibold leading-6" style={{ color: "#fafafa" }}>{job.title}</p>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {job.dots.map((color, i) => (
                <span key={i} className="size-3 rounded-full flex-shrink-0" style={{ background: color }} />
              ))}
            </div>
            <span className="text-[14px] font-normal leading-5 text-center" style={{ color: "#d4d4d8" }}>{job.status}</span>
          </div>
        </div>
        {/* Meta row: text • text • text with 4px dot separators, gap-3 (12px) between all */}
        <div className="flex items-center gap-3">
          {job.metaParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="size-1 rounded-full flex-shrink-0" style={{ background: "#d4d4d8" }} />}
              <span className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>{part}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
      {/* Metrics row: flex-1, default items-stretch ensures both cards same height */}
      <div className="flex gap-4 flex-1 w-full" style={{ minHeight: 1 }}>
        <MetricCard m={job.left} />
        <MetricCard m={job.right} />
      </div>
    </Tag>
  );
}

const CAL_ROWS = [
  CAL.slice(0, 7),
  CAL.slice(7, 14),
  CAL.slice(14, 21),
  CAL.slice(21, 28),
  CAL.slice(28, 35),
  CAL.slice(35, 42),
];

function MiniCalendar() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Month header — 16px semibold, chevrons */}
      <div className="flex items-center justify-between pr-2">
        <span className="text-base font-semibold text-white leading-6">June 2026</span>
        <div className="flex gap-1">
          <button type="button" className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65">
            <ChevronLeft size={14} />
          </button>
          <button type="button" className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {/* Sub-container: weekday row + date grid — no gap between them → H: 36+244=280px */}
      <div className="flex flex-col items-center w-full">
        {/* Weekday headers — 12px, #f4f4f5, size-9 cells, justify-between */}
        <div className="flex items-start justify-between w-full">
          {CAL_HEADS.map((h, i) => (
            <div key={i} className="size-9 flex items-center justify-center text-[12px] font-normal leading-4" style={{ color: "#f4f4f5" }}>{h}</div>
          ))}
        </div>
        {/* Date grid — flex rows, gap-1 (4px) between rows, pb-2 (8px) */}
        <div className="flex flex-col gap-1 pb-2 items-center w-full">
          {CAL_ROWS.map((row, ri) => (
            <div key={ri} className="flex items-start justify-between w-full">
              {row.map((c, ci) => (
                <div key={ci} className="relative size-9 flex items-center justify-center">
                  <span
                    className="size-9 flex items-center justify-center text-[14px] font-normal leading-5 rounded-full"
                    style={
                      !c.other && c.d === TODAY_D
                        ? { background: "#1ed25e", color: "#0d1117", fontWeight: 600 }
                        : c.other
                        ? { color: "#71717b" }
                        : { color: "#f4f4f5" }
                    }
                  >
                    {c.d}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── status helpers ──────────────────────────────────────────────────────── */
function statusDotColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "open")       return "#1ed25e";
  if (s === "interviewing")                  return "#f97316";
  if (s === "screening")                     return "#51a2ff";
  if (s === "closed" || s === "completed")   return "rgba(255,255,255,0.35)";
  return "#a78bfa";
}

function statusDotCount(status: string): { solid: number; faded: number } {
  const s = status.toLowerCase();
  if (s === "active" || s === "open")       return { solid: 4, faded: 0 };
  if (s === "interviewing")                  return { solid: 3, faded: 1 };
  if (s === "screening")                     return { solid: 2, faded: 2 };
  if (s === "closed" || s === "completed")   return { solid: 1, faded: 3 };
  return { solid: 2, faded: 2 };
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)       return "just now";
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

function buildMeta(job: JobPostingResponse): string {
  const parts: string[] = [];
  if (job.department) parts.push(job.department);
  if (job.location)   parts.push(job.location);
  parts.push(relativeDate(job.created_at));
  return parts.join(" · ");
}

/* ── live job posting card — matches Figma 4812:41693 ────────────────────── */
// Renders a real JobPostingResponse in the same rich format as the mock
// DetailedJobCard: title/meta header, status dots stacked above label,
// two metric sub-cards (screened + talent pool), and a bottom sub-label.
// For newly posted jobs the counts start at 0; they will grow over time.
function LiveJobCard({ job, onClick }: { job: JobPostingResponse; onClick?: () => void }) {
  const dotColor = statusDotColor(job.status);
  let { solid, faded } = statusDotCount(job.status);

  // Meta parts separated by bullet dots (matches Figma separator style)
  const metaParts: string[] = [];
  if (job.department) metaParts.push(job.department);
  if (job.location)   metaParts.push(job.location);
  metaParts.push(relativeDate(job.created_at));

  // For any AI Developer job the dashboard tile always shows the "just posted"
  // state: 0 screened applicants, 13 in talent pool.  The actual per-stage
  // candidate counts live inside the job detail view (Screening / Shortlisted
  // tabs), not on this overview card.
  // Match any variant: "Senior AI Developer", "Mid-level AI Developer", "AI Developer", etc.
  const isAIDev = /ai\s*developer/i.test(job.title);

  const screened    = 0;
  const shortlisted = isAIDev ? 5 : 0;
  const talentPool  = isAIDev ? 13 : 0;
  const suggestions = 0;

  // No colored progression dots on the overview tile — keep it clean
  const dotColors: string[] = Array(solid).fill(dotColor);

  // Colorful grid squares — blue/purple mix for screened, all-purple for pool
  // Renders up to `max` squares; shows a faint dash when count is 0
  function GridDots({ count, max, colors }: { count: number; max: number; colors: string[] }) {
    if (count === 0) return <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {Array.from({ length: Math.min(count, max) }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 12, height: 12, borderRadius: 4, flexShrink: 0,
              background: colors[Math.floor((i / Math.min(count, max)) * colors.length)],
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all hover:scale-[1.005] active:scale-[0.998]"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        flex: "1 1 0",
        minHeight: 0,
      }}
    >
      {/* ── Header: title + status (stacked) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px", margin: 0 }}>
            {job.title}
          </p>
          {/* Status: dots row on top, label below — matches Figma node 4812:41706 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 12 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {dotColors.map((color, i) => (
                <span key={`dot-${i}`} style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
              ))}
              {Array.from({ length: faded }).map((_, i) => (
                <span key={`f-${i}`} style={{ width: 12, height: 12, borderRadius: "50%", background: "#71717b", flexShrink: 0 }} />
              ))}
            </div>
            <span style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>
              {statusLabel(job.status)}
            </span>
          </div>
        </div>

        {/* Meta row: Engineering • Jeddah • just now — Figma node 4812:41713 */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
          {metaParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4d4d8", flexShrink: 0, margin: "0 12px" }} />
              )}
              <span style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>{part}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Two metric sub-cards ── */}
      <div style={{ display: "flex", gap: 16, width: "100%", flex: "1 1 0", minHeight: 0 }}>
        {/* Left — screened applicants */}
        <div style={{
          background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16,
          flex: "1 0 0", minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Big number + label */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 600, color: "#f4f4f5", lineHeight: "48px" }}>{screened}</span>
              <span style={{ fontSize: 16, color: "#d4d4d8", paddingBottom: 5 }}>screened applicants</span>
            </div>
            {/* Grid dots: blue → purple gradient for screened */}
            <GridDots count={screened} max={8} colors={["#3689ff", "#3689ff", "#3689ff", "#9e36ff", "#9e36ff"]} />
          </div>
          {/* Bottom sub-label */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Users size={16} style={{ color: "rgba(255,255,255,0.6)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "#fff" }}>{shortlisted} shortlisted</span>
          </div>
        </div>

        {/* Right — talent pool */}
        <div style={{
          background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16,
          flex: "1 0 0", minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Big number + label */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 600, color: "#f4f4f5", lineHeight: "48px" }}>{talentPool}</span>
              <span style={{ fontSize: 16, color: "#d4d4d8", paddingBottom: 5 }}>talent pool</span>
            </div>
            {/* Grid dots: all purple for talent pool */}
            <GridDots count={talentPool} max={13} colors={["#9e36ff"]} />
          </div>
          {/* Bottom sub-label */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Users size={16} style={{ color: "rgba(255,255,255,0.6)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "#fff" }}>{suggestions} new suggestions</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── job-matching-service job card (by-poster endpoint) ──────────────────── */
function LiveMockJobCard({ job, onClick }: { job: MockJobResponse; onClick?: () => void }) {
  const skillCount = (job.required_skills?.length ?? 0) + (job.recommended_skills?.length ?? 0);

  return (
    <button type="button" onClick={onClick} className="rounded-xl p-4 w-full text-left transition-all hover:scale-[1.01] active:scale-[0.99]" style={CARD}>
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-tight truncate">{job.title}</p>
          <p className="text-[10px] text-white/40 mt-0.5">
            {[job.company, job.location, job.category].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {job.salary_range && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <DollarSign size={9} className="flex-shrink-0" />
            {job.salary_range}
          </span>
        )}
        {skillCount > 0 && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            {skillCount} skills required
          </span>
        )}
      </div>

      {job.description && (
        <p className="text-[10px] text-white/35 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
      )}

      {job.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {job.required_skills.slice(0, 4).map((s) => (
            <span
              key={s.name}
              className="px-1.5 py-0.5 rounded text-[9px] text-white/50"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              {s.name}
            </span>
          ))}
          {job.required_skills.length > 4 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] text-white/35">
              +{job.required_skills.length - 4} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/* ── candidate types & shared data ──────────────────────────────────────── */
interface Candidate {
  id: string;
  name: string;
  role: string;
  score: number;
  avatar: string;
  status: string;
  statusBg: string;
  statusColor: string;
  insight: string;
  bullets: string[];
  cta: string;
  ctaGreen?: boolean;
}

/* 3 candidates currently in Screening — scores descending */
const SCREENING_CANDIDATES: Candidate[] = [
  {
    id: "s1",
    name: "Layla Hassan",
    role: "AI Practitioner",
    score: 84,
    avatar: "https://ui-avatars.com/api/?name=Layla+Hassan&background=2a3a6e&color=fff&size=80",
    status: "In screening",
    statusBg: "rgba(158,54,255,0.12)",
    statusColor: "#a855f7",
    insight: "Layla's profile matches 84% of the role requirements. Strong background in applied ML and data pipelines.",
    bullets: ["Based in Riyadh", "3 years experience with PyTorch and production ML systems."],
    cta: "Move to Shortlist",
  },
  {
    id: "s2",
    name: "Khalid Mansour",
    role: "AI Practitioner",
    score: 79,
    avatar: "https://ui-avatars.com/api/?name=Khalid+Mansour&background=1e3a4a&color=fff&size=80",
    status: "In screening",
    statusBg: "rgba(158,54,255,0.12)",
    statusColor: "#a855f7",
    insight: "Khalid has solid experience with model evaluation and MLflow. Preferred skills partially met.",
    bullets: ["Based in Jeddah", "Experienced with Scikit-learn and SQL data pipelines."],
    cta: "Move to Shortlist",
  },
  {
    id: "s3",
    name: "Reem Saleh",
    role: "AI Practitioner",
    score: 72,
    avatar: "https://ui-avatars.com/api/?name=Reem+Saleh&background=3a2a4e&color=fff&size=80",
    status: "In screening",
    statusBg: "rgba(158,54,255,0.12)",
    statusColor: "#a855f7",
    insight: "Reem meets all must-have criteria. Nice-to-have skills (LLM fine-tuning) not yet demonstrated.",
    bullets: ["Based in Riyadh", "Recent MSc in AI — strong academic track record."],
    cta: "Move to Shortlist",
  },
];

/* 5 candidates in Shortlisted — scores descending */
const SHORTLIST: Candidate[] = [
  {
    id: "1",
    name: "Nora Ahmed",
    role: "AI Practitioner",
    score: 97,
    avatar: "https://ui-avatars.com/api/?name=Nora+Ahmed&background=1a3a5c&color=fff&size=80",
    status: "Yet to apply",
    statusBg: "rgba(255,255,255,0.07)",
    statusColor: "rgba(255,255,255,0.5)",
    insight: "We've let Nora know she's a shortlisted candidate. trAIn will alert you if she applies.",
    bullets: ["Based in Jeddah", "Strongest applicant in all 'must-have' skills for this role."],
    cta: "Invited to apply",
    ctaGreen: true,
  },
  {
    id: "2",
    name: "Sara Khalid",
    role: "AI Practitioner",
    score: 93,
    avatar: "/sara-khalid.png",
    status: "Top applicant",
    statusBg: "rgba(30,210,94,0.12)",
    statusColor: "#1ed25e",
    insight: "Sara is the strongest candidate of 57 applicants for this role. Consider booking an interview.",
    bullets: ["Based in Jeddah", "Very strong in both Generative AI and Prompt Engineering."],
    cta: "Book AI interview",
  },
  {
    id: "3",
    name: "Omar Abdul",
    role: "AI Practitioner",
    score: 88,
    avatar: "https://ui-avatars.com/api/?name=Omar+Abdul&background=3a2a6e&color=fff&size=80",
    status: "Strong fit",
    statusBg: "rgba(81,162,255,0.12)",
    statusColor: "#51a2ff",
    insight: "Omar's Generative AI skills aren't as strong as Sara, but he is otherwise a strong fit.",
    bullets: ["Based in Riyadh, but open to moving to Jeddah.", "Expert in SQL and Kubernetes."],
    cta: "Book AI interview",
  },
  {
    id: "4",
    name: "Fatima Al-Rashid",
    role: "AI Practitioner",
    score: 85,
    avatar: "https://ui-avatars.com/api/?name=Fatima+Al-Rashid&background=1a4a3c&color=fff&size=80",
    status: "Strong fit",
    statusBg: "rgba(81,162,255,0.12)",
    statusColor: "#51a2ff",
    insight: "Fatima brings strong Python and PyTorch skills with two years of production AI deployment experience.",
    bullets: ["Based in Jeddah", "Published research in transformer architectures."],
    cta: "Book AI interview",
  },
  {
    id: "5",
    name: "Yousef Nasser",
    role: "AI Practitioner",
    score: 81,
    avatar: "https://ui-avatars.com/api/?name=Yousef+Nasser&background=3a3a1e&color=fff&size=80",
    status: "Good match",
    statusBg: "rgba(245,158,11,0.12)",
    statusColor: "#f59e0b",
    insight: "Yousef covers all must-have skills and several preferred ones. Less experience with MLflow.",
    bullets: ["Based in Riyadh", "Strong model evaluation and Scikit-learn background."],
    cta: "Book AI interview",
  },
];

/* ── candidate card (shared by Screening and Shortlisted tabs) ───────────── */
function CandidateCard({ c, onInvite, inviting }: { c: Candidate; onInvite?: () => void; inviting?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={CARD}>
      {/* avatar + name + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <img
            src={c.avatar} alt={c.name}
            className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=2a3a5c&color=fff&size=80`;
            }}
          />
          <div>
            <div className="flex items-center gap-1">
              <p className="text-[13px] font-semibold text-white leading-tight">{c.name}</p>
              <Star size={11} className="flex-shrink-0" style={{ color: "#f59e0b", fill: "#f59e0b" }} />
            </div>
            <p className="text-[10px] text-white/45 mt-0.5">{c.role}</p>
          </div>
        </div>
        {/* score ring */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ border: "2px solid var(--accent)", background: "rgba(30,210,94,0.08)" }}
        >
          <span className="text-[15px] font-bold" style={{ color: "var(--accent)" }}>{c.score}</span>
        </div>
      </div>

      {/* status badge */}
      <span
        className="self-start px-2 py-0.5 rounded-md text-[10px] font-medium"
        style={{ background: c.statusBg, color: c.statusColor }}
      >
        {c.status}
      </span>

      {/* insight */}
      <p className="text-[11px] text-white/55 leading-relaxed">{c.insight}</p>

      {/* bullets */}
      <ul className="flex flex-col gap-1">
        {c.bullets.map((b, i) => (
          <li key={i} className="text-[10px] text-white/45 flex items-start gap-1.5">
            <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.3)" }} />
            {b}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        disabled={inviting}
        onClick={onInvite}
        className="mt-auto w-full py-2 rounded-lg text-[11px] font-medium transition-all"
        style={
          inviting
            ? { background: "rgba(30,210,94,0.06)", border: "1px solid rgba(30,210,94,0.2)", color: "rgba(30,210,94,0.5)", cursor: "not-allowed" }
            : c.ctaGreen
            ? { background: "rgba(30,210,94,0.1)", border: "1px solid rgba(30,210,94,0.3)", color: "#1ed25e" }
            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
        }
      >
        {inviting ? "Sending invite…" : c.cta}
      </button>
    </div>
  );
}

/* ── job detail view (sidebar + tabs) ───────────────────────────────────── */
type SelectedJob = { id: string; title: string; department: string; location: string; status: string; posted_at?: string };

const DETAIL_TABS = [
  { key: "screened",   label: "Screening",  count: 3  },
  { key: "shortlist",  label: "Shortlisted", count: 5 },
  { key: "interview",  label: "Interview",  count: null },
  { key: "hire",       label: "Hire",       count: null },
] as const;

type DetailTab = typeof DETAIL_TABS[number]["key"];

function JobDetailView({
  job,
  allJobs,
  onBack,
  onSwitchJob,
}: {
  job: SelectedJob;
  allJobs: JobPostingResponse[];
  onBack: () => void;
  onSwitchJob: (j: SelectedJob) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("shortlist");

  // Invite-to-screening state: tracks which candidate id is being invited
  // and whether Sara has already landed in Screening after the ~5s transition.
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [screeningExtra, setScreeningExtra] = useState<Candidate[]>([]);
  const [removedFromShortlist, setRemovedFromShortlist] = useState<Set<string>>(new Set());
  const inviteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic tab counts based on invite state
  const screeningCount = SCREENING_CANDIDATES.length + screeningExtra.length;
  const shortlistCount = SHORTLIST.filter((c) => !removedFromShortlist.has(c.id)).length;

  const dynamicTabs = DETAIL_TABS.map((t) => ({
    ...t,
    count: t.key === "screened" ? screeningCount : t.key === "shortlist" ? shortlistCount : t.count,
  }));

  function handleInvite(candidate: Candidate) {
    if (invitingId) return;
    setInvitingId(candidate.id);

    inviteTimerRef.current = setTimeout(() => {
      // Move candidate to Screening at the top (score-sorted: Sara=93 > 84 > 79 > 72)
      setScreeningExtra((prev) => {
        const alreadyIn = prev.some((c) => c.id === candidate.id);
        if (alreadyIn) return prev;
        // Insert in descending score order
        const updated = [...prev, { ...candidate, status: "In screening", statusBg: "rgba(158,54,255,0.12)", statusColor: "#a855f7", cta: "Move to Shortlist", ctaGreen: false }];
        updated.sort((a, b) => b.score - a.score);
        return updated;
      });
      setRemovedFromShortlist((prev) => new Set([...prev, candidate.id]));
      setInvitingId(null);
      // Auto-switch to Screening tab to show the arrival
      setTab("screened");
    }, 5000);
  }

  useEffect(() => {
    return () => { if (inviteTimerRef.current) clearTimeout(inviteTimerRef.current); };
  }, []);

  // Merged screening list: invited candidates merged with original screening candidates,
  // deduplicated, then explicitly sorted by score descending so order is always correct.
  const allScreeningCandidates: Candidate[] = (() => {
    const combined = [...screeningExtra, ...SCREENING_CANDIDATES];
    const seen = new Set<string>();
    const deduped = combined.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    return deduped.sort((a, b) => b.score - a.score);
  })();

  const activeJobs    = allJobs.filter((j) => { const s = j.status.toLowerCase(); return s !== "closed" && s !== "completed"; });
  const completedJobs = allJobs.filter((j) => { const s = j.status.toLowerCase(); return s === "closed" || s === "completed"; });

  function sidebarJob(j: JobPostingResponse) {
    return { id: j.id, title: j.title, department: j.department || "", location: j.location || "", status: j.status, posted_at: relativeDate(j.created_at) };
  }

  return (
    <div className="flex gap-0 h-full min-h-0" style={{ minHeight: 0 }}>

      {/* ── sidebar ── */}
      <div
        className="w-52 flex-shrink-0 flex flex-col gap-1 overflow-y-auto pr-3 py-1"
        style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2 px-1">Job Postings</p>

        {activeJobs.length > 0 && (
          <>
            <p className="text-[9px] text-white/25 px-1 mb-1">Active</p>
            {activeJobs.map((j) => (
              <button
                key={j.id} type="button"
                onClick={() => onSwitchJob(sidebarJob(j))}
                className="w-full text-left px-2.5 py-2 rounded-lg transition-colors"
                style={{ background: j.id === job.id ? "rgba(255,255,255,0.1)" : "transparent" }}
              >
                <p className="text-[12px] font-medium text-white leading-snug">{j.title}</p>
                <p className="text-[9px] text-white/35 mt-0.5">
                  {[j.department, j.location, relativeDate(j.created_at)].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </>
        )}

        {completedJobs.length > 0 && (
          <>
            <p className="text-[9px] text-white/25 px-1 mt-3 mb-1">Completed</p>
            {completedJobs.map((j) => (
              <button
                key={j.id} type="button"
                onClick={() => onSwitchJob(sidebarJob(j))}
                className="w-full text-left px-2.5 py-2 rounded-lg transition-colors opacity-60"
                style={{ background: j.id === job.id ? "rgba(255,255,255,0.1)" : "transparent" }}
              >
                <p className="text-[12px] font-medium text-white leading-snug">{j.title}</p>
                <p className="text-[9px] text-white/35 mt-0.5">
                  {[j.department, j.location, relativeDate(j.created_at)].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── main content ── */}
      <div className="flex-1 min-w-0 pl-5 flex flex-col overflow-y-auto relative">

        {/* breadcrumb */}
        <div className="flex items-center gap-1.5 mb-4">
          <button type="button" onClick={onBack} className="text-[12px] text-white/40 hover:text-white/70 transition-colors">
            Hiring
          </button>
          <ChevronRight size={12} className="text-white/25" />
          <span className="text-[12px] text-white">{job.title}</span>
        </div>

        {/* job header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">{job.title}</h2>
            <p className="text-[11px] text-white/45 mt-1">
              {[job.department, job.location, job.posted_at].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-white/35 hover:text-white/65 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Pencil size={13} />
          </button>
        </div>

        {/* tab bar */}
        <div
          className="flex gap-1 mb-5 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {dynamicTabs.map((t) => (
            <button
              key={t.key} type="button"
              onClick={() => setTab(t.key)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{
                background: tab === t.key ? "rgba(255,255,255,0.13)" : "transparent",
                color:      tab === t.key ? "white" : "rgba(255,255,255,0.4)",
              }}
            >
              {t.label}
              {t.count !== null && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-md"
                  style={{ background: tab === t.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)" }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Screening tab ── */}
        {tab === "screened" && (
          <div className="flex flex-col gap-4 pb-16">
            {/* AI insight banner */}
            <div
              className="rounded-xl p-3.5 flex items-start gap-2.5"
              style={{ background: "rgba(158,54,255,0.07)", border: "1px solid rgba(158,54,255,0.22)" }}
            >
              <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#a855f7" }} />
              <p className="text-[11px] text-white/65 leading-relaxed">
                <span style={{ color: "#a855f7" }}>{screeningCount} candidate{screeningCount !== 1 ? "s" : ""} currently in screening.</span>{" "}
                Scores are shown in descending order. Move strong candidates to the Shortlisted tab.
              </p>
            </div>

            {/* candidate cards — sorted by score descending, invited ones animate in */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AnimatePresence initial={false}>
                {allScreeningCandidates.map((c) => {
                  const isNew = screeningExtra.some((e) => e.id === c.id);
                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={isNew ? { opacity: 0, y: -24, scale: 0.96 } : false}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <CandidateCard c={c} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Shortlisted tab ── */}
        {tab === "shortlist" && (
          <div className="flex flex-col gap-4 pb-16">
            {/* AI insight banner */}
            <div
              className="rounded-xl p-3.5 flex items-start gap-2.5"
              style={{ background: "rgba(30,210,94,0.07)", border: "1px solid rgba(30,210,94,0.18)" }}
            >
              <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#1ed25e" }} />
              <p className="text-[11px] text-white/65 leading-relaxed">
                <span style={{ color: "#1ed25e" }}>Nora is the top candidate overall, with a 97% skill match.</span>{" "}
                Of those who already applied, Sara is the standout, thanks to her skills in Generative AI and Prompt Engineering.
              </p>
            </div>

            {/* candidate cards — sorted by score descending; invited candidates fade out */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AnimatePresence>
                {SHORTLIST.filter((c) => !removedFromShortlist.has(c.id)).map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    exit={{ opacity: 0, scale: 0.92, y: 12 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 1, 1] }}
                  >
                    <CandidateCard
                      c={c}
                      inviting={invitingId === c.id}
                      onInvite={c.cta === "Book AI interview" ? () => handleInvite(c) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Chat about shortlist — sticky bottom-right */}
            <div className="sticky bottom-0 flex justify-end pt-2">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-semibold shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{ background: "var(--accent)", color: "#0d1117" }}
              >
                <MessageCircle size={14} />
                Chat about shortlist
              </button>
            </div>
          </div>
        )}

        {/* ── Interview tab ── */}
        {tab === "interview" && (
          <div className="rounded-xl p-8 flex flex-col items-center gap-2 text-center" style={CARD}>
            <p className="text-[14px] font-medium text-white/60">No interviews scheduled</p>
            <p className="text-[11px] text-white/35">Shortlisted candidates you invite will appear here.</p>
          </div>
        )}

        {/* ── Hire tab ── */}
        {tab === "hire" && (
          <div className="rounded-xl p-8 flex flex-col items-center gap-2 text-center" style={CARD}>
            <p className="text-[14px] font-medium text-white/60">No hire decisions yet</p>
            <p className="text-[11px] text-white/35">Move candidates from Interview to track offers and decisions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Default poster identifier — replace with the authenticated employer's ID when auth is available. */
const DEFAULT_POSTER = "default";

interface HiringPageProps {
  onSelectJob?: (jobId: string, job: { title: string; department: string; location: string; status: string; posted_at?: string }) => void;
  /** Called when the user clicks "Post a Job" — parent opens the wizard. */
  onPostJob?: () => void;
  /** Pre-fetched job postings from parent — when provided, skips internal fetch. */
  apiJobs?: JobPostingResponse[];
  /** Loading state for pre-fetched jobs. */
  apiJobsLoading?: boolean;
}

export function HiringPage({ onSelectJob, onPostJob, apiJobs: externalJobs, apiJobsLoading: externalLoading }: HiringPageProps = {}) {
  const [role, setRole] = useState(ROLES[0]);
  const [jobTab, setJobTab]     = useState<"Active" | "Completed">("Active");
  const [jobSource, setJobSource] = useState<"mine" | "posted">("mine");
  const [ivTab, setIvTab]       = useState<"For you" | "All Interviews">("For you");
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);

  /* live job postings — from employer DB */
  const [internalJobs, setInternalJobs] = useState<JobPostingResponse[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [jobsError, setError]     = useState<string | null>(null);

  const hasExternalJobs = externalJobs !== undefined;
  const apiJobs = hasExternalJobs ? externalJobs : internalJobs;
  const jobsLoading = hasExternalJobs ? (externalLoading ?? false) : internalLoading;

  /* by-poster jobs — from job-matching service */
  const [posterJobs, setPosterJobs]         = useState<MockJobResponse[]>([]);
  const [posterLoading, setPosterLoading]   = useState(false);
  const [posterError, setPosterError]       = useState<string | null>(null);

  useEffect(() => {
    if (hasExternalJobs) return;
    let cancelled = false;
    setInternalLoading(true);
    setError(null);
    
    import('@/lib/mcpBridge').then(({ listJobPostings }) => {
      return listJobPostings(5, 0);
    })
      .then((data) => { if (!cancelled) setInternalJobs(data.items ?? []); })
      .catch((e: unknown) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setInternalLoading(false); });
    
    return () => { cancelled = true; };
  }, [hasExternalJobs]);

  useEffect(() => {
    if (jobSource !== "posted") return;
    let cancelled = false;
    setPosterLoading(true);
    setPosterError(null);
    
    import('@/lib/mcpBridge').then(({ listJobPostingsByPoster }) => {
      return listJobPostingsByPoster(DEFAULT_POSTER, 100, 0);
    })
      .then((data) => { if (!cancelled) setPosterJobs(data.jobs ?? []); })
      .catch((e: unknown) => { if (!cancelled) setPosterError(String(e)); })
      .finally(() => { if (!cancelled) setPosterLoading(false); });
    
    return () => { cancelled = true; };
  }, [jobSource]);

  const filteredJobs = apiJobs.filter((j) => {
    const s = j.status.toLowerCase();
    if (jobTab === "Active") return s !== "closed" && s !== "completed";
    return s === "closed" || s === "completed";
  });

  /* ── job detail view ── */
  if (selectedJob) {
    return (
      <motion.div
        key={selectedJob.id}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 min-h-0 overflow-hidden flex flex-col px-3 pt-3 pb-4"
      >
        <JobDetailView
          job={selectedJob}
          allJobs={apiJobs}
          onBack={() => setSelectedJob(null)}
          onSwitchJob={(j) => setSelectedJob(j)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-h-0 overflow-hidden flex flex-col"
    >
      <div className="flex flex-col items-center gap-10 px-8 pb-10 flex-1 min-h-0">

        {/* ── header ── */}
        <div className="flex items-center justify-between flex-shrink-0 w-full">
          <h1 className="text-[40px] font-semibold text-white leading-[48px]">Hiring</h1>
          <div className="flex gap-4">
            <button
              type="button"
              className="h-10 px-4 rounded-[100px] text-base font-semibold text-[#f4f4f5] transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              Browse Talent
            </button>
            <button
              type="button"
              onClick={() => onPostJob?.()}
              className="h-10 px-4 rounded-[100px] text-base font-semibold text-[#f4f4f5] transition-opacity hover:opacity-90 active:scale-[0.97]"
              style={{ background: "rgba(29,197,88,0.5)" }}
            >
              Post a Job
            </button>
          </div>
        </div>

        {/* ── main layout: left content (flex-1) + right panel (316px fixed) ── */}
        <div className="flex gap-6 flex-1 min-h-0 w-full">

          {/* ── Left content ── */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-6">

            {/* Top stats row — flex: Pipeline(flex-1) + Avg time(204px) + Avg skill(204px), gap-6 */}
            <div className="flex gap-6 flex-shrink-0">

              {/* Pipeline — fills remaining width */}
              <Card className="flex-1 flex flex-col justify-between" style={{ height: 204 }}>
                {/* header */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-normal leading-6" style={{ color: "#d4d4d8" }}>Pipeline</span>
                  <div className="ml-auto flex gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r} type="button"
                        onClick={() => setRole(r)}
                        className="px-3 py-1 rounded-full text-sm font-normal leading-5 transition-colors"
                        style={{
                          background: role === r ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                          color: "#f4f4f5",
                          border: role === r ? "1px solid rgba(255,255,255,0.1)" : "none",
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {/* count */}
                <div className="flex items-end gap-2">
                  <span className="text-[48px] font-semibold leading-[56px]" style={{ color: "#fafafa" }}>107</span>
                  <span className="text-base font-normal leading-6 pb-[7px]" style={{ color: "#d4d4d8" }}>applicants</span>
                </div>
                {/* bar + legend */}
                <div className="flex flex-col gap-3">
                  <div className="h-3 rounded-full overflow-hidden flex gap-px">
                    {BAR.map((s, i) => (
                      <div
                        key={s.label}
                        className="h-full"
                        style={{
                          width: `${s.pct}%`,
                          background: s.color,
                          borderRadius: i === 0 ? "100px 0 0 100px" : i === BAR.length - 1 ? "0 100px 100px 0" : undefined,
                        }}
                      />
                    ))}
                  </div>
                  {/* legend */}
                  <div className="flex items-center gap-4">
                    {BAR.map((s) => (
                      <span key={s.label} className="flex items-center gap-1.5 text-[12px] font-normal leading-4" style={{ color: "#d4d4d8" }}>
                        <span className="size-3 rounded-[4px] flex-shrink-0" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Avg. time to match — 204px fixed */}
              <Card className="w-[204px] flex-shrink-0 flex flex-col justify-between" style={{ height: 204 }}>
                <span className="text-base text-white/55">Avg. time to match</span>
                <div className="flex items-end gap-2">
                  <span className="text-[48px] font-semibold leading-none" style={{ color: "#1dc558" }}>4.2</span>
                  <span className="text-base text-white/55 pb-1">days</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowDown size={16} style={{ color: "#1dc558" }} />
                  <span className="text-sm text-white">15% from last month</span>
                </div>
              </Card>

              {/* Avg. skill readiness — 204px fixed */}
              <Card className="w-[204px] flex-shrink-0 flex flex-col justify-between" style={{ height: 204 }}>
                <span className="text-base text-white/55">Avg. skill readiness</span>
                <div className="flex items-end gap-2">
                  <span className="text-[48px] font-semibold leading-none" style={{ color: "#ff9040" }}>79</span>
                  <span className="text-base text-white/55 pb-1">%</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowDown size={16} style={{ color: "#ff4040" }} />
                  <span className="text-sm text-white">5% this month</span>
                </div>
              </Card>

            </div>{/* end top stats row */}

            {/* Bottom row — Job Postings (flex-1) + Hiring Intelligence (367px) */}
            <div className="flex gap-6 flex-1 min-h-0">

              {/* Job Postings — flex-1 (takes ~533px) */}
              <div className="flex-1 flex flex-col gap-6 rounded-2xl p-5 min-h-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-normal leading-6" style={{ color: "#d4d4d8" }}>Job Postings</h2>
                  <div className="flex gap-2">
                    {(["Active", "Completed"] as const).map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setJobTab(t)}
                        className="px-3 py-1 rounded-full text-sm font-normal leading-5 transition-colors"
                        style={{
                          background: jobTab === t ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                          color: "#f4f4f5",
                          border: jobTab === t ? "1px solid rgba(255,255,255,0.1)" : "none",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading state */}
                {jobsLoading && (
                  <div className="flex flex-col gap-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-xl p-4 animate-pulse" style={CARD}>
                        <div className="h-3 rounded w-2/3 mb-2" style={{ background: "rgba(255,255,255,0.1)" }} />
                        <div className="h-2 rounded w-1/2" style={{ background: "rgba(255,255,255,0.06)" }} />
                      </div>
                    ))}
                  </div>
                )}
                {!jobsLoading && jobsError && (
                  <div className="rounded-xl p-4 text-[12px] text-red-400/80" style={CARD}>
                    Could not load job postings: {jobsError}
                  </div>
                )}

                {/* ── Job postings list — always show both mock cards to match Figma ── */}
                {jobTab === "Active" && (
                  <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <DetailedJobCard
                      job={JOBS[0]}
                      onClick={() => onSelectJob?.("mock-senior-ai-dev", {
                        title: JOBS[0].title,
                        department: JOBS[0].metaParts[0],
                        location: JOBS[0].metaParts[1],
                        status: JOBS[0].status,
                        posted_at: JOBS[0].metaParts[2],
                      })}
                    />
                    <DetailedJobCard
                      job={JOBS[1]}
                      onClick={() => onSelectJob?.("mock-cloud-engineer", {
                        title: JOBS[1].title,
                        department: JOBS[1].metaParts[0],
                        location: JOBS[1].metaParts[1],
                        status: JOBS[1].status,
                        posted_at: JOBS[1].metaParts[2],
                      })}
                    />
                  </div>
                )}

                {/* No completed postings placeholder */}
                {!jobsLoading && !jobsError && filteredJobs.length === 0 && jobTab === "Completed" && (
                  <div className="rounded-xl p-6 flex flex-col items-center gap-2 text-center" style={CARD}>
                    <p className="text-[13px] font-medium text-white/60">No completed postings</p>
                    <p className="text-[11px] text-white/35">Completed postings will appear here.</p>
                  </div>
                )}
              </div>

              {/* Hiring Intelligence — 367px fixed, Figma 10726:55251 */}
              <div className="w-[367px] flex-shrink-0 flex flex-col gap-6 rounded-2xl p-5 min-h-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>

                {/* Section header — font-normal, #d4d4d8 + MoreVertical ⋮ icon */}
                <div className="flex items-center justify-between flex-shrink-0">
                  <h2 className="text-base font-normal leading-6" style={{ color: "#d4d4d8" }}>Hiring intelligence</h2>
                  <button type="button" className="text-white/35 hover:text-white/65 flex-shrink-0">
                    <MoreVertical size={20} />
                  </button>
                </div>

                {/* Cards list — flex-1 so it fills remaining height, gap-4 (16px) between cards */}
                <div className="flex flex-col gap-4 flex-1 min-h-0">

                  {/* Card 1 — Pipeline dropoff (flex-1 = equal 1/3 height) */}
                  <div className="rounded-xl p-4 flex flex-col justify-between flex-1 min-h-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <TrendingDown size={20} style={{ color: "#f97316" }} />
                        <p className="text-base font-normal leading-6" style={{ color: "#f4f4f5" }}>Pipeline dropoff</p>
                      </div>
                      <p className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>
                        Based on May&apos;s data, candidates were 15% more likely to drop out of the process when waiting over 7 days between interviews.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full py-2 rounded-lg text-[14px] font-normal leading-5 text-white text-center transition-colors hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      Review schedule
                    </button>
                  </div>

                  {/* Card 2 — AI readiness in Jeddah (flex-1 = equal 1/3 height) */}
                  <div className="rounded-xl p-4 flex flex-col justify-between flex-1 min-h-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={20} style={{ color: "#1ed25e" }} />
                        <p className="text-base font-normal leading-6" style={{ color: "#f4f4f5" }}>AI readiness in Jeddah</p>
                      </div>
                      <p className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>
                        Artificial intelligence graduates in Jeddah are showing a 5% higher skill readiness score than those in Riyadh.
                      </p>
                    </div>
                    <div className="w-full py-2 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <p className="text-[14px] font-normal leading-5 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>No action required.</p>
                    </div>
                  </div>

                  {/* Card 3 — AI Developer compensation (flex-1 = equal 1/3 height) */}
                  <div className="rounded-xl p-4 flex flex-col justify-between flex-1 min-h-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/arrow_upward.png" alt="" width={20} height={20} style={{ flexShrink: 0 }} />
                        <p className="text-base font-normal leading-6" style={{ color: "#f4f4f5" }}>AI Developer compensation</p>
                      </div>
                      <p className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>
                        A talent shortage has seen wage demands increase by 12% this quarter.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <p className="text-[14px] font-normal leading-5">
                        <span className="underline cursor-pointer" style={{ color: "#1dc558" }}>2 listings</span>
                        <span style={{ color: "#f4f4f5" }}> have fallen below the range.</span>
                      </p>
                      <button
                        type="button"
                        className="w-full py-2 rounded-lg text-[14px] font-normal leading-5 text-white text-center transition-colors hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        Update salary range
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>{/* end bottom row */}

          </div>{/* end left content */}

          {/* ── Right panel — Upcoming Interviews, fixed 316px ── */}
          <div
            className="w-[316px] flex-shrink-0 flex flex-col rounded-2xl p-5 self-stretch overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {/* top: title + icon — fixed gap to calendar, never grows */}
            <div className="flex items-center justify-between flex-shrink-0 mb-5">
              <h2 className="text-base font-normal leading-6" style={{ color: "#d4d4d8" }}>Upcoming Interviews</h2>
              <button type="button" className="text-white/35 hover:text-white/65">
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* calendar + toggle + interviews — sits right after the title; spare space goes below */}
            <div className="flex flex-col gap-3 w-full">
              <MiniCalendar />

              {/* toggle — bg rgba(255,255,255,0.05), p-1, gap-2, rounded-[100px] */}
              <div className="flex gap-2 p-1 rounded-[100px] w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                {(["For you","All Interviews"] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setIvTab(t)}
                    className="flex-1 h-8 p-2 rounded-[100px] text-[14px] font-normal leading-5 transition-colors"
                    style={{
                      background: ivTab === t ? "rgba(255,255,255,0.10)" : "transparent",
                      color: "#f4f4f5",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* interview list — flex-col gap-3, each card is flex-col */}
              <div className="flex flex-col gap-3 w-full">
                {IVWS.map((iv, i) => (
                  <div key={i} className="flex flex-col gap-4 rounded-xl p-4 w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    {/* top: avatar + name/role */}
                    <div className="flex gap-3 items-start w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={iv.avatar} alt={iv.name}
                        className="flex-shrink-0 rounded-full object-cover"
                        style={{ width: 44, height: 44 }}
                      />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-base font-normal leading-6" style={{ color: "#fafafa" }}>{iv.name}</p>
                        <p className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>{iv.role}</p>
                      </div>
                    </div>
                    {/* bottom: location + time */}
                    <div className="flex items-end justify-between w-full">
                      <div className="flex items-center gap-1">
                        <MapPin size={16} className="flex-shrink-0" style={{ color: "#d4d4d8" }} />
                        <span className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>{iv.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-normal leading-5" style={{ color: "#f4f4f5" }}>{iv.day}</span>
                        <span>
                          <span className="text-base font-semibold leading-6" style={{ color: "#f4f4f5" }}>{iv.clockTime}</span>
                          {" "}
                          <span className="text-[12px] font-normal leading-4" style={{ color: "#9f9fa9" }}>{iv.ampm}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>{/* end right panel */}

        </div>{/* end main layout */}
      </div>
    </motion.div>
  );
}
