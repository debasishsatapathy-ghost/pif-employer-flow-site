import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronDown, Star, Sparkles, MessageCircle, X, Pencil,
  TrendingUp, Calendar, CheckCircle, ClipboardList, AlertCircle,
  ArrowUpDown, ListFilter, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JobCandidateView, type ApplicantWithScore } from "@/components/templates/JobCandidateView";
import { Breadcrumb } from "@/components/employer/Breadcrumb";
import { JobPostingSidebar, type SidebarJob } from "@/components/employer/JobPostingSidebar";

/* ══════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
══════════════════════════════════════════════════════════════════════════ */
interface CandidateSkill   { name: string; level: string; years: number }
interface CandidateProfile {
  id: string; name: string; dob?: string; gender?: string; city?: string;
  location?: string; experience_years?: number; skills: CandidateSkill[];
  experience?: { title?: string; company?: string; years?: number }[];
  education?:  { degree?: string; institution?: string; field_of_study?: string; graduation_year?: number }[];
  job_preferences?: string[];
}
interface Applicant {
  id: string; job_posting_id: string; candidate_id: string;
  candidate_name: string | null;
  status: "applied" | "reviewing" | "shortlisted" | "rejected";
  applied_at: string; updated_at: string;
  candidate_profile?: CandidateProfile;
}
interface JobPosting {
  id: string; title: string; department: string; location: string;
  status: string; posted_at?: string;
}
interface JobPostingTemplateProps {
  jobPosting?:          JobPosting;
  postingId?:           string;
  onNavigateToHiring?:  () => void;
  jobs?:                SidebarJob[];
  onSelectJob?:         (id: string, job: SidebarJob) => void;
}

/* — Shortlist candidate ------------------------------------------------- */
interface ShortlistCandidate {
  id: string; name: string; role: string; score: number; avatar: string;
  status: string; statusBg: string; statusColor: string;
  insight: string; bullets: string[]; cta: string; ctaGreen?: boolean;
}

/* — Interview / second-round types -------------------------------------- */
interface InterviewOutcome {
  interviewScore: number;
  verdict:        "Strong Yes" | "Yes" | "No" | "Strong No";
  summary:        string;
  feedbackPoints: { skill: string; note: string; positive: boolean }[];
}
interface NextRoundBooking  { time: string; location: "Remote" | "In-person"; attendees: string[] }
interface SecondRoundStatus { completedAt: string; verdict?: InterviewOutcome["verdict"]; notes?: string }

/* — Hire tab type ------------------------------------------------------- */
type HireDecisionStatus = "offered" | "hired" | "unsuccessful" | "stall" | null;

/* ══════════════════════════════════════════════════════════════════════════
   MOCK / CONSTANT DATA
══════════════════════════════════════════════════════════════════════════ */
const VERDICT_STYLE: Record<InterviewOutcome["verdict"], { color: string; bg: string }> = {
  "Strong Yes": { color: "#1ed25e", bg: "rgba(29,197,88,0.12)"   },
  "Yes":        { color: "#51a2ff", bg: "rgba(81,162,255,0.12)"  },
  "No":         { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  "Strong No":  { color: "#ef4444", bg: "rgba(239,68,68,0.15)"   },
};

const TIME_SLOTS = [
  { label: "6:00pm Today",    sub: "AI Facilitator" },
  { label: "9:00am Tomorrow", sub: "AI Facilitator" },
  { label: "2:00pm Tomorrow", sub: "AI Facilitator" },
];
const NEXT_TIME_SLOTS = [
  { label: "1:00pm Tomorrow", sub: "Human Interview" },
  { label: "3:00pm Tomorrow", sub: "Human Interview" },
  { label: "10:00am Thu",     sub: "Human Interview" },
];
const MOCK_ATTENDEES = [
  { id: "omar_s",  name: "Omar S.",  role: "Hiring Manager"  },
  { id: "ahmed_w", name: "Ahmed W.", role: "Technical Lead"  },
  { id: "rayan_t", name: "Rayan T.", role: "Team Lead"       },
];

/** Four shortlist candidates — one per interview pipeline stage in the demo */
const SHORTLIST_CANDIDATES: ShortlistCandidate[] = [
  {
    id: "s1", name: "Nora Ahmed", role: "AI Practitioner", score: 97,
    avatar: "https://ui-avatars.com/api/?name=Nora+Ahmed&background=1a3a5c&color=fff&size=80",
    status: "Yet to apply", statusBg: "rgba(255,255,255,0.07)", statusColor: "rgba(255,255,255,0.5)",
    insight: "We've let Nora know she's a shortlisted candidate. trAIn will alert you if she applies.",
    bullets: ["Based in Jeddah", "Strongest applicant in all 'must-have' skills for this role."],
    cta: "Invited to apply", ctaGreen: true,
  },
  {
    id: "s2", name: "Sara Khalid", role: "AI Practitioner", score: 93,
    avatar: "https://ui-avatars.com/api/?name=Sara+Khalid&background=2a4a7e&color=fff&size=80",
    status: "Top applicant", statusBg: "rgba(30,210,94,0.12)", statusColor: "#1ed25e",
    insight: "Sara is the strongest candidate of 57 applicants for this role. Consider booking an interview.",
    bullets: ["Based in Jeddah", "Very strong in both Generative AI and Prompt Engineering."],
    cta: "Book AI interview",
  },
  {
    id: "s3", name: "Omar Abdul", role: "AI Practitioner", score: 88,
    avatar: "https://ui-avatars.com/api/?name=Omar+Abdul&background=3a2a6e&color=fff&size=80",
    status: "Strong fit", statusBg: "rgba(81,162,255,0.12)", statusColor: "#51a2ff",
    insight: "Omar's Generative AI skills aren't as strong as Sara, but he is otherwise a strong fit.",
    bullets: ["Based in Riyadh, but open to moving to Jeddah.", "Expert in SQL and Kubernetes."],
    cta: "Book AI interview",
  },
  {
    id: "s4", name: "Layla Hassan", role: "AI Practitioner", score: 91,
    avatar: "https://ui-avatars.com/api/?name=Layla+Hassan&background=4a2a3e&color=fff&size=80",
    status: "Strong fit", statusBg: "rgba(245,158,11,0.12)", statusColor: "#f59e0b",
    insight: "Layla's expertise in NLP and model fine-tuning makes her a strong secondary pick.",
    bullets: ["Based in Riyadh, open to Jeddah.", "Published 3 papers on transformer architectures."],
    cta: "Book AI interview",
  },
];

/**
 * Pre-configured AI outcomes used by the "Simulate: AI interview complete" button.
 * In production these would come from the AI scoring service.
 */
const MOCK_AI_OUTCOMES: Record<string, InterviewOutcome> = {
  s2: {
    interviewScore: 95, verdict: "Strong Yes",
    summary: "Sara excelled in her AI-facilitated interview. trAIn recommends advancing her to the next round.",
    feedbackPoints: [
      { skill: "Generative AI",      note: "Deep practical knowledge and real-world examples.",           positive: true  },
      { skill: "Prompt Engineering", note: "Advanced understanding of chain-of-thought prompting.",        positive: true  },
      { skill: "System Design",      note: "Solid fundamentals with room to grow on distributed systems.", positive: false },
      { skill: "Communication",      note: "Clear, structured answers. Strong cultural fit signals.",      positive: true  },
    ],
  },
  s3: {
    interviewScore: 88, verdict: "Yes",
    summary: "Omar completed his AI-facilitated interview. trAIn recommends advancing him to the next round.",
    feedbackPoints: [
      { skill: "Generative AI",    note: "Good foundational knowledge, though less deep than the top applicant.", positive: false },
      { skill: "SQL & Kubernetes", note: "Expert-level skills, highly relevant to this role.",                     positive: true  },
      { skill: "Problem Solving",  note: "Strong analytical approach with structured reasoning.",                  positive: true  },
      { skill: "Communication",    note: "Clear and professional throughout the interview.",                       positive: true  },
    ],
  },
  s4: {
    interviewScore: 91, verdict: "Yes",
    summary: "Layla performed well in her AI-facilitated interview. trAIn recommends advancing her to the next round.",
    feedbackPoints: [
      { skill: "NLP",             note: "Strong domain expertise, particularly in transformer architectures.", positive: true  },
      { skill: "Model Fine-tuning",note: "Demonstrated clear understanding of training pipelines.",            positive: true  },
      { skill: "System Design",   note: "Good fundamentals, slightly less polished than the top applicant.",   positive: false },
      { skill: "Communication",   note: "Well-articulated and thoughtful throughout.",                         positive: true  },
    ],
  },
};

/**
 * Pre-configured second-round completion timestamps used by the State 3 simulation button.
 * No verdict is set — the interviewer adds that via AddFeedbackModal (Figma 5411-18921).
 */
const MOCK_SECOND_ROUND_STATUSES: Record<string, SecondRoundStatus> = {
  s2: { completedAt: "2:00pm Today" },
  s3: { completedAt: "2:00pm Today" },
  s4: { completedAt: "2:00pm Today" },
};

const MOCK_JOB_POSTING: JobPosting = {
  id: "job_004", title: "Senior AI Developer", department: "Engineering",
  location: "Jeddah", status: "active", posted_at: "2d ago",
};

/* ══════════════════════════════════════════════════════════════════════════
   KANBAN + TALENT POOL TYPES & DATA
══════════════════════════════════════════════════════════════════════════ */
type MainTab   = "applicants" | "talentPool" | "jobDetails";
type KanbanCol = "screening" | "shortlist" | "interview" | "hire";

interface KCandidate { id: string; name: string; role: string; score: number }
interface TalentCandidate { id: string; name: string; role: string; score: number; invited?: boolean }

const KANBAN_LABELS: Record<KanbanCol, string> = {
  screening: "Screening", shortlist: "Shortlist", interview: "Interview", hire: "Hire",
};
const KANBAN_EMPTY: Record<KanbanCol, string> = {
  screening: "Drag candidates here",
  shortlist: "Drag candidates here",
  interview: "Drag candidates here",
  hire:      "Drag candidates here\nto compare and hire",
};

const KANBAN_INIT: Record<KanbanCol, KCandidate[]> = {
  screening: [
    { id: "k1", name: "Waleed Jaber", role: "ML Specialist",   score: 79 },
    { id: "k2", name: "Lina Faraj",   role: "AI Practitioner", score: 77 },
    { id: "k3", name: "Yousef Rayan", role: "ML Engineer",     score: 74 },
  ],
  shortlist: [
    { id: "k4", name: "Omar Abdul",   role: "AI Engineer",     score: 88 },
    { id: "k5", name: "Faris Saleh",  role: "AI Developer",    score: 85 },
    { id: "k6", name: "Ahmed Saad",   role: "ML Specialist",   score: 83 },
    { id: "k7", name: "Lama Abdul",   role: "AI Developer",    score: 81 },
    { id: "k8", name: "Tariq Nasser", role: "ML Practitioner", score: 80 },
  ],
  interview: [],
  hire:      [],
};

const TALENT_POOL_INIT: TalentCandidate[] = [
  { id: "tp1",  name: "Sara Khalid",   role: "AI Practitioner",     score: 93, invited: true },
  { id: "tp2",  name: "Nora Ahmed",    role: "AI Developer",        score: 92 },
  { id: "tp3",  name: "Fahad Yousef",  role: "AI Consultant",       score: 91 },
  { id: "tp4",  name: "Badr Omar",     role: "AI Engineer",         score: 90 },
  { id: "tp5",  name: "Rawan Saad",    role: "AI Solutions Lead",   score: 90 },
  { id: "tp6",  name: "Dana Turki",    role: "AI Developer",        score: 89 },
  { id: "tp7",  name: "Isa Hamad",     role: "Applied AI Lead",     score: 87 },
  { id: "tp8",  name: "Maha Saleh",    role: "ML Specialist",       score: 90 },
  { id: "tp9",  name: "Nabil Asim",    role: "AI Practitioner",     score: 86 },
  { id: "tp10", name: "Reem Turkan",   role: "AI Architect",        score: 83 },
  { id: "tp11", name: "Diana Majed",   role: "AI Practitioner",     score: 81 },
  { id: "tp12", name: "Rayan Harbi",   role: "AI Practitioner",     score: 87 },
  { id: "tp13", name: "Haya Suliman",  role: "AI & Data Consultant", score: 80 },
];

/* ══════════════════════════════════════════════════════════════════════════
   PRIMITIVE COMPONENTS  (reused throughout every card & modal)
══════════════════════════════════════════════════════════════════════════ */

/** Circular score ring */
function ScoreRing({ score, size = "md", delta }: { score: number; size?: "sm" | "md" | "lg"; delta?: number }) {
  const dim = size === "sm" ? 40 : size === "lg" ? 52 : 44;
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-bold"
        style={{
          width: dim, height: dim,
          border: "2px solid #1ed25e",
          color: "#1ed25e",
          fontSize: size === "lg" ? 17 : 14,
        }}
      >
        {score}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className="flex items-center gap-0.5" style={{ color: "#1ed25e" }}>
          <TrendingUp size={9} />
          <span className="text-[9px] font-medium">{delta > 0 ? `+${delta}` : delta}</span>
        </div>
      )}
    </div>
  );
}

