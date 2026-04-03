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
  ArrowDown,
} from "lucide-react";
import {
  type JobPostingResponse,
  type MockJobResponse,
} from "@/lib/employerApi";

/* ── palette ─────────────────────────────────────────────────────────────── */
const CARD = { background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)" };

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
  | { t: "grid";    color: string; rows: number; cols: number }
  | { t: "squares"; color: string; n: number }
  | { t: "avatars"; n: number }
  | { t: "grid-mixed"; rows: number; cols: number };  /* blue + 1 orange */

interface Metric {
  num: string; label: string; visual: Visual;
  sub?: string; subIcon?: "plus"|"check"|"warn"|"people"; subColor?: string;
}

const JOBS: {
  title: string; meta: string; status: string;
  solidDots: number; fadedDots: number; dotColor: string;
  left: Metric; right: Metric;
}[] = [
  {
    title: "Senior AI Developer", meta: "Engineering · Jeddah · 2 days ago",
    status: "Screening", dotColor: "#1dc558", solidDots: 3, fadedDots: 1,
    left: {
      num: "8", label: "screened applicants",
      visual: { t: "grid", color: "#a78bfa", rows: 2, cols: 4 },
      sub: "5 shortlisted", subIcon: "people", subColor: "rgba(255,255,255,0.45)",
    },
    right: {
      num: "13", label: "talent pool",
      visual: { t: "grid", color: "#a78bfa", rows: 3, cols: 5 },
      sub: "8 new suggestions", subIcon: "plus", subColor: "rgba(255,255,255,0.45)",
    },
  },
  {
    title: "Cloud Engineer", meta: "Engineering · Remote · 4 days ago",
    status: "Interviewing", dotColor: "#f97316", solidDots: 3, fadedDots: 1,
    left: {
      num: "6", label: "interviews booked",
      visual: { t: "avatars", n: 6 },
      sub: "2 recently accepted", subIcon: "check", subColor: "#4ade80",
    },
    right: {
      num: "17", label: "shortlisted",
      visual: { t: "grid-mixed", rows: 2, cols: 9 },
      sub: "1 dropped out", subIcon: "warn", subColor: "#f97316",
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
    const inits = ["SK","RT","AK","NM","JD","AB"];
    return (
      <div className="flex mt-2" style={{gap: 0}}>
        {Array.from({length: v.n}).map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0"
            style={{ background: "#4b6f8c", border: "2px solid rgba(15,20,28,0.9)", marginLeft: i === 0 ? 0 : -6, zIndex: v.n - i }}
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

function SubRow({ sub, icon, color }: { sub: string; icon?: "plus"|"check"|"warn"|"people"; color?: string }) {
  const Ic = icon === "people" ? Users : icon === "plus" ? UserPlus : icon === "check" ? UserCheck : AlertCircle;
  return (
    <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{color: color ?? "rgba(255,255,255,0.45)"}}>
      {icon && <Ic size={10} className="flex-shrink-0" />}
      {sub}
    </p>
  );
}

function MetricCard({ m }: { m: Metric }) {
  return (
    <div className="rounded-lg p-2.5 flex flex-col flex-1 min-w-0" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-[22px] font-semibold text-white leading-none">{m.num}</p>
      <p className="text-[11px] text-white/55 mt-0.5 leading-tight">{m.label}</p>
      <VisualBlock v={m.visual} />
      {m.sub && <SubRow sub={m.sub} icon={m.subIcon} color={m.subColor} />}
    </div>
  );
}

function DetailedJobCard({ job }: { job: typeof JOBS[0] }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)" }}>
      {/* title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-tight">{job.title}</p>
          <p className="text-[11px] text-white/45 mt-0.5">{job.meta}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Dots color={job.dotColor} solid={job.solidDots} faded={job.fadedDots} />
          <span className="text-[11px] text-white/65 font-medium">{job.status}</span>
        </div>
      </div>
      {/* two metric cards */}
      <div className="flex gap-2">
        <MetricCard m={job.left} />
        <MetricCard m={job.right} />
      </div>
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
          <h1 className="text-[32px] font-semibold text-white leading-tight">Hiring</h1>
          <div className="flex gap-2">
            <button type="button" className="px-4 py-2 rounded-full text-sm font-medium text-white transition-colors" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
              Browse Talent
            </button>
            <button type="button" onClick={() => onPostJob?.()} className="px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.97]" style={{ background: "#1dc558", color: "#09090b" }}>
              Post a Job
            </button>
          </div>
        </div>

        {/* ── main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4">

          {/* Pipeline — xl:col-span-4 */}
          <Card className="md:col-span-3 xl:col-span-4 flex flex-col justify-between" style={{ minHeight: 204 }}>
            {/* header */}
            <div className="flex items-center gap-2">
              <span className="text-base text-white/55 font-normal">Pipeline</span>
              <div className="ml-auto flex gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setRole(r)}
                    className="px-3 py-1 rounded-full text-[13px] font-medium transition-colors"
                    style={{
                      background: role === r ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.9)",
                      border: role === r ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* count */}
            <div className="flex items-end gap-2">
              <span className="text-[48px] font-semibold text-white leading-none">107</span>
              <span className="text-base text-white/55 pb-1">applicants</span>
            </div>
            {/* bar */}
            <div className="flex flex-col gap-3">
              <div className="h-3 rounded-full overflow-hidden flex gap-px">
                {BAR.map((s) => (
                  <div key={s.label} className="h-full" style={{ width: `${s.pct}%`, background: s.color }} />
                ))}
              </div>
              {/* legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {BAR.map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[12px] text-white/50">
                    <span className="w-3 h-3 rounded-[4px] flex-shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* Avg. time to match — xl:col-span-2 */}
          <Card className="md:col-span-1 xl:col-span-2 flex flex-col justify-between" style={{ minHeight: 204 }}>
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

          {/* Avg. skill readiness — xl:col-span-2 */}
          <Card className="md:col-span-1 xl:col-span-2 flex flex-col justify-between" style={{ minHeight: 204 }}>
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

          {/* Upcoming Interviews — xl:col-span-4, spans 2 rows */}
          <div className="md:col-span-3 xl:col-span-4 flex flex-col gap-3 md:row-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Upcoming Interviews</h2>
              <button type="button" className="text-white/35 hover:text-white/65">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <MiniCalendar />

            {/* toggle */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["For you","All Interviews"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setIvTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
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
                  <p className="text-[11px] text-white/50 mt-0.5">{iv.role}</p>
                  <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} className="flex-shrink-0" /> {iv.type}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-semibold text-white leading-tight">{iv.time}</p>
                  <p className="text-[11px] text-white/50">{iv.ampm}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Job Postings — xl:col-span-5 (bottom-LEFT, before Hiring Intel) */}
          <div className="md:col-span-4 xl:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Job Postings</h2>
              <div className="flex gap-2">
                {(["Active", "Completed"] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setJobTab(t)}
                    className="px-3 py-1 rounded-full text-[13px] font-medium transition-colors"
                    style={{
                      background: jobTab === t ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.9)",
                      border: jobTab === t ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
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

            {/* Show mock DetailedJobCards when no real data (Active tab) */}
            {!jobsLoading && !jobsError && filteredJobs.length === 0 && jobTab === "Active" && (
              <div className="flex flex-col gap-3">
                {JOBS.map((job) => (
                  <DetailedJobCard key={job.title} job={job} />
                ))}
              </div>
            )}

            {/* No completed postings placeholder */}
            {!jobsLoading && !jobsError && filteredJobs.length === 0 && jobTab === "Completed" && (
              <div className="rounded-xl p-6 flex flex-col items-center gap-2 text-center" style={CARD}>
                <p className="text-[13px] font-medium text-white/60">No completed postings</p>
                <p className="text-[11px] text-white/35">Completed postings will appear here.</p>
              </div>
            )}

            {/* Real job postings */}
            {!jobsLoading && !jobsError && filteredJobs.map((job) => (
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
          </div>

          {/* Hiring Intelligence — xl:col-span-3 (bottom-RIGHT, after Job Postings) */}
          <div className="md:col-span-2 xl:col-span-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Hiring Intelligence</h2>
              <button type="button" className="text-white/35 hover:text-white/65">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="rounded-2xl flex flex-col gap-3 p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {INTEL.map((c, i) => (
                <div key={i} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: c.iconColor }}>
                      {c.icon === "down" ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                    </span>
                    <p className="text-base font-semibold text-white">{c.title}</p>
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed">{c.body}</p>
                  {"note" in c && c.note && (
                    <p className="text-sm font-medium underline" style={{ color: "#1dc558" }}>{c.note}</p>
                  )}
                  <div>
                    {"noAction" in c && c.noAction ? (
                      <p className="text-sm text-white/35">{c.noAction}</p>
                    ) : "cta" in c && c.cta ? (
                      <button
                        type="button"
                        className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {c.cta}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>{/* end 12-col grid */}
      </div>
    </motion.div>
  );
}
