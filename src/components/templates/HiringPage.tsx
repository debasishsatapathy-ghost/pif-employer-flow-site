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

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserPlus,
  UserCheck,
  AlertCircle,
  Briefcase,
  DollarSign,
  Plus,
  Star,
  MessageCircle,
  Sparkles,
  Pencil,
  Users,
  Clock,
  LogOut,
} from "lucide-react";
import {
  type JobPostingResponse,
  type MockJobResponse,
} from "@/lib/employerApi";

/* ── palette ─────────────────────────────────────────────────────────────── */
const CARD = { background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)" };

/* ── pipeline ────────────────────────────────────────────────────────────── */
const ROLES = ["Senior AI Developer", "Cloud Engineer"];
const BAR = [
  { label: "Interview",   color: "#1ed25e", pct: 35 },
  { label: "Shortlisted", color: "#51a2ff", pct: 30 },
  { label: "Screened",    color: "#a78bfa", pct: 25 },
  { label: "Rejected",    color: "rgba(255,255,255,0.22)", pct: 10 },
];

/* ── hiring intelligence ─────────────────────────────────────────────────── */
const INTEL = [
  {
    icon: "down", iconColor: "#f97316",
    title: "Pipeline dropoff",
    body: "Based on May's data, candidates were 15% more likely to drop out of the process when waiting over 7 days between interviews.",
    cta: "Review schedule",
  },
  {
    icon: "up", iconColor: "#1ed25e",
    title: "AI readiness in Jeddah",
    body: "Artificial intelligence graduates in Jeddah are showing a 5% higher skill readiness score than those in Riyadh.",
    noAction: "No action required.",
  },
  {
    icon: "up", iconColor: "#f97316",
    title: "AI Developer compensation",
    body: "A talent shortage has seen wage demands increase by 12% this quarter.",
    note: "2 listings have fallen below the range.",
    cta: "Update salary range",
  },
] as const;

/* ── job postings ────────────────────────────────────────────────────────── */
type Visual =
  | { t: "grid";      color: string; rows: number; cols: number }
  | { t: "grid-seq";  rows: string[][] }   /* explicit rows of hex colors */
  | { t: "squares";   color: string; n: number }
  | { t: "avatars";   n: number }
  | { t: "grid-mixed"; rows: number; cols: number };  /* blue + 1 orange */

interface Metric {
  num: string; label: string; visual: Visual;
  sub?: string; subIcon?: "plus"|"check"|"warn"|"people"|"clock"|"logout"; subColor?: string;
}

const JOBS: {
  title: string; meta: string; status: string;
  dotColors: string[];
  left: Metric; right: Metric;
}[] = [
  {
    title: "Senior AI Developer", meta: "Engineering · Jeddah · 2 days ago",
    status: "Screening",
    dotColors: ["#1dc558", "#71717b", "#71717b", "#71717b"],
    left: {
      num: "8", label: "screened applicants",
      visual: { t: "grid-seq", rows: [["#3689ff","#3689ff","#3689ff","#3689ff","#3689ff","#9e36ff","#9e36ff","#9e36ff"]] },
      sub: "5 shortlisted", subIcon: "people", subColor: "rgba(255,255,255,0.9)",
    },
    right: {
      num: "13", label: "talent pool",
      visual: { t: "grid-seq", rows: [Array(8).fill("#9e36ff"), Array(5).fill("#9e36ff")] },
      sub: "8 new suggestions", subIcon: "people", subColor: "rgba(255,255,255,0.9)",
    },
  },
  {
    title: "Cloud Engineer", meta: "Engineering · Remote · 4 days ago",
    status: "Interviewing",
    dotColors: ["#a5e8bc", "#a5e8bc", "#1dc558", "#71717b"],
    left: {
      num: "6", label: "interviews booked",
      visual: { t: "avatars", n: 6 },
      sub: "2 recently accepted", subIcon: "clock", subColor: "#4ade80",
    },
    right: {
      num: "17", label: "shortlisted",
      visual: { t: "grid-seq", rows: [
        ["#1dc558","#1dc558","#1dc558","#1dc558","#1dc558","#1dc558","#3689ff","#3689ff","#3689ff"],
        ["#3689ff","#3689ff","#3689ff","#3689ff","#3689ff","#3689ff","#3689ff","#ff6b00"],
      ]},
      sub: "1 dropped out", subIcon: "logout", subColor: "#f97316",
    },
  },
];