/** Avatar + name + star + role — the left side of every candidate row */
function CandidateInfo({ c, size = "md" }: { c: ShortlistCandidate; size?: "sm" | "md" | "lg" }) {
  const imgSize = size === "lg" ? "w-12 h-12" : "w-10 h-10";
  const nameSize = size === "lg" ? "text-[15px]" : "text-[14px]";
  const starSize = size === "lg" ? 14 : 12;
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <img
        src={c.avatar} alt={c.name}
        className={`${imgSize} rounded-full flex-shrink-0 object-cover`}
        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className={`${nameSize} font-semibold text-white leading-tight`}>{c.name}</p>
          <Star size={starSize} className="flex-shrink-0" style={{ color: "#1ed25e", fill: "#1ed25e" }} />
        </div>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{c.role}</p>
      </div>
    </div>
  );
}

/** Full candidate row used inside cards (info + score ring) */
function CandidateHeader({ c, score, delta }: { c: ShortlistCandidate; score?: number; delta?: number }) {
  return (
    <div className="flex items-center gap-3">
      <CandidateInfo c={c} />
      <ScoreRing score={score ?? c.score} delta={delta} />
    </div>
  );
}

/** The candidate summary panel used at the top of every modal */
function ModalCandidateRow({ c, extra }: { c: ShortlistCandidate; extra?: ReactNode }) {
  return (
    <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.07)" }}>
      <CandidateInfo c={c} size="lg" />
      {extra ?? <ScoreRing score={c.score} size="lg" />}
    </div>
  );
}

/** Green sparkles info banner */
function AiBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-xl px-3 py-2.5 flex items-start gap-2", className)}
      style={{ background: "rgba(29,197,88,0.07)", border: "1px solid rgba(29,197,88,0.18)" }}
    >
      <Sparkles size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#1ed25e" }} />
      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{children}</p>
    </div>
  );
}

/** Reusable modal overlay + animated container + header */
function ModalShell({
  title, onClose, onBack, maxWidth = "max-w-md", children,
}: { title: string; onClose: () => void; onBack?: () => void; maxWidth?: string; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full ${maxWidth} rounded-3xl p-6 flex flex-col gap-4 overflow-y-auto`}
        style={{ background: "#2d2d2d", maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button type="button" onClick={onBack}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            type="button" onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

/* ── Shared helpers ──────────────────────────────────────────────────────── */

/** Returns "her" for common female names in the dataset, else "his" */
function pronounFor(name: string): "her" | "his" {
  const fn = name.split(" ")[0];
  return ["Sara", "Nora", "Layla"].includes(fn) ? "her" : "his";
}

/** Uppercase section label used above form fields in modals */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">{children}</p>
  );
}

/** Coloured verdict badge pill */
function VerdictBadge({ verdict }: { verdict: InterviewOutcome["verdict"] }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {verdict}
    </span>
  );
}

/**
 * Single round-verdict row:  ✓ Label: Verdict
 * `pending` renders an amber "Feedback Needed" badge instead.
 */
function RoundVerdictRow({ label, verdict, pending = false }: {
  label:    string;
  verdict?: InterviewOutcome["verdict"];
  pending?: boolean;
}) {
  const iconColor = verdict ? "#1ed25e" : pending ? "#f59e0b" : "#1ed25e";
  return (
    <div className="flex items-center gap-2">
      <CheckCircle size={13} style={{ color: iconColor }} />
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</span>
      {verdict ? (
        <VerdictBadge verdict={verdict} />
      ) : pending ? (
        <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>Feedback Needed</span>
      ) : null}
    </div>
  );
}

/** Green confirmed pill with optional pulsing dot */
function ConfirmedPill({ primary, sub, dotLabel = "Confirmed" }: {
  primary:   string;
  sub:       string;
  dotLabel?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(29,197,88,0.08)", border: "1px solid rgba(29,197,88,0.2)" }}>
      <div>
        <p className="text-sm font-semibold text-white">{primary}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#1ed25e" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#1ed25e] animate-pulse" />
        {dotLabel}
      </div>
    </motion.div>
  );
}

/** Full-width card action button — ghost (default) or green */
function CardActionButton({ onClick, icon: Icon, children, variant = "ghost", disabled = false }: {
  onClick?:  () => void;
  icon?:     React.ElementType;
  children:  ReactNode;
  variant?:  "ghost" | "green" | "red" | "greenSolid";
  disabled?: boolean;
}) {
  const styles = {
    ghost:      { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" },
    green:      { background: "rgba(29,197,88,0.12)",   border: "1px solid rgba(29,197,88,0.3)",   color: "#1ed25e" },
    greenSolid: { background: "rgba(29,197,88,0.15)",   border: "1px solid rgba(29,197,88,0.4)",   color: "#1ed25e" },
    red:        { background: "rgba(248,113,113,0.1)",  border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" },
  }[variant];
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
      style={{ ...styles, cursor: disabled ? "default" : undefined }}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/**
 * Animated time-slot picker used in booking modals.
 * Shows selected slot + pencil to expand a dropdown list.
 */
function TimeSlotPicker({ slots, selected, onSelect, sublabelFn }: {
  slots:       { label: string; sub: string }[];
  selected:    number;
  onSelect:    (i: number) => void;
  sublabelFn?: (slot: { label: string; sub: string }) => string;
}) {
  const [open, setOpen] = useState(false);
  const slot = slots[selected];
  const sublabel = sublabelFn ? sublabelFn(slot) : slot.sub;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="p-3 flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold text-white">{slot.label}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{sublabel}</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: open ? "#1ed25e" : "rgba(255,255,255,0.4)" }}>
          <Pencil size={15} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {slots.map((s, i) => (
              <button key={i} type="button"
                onClick={() => { onSelect(i); setOpen(false); }}
                className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/5"
                style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                <p className="text-[13px] font-medium text-white">{s.label}</p>
                {i === selected && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: "#1ed25e", color: "#0d1117" }}>✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Tab empty state */
function EmptyTabState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Star size={28} className="text-[var(--text-subtle)]" />
      </div>
      <p className="text-[var(--text-subtle)] text-sm">{message}</p>
      {hint && <p className="text-xs text-center max-w-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{hint}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SHORTLIST TAB — ShortlistCard

   Action states (5039-23958 layout):
     • Neither taken  → both "Invite to Apply" + "Book AI Interview" buttons shown
     • Invited only   → invitation pill + "Book AI Interview" button still available
     • Booked         → interview time pill, both buttons hidden (5099-27211 state)
══════════════════════════════════════════════════════════════════════════ */
function ShortlistCard({ c, onBook, onInvite, bookedTime, invited }: {
  c:           ShortlistCandidate;
  onBook?:     () => void;
  onInvite?:   () => void;
  bookedTime?: string;
  invited?:    boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: bookedTime
          ? "1px solid rgba(29,197,88,0.3)"
          : invited
          ? "1px solid rgba(29,197,88,0.18)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <CandidateInfo c={c} />
        <ScoreRing score={c.score} />
      </div>

      {/* status badge */}
      <span
        className="self-start px-2 py-0.5 rounded-md text-xs font-medium"
        style={bookedTime
          ? { background: "rgba(29,197,88,0.12)", color: "#1ed25e" }
          : { background: c.statusBg, color: c.statusColor }}
      >
        {bookedTime ? "Interview scheduled" : c.status}
      </span>

      {/* insight */}
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{c.insight}</p>

      {/* bullets */}
      <ul className="flex flex-col gap-1">
        {c.bullets.map((b, i) => (
          <li key={i} className="text-xs text-[var(--text-subtle)] flex items-start gap-1.5">
            <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0 bg-white/30" />
            {b}
          </li>
        ))}
      </ul>

      {/* ── interview booked pill (5099-27211 — booked) ── */}
      {bookedTime && <ConfirmedPill primary={bookedTime} sub="AI Facilitator" />}

      {/* ── action buttons ── */}
      {!bookedTime && (
        <div className="mt-auto">
          {c.ctaGreen ? (
            !invited
              ? <CardActionButton onClick={onInvite} variant="green">Invite to Apply</CardActionButton>
              : /* Post-invitation confirmed state — Figma 5099-27962 */
                <div className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(29,197,88,0.1)", border: "1px solid rgba(29,197,88,0.3)", color: "var(--accent)" }}>
                  <Sparkles size={13} />Invited to apply
                </div>
          ) : (
            <CardActionButton onClick={onBook} variant="ghost">Book AI interview</CardActionButton>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INVITE TO APPLY MODAL
══════════════════════════════════════════════════════════════════════════ */
function InviteToApplyModal({
  candidate, jobTitle, onClose, onSend,
}: {
  candidate: ShortlistCandidate;
  jobTitle:  string;
  onClose:   () => void;
  onSend:    () => void;
}) {
  const fn = candidate.name.split(" ")[0];
  const defaultMsg = `Invitation to apply for ${jobTitle}`;
  const [message, setMessage] = useState(defaultMsg);
  const [sent,    setSent]    = useState(false);

  function handleSend() {
    setSent(true);
    setTimeout(() => { onSend(); onClose(); }, 1200);
  }

  return (
    <ModalShell title="Invite this candidate to apply?" onClose={onClose}>
      {/* AI info banner */}
      <AiBanner>
        {fn} is open to new opportunities. trAIn will contact{" "}
        {pronounFor(candidate.name)} immediately to let{" "}
        {pronounFor(candidate.name)} know she's been shortlisted for this role.
      </AiBanner>

      {/* candidate row */}
      <ModalCandidateRow c={candidate} />

      {/* message field */}
      <div
        className="rounded-2xl px-4 py-3.5"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full bg-transparent text-[15px] text-white font-medium resize-none outline-none placeholder-white/30 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        />
      </div>

      {/* send button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSend}
          disabled={sent}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97] flex items-center gap-2"
          style={{ background: "#1a6b35", color: "white", opacity: sent ? 0.7 : 1 }}
        >
          {sent ? (
            <>
              <CheckCircle size={16} />
              Invitation Sent
            </>
          ) : (
            "Send Invitation"
          )}
        </button>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INTERVIEW TAB — InterviewCard  (4 distinct pipeline states)

   State 1 — upcoming first round:        no outcome, no nextRound
   State 2 — first round done:             outcome set, no nextRound
   State 3 — second round booked:          outcome set, nextRound set, no secondRound
   State 4 — second round completed:       outcome + nextRound + secondRound set
              4a verdict = undefined  →  "Feedback Needed"
              4b verdict = set        →  show verdict + "View Feedback"
══════════════════════════════════════════════════════════════════════════ */
function InterviewCard({ c, time, outcome, nextRound, secondRound,
  onReschedule, onViewFeedback, onBookNext, onRescheduleNext, onAddFeedback,
  onSimulateComplete, onSimulateSecondRound,
}: {
  c:                   ShortlistCandidate;
  time:                string;
  outcome?:            InterviewOutcome;
  nextRound?:          NextRoundBooking;
  secondRound?:        SecondRoundStatus;
  onReschedule:        () => void;
  onViewFeedback:      () => void;
  onBookNext:          () => void;
  onRescheduleNext:    () => void;
  onAddFeedback:       () => void;
  /** Demo only — simulates the AI completing the first-round interview (Step 2 → Step 3) */
  onSimulateComplete?:    () => void;
  /** Demo only — simulates the second round completing with a verdict, jumping to Hire tab (Step 5 → Step 8) */
  onSimulateSecondRound?: () => void;
}) {
  const displayScore   = outcome?.interviewScore ?? c.score;
  const delta          = outcome ? outcome.interviewScore - c.score : undefined;
  const verdictStyle   = outcome ? VERDICT_STYLE[outcome.verdict] : null;
  const attendeeList   = nextRound?.attendees.join(", ") ?? "";
  const secondVStyle   = secondRound?.verdict ? VERDICT_STYLE[secondRound.verdict] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <CandidateHeader c={c} score={displayScore} delta={delta} />

      {/* ── STATE 4: second round completed ── */}
      {secondRound && (
        <>
          <AiBanner>
            {c.name.split(" ")[0]}'s second round interview was completed at {secondRound.completedAt}.
          </AiBanner>
          <div className="flex flex-col gap-1.5">
            {outcome && <RoundVerdictRow label="First Round (AI):" verdict={outcome.verdict} />}
            <RoundVerdictRow label="Second Round:" verdict={secondRound.verdict} pending={!secondRound.verdict} />
          </div>
          {secondRound.verdict
            ? <CardActionButton onClick={onViewFeedback} icon={ClipboardList}>View Feedback</CardActionButton>
            : <CardActionButton onClick={onAddFeedback}  icon={ClipboardList}>Add Interview Feedback</CardActionButton>
          }
        </>
      )}

      {/* ── STATE 3: second round booked ── */}
      {nextRound && !secondRound && (
        <>
          <div className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Second Round Interview</p>
              <button type="button" onClick={onRescheduleNext}
                className="p-1 rounded-md transition-colors hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                <Pencil size={13} />
              </button>
            </div>
            <p className="text-[15px] font-semibold text-white">{nextRound.time}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {nextRound.location} · {attendeeList}
            </p>
          </div>
          <AiBanner>trAIn has added this interview to {attendeeList}'s calendars.</AiBanner>

          {/* ── Demo trigger: simulates 2nd round completing (→ State 4a, Figma 5397-18150) ── */}
          {onSimulateSecondRound && (
            <button type="button" onClick={onSimulateSecondRound}
              className="w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:bg-white/5 active:scale-[0.98]"
              style={{ color: "rgba(255,255,255,0.25)", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Sparkles size={11} style={{ color: "#1ed25e", opacity: 0.6 }} />
              Simulate: 2nd round complete
            </button>
          )}
        </>
      )}

      {/* ── STATE 2: first round done, awaiting next round ── */}
      {outcome && !nextRound && (
        <>
          <AiBanner>{outcome.summary}</AiBanner>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Outcome:</span>
              <VerdictBadge verdict={outcome.verdict} />
            </div>
            <button type="button" onClick={onViewFeedback}
              className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.55)" }}>
              View Feedback Summary
            </button>
          </div>
          <CardActionButton onClick={onBookNext} icon={Calendar}>Book Next Interview</CardActionButton>
        </>
      )}

      {/* ── STATE 1: upcoming first round ── */}
      {!outcome && !nextRound && (
        <>
          <div className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>First Round Interview</p>
              <button type="button" onClick={onReschedule}
                className="p-1 rounded-md transition-colors hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                <Pencil size={13} />
              </button>
            </div>
            <p className="text-[15px] font-semibold text-white">{time}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>AI Facilitator</p>
          </div>
          <AiBanner>trAIn will automatically score the interview and share a summary once completed.</AiBanner>

          {/* ── Demo trigger: simulates the AI completing the interview (Figma 5382-16686) ── */}
          {onSimulateComplete && (
            <button type="button" onClick={onSimulateComplete}
              className="w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:bg-white/5 active:scale-[0.98]"
              style={{ color: "rgba(255,255,255,0.25)", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Sparkles size={11} style={{ color: "#1ed25e", opacity: 0.6 }} />
              Simulate: AI interview complete
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HIRE TAB — HireCard  (4 decision states)

   null          → "Make Hiring Decision"
   "offered"     → contract sent; click to simulate acceptance
   "hired"       → accepted; shows start date
   "unsuccessful"→ feedback sent to candidate
══════════════════════════════════════════════════════════════════════════ */
function HireCard({ c, firstRoundVerdict, secondRoundVerdict, recommendation, status, onMakeDecision, onSimulateAcceptance }: {
  c:                    ShortlistCandidate;
  firstRoundVerdict?:   InterviewOutcome["verdict"];
  secondRoundVerdict?:  InterviewOutcome["verdict"];
  recommendation:       string;
  status:               HireDecisionStatus;
  onMakeDecision:       () => void;
  onSimulateAcceptance: () => void;
}) {
  const fn      = c.name.split(" ")[0];
  const pronoun = pronounFor(c.name);

  const bannerText: Record<NonNullable<HireDecisionStatus>, string> = {
    offered:      `${fn} has been offered the role. trAIn will alert you when ${fn} makes a decision.`,
    hired:        `${fn} has accepted the contract. trAIn has contacted ${pronoun} to commence the onboarding process.`,
    unsuccessful: `trAIn has shared a feedback summary with ${fn} to help ${pronoun} understand which skills to focus on in future. Overall, ${fn} was a good match for the role, however ${pronoun} skills in Generative AI weren't as strong as other leading applicants.`,
    stall:        `${fn} has been placed on hold. You can revisit this decision at any time from the Hire tab.`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <CandidateHeader c={c} delta={2} />

      <AiBanner>{status ? bannerText[status] : recommendation}</AiBanner>

      {status === "hired" && (
        <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          {fn}'s start date is 01 August 2026.
        </p>
      )}

      {status !== "unsuccessful" && (
        <div className="flex flex-col gap-1.5">
          {firstRoundVerdict  && <RoundVerdictRow label="First Round (AI):" verdict={firstRoundVerdict} />}
          {secondRoundVerdict && <RoundVerdictRow label="Second Round:"     verdict={secondRoundVerdict} />}
        </div>
      )}

      {status === null        && <CardActionButton onClick={onMakeDecision}       icon={ClipboardList} variant="ghost">Make Hiring Decision</CardActionButton>}
      {status === "stall"     && <CardActionButton onClick={onMakeDecision}       icon={ClipboardList} variant="ghost">On Hold — Revisit Decision</CardActionButton>}
      {status === "offered"   && <CardActionButton onClick={onSimulateAcceptance} icon={Sparkles}      variant="green">Contract Offered</CardActionButton>}
      {status === "hired"     && <CardActionButton icon={CheckCircle} variant="greenSolid" disabled>Hired</CardActionButton>}
      {status === "unsuccessful" && <CardActionButton icon={X} variant="red" disabled>Unsuccessful</CardActionButton>}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════════════════════════════ */

/** Book the first AI interview round */
function BookAIInterviewModal({ candidate, onClose, onBook }: {
  candidate: ShortlistCandidate; onClose: () => void; onBook: (time: string) => void;
}) {
  const [selected, setSelected] = useState(0);

  return (
    <ModalShell title="Book AI Interview" onClose={onClose}>
      <div className="rounded-2xl p-4 flex gap-3" style={{ background: "rgba(255,255,255,0.07)" }}>
        <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#1ed25e" }} />
        <div className="flex flex-col gap-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          <p>trAIn has found suitable time for an AI-facilitated chat based on the candidate's schedule.</p>
          <p>trAIn will automatically score the interview and share a summary once completed.</p>
        </div>
      </div>

      <ModalCandidateRow c={candidate} />

      <TimeSlotPicker slots={TIME_SLOTS} selected={selected} onSelect={setSelected} />

      <div className="flex justify-end pt-1">
        <button type="button" onClick={() => onBook(TIME_SLOTS[selected].label)}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "#1a6b35", color: "white" }}>
          Book Interview
        </button>
      </div>
    </ModalShell>
  );
}