/* ── interviews ──────────────────────────────────────────────────────────── */
const IVWS = [
  { name: "Sara Khalid",  role: "Senior AI Developer", type: "In-person", time: "Today 10:00",   ampm: "AM", bg: "#2a4a6e", avatar: "https://ui-avatars.com/api/?name=Sara+Khalid&background=2a4a6e&color=fff&size=80" },
  { name: "Rayan Tosan",  role: "Senior AI Developer", type: "In-person", time: "Today 11:00",   ampm: "AM", bg: "#2e5e50", avatar: "https://ui-avatars.com/api/?name=Rayan+Tosan&background=2e5e50&color=fff&size=80" },
  { name: "Rayan Tosan",  role: "Senior AI Developer", type: "In-person", time: "Tomorrow 9:30", ampm: "AM", bg: "#2e5e50", avatar: "https://ui-avatars.com/api/?name=Rayan+T&background=2e5e50&color=fff&size=80" },
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
    <div className={`rounded-xl p-4 ${className}`} style={{ ...CARD, ...style }}>
      {children}
    </div>
  );
}

function Dots({ color, solid, faded }: { color: string; solid: number; faded: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({length: solid}).map((_, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{background: color}} />
      ))}
      {Array.from({length: faded}).map((_, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{background: "rgba(255,255,255,0.25)"}} />
      ))}
    </div>
  );
}