/** Book the second (human) interview round */
function BookNextInterviewModal({ candidate, onClose, onBook }: {
  candidate: ShortlistCandidate; onClose: () => void; onBook: (b: NextRoundBooking) => void;
}) {
  const [editing,           setEditing]           = useState(false);
  const [selected,          setSelected]          = useState(0);
  const [location,          setLocation]          = useState<"Remote" | "In-person">("Remote");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(["omar_s", "ahmed_w"]);

  const attendeeNames = MOCK_ATTENDEES
    .filter((a) => selectedAttendees.includes(a.id))
    .map((a) => a.name)
    .join(", ");

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  }
  function handleBook() {
    onBook({ time: NEXT_TIME_SLOTS[selected].label, location, attendees: attendeeNames.split(", ") });
  }

  return (
    <ModalShell title="Book Interview" onClose={onClose} maxWidth="max-w-md">
      {/* AI banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.07)" }}>
        <Sparkles size={16} className="flex-shrink-0 mt-0.5 text-[var(--accent)]" />
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          trAIn found a suitable time based on your settings and the candidate's schedule. You can book this time or choose another slot.
        </p>
      </div>

      {/* candidate row */}
      <ModalCandidateRow c={candidate} />

      {/* pre-selected time card */}
      {!editing ? (
        <button type="button" onClick={() => setEditing(true)}
          className="w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all hover:brightness-110"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold text-white">{NEXT_TIME_SLOTS[selected].label}</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {location}{attendeeNames ? ` \u2022 ${attendeeNames}` : ""}
            </span>
          </div>
          <Pencil size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {/* location toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {(["Remote", "In-person"] as const).map((loc) => (
              <button key={loc} type="button" onClick={() => setLocation(loc)}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={{
                  background: location === loc ? "rgba(255,255,255,0.15)" : "transparent",
                  color:      location === loc ? "white" : "rgba(255,255,255,0.45)",
                }}>
                {loc}
              </button>
            ))}
          </div>
          {/* time slots */}
          <TimeSlotPicker
            slots={NEXT_TIME_SLOTS}
            selected={selected}
            onSelect={(i) => { setSelected(i); setEditing(false); }}
            sublabelFn={(s) => `${location} · ${s.sub}`}
          />
          {/* attendees */}
          <div className="flex flex-col gap-2">
            {MOCK_ATTENDEES.map((a) => {
              const checked = selectedAttendees.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggleAttendee(a.id)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: checked ? "rgba(29,197,88,0.08)" : "rgba(255,255,255,0.05)",
                    border:     checked ? "1px solid rgba(29,197,88,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #1ed25e, #51a2ff)", color: "white" }}>
                    {a.name.split(" ").map((w) => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white">{a.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{a.role}</p>
                  </div>
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: checked ? "#1ed25e" : "rgba(255,255,255,0.1)", border: checked ? "none" : "1px solid rgba(255,255,255,0.2)" }}>
                    {checked && <span className="text-[10px] font-bold text-[#0d1117]">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button type="button" onClick={handleBook}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "#1a6b35", color: "white" }}>
          Book Interview
        </button>
      </div>
    </ModalShell>
  );
}

/** AI interview feedback summary */
function FeedbackSummaryModal({ candidate, outcome, onClose, onBookNext }: {
  candidate: ShortlistCandidate; outcome: InterviewOutcome;
  onClose: () => void; onBookNext: () => void;
}) {
  const verdictStyle = VERDICT_STYLE[outcome.verdict];
  return (
    <ModalShell title="Interview Feedback" onClose={onClose} maxWidth="max-w-lg">
      <ModalCandidateRow c={candidate}
        extra={<ScoreRing score={outcome.interviewScore} size="lg" delta={outcome.interviewScore - candidate.score} />}
      />

      {/* outcome + summary */}
      <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/45">Overall outcome</span>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold"
            style={{ background: verdictStyle.bg, color: verdictStyle.color }}>
            {outcome.verdict}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{outcome.summary}</p>
      </div>

      {/* skill breakdown */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Skill Breakdown</p>
        {outcome.feedbackPoints.map((fp, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
            style={{
              background: fp.positive ? "rgba(29,197,88,0.06)"    : "rgba(248,113,113,0.06)",
              border:     fp.positive ? "1px solid rgba(29,197,88,0.15)" : "1px solid rgba(248,113,113,0.15)",
            }}>
            <span className="mt-0.5 text-[11px]">{fp.positive ? "✓" : "△"}</span>
            <div>
              <p className="text-xs font-semibold text-white">{fp.skill}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{fp.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
          Close
        </button>
        <button type="button" onClick={() => { onClose(); onBookNext(); }}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: "#1a6b35", color: "white" }}>
          <Calendar size={14} />Book Next Interview
        </button>
      </div>
    </ModalShell>
  );
}

/**
 * Add Interview Feedback modal — matches Figma 5411-18810.
 *
 * Layout (single screen):
 *   1. Candidate row (avatar · name · star · role · score ring)
 *   2. "Feedback" label + large free-text area
 *   3. "Did the candidate pass the interview?" + 4 inline verdict buttons
 *      Strong No | No | Yes | Strong Yes
 *   4. "Submit Feedback" bottom-right (green when verdict selected)
 */
function AddFeedbackModal({ candidate, onClose, onSubmit }: {
  candidate: ShortlistCandidate;
  onClose:   () => void;
  onSubmit:  (verdict: InterviewOutcome["verdict"], notes: string) => void;
}) {
  const [verdict, setVerdict] = useState<InterviewOutcome["verdict"] | null>(null);
  const [notes,   setNotes]   = useState("");

  const verdictOptions: InterviewOutcome["verdict"][] = ["Strong No", "No", "Yes", "Strong Yes"];

  return (
    <ModalShell title="Add Interview Feedback" onClose={onClose} maxWidth="max-w-lg">
      {/* candidate row */}
      <ModalCandidateRow c={candidate} />

      <div className="flex flex-col gap-2">
        <p className="text-base font-bold text-white">Feedback</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter feedback..."
          rows={8}
          className="w-full rounded-2xl px-4 py-3.5 text-sm resize-none outline-none leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.07)",
            border:     "1px solid rgba(255,255,255,0.1)",
            color:      "rgba(255,255,255,0.75)",
          }}
        />
      </div>

      {/* verdict row */}
      <div className="flex flex-col gap-3">
        <p className="text-base font-bold text-white">Did the candidate pass the interview?</p>
        <div className="grid grid-cols-4 gap-2">
          {verdictOptions.map((v) => {
            const s = VERDICT_STYLE[v];
            const selected = verdict === v;
            return (
              <button key={v} type="button" onClick={() => setVerdict(v)}
                className="py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.97]"
                style={{
                  background: selected ? s.bg        : "rgba(255,255,255,0.07)",
                  border:     selected ? `1.5px solid ${s.color}` : "1px solid rgba(255,255,255,0.1)",
                  color:      selected ? s.color      : "rgba(255,255,255,0.65)",
                }}>
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* submit */}
      <div className="flex justify-end pt-1">
        <button type="button" disabled={!verdict}
          onClick={() => verdict && onSubmit(verdict, notes)}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all active:scale-[0.97]"
          style={{
            background: verdict ? "#1a6b35"              : "rgba(29,197,88,0.2)",
            color:      verdict ? "white"                : "rgba(255,255,255,0.35)",
            cursor:     verdict ? "pointer"              : "not-allowed",
            opacity:    verdict ? 1                      : 0.7,
          }}>
          Submit Feedback
        </button>
      </div>
    </ModalShell>
  );
}

/**
 * Hiring Decision modal — 2-step flow matching Figma 5422-20845 and 5422-20924.
 *
 *   Step 1 (5422-20845): Two interview summary cards + No / Stall / Yes selector + Next
 *   Step 2 (5422-20924): Confirm screen showing the chosen action + Confirm CTA
 */
function MakeHiringDecisionModal({ candidate, firstRoundVerdict, secondRoundVerdict, interviewScore, attendees, onClose, onConfirm }: {
  candidate:           ShortlistCandidate;
  firstRoundVerdict?:  string;
  secondRoundVerdict?: string;
  interviewScore?:     number;
  attendees?:          string[];
  onClose:             () => void;
  onConfirm:           (decision: "yes" | "stall" | "no") => void;
}) {
  const [choice, setChoice] = useState<"yes" | "stall" | "no" | null>(null);
  const [step,   setStep]   = useState<"pick" | "action" | "no-done">("pick");

  const fn           = candidate.name.split(" ")[0];
  const displayScore = interviewScore ?? candidate.score;
  const isYes        = choice === "yes";
  const isNo         = choice === "no";
  const isStall      = choice === "stall";

  const verdictColor = (v?: string) =>
    !v ? "#1ed25e"
    : ({ "Strong Yes": "#1ed25e", "Yes": "#51a2ff", "No": "#f87171", "Strong No": "#ef4444" })[v] ?? "#1ed25e";

  /* colour config per choice */
  const choiceStyle = {
    yes:   { border: "rgba(29,197,88,0.7)",   text: "#1ed25e",  bg: "rgba(29,197,88,0.1)"   },
    stall: { border: "rgba(245,158,11,0.7)",  text: "#f59e0b",  bg: "rgba(245,158,11,0.08)" },
    no:    { border: "rgba(248,113,113,0.7)", text: "#f87171",  bg: "rgba(248,113,113,0.1)" },
  };

  /* interview summary cards */
  const interviewCards = (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl p-4 flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>First Interview</p>
        {firstRoundVerdict
          ? <p className="text-base font-bold" style={{ color: verdictColor(firstRoundVerdict) }}>{firstRoundVerdict}</p>
          : <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Pending</p>}
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>AI Facilitated</p>
      </div>
      <div className="rounded-2xl p-4 flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Second Interview</p>
        {secondRoundVerdict
          ? <p className="text-base font-bold" style={{ color: verdictColor(secondRoundVerdict) }}>{secondRoundVerdict}</p>
          : <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Pending</p>}
        {attendees && attendees.length > 0 && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{attendees.join(", ")}</p>
        )}
      </div>
    </div>
  );

  /* ── Step 1 & 2: pick decision (Figma 5422-20707 → 5422-20845) ── */
  if (step === "pick") return (
    <ModalShell title="Hiring Decision" onClose={onClose} maxWidth="max-w-lg">
      <ModalCandidateRow c={candidate} extra={<ScoreRing score={displayScore} size="lg" />} />
      {interviewCards}
      <p className="text-base font-bold text-white">Would you like to move forward with {candidate.name}?</p>

      {/* No | Stall | Yes */}
      <div className="grid grid-cols-3 gap-3">
        {(["No", "Stall", "Yes"] as const).map((label) => {
          const key = label.toLowerCase() as "no" | "stall" | "yes";
          const sel = choice === key;
          const cs  = choiceStyle[key];
          return (
            <button key={label} type="button" onClick={() => setChoice(key)}
              className="py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90 active:scale-[0.97]"
              style={{
                background: sel ? cs.bg : "rgba(255,255,255,0.07)",
                border:     sel ? `1.5px solid ${cs.border}` : "1px solid rgba(255,255,255,0.12)",
                color:      sel ? cs.text : choice ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)",
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Next button — grayed until selection, green once selected */}
      <div className="flex justify-end pt-1">
        <button type="button" disabled={!choice}
          onClick={() => choice && setStep("action")}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all active:scale-[0.97]"
          style={{
            background: choice ? "#1a6b35" : "rgba(255,255,255,0.08)",
            color:      choice ? "white"   : "rgba(255,255,255,0.3)",
            cursor:     choice ? "pointer" : "not-allowed",
          }}>
          Next
        </button>
      </div>
    </ModalShell>
  );

  /* ── Step 3: action screen (Figma 5422-20923) — branches per choice ── */
  if (isYes) return (
    <ModalShell title="Offer Contract" onBack={() => setStep("pick")} onClose={onClose} maxWidth="max-w-lg">
      <ModalCandidateRow c={candidate} extra={<ScoreRing score={displayScore} size="lg" />} />
      <AiBanner>
        trAIn has prepared the contract based on your preferences for this job posting. You can review and edit the details or proceed with the offer.
      </AiBanner>
      {/* contract card */}
      <div className="rounded-2xl p-4 flex items-start justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Contract</p>
          <p className="text-base font-bold text-white">{candidate.role || "Senior AI Developer"}</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            88,000 SAR p.a &nbsp;•&nbsp; Jeddah
          </p>
        </div>
        <Pencil size={16} className="flex-shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.4)" }} />
      </div>
      <div className="flex justify-end pt-1">
        <button type="button"
          onClick={() => { onConfirm("yes"); onClose(); }}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "#1a6b35", color: "white" }}>
          Offer Contract
        </button>
      </div>
    </ModalShell>
  );

  /* ── No: step 2 — Decline Candidate (Figma 5422-21684) ── */
  if (isNo && step === "action") return (
    <ModalShell title="Decline Candidate" onBack={() => setStep("pick")} onClose={onClose} maxWidth="max-w-lg">
      <ModalCandidateRow c={candidate} extra={<ScoreRing score={displayScore} size="lg" />} />
      <AiBanner>
        trAIn has prepared a candidate-ready feedback summary of the specific skills they may wish to focus on to improve their chances for future applications. You can add your own notes before submitting your decision.
      </AiBanner>
      {/* feedback summary card */}
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Feedback Summary</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Based on 2 interviews</p>
        </div>
        <button type="button"
          className="text-sm font-medium underline transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.75)" }}>
          View
        </button>
      </div>
      <div className="flex justify-end pt-1">
        <button type="button"
          onClick={() => { onConfirm("no"); setStep("no-done"); }}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "rgba(185,28,28,0.85)", color: "white" }}>
          Decline Candidate
        </button>
      </div>
    </ModalShell>
  );

  /* ── No: step 3 — done (Figma 5422-21743) ── */
  if (step === "no-done") return (
    <ModalShell title="Candidate Declined" onClose={onClose} maxWidth="max-w-lg">
      <ModalCandidateRow c={candidate} extra={<ScoreRing score={displayScore} size="lg" />} />
      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
        <X size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold" style={{ color: "#f87171" }}>Candidate Declined</p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            {candidate.name} has been marked as unsuccessful. trAIn has sent {pronounFor(candidate.name)} a personalised feedback summary to help with future applications.
          </p>
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <button type="button" onClick={onClose}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:bg-white/10 active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>
          Close
        </button>
      </div>
    </ModalShell>
  );

  /* Stall */
  return (
    <ModalShell title="Put on Hold" onBack={() => setStep("pick")} onClose={onClose} maxWidth="max-w-lg">
      <ModalCandidateRow c={candidate} extra={<ScoreRing score={displayScore} size="lg" />} />
      <AiBanner>
        {fn} will be placed on hold. You can revisit this decision at any time from the Hire tab. trAIn will keep {fn}'s profile active.
      </AiBanner>
      <div className="flex justify-end pt-1">
        <button type="button"
          onClick={() => { onConfirm("stall"); onClose(); }}
          className="px-8 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "rgba(180,83,9,0.7)", color: "#fde68a" }}>
          Put on Hold
        </button>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SCREENED TAB — ApplicantCard
══════════════════════════════════════════════════════════════════════════ */
interface ApplicantCardProps {
  applicant: Applicant & { matchScore?: number };
  delay?:    number;
  compact?:  boolean;
  starred?:  boolean;
  onClick?:  (id: string) => void;
  onStar?:   (applicant: Applicant & { matchScore?: number }) => void;
}
function ApplicantCard({ applicant, delay = 0, compact = false, starred = false, onClick, onStar }: ApplicantCardProps) {
  const profile    = applicant.candidate_profile;
  const name       = applicant.candidate_name || profile?.name || "Unknown";
  const initials   = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const title      = profile?.experience?.[0]?.title || "AI Practitioner";
  const matchScore = applicant.matchScore || Math.floor(Math.random() * 20) + 75;
  const topSkills  = profile?.skills?.slice(0, 3) || [];

  const ringColor =
    matchScore >= 90 ? { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.4)", text: "#34d399" } :
    matchScore >= 80 ? { bg: "rgba(81,162,255,0.15)", border: "rgba(81,162,255,0.4)", text: "#51a2ff" } :
                       { bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.4)",  text: "#fbbf24" };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}>
      <div
        className="w-full text-left rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: starred ? "1px solid rgba(29,197,88,0.35)" : "1px solid rgba(255,255,255,0.08)",
        }}>
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: "linear-gradient(135deg, #1ed25e 0%, #51a2ff 100%)", color: "white" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white text-base font-semibold truncate">{name}</p>
            </div>
            <p className="text-[var(--text-muted)] text-sm truncate">{title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* star / shortlist button */}
            {onStar && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onStar(applicant); }}
                className="p-1.5 rounded-full transition-all hover:scale-110 active:scale-95"
                style={{ color: starred ? "var(--accent)" : "rgba(255,255,255,0.25)" }}
                title={starred ? "Shortlisted" : "Add to shortlist"}>
                <Star size={16} style={starred ? { fill: "var(--accent)" } : {}} />
              </button>
            )}
            <div className="size-11 rounded-full flex items-center justify-center font-bold text-base"
              style={{ background: ringColor.bg, border: `2px solid ${ringColor.border}`, color: ringColor.text }}>
              {matchScore}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onClick?.(applicant.id)}
          className="w-full text-left flex flex-col gap-2 transition-all hover:opacity-80">
          {!compact && topSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topSkills.map((skill) => (
                <span key={skill.name} className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)" }}>
                  {skill.name}
                </span>
              ))}
            </div>
          )}
          {!compact && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[var(--text-label)]">Applied {formatRelativeTime(applicant.applied_at)}</span>
              <ChevronRight size={16} className="text-[var(--text-subtle)]" />
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   KANBAN + TALENT POOL COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

/** SVG circular progress score ring — matches Figma Skill Score component */
function ScoreCircle({ score, size = 44 }: { score: number; size?: number }) {
  const r   = (size - 5) / 2;
  const c   = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  const color = score >= 85 ? "#1ed25e" : score >= 75 ? "#f59e0b" : "#f87171";
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg) scaleY(-1)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2.5} />
        <circle cx={c} cy={c} r={r} fill="none"
          stroke={color} strokeWidth={2.5}
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}</span>
      </div>
    </div>
  );
}

/** Round avatar with gradient + initials fallback */
function CandidateAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d1b69 100%)",
        border: "1.5px solid rgba(255,255,255,0.12)",
      }}
    >
      <span style={{ color: "white", fontSize: Math.round(size * 0.32), fontWeight: 600 }}>{initials}</span>
    </div>
  );
}

/** Single draggable card inside the Kanban board */
function KanbanCardItem({ candidate, onDragStart }: {
  candidate: KCandidate;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-4 rounded-xl select-none"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "grab",
      }}
    >
      <CandidateAvatar name={candidate.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight truncate">{candidate.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{candidate.role}</p>
      </div>
      <ScoreCircle score={candidate.score} />
    </div>
  );
}

/** One column of the Kanban board — handles drag-over visual + drop */
function KanbanColumnPanel({
  col, candidates, isDragOver,
  onDragOver, onDragLeave, onDrop, onCandidateDragStart,
}: {
  col:                  KanbanCol;
  candidates:           KCandidate[];
  isDragOver:           boolean;
  onDragOver:           (e: React.DragEvent) => void;
  onDragLeave:          (e: React.DragEvent) => void;
  onDrop:               (e: React.DragEvent) => void;
  onCandidateDragStart: (e: React.DragEvent, c: KCandidate) => void;
}) {
  return (
    <div
      className="flex-1 flex flex-col gap-3 p-4 rounded-xl min-w-0 transition-colors"
      style={{
        background: isDragOver ? "rgba(29,197,88,0.04)" : "rgba(255,255,255,0.04)",
        border: isDragOver
          ? "1px solid rgba(29,197,88,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        minWidth: 0,
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header pill */}
      <div className="flex-shrink-0">
        <span
          className="inline-block px-3 py-1 rounded-full text-sm"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.9)" }}
        >
          {KANBAN_LABELS[col]}
        </span>
      </div>

      {candidates.length > 0 ? (
        <div className="flex flex-col gap-2">
          {candidates.map((c) => (
            <KanbanCardItem
              key={c.id}
              candidate={c}
              onDragStart={(e) => onCandidateDragStart(e, c)}
            />
          ))}
        </div>
      ) : (
        <div
          className="flex-1 flex items-center justify-center rounded-xl"
          style={{
            border: "1.5px dashed rgba(255,255,255,0.15)",
            minHeight: 80,
          }}
        >
          <p
            className="text-xs text-center px-4 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.3)", whiteSpace: "pre-line" }}
          >
            {KANBAN_EMPTY[col]}
          </p>
        </div>
      )}
    </div>
  );
}