function VisualBlock({ v }: { v: Visual }) {
  if (v.t === "grid-seq") {
    return (
      <div className="flex flex-col gap-1 mt-1">
        {v.rows.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((color, ci) => (
              <span key={ci} className="rounded-sm flex-shrink-0" style={{ background: color, width: 12, height: 12 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (v.t === "grid") {
    return (
      <div className="mt-2" style={{ display: "grid", gridTemplateColumns: `repeat(${v.cols}, 1fr)`, gap: 3 }}>
        {Array.from({length: v.rows * v.cols}).map((_, i) => (
          <span key={i} className="rounded-sm" style={{ background: v.color, aspectRatio: "1", minWidth: 12, minHeight: 12 }} />
        ))}
      </div>
    );
  }
  if (v.t === "squares") {
    return (
      <div className="flex gap-1.5 mt-2">
        {Array.from({length: v.n}).map((_, i) => (
          <span key={i} className="w-5 h-5 rounded-sm flex-shrink-0" style={{background: v.color}} />
        ))}
      </div>
    );
  }
  if (v.t === "avatars") {
    const AVATAR_BG = ["#a5e5e8","#ffbfbf","#a5e8bc","#d7a5e8","#afd0ff","#ffdabf"];
    const inits = ["SK","RT","AK","NM","JD","AB"];
    return (
      <div className="flex mt-2" style={{gap: 0}}>
        {Array.from({length: v.n}).map((_, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[9px] font-bold text-[#09090b] flex-shrink-0"
            style={{ background: AVATAR_BG[i % AVATAR_BG.length], border: "2px solid rgba(9,9,11,0.8)", marginLeft: i === 0 ? 0 : -10, zIndex: v.n - i }}
          >
            {inits[i]}
          </div>
        ))}
      </div>
    );
  }
  /* grid-mixed: cols×rows of blue, last cell orange */
  const total = v.rows * v.cols;
  return (
    <div className="mt-2" style={{ display: "grid", gridTemplateColumns: `repeat(${v.cols}, 1fr)`, gap: 3 }}>
      {Array.from({length: total}).map((_, i) => (
        <span key={i} className="rounded-sm" style={{ background: i === total - 1 ? "#f97316" : "#51a2ff", aspectRatio: "1", minWidth: 12, minHeight: 12 }} />
      ))}
    </div>
  );
}

function SubRow({ sub, icon, color }: { sub: string; icon?: string; color?: string }) {
  const getIc = () => {
    if (icon === "plus")   return <UserPlus size={14} className="flex-shrink-0" />;
    if (icon === "check")  return <UserCheck size={14} className="flex-shrink-0" />;
    if (icon === "warn")   return <AlertCircle size={14} className="flex-shrink-0" />;
    if (icon === "people") return <Users size={14} className="flex-shrink-0" />;
    if (icon === "clock")  return <Clock size={14} className="flex-shrink-0" />;
    if (icon === "logout") return <LogOut size={14} className="flex-shrink-0" />;
    return null;
  };
  return (
    <p className="text-sm flex items-center gap-1.5" style={{color: color ?? "rgba(255,255,255,0.7)"}}>
      {icon && getIc()}
      {sub}
    </p>
  );
}

function MetricCard({ m }: { m: Metric }) {
  return (
    <div className="rounded-xl p-4 flex flex-col justify-between flex-1 gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2 leading-none">
          <span className="text-[40px] font-semibold leading-none text-white">{m.num}</span>
          <span className="text-base text-[#d4d4d8] pb-1">{m.label}</span>
        </div>
        <VisualBlock v={m.visual} />
      </div>
      {m.sub && <SubRow sub={m.sub} icon={m.subIcon} color={m.subColor} />}
    </div>
  );
}

function MiniCalendar() {
  return (
    <div className="rounded-xl p-3" style={CARD}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">June 2026</span>
        <div className="flex gap-0.5">
          <button type="button" className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65">
            <ChevronLeft size={12} />
          </button>
          <button type="button" className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
      {/* Headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {CAL_HEADS.map((h, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-white/30 py-0.5">{h}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7">
        {CAL.map((c, i) => (
          <div key={i} className="flex items-center justify-center" style={{padding: "1px 0"}}>
            <span
              className="w-[22px] h-[22px] flex items-center justify-center text-[10px] font-medium rounded-full"
              style={
                !c.other && c.d === TODAY_D
                  ? { background: "var(--accent)", color: "#0d1117", fontWeight: 700 }
                  : c.other
                  ? { color: "rgba(255,255,255,0.25)" }
                  : { color: "rgba(255,255,255,0.8)" }
              }
            >
              {c.d}
            </span>
          </div>
        ))}
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

/* ── live job posting card ───────────────────────────────────────────────── */
function LiveJobCard({ job, onClick }: { job: JobPostingResponse; onClick?: () => void }) {
  const dotColor = statusDotColor(job.status);
  const { solid, faded } = statusDotCount(job.status);
  const hasSalary = job.salary_min || job.salary_max;
  const salaryText = hasSalary
    ? [job.salary_min, job.salary_max].filter(Boolean).join(" – ")
    : null;
  const skillCount = (job.skills?.mustHave?.length ?? 0) +
    (job.skills?.preferred?.length ?? 0) +
    (job.skills?.niceToHave?.length ?? 0);

  return (
    <button type="button" onClick={onClick} className="rounded-xl p-4 w-full text-left transition-all hover:scale-[1.01] active:scale-[0.99]" style={CARD}>
      {/* title row */}
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-tight truncate">{job.title}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{buildMeta(job)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2 mt-0.5">
          <Dots color={dotColor} solid={solid} faded={faded} />
          <span className="text-[10px] text-white/65 font-medium">{statusLabel(job.status)}</span>
        </div>
      </div>

      {/* tags */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {job.employment_type && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <Briefcase size={9} className="flex-shrink-0" />
            {job.employment_type}
          </span>
        )}
        {salaryText && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <DollarSign size={9} className="flex-shrink-0" />
            {salaryText}
          </span>
        )}
        {skillCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {skillCount} skills required
          </span>
        )}
      </div>

      {/* description preview */}
      {job.description && (
        <p className="text-[10px] text-white/35 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
      )}
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

/* ── detailed static job card (matches Figma design) ────────────────────── */
function DetailedJobCard({ job, onClick }: {
  job: typeof JOBS[number];
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl w-full text-left transition-all hover:scale-[1.005] active:scale-[0.995] flex flex-col gap-4 p-5"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* job header */}
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-start justify-between w-full">
          <p className="text-base font-semibold text-white">{job.title}</p>
          {/* progress dots + status label */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
            <div className="flex items-center gap-1">
              {job.dotColors.map((color, i) => (
                <span key={i} className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
              ))}
            </div>
            <span className="text-sm text-[#d4d4d8]">{job.status}</span>
          </div>
        </div>
        {/* meta — Department • Location • Age */}
        <div className="flex items-center gap-2">
          {job.meta.split(" · ").map((part, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-sm text-[#d4d4d8]">{part}</span>
              {i < arr.length - 1 && (
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#d4d4d8" }} />
              )}
            </span>
          ))}
        </div>
      </div>
      {/* two metric sub-cards */}
      <div className="flex gap-4 w-full">
        <MetricCard m={job.left} />
        <MetricCard m={job.right} />
      </div>
    </button>
  );
}

/* ── shortlist mock data ─────────────────────────────────────────────────── */
interface ShortlistCandidate {
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

const SHORTLIST: ShortlistCandidate[] = [
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
    avatar: "https://ui-avatars.com/api/?name=Sara+Khalid&background=2a4a7e&color=fff&size=80",
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
];

/* ── shortlist candidate card ────────────────────────────────────────────── */
function ShortlistCandidateCard({ c }: { c: ShortlistCandidate }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={CARD}>
      {/* avatar + name + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <img
            src={c.avatar} alt={c.name}
            className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
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
        className="mt-auto w-full py-2 rounded-lg text-[11px] font-medium transition-colors"
        style={
          c.ctaGreen
            ? { background: "rgba(30,210,94,0.1)", border: "1px solid rgba(30,210,94,0.3)", color: "#1ed25e" }
            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
        }
      >
        {c.cta}
      </button>
    </div>
  );
}

/* ── job detail view (sidebar + tabs) ───────────────────────────────────── */
type SelectedJob = { id: string; title: string; department: string; location: string; status: string; posted_at?: string };

const DETAIL_TABS = [
  { key: "screened",   label: "Screened",  count: 30 },
  { key: "shortlist",  label: "Shortlist", count: 3  },
  { key: "interview",  label: "Interview", count: null },
  { key: "hire",       label: "Hire",      count: null },
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
          {DETAIL_TABS.map((t) => (
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

        {/* ── Shortlist tab ── */}
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

            {/* candidate cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SHORTLIST.map((c) => (
                <ShortlistCandidateCard key={c.id} c={c} />
              ))}
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

        {/* ── Screened tab ── */}
        {tab === "screened" && (
          <div className="rounded-xl p-8 flex flex-col items-center gap-2 text-center" style={CARD}>
            <p className="text-[14px] font-medium text-white/60">30 screened candidates</p>
            <p className="text-[11px] text-white/35">Detailed screened view coming soon.</p>
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
  /** Pre-fetched job postings from parent — when provided, skips internal fetch. */
  apiJobs?: JobPostingResponse[];
  /** Loading state for pre-fetched jobs. */
  apiJobsLoading?: boolean;
}

export function HiringPage({ onSelectJob, apiJobs: externalJobs, apiJobsLoading: externalLoading }: HiringPageProps = {}) {
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
        className="h-full overflow-hidden flex flex-col px-3 pt-3 pb-4"
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
      className="h-full overflow-y-auto"
    >
      <div className="flex flex-col gap-4 px-3 pt-3 pb-8">

        {/* ── header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight">Hiring</h1>
          <div className="flex gap-2">
            <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/5 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
              Browse Talent
            </button>
            <button type="button" className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-90" style={{ background: "#1dc558", color: "#09090b" }}>
              Post a Job
            </button>
          </div>
        </div>

        {/* ── 4-column top row ── */}
        <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4">

          {/* Pipeline — 4 of 12 */}
          <div className="md:col-span-3 xl:col-span-4 rounded-2xl flex flex-col justify-between p-5 gap-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {/* header row */}
            <div className="flex items-start justify-between">
              <p className="text-base text-[#d4d4d8]">Pipeline</p>
              <div className="flex items-center gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setRole(r)}
                    className="px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap"
                    style={{
                      background: role === r ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                      border: role === r ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                      color: role === r ? "#f4f4f5" : "rgba(244,244,245,0.6)",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* count */}
            <div className="flex items-end gap-2">
              <span className="text-[48px] font-semibold leading-none text-white">107</span>
              <span className="text-base text-[#d4d4d8] pb-2">applicants</span>
            </div>
            {/* bar + legend */}
            <div className="flex flex-col gap-3">
              <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.07)" }}>
                {BAR.map((s) => (
                  <div key={s.label} className="h-full" style={{ width: `${s.pct}%`, background: s.color }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {BAR.map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-xs text-[#d4d4d8]">
                    <span className="w-3 h-3 rounded-[4px] flex-shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Avg. time to match — 2 of 12 */}
          <div className="md:col-span-1.5 xl:col-span-2 rounded-2xl flex flex-col justify-between p-5 gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <p className="text-base text-[#d4d4d8]">Avg. time to match</p>
            <div className="flex items-end gap-2">
              <span className="text-[48px] font-semibold leading-none" style={{ color: "#1dc558" }}>4.2</span>
              <span className="text-base text-[#d4d4d8] pb-2">days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={16} style={{ color: "#1dc558" }} className="flex-shrink-0" />
              <span className="text-sm text-white">15% from last month</span>
            </div>
          </div>

          {/* Avg. skill readiness — 2 of 12 */}
          <div className="md:col-span-1.5 xl:col-span-2 rounded-2xl flex flex-col justify-between p-5 gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <p className="text-base text-[#d4d4d8]">Avg. skill readiness</p>
            <div className="flex items-end gap-2">
              <span className="text-[48px] font-semibold leading-none" style={{ color: "#ff9040" }}>79</span>
              <span className="text-base text-[#d4d4d8] pb-2">%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={16} className="text-white flex-shrink-0" />
              <span className="text-sm text-white">5% this month</span>
            </div>
          </div>

          {/* Upcoming Interviews — 4 of 12, spans 2 rows */}
          <div className="md:col-span-3 xl:col-span-4 flex flex-col gap-4 md:row-span-2">
            {/* heading */}
            <div className="flex items-center justify-between">
              <p className="text-base text-[#d4d4d8]">Upcoming Interviews</p>
              <button type="button" className="text-white/35 hover:text-white/65 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>

            {/* calendar */}
            <MiniCalendar />

            {/* toggle */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {(["For you","All Interviews"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setIvTab(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: ivTab === t ? "rgba(255,255,255,0.12)" : "transparent",
                    color: ivTab === t ? "white" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* list */}
            {IVWS.map((iv, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-4" style={CARD}>
                <img
                  src={iv.avatar} alt={iv.name}
                  className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white leading-tight">{iv.name}</p>
                  <p className="text-xs text-white/50 mt-0.5">{iv.role}</p>
                  <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                    <MapPin size={10} className="flex-shrink-0" /> {iv.type}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white leading-tight">{iv.time}</p>
                  <p className="text-xs text-white/50 mt-0.5">{iv.ampm}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hiring intelligence — 4 of 12 (bottom-left) */}
          <div className="md:col-span-3 xl:col-span-4">
            <div className="rounded-2xl flex flex-col gap-6 h-full p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-base text-[#d4d4d8]">Hiring intelligence</p>
                <button type="button" className="text-white/35 hover:text-white/65 transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {INTEL.map((c, i) => (
                  <div key={i} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: c.iconColor }} className="flex-shrink-0">
                          {c.icon === "down" ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                        </span>
                        <p className="text-base text-white">{c.title}</p>
                      </div>
                      <p className="text-sm text-[#d4d4d8] leading-relaxed">{c.body}</p>
                    </div>
                    {"note" in c && c.note && (
                      <p className="text-sm">
                        <span className="underline" style={{ color: "#1dc558" }}>2 listings</span>
                        {" have fallen below the range."}
                      </p>
                    )}
                    <div>
                      {"noAction" in c && c.noAction ? (
                        <p className="text-sm text-center py-2" style={{ color: "rgba(255,255,255,0.4)" }}>{c.noAction}</p>
                      ) : "cta" in c && c.cta ? (
                        <button
                          type="button"
                          className="w-full py-2 px-4 rounded-lg text-sm text-white text-center transition-colors hover:bg-white/10"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          {c.cta}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Job Postings — 4 of 12 (bottom-center) */}
          <div className="md:col-span-3 xl:col-span-4">
            <div className="rounded-2xl flex flex-col gap-6 h-full p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              {/* header */}
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-base text-[#d4d4d8]">Job Postings</p>
                <div className="flex items-center gap-2">
                  {(["Active", "Completed"] as const).map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => setJobTab(t)}
                      className="px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap"
                      style={{
                        background: jobTab === t ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                        border: jobTab === t ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                        color: jobTab === t ? "#f4f4f5" : "rgba(244,244,245,0.6)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* job list */}
              <div className="flex flex-col gap-4">
                {jobsLoading && (
                  <>
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-xl p-5 animate-pulse" style={CARD}>
                        <div className="h-4 rounded w-2/3 mb-3" style={{ background: "rgba(255,255,255,0.1)" }} />
                        <div className="h-3 rounded w-1/2 mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
                        <div className="flex gap-4">
                          <div className="flex-1 h-24 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="flex-1 h-24 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!jobsLoading && jobsError && (
                  <div className="rounded-xl p-4 text-sm text-red-400/80" style={CARD}>
                    Could not load job postings: {jobsError}
                  </div>
                )}
                {/* Live API jobs when available */}
                {!jobsLoading && !jobsError && filteredJobs.length > 0 && filteredJobs.map((job) => (
                  <LiveJobCard
                    key={job.id}
                    job={job}
                    onClick={() => {
                      const j = { id: job.id, title: job.title, department: job.department || "Engineering", location: job.location || "", status: job.status, posted_at: relativeDate(job.created_at) };
                      setSelectedJob(j);
                      onSelectJob?.(job.id, j);
                    }}
                  />
                ))}
                {/* Static detailed job cards — shown when no API jobs loaded yet */}
                {!jobsLoading && !jobsError && filteredJobs.length === 0 && jobTab === "Active" && (
                  <>
                    {JOBS.map((job) => (
                      <DetailedJobCard
                        key={job.title}
                        job={job}
                        onClick={() => {
                          const j = { id: job.title.toLowerCase().replace(/\s+/g, "-"), title: job.title, department: "Engineering", location: job.meta.split(" · ")[1] ?? "", status: job.status.toLowerCase() };
                          setSelectedJob(j);
                        }}
                      />
                    ))}
                  </>
                )}
                {!jobsLoading && !jobsError && filteredJobs.length === 0 && jobTab === "Completed" && (
                  <div className="rounded-xl p-6 flex flex-col items-center gap-2 text-center" style={CARD}>
                    <p className="text-sm font-medium text-white/60">No completed postings</p>
                    <p className="text-xs text-white/35">Completed postings will appear here.</p>
                  </div>
                )}
              </div>

              {/* On Platform — accessible via source toggle kept in state */}
              {jobSource === "posted" && (
                <div className="flex flex-col gap-3">
                  {posterLoading && (
                    <div className="flex flex-col gap-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl p-4 animate-pulse" style={CARD}>
                          <div className="h-3 rounded w-2/3 mb-2" style={{ background: "rgba(255,255,255,0.1)" }} />
                          <div className="h-2 rounded w-1/2" style={{ background: "rgba(255,255,255,0.06)" }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {!posterLoading && !posterError && posterJobs.map((job) => (
                    <LiveMockJobCard
                      key={job.id}
                      job={job}
                      onClick={() => {
                        const j = { id: job.id, title: job.title, department: job.category || "", location: job.location || "", status: "active" };
                        setSelectedJob(j);
                        onSelectJob?.(job.id, j);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>{/* end 12-col grid */}
      </div>
    </motion.div>
  );
}