/** Card in the Talent Pool grid */
function TalentPoolCard({ candidate, onInvite }: {
  candidate: TalentCandidate;
  onInvite:  () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: candidate.invited
          ? "1px solid rgba(29,197,88,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Avatar + name + score */}
      <div className="flex items-center gap-3">
        <CandidateAvatar name={candidate.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{candidate.name}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{candidate.role}</p>
        </div>
        <ScoreCircle score={candidate.score} />
      </div>

      {/* Invite / Invited button */}
      {candidate.invited ? (
        <div
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: "rgba(29,197,88,0.08)",
            border: "1px solid rgba(29,197,88,0.2)",
            color: "#1ed25e",
          }}
        >
          <Sparkles size={13} />
          Invitation sent
        </div>
      ) : (
        <button
          type="button"
          onClick={onInvite}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          <Mail size={13} />
          Invite to apply
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — JobPostingTemplate
══════════════════════════════════════════════════════════════════════════ */
export function JobPostingTemplate({
  jobPosting, postingId, onNavigateToHiring, jobs, onSelectJob,
}: JobPostingTemplateProps) {
  /* ── data state ─────────────────────────────────────────────────────── */
  const [applicants,         setApplicants]         = useState<Applicant[]>([]);
  const [loading,            setLoading]             = useState(true);
  const [selectedApplicantId,setSelectedApplicantId] = useState<string | null>(null);
  const [starredIds,         setStarredIds]          = useState<Set<string>>(new Set());

  /* ── new 3-tab state ─────────────────────────────────────────────────── */
  const [mainTab,    setMainTab]    = useState<MainTab>("applicants");
  const [kanban,     setKanban]     = useState<Record<KanbanCol, KCandidate[]>>(KANBAN_INIT);
  const [dragOver,   setDragOver]   = useState<KanbanCol | null>(null);
  const [talentPool, setTalentPool] = useState<TalentCandidate[]>(TALENT_POOL_INIT);
  const dragRef = useRef<{ candidate: KCandidate; from: KanbanCol } | null>(null);

  // keep activeTab for backward-compat with existing modal logic
  const activeTab = "screened" as const;

  /* ── interview pipeline state ───────────────────────────────────────── */
  /*
   * Demo flow — 8 Figma steps, all triggered by user interaction:
   *   Step 1 (5099-28300)  → State 1: Sara + Omar both have upcoming first round
   *   Step 2 (5382-16686)  → Click "Simulate: AI interview complete" → outcome set
   *   Step 3 (5397-17025)  → State 2: outcome shown, "Book Next Interview" CTA
   *   Step 4 (5099-27518)  → BookNextInterviewModal opens
   *   Step 5 (5397-17446)  → State 3: second round booked
   *   Step 6 (5397-17746)  → AddFeedbackModal opens
   *   Step 7 (5397-17818)  → State 4: second round verdict shown
   *   Step 8 (5397-18150)  → Candidate appears in Hire tab
   */
  const [bookedTimes, setBookedTimes] = useState<Record<string, string>>({
    s2: "6:00pm Today",     // Sara  — first round upcoming (State 1)
    s3: "10:00am Tomorrow", // Omar  — first round upcoming (State 1)
  });

  // Outcomes start empty; populated when "Simulate: AI interview complete" is clicked
  const [interviewOutcomes, setInterviewOutcomes] = useState<Record<string, InterviewOutcome>>({});

  const [nextRoundBookings,  setNextRoundBookings]  = useState<Record<string, NextRoundBooking>>({});
  const [secondRoundStatuses,setSecondRoundStatuses]= useState<Record<string, SecondRoundStatus>>({});

  /* ── modal / selection state ────────────────────────────────────────── */
  const [bookingCandidate,    setBookingCandidate]    = useState<ShortlistCandidate | null>(null);
  const [feedbackCandidate,   setFeedbackCandidate]   = useState<ShortlistCandidate | null>(null);
  const [nextRoundCandidate,  setNextRoundCandidate]  = useState<ShortlistCandidate | null>(null);
  const [feedbackTarget,      setFeedbackTarget]      = useState<ShortlistCandidate | null>(null);
  const [hiringDecisionTarget,setHiringDecisionTarget]= useState<ShortlistCandidate | null>(null);
  const [inviteCandidate,     setInviteCandidate]     = useState<ShortlistCandidate | null>(null);
  const [invitedCandidates,   setInvitedCandidates]   = useState<Record<string, boolean>>({});

  /* ── hire state ─────────────────────────────────────────────────────── */
  // No hire decisions yet — candidates reach Hire tab after second round completes
  const [hireStatuses,      setHireStatuses]      = useState<Record<string, HireDecisionStatus>>({});
  const [showCloseJobModal, setShowCloseJobModal] = useState(false);

  /* ── derived values ─────────────────────────────────────────────────── */
  const posting = {
    ...MOCK_JOB_POSTING,
    ...Object.fromEntries(Object.entries(jobPosting || {}).filter(([, v]) => v != null && v !== "")),
  } as JobPosting;
  const effectivePostingId = postingId || posting.id;

  const interviewCount = Object.keys(bookedTimes).length;
  const hireCount = SHORTLIST_CANDIDATES.filter((c) => {
    const sr = secondRoundStatuses[c.id];
    return sr?.verdict === "Strong Yes" || sr?.verdict === "Yes";
  }).length;

  /* ── fetch applicants ───────────────────────────────────────────────── */
  useEffect(() => {
    const fetchForPosting = async (pid: string) => {
      const { getJobApplicants } = await import('@/lib/mcpBridge');
      try {
        const data = await getJobApplicants(pid, true, 100);
        return (data.items || []) as Applicant[];
      } catch (err) {
        console.error("[JobPostingTemplate] Failed to fetch for posting:", pid, err);
        return [];
      }
    };

    const fetchApplicants = async () => {
      setLoading(true);
      try {
        let items = await fetchForPosting(effectivePostingId);
        if (items.length === 0 && effectivePostingId !== MOCK_JOB_POSTING.id) {
          items = await fetchForPosting(MOCK_JOB_POSTING.id);
        }
        setApplicants(items);
      } catch (err) {
        console.error("[JobPostingTemplate] Failed to fetch applicants:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicants();
  }, [effectivePostingId]);

  /* ── star / shortlist helper ────────────────────────────────────────── */
  const starredShortlistCandidates: ShortlistCandidate[] = useMemo(() =>
    applicants
      .filter((a) => starredIds.has(a.id))
      .map((a) => {
        const profile   = a.candidate_profile;
        const name      = a.candidate_name || profile?.name || "Unknown";
        const score     = profile ? calculateMatchScore(profile) : 75;
        const topSkills = profile?.skills?.slice(0, 2).map((s) => s.name).join(" and ") || "";
        const location  = profile?.location || profile?.city || "Unknown location";
        return {
          id:          a.id,
          name,
          role:        profile?.experience?.[0]?.title || "Candidate",
          score,
          avatar:      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a3a5c&color=fff&size=80`,
          status:      "Shortlisted",
          statusBg:    "rgba(30,210,94,0.12)",
          statusColor: "#1ed25e",
          insight:     topSkills
            ? `${name} is a strong match with experience in ${topSkills}.`
            : `${name} has been shortlisted for this role.`,
          bullets: [`Based in ${location}`, ...(topSkills ? [`Strong skills in ${topSkills}`] : [])],
          cta:         "Book AI interview",
        };
      }),
  [applicants, starredIds]);

  const allShortlistCandidates = useMemo(
    () => [...SHORTLIST_CANDIDATES, ...starredShortlistCandidates],
    [starredShortlistCandidates],
  );

  const handleStarApplicant = useCallback((a: Applicant & { matchScore?: number }) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) { next.delete(a.id); } else { next.add(a.id); }
      return next;
    });
  }, []);

  /* ── derived lists ──────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    screened:  applicants.filter((a) => a.status === "applied" || a.status === "reviewing").length,
    shortlist: allShortlistCandidates.length,
    interview: interviewCount,
    hire:      hireCount,
  }), [applicants, allShortlistCandidates.length, interviewCount, hireCount]);

  const recommendedApplicants = useMemo(() =>
    applicants.filter((a) => a.candidate_profile)
      .map((a) => ({ ...a, matchScore: calculateMatchScore(a.candidate_profile!) }))
      .filter((a) => a.matchScore >= 80)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8),
  [applicants]);

  const aiSuggestions = useMemo(() =>
    applicants.filter((a) => a.candidate_profile)
      .map((a) => ({ ...a, matchScore: calculateMatchScore(a.candidate_profile!) }))
      .filter((a) => a.matchScore >= 75 && a.matchScore < 80)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8),
  [applicants]);

  const filteredApplicants = useMemo(() => {
    if (activeTab === "screened") return applicants.filter((a) => a.status === "applied" || a.status === "reviewing");
        return [];
  }, [applicants, activeTab]);

  const scoredApplicants: ApplicantWithScore[] = useMemo(
    () => applicants.filter((a) => a.candidate_profile)
      .map((a) => ({ ...a, matchScore: calculateMatchScore(a.candidate_profile!) }))
        .sort((a, b) => b.matchScore - a.matchScore),
    [applicants],
  );

  /* ── callbacks ──────────────────────────────────────────────────────── */
  const handleApplicantClick  = useCallback((id: string) => setSelectedApplicantId(id), []);
  const handleBackFromCandidate = useCallback(() => setSelectedApplicantId(null), []);

  /* ── candidate detail view ──────────────────────────────────────────── */
  if (selectedApplicantId) {
    return (
      <JobCandidateView
        jobPosting={{ title: posting.title, department: posting.department, location: posting.location, postedAt: posting.posted_at }}
        applicants={scoredApplicants}
        selectedId={selectedApplicantId}
        onSelectCandidate={handleApplicantClick}
        onBack={handleBackFromCandidate}
        onNavigateToHiring={onNavigateToHiring}
      />
    );
  }

  /* ── kanban drag handlers ────────────────────────────────────────────── */
  function handleKanbanDragStart(e: React.DragEvent, candidate: KCandidate, from: KanbanCol) {
    dragRef.current = { candidate, from };
    e.dataTransfer.effectAllowed = "move";
  }
  function handleKanbanDragOver(e: React.DragEvent, col: KanbanCol) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(col);
  }
  function handleKanbanDragLeave(e: React.DragEvent) {
    // only clear if leaving the column container itself, not a child
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }
  function handleKanbanDrop(e: React.DragEvent, to: KanbanCol) {
    e.preventDefault();
    setDragOver(null);
    if (!dragRef.current) return;
    const { candidate, from } = dragRef.current;
    dragRef.current = null;
    if (from === to) return;
    setKanban((prev) => ({
      ...prev,
      [from]: prev[from].filter((c) => c.id !== candidate.id),
      [to]:   [...prev[to], candidate],
    }));
  }

  /* ── talent pool invite handler ─────────────────────────────────────── */
  function handleTalentInvite(id: string) {
    setTalentPool((prev) =>
      prev.map((c) => (c.id === id ? { ...c, invited: true } : c)),
    );
  }

  /* ── derived counts for tab badges ─────────────────────────────────── */
  const applicantsCount = Object.values(kanban).reduce((s, col) => s + col.length, 0);
  const talentPoolCount = talentPool.length;
  const invitedCount    = talentPool.filter((c) => c.invited).length;

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <>
    <div className="flex h-full overflow-hidden gap-6 p-6">
      {/* Sidebar */}
      {jobs && jobs.length > 0 && (
        <div className="w-72 flex-shrink-0 h-full">
          <JobPostingSidebar jobs={jobs} selectedId={effectivePostingId} onSelect={onSelectJob} />
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-base mb-5 flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.5)" }}>
          <button
            type="button"
            onClick={onNavigateToHiring}
            className="hover:text-white transition-colors"
          >
            Hiring
          </button>
          <span>/</span>
          <span className="text-white">{posting.title}</span>
        </div>

        {/* ── Title row ── */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[40px] font-semibold text-white leading-tight">{posting.title}</h1>
            <ChevronDown size={28} className="text-white opacity-70 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ArrowUpDown size={18} className="text-white/70" />
            </button>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ListFilter size={18} className="text-white/70" />
            </button>
          </div>
        </div>

        {/* ── 3-tab bar ── */}
        <div className="flex gap-6 relative mb-5 flex-shrink-0">
          {(["applicants", "talentPool", "jobDetails"] as const).map((tab) => {
            const isActive = mainTab === tab;
            const label =
              tab === "applicants"  ? "Applicants" :
              tab === "talentPool"  ? "Talent Pool" :
              "Job Details";
            const count =
              tab === "applicants" ? applicantsCount :
              tab === "talentPool" ? talentPoolCount :
              undefined;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setMainTab(tab)}
                className="flex flex-col items-center gap-[13px] pb-0 transition-opacity"
                style={{ opacity: isActive ? 1 : 0.5 }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base text-white">{label}</span>
                  {count !== undefined && (
                    <span
                      className="px-2.5 rounded-full text-base leading-6"
                      style={{ background: "rgba(255,255,255,0.1)", color: "#f4f4f5" }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="w-full h-[3px] rounded-[1px] bg-white flex-shrink-0" />
                )}
              </button>
            );
          })}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto pb-8 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={mainTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 h-full"
            >

              {/* ═══ APPLICANTS TAB ═══ */}
              {mainTab === "applicants" && (
                <>
                  {/* AI banner */}
                  <div
                    className="flex items-start gap-2 rounded-xl overflow-hidden flex-shrink-0"
                    style={{
                      background: "rgba(119,220,155,0.05)",
                      border: "1px solid rgba(74,209,121,0.6)",
                    }}
                  >
                    <div className="w-2 self-stretch flex-shrink-0" style={{ background: "#4ad179" }} />
                    <div className="flex items-start gap-2 px-4 py-4 flex-1">
                      <Sparkles size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#4ad179" }} />
                      <p className="text-sm leading-relaxed" style={{ color: "#d2f3de" }}>
                        <strong className="font-semibold">Showing {applicantsCount} recommended applicants</strong>
                        {" "}from 53 total applications. trAIn filtered applicants who didn't meet key skills, surfacing the strongest matches first.
                      </p>
                    </div>
                  </div>

                  {/* Kanban board — 4 equal columns */}
                  <div className="flex gap-4 flex-1 min-h-0">
                    {(["screening", "shortlist", "interview", "hire"] as KanbanCol[]).map((col) => (
                      <KanbanColumnPanel
                        key={col}
                        col={col}
                        candidates={kanban[col]}
                        isDragOver={dragOver === col}
                        onDragOver={(e) => handleKanbanDragOver(e, col)}
                        onDragLeave={handleKanbanDragLeave}
                        onDrop={(e) => handleKanbanDrop(e, col)}
                        onCandidateDragStart={(e, c) => handleKanbanDragStart(e, c, col)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* ═══ TALENT POOL TAB ═══ */}
              {mainTab === "talentPool" && (
                <>
                  {/* AI banner */}
                  <div
                    className="flex items-start gap-2 rounded-xl overflow-hidden flex-shrink-0"
                    style={{
                      background: "rgba(119,220,155,0.05)",
                      border: "1px solid rgba(74,209,121,0.6)",
                    }}
                  >
                    <div className="w-2 self-stretch flex-shrink-0" style={{ background: "#4ad179" }} />
                    <div className="flex items-start gap-2 px-4 py-4 flex-1">
                      <Sparkles size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#4ad179" }} />
                      <p className="text-sm leading-relaxed" style={{ color: "#d2f3de" }}>
                        <strong className="font-semibold">Showing {talentPoolCount} candidates who match required skills.</strong>
                        {" "}Invite them to apply and trAIn will automatically contact them to request they submit an application.
                        {invitedCount > 0 && (
                          <span className="ml-1 opacity-75">({invitedCount} invited)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 4-column grid */}
                  <div className="grid grid-cols-4 gap-4">
                    {talentPool.map((c) => (
                      <TalentPoolCard
                        key={c.id}
                        candidate={c}
                        onInvite={() => handleTalentInvite(c.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* ═══ JOB DETAILS TAB ═══ */}
              {mainTab === "jobDetails" && (
                <div className="flex flex-col gap-4 max-w-2xl">
                  <div
                    className="rounded-2xl p-6 flex flex-col gap-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <h2 className="text-xl font-semibold text-white">{posting.title}</h2>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: posting.department || "Engineering" },
                        { label: posting.location   || "Remote" },
                        { label: posting.status     || "active" },
                      ].map(({ label }) => (
                        <span
                          key={label}
                          className="px-3 py-1 rounded-full text-sm"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)" }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                      We&apos;re looking for a {posting.title} to design, build, and deploy intelligent systems.
                      You&apos;ll work across the full model lifecycle — from data prep and training to evaluation and production rollout.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Action Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="fixed bottom-6 right-6 px-5 py-3 rounded-full flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          <MessageCircle size={18} />
          <span className="text-sm font-semibold">
            {mainTab === "talentPool" ? "Chat about talent pool" : "Chat about candidates"}
          </span>
        </motion.button>

      </div>
    </div>

    {/* ── Retained modals (ShortlistCard interactions) ─────────────────── */}

    <AnimatePresence>
      {inviteCandidate && (
        <InviteToApplyModal
          candidate={inviteCandidate}
          jobTitle={posting.title}
          onClose={() => setInviteCandidate(null)}
          onSend={() => {
            const id = inviteCandidate.id;
            setInvitedCandidates((prev) => ({ ...prev, [id]: true }));
            setInviteCandidate(null);
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {bookingCandidate && (
        <BookAIInterviewModal
          candidate={bookingCandidate}
          onClose={() => setBookingCandidate(null)}
          onBook={(time) => {
            const id    = bookingCandidate.id;
            const isNew = !bookedTimes[id];
            setBookingCandidate(null);
            if (!isNew) setInterviewOutcomes((prev) => { const n = { ...prev }; delete n[id]; return n; });
            setBookedTimes((prev) => ({ ...prev, [id]: time }));
            if (isNew) console.log("[Kanban] Interview booked for", id);
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {nextRoundCandidate && (
        <BookNextInterviewModal
          candidate={nextRoundCandidate}
          onClose={() => setNextRoundCandidate(null)}
          onBook={(booking) => {
            const id = nextRoundCandidate.id;
            setNextRoundCandidate(null);
            setNextRoundBookings((prev) => ({ ...prev, [id]: booking }));
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {feedbackTarget && (
        <AddFeedbackModal
          candidate={feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          onSubmit={(verdict, notes) => {
            const id = feedbackTarget.id;
            setFeedbackTarget(null);
            setSecondRoundStatuses((prev) => ({ ...prev, [id]: { ...prev[id], verdict, notes } }));
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {hiringDecisionTarget && (
        <MakeHiringDecisionModal
          candidate={hiringDecisionTarget}
          firstRoundVerdict={interviewOutcomes[hiringDecisionTarget.id]?.verdict}
          secondRoundVerdict={secondRoundStatuses[hiringDecisionTarget.id]?.verdict}
          interviewScore={interviewOutcomes[hiringDecisionTarget.id]?.interviewScore}
          attendees={nextRoundBookings[hiringDecisionTarget.id]?.attendees}
          onClose={() => setHiringDecisionTarget(null)}
          onConfirm={(decision) => {
            const id = hiringDecisionTarget.id;
            if (decision === "yes")   setHireStatuses((prev) => ({ ...prev, [id]: "offered" }));
            if (decision === "no")    setHireStatuses((prev) => ({ ...prev, [id]: "unsuccessful" }));
            if (decision === "stall") setHireStatuses((prev) => ({ ...prev, [id]: "stall" }));
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {feedbackCandidate && interviewOutcomes[feedbackCandidate.id] && (
        <FeedbackSummaryModal
          candidate={feedbackCandidate}
          outcome={interviewOutcomes[feedbackCandidate.id]}
          onClose={() => setFeedbackCandidate(null)}
          onBookNext={() => {
            const c = feedbackCandidate;
            setFeedbackCandidate(null);
            setNextRoundCandidate(c);
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showCloseJobModal && (
        <CloseJobPostingModal
          jobTitle={posting.title}
          hiredCount={0}
          offeredCount={0}
          unsuccessfulCount={0}
          onClose={() => setShowCloseJobModal(false)}
          onConfirm={() => setShowCloseJobModal(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CLOSE JOB POSTING MODAL  (Figma 5422-22574)
══════════════════════════════════════════════════════════════════════════ */
function CloseJobPostingModal({ jobTitle, hiredCount, offeredCount, unsuccessfulCount, onClose, onConfirm }: {
  jobTitle:         string;
  hiredCount:       number;
  offeredCount:     number;
  unsuccessfulCount:number;
  onClose:   () => void;
  onConfirm: () => void;
}) {
  const summaryItems = [
    ...(hiredCount       > 0 ? [{ label: "Hired",     count: hiredCount,        color: "rgba(29,197,88,1)",    bg: "rgba(29,197,88,0.12)" }]  : []),
    ...(offeredCount     > 0 ? [{ label: "Offered",   count: offeredCount,       color: "rgba(99,179,237,1)",   bg: "rgba(99,179,237,0.12)" }] : []),
    ...(unsuccessfulCount>0  ? [{ label: "Declined",  count: unsuccessfulCount,  color: "rgba(249,112,102,1)",  bg: "rgba(249,112,102,0.12)" }]: []),
  ];

  return (
    <ModalShell title="Close Job Posting" onClose={onClose}>
      {/* AI summary banner */}
      <div className="px-4 py-3 rounded-xl flex items-start gap-2.5 mb-4"
        style={{ background: "rgba(29,197,88,0.07)", border: "1px solid rgba(29,197,88,0.2)" }}>
        <Sparkles size={15} className="flex-shrink-0 mt-0.5 text-[var(--accent)]" />
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
          <span className="text-[var(--accent)] font-medium">trAIn recommends closing this posting. </span>
          All candidates have received a decision. Closing will archive the posting and notify all applicants.
        </p>
      </div>

      {/* Job title card */}
      <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{jobTitle}</p>
          <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>Job Posting</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: "rgba(249,112,102,0.15)", color: "rgba(249,112,102,1)" }}>
          Closing
        </span>
      </div>

      {/* Hiring summary pills */}
      {summaryItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {summaryItems.map((item) => (
            <span key={item.label}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5"
              style={{ background: item.bg, color: item.color }}>
              <CheckCircle size={12} />
              {item.count} {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Warning note */}
      <div className="px-4 py-3 rounded-xl flex items-start gap-2.5 mb-6"
        style={{ background: "rgba(249,112,102,0.07)", border: "1px solid rgba(249,112,102,0.2)" }}>
        <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(249,112,102,0.9)" }} />
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
          This action cannot be undone. The posting will be archived and no longer visible to new candidates.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-full text-[14px] font-semibold transition-all hover:brightness-110"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm}
          className="flex-1 py-3 rounded-full text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "rgba(249,112,102,0.9)", color: "white" }}>
          Close Job Posting
        </button>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════════════════ */
function calculateMatchScore(profile: CandidateProfile): number {
  const skillCount      = profile.skills?.length || 0;
  const experienceYears = profile.experience_years || 0;
  const hasEducation    = (profile.education?.length || 0) > 0;
  let score = 60 + Math.min(skillCount * 3, 25) + Math.min(experienceYears * 2, 10) + (hasEducation ? 5 : 0);
  return Math.min(Math.max(score, 65), 97);
}

function formatRelativeTime(dateString: string): string {
  try {
    const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
    if (diffDays === 0)  return "today";
    if (diffDays === 1)  return "yesterday";
    if (diffDays < 7)   return `${diffDays}d ago`;
    if (diffDays < 30)  return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch { return "recently"; }
}
