import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronDown, ChevronLeft, Star, Sparkles, X, Pencil,
  TrendingUp, Calendar, CheckCircle, ClipboardList, AlertCircle, ChevronsUp, Circle,
  ArrowUpDown, ListFilter, Mail, Briefcase, GraduationCap, Info, User, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JobCandidateView, type ApplicantWithScore } from "@/components/templates/JobCandidateView";
import { Breadcrumb } from "@/components/employer/Breadcrumb";
import { JobPostingSidebar, type SidebarJob } from "@/components/employer/JobPostingSidebar";
import { useVoiceSessionStore } from "@/lib/stores/voice-session-store";

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

interface KCandidate {
  id: string;
  name: string;
  role: string;
  score: number;
  avatar?: string;
  interviewBadges?: { count: string; status: string; statusVariant?: "green" | "blue" | "default" };
  scoreIncreased?: boolean;
}
interface TalentCandidate { id: string; name: string; role: string; score: number; invited?: boolean; avatar?: string }

interface CandidateProfileData {
  id: string;
  name: string;
  role: string;
  location: string;
  score: number;
  avatar?: string;
  matchInsight: string;
  workExperience: { title: string; company: string; period: string }[];
  certifications: { name: string; issuer: string; year: string; logo?: string }[];
  skills: { name: string; level: string }[];
}

const KANBAN_LABELS: Record<KanbanCol, string> = {
  screening: "Screening", shortlist: "Shortlist", interview: "Interview", hire: "Hire",
};
const KANBAN_EMPTY: Record<KanbanCol, string> = {
  screening: "Drag candidates here",
  shortlist: "Drag candidates here",
  interview: "Drag candidates here",
  hire:      "Drag candidates here\nto compare and hire",
};

// Screening + Shortlist candidates (Figma-accurate scores and real profile photos)
const SCREENING_CANDIDATES: KCandidate[] = [
  { id: "k1", name: "Waleed Jaber", role: "ML Specialist",   score: 88, avatar: "/candidates/waleed-jaber.png" },
  { id: "k2", name: "Lina Faraj",   role: "AI Practitioner", score: 86, avatar: "/candidates/lina-faraj.png"  },
  { id: "k3", name: "Yousef Rayan", role: "ML Engineer",     score: 86, avatar: "/candidates/yousef-rayan.png"},
];
const SHORTLIST_INIT_CANDIDATES: KCandidate[] = [
  { id: "k7", name: "Lama Abdul",   role: "AI Developer",    score: 88, avatar: "/candidates/lama-abdul.png"  },
  { id: "k8", name: "Tariq Nasser", role: "ML Practitioner", score: 87, avatar: "/candidates/tariq-nasser.png"},
  { id: "k6", name: "Ahmed Saad",   role: "ML Specialist",   score: 85, avatar: "/candidates/ahmed-saad.png"  },
];
// Omar & Faris are pre-placed in Interview (Figma image 1 state)
const INTERVIEW_INIT_CANDIDATES: KCandidate[] = [
  { id: "k4", name: "Omar Abdul",  role: "AI Engineer",  score: 88, avatar: "/candidates/omar-abdul.png",
    interviewBadges: { count: "2 of 2", status: "3:00pm Wednesday" } },
  { id: "k5", name: "Faris Saleh", role: "AI Developer", score: 88, avatar: "/candidates/faris-saleh.png",
    interviewBadges: { count: "1 of 2", status: "AI Interview booked" } },
];
// All screened (used for ALL-in-screening "screening" progression stage)
const ALL_SCREENED_CANDIDATES: KCandidate[] = [
  ...SHORTLIST_INIT_CANDIDATES,
  ...SCREENING_CANDIDATES,
  ...INTERVIEW_INIT_CANDIDATES,
];

// Kanban presets — used for non-"Senior AI Developer" jobs (static default)
const KANBAN_INIT: Record<KanbanCol, KCandidate[]> = {
  screening: ALL_SCREENED_CANDIDATES.slice(0, 3),
  shortlist: ALL_SCREENED_CANDIDATES.slice(3),
  interview: [],
  hire:      [],
};

const KANBAN_CANDIDATES_EMPTY: Record<KanbanCol, KCandidate[]> = {
  screening: [],
  shortlist: [],
  interview: [],
  hire:      [],
};

const TALENT_POOL_INIT: TalentCandidate[] = [
  { id: "tp1",  name: "Sara Khalid",   role: "AI Practitioner",      score: 93, avatar: "/sara-khalid.png" },
  { id: "tp2",  name: "Nora Ahmed",    role: "AI Developer",         score: 92, avatar: "https://i.pravatar.cc/88?u=nora_ahmed_train" },
  { id: "tp3",  name: "Fahad Yousef",  role: "AI Consultant",        score: 91, avatar: "https://i.pravatar.cc/88?u=fahad_yousef_train" },
  { id: "tp4",  name: "Badr Omar",     role: "AI Engineer",          score: 90, avatar: "https://i.pravatar.cc/88?u=badr_omar_train" },
  { id: "tp5",  name: "Rawan Saad",    role: "AI Solutions Lead",    score: 90, avatar: "https://i.pravatar.cc/88?u=rawan_saad_train" },
  { id: "tp6",  name: "Dana Turki",    role: "AI Developer",         score: 89, avatar: "https://i.pravatar.cc/88?u=dana_turki_train" },
  { id: "tp7",  name: "Isa Hamad",     role: "Applied AI Lead",      score: 87, avatar: "https://i.pravatar.cc/88?u=isa_hamad_train" },
  { id: "tp8",  name: "Maha Saleh",    role: "ML Specialist",        score: 90, avatar: "https://i.pravatar.cc/88?u=maha_saleh_train" },
  { id: "tp9",  name: "Nabil Asim",    role: "AI Practitioner",      score: 86, avatar: "https://i.pravatar.cc/88?u=nabil_asim_train" },
  { id: "tp10", name: "Reem Turkan",   role: "AI Architect",         score: 83, avatar: "https://i.pravatar.cc/88?u=reem_turkan_train" },
  { id: "tp11", name: "Diana Majed",   role: "AI Practitioner",      score: 81, avatar: "https://i.pravatar.cc/88?u=diana_majed_train" },
  { id: "tp12", name: "Rayan Harbi",   role: "AI Practitioner",      score: 87, avatar: "https://i.pravatar.cc/88?u=rayan_harbi_train" },
  { id: "tp13", name: "Haya Suliman",  role: "AI & Data Consultant",  score: 80, avatar: "https://i.pravatar.cc/88?u=haya_suliman_train" },
];

// Detailed profile data for Sara Khalid
const SARA_PROFILE_DATA: CandidateProfileData = {
  id: "tp1",
  name: "Sara Khalid",
  role: "AI Practitioner",
  location: "Jeddah",
  score: 93,
  avatar: "/sara-khalid.png",
  matchInsight: "Sara's profile is an excellent match. Her 4 years of hands-on Generative AI experience directly covers your top requirement, and her published research on Prompt Engineering is rare at this level.",
  workExperience: [
    { title: "Data Engineer", company: "SDAIA", period: "2022 - Present · 3 yrs" },
    { title: "Junior Data Analyst", company: "STC", period: "2020 - 2022 · 2 yrs" },
  ],
  certifications: [
    { name: "IT Specialist, Python", issuer: "Pearson", year: "2022" },
    { name: "AI Practitioner, Foundational", issuer: "AWS", year: "2024" },
  ],
  skills: [
    { name: "Generative AI", level: "Intermediate" },
    { name: "Prompt Engineering", level: "Intermediate" },
    { name: "Python", level: "Beginner" },
    { name: "Distributed Training", level: "Novice" },
  ],
};

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
function ScoreCircle({ score, size = 44, fontSize, textColor, scoreIncreased }: { score: number; size?: number; fontSize?: number; textColor?: string; scoreIncreased?: boolean }) {
  const r   = (size - 5) / 2;
  const c   = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);

  // Quality-based color: green>=80%, yellow>=60%, red<60%
  const arcColor = score >= 80 ? "#1dc558" : score >= 60 ? "#f59e0b" : "#f87171";
  const numColor = textColor ?? arcColor;
  const numSize  = fontSize ?? (size <= 36 ? 11 : size <= 48 ? 14 : 16);

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg) scaleY(-1)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2.5} />
        <circle cx={c} cy={c} r={r} fill="none"
          stroke={arcColor} strokeWidth={2.5}
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: numSize, fontWeight: 700, color: numColor }}>{score}</span>
      </div>
      {/* Score increase indicator — two green upward chevrons, transparent bg (Figma 6657:30508) */}
      {scoreIncreased && (
        <div style={{
          position: "absolute", top: -8, left: -8,
          width: 16, height: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ChevronsUp size={14} color="#1dc558" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

/** Round avatar — uses photo URL when provided, falls back to gradient + initials */
function CandidateAvatar({ name, size = 44, avatar }: { name: string; size?: number; avatar?: string }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="rounded-full flex-shrink-0 object-cover object-top"
        style={{ width: size, height: size, border: "1.5px solid rgba(255,255,255,0.12)" }}
      />
    );
  }
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
function KanbanCardItem({ candidate, onDragStart, onClick }: {
  candidate: KCandidate;
  onDragStart: (e: React.DragEvent) => void;
  onClick?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-xl w-full select-none transition-colors hover:bg-white/10"
      style={{
        background: "rgba(255,255,255,0.05)",
        cursor: onClick ? "pointer" : "grab",
      }}
    >
      <div className="flex items-start gap-3 w-full">
        <CandidateAvatar name={candidate.name} avatar={candidate.avatar} />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold leading-6 truncate" style={{ color: "#fafafa" }}>{candidate.name}</p>
          <p className="text-[14px] font-normal leading-5" style={{ color: "#d4d4d8" }}>{candidate.role}</p>
        </div>
        <ScoreCircle score={candidate.score} scoreIncreased={candidate.scoreIncreased} />
      </div>
      {/* Interview sub-badges — "2 of 2" + "3:00pm Wednesday" */}
      {candidate.interviewBadges && (
        <div className="flex gap-2">
          <span
            className="text-xs px-2 py-1 rounded-lg text-white/90"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {candidate.interviewBadges.count}
          </span>
          <span
            className="text-xs px-2 py-1 rounded-lg"
            style={
              candidate.interviewBadges.statusVariant === "blue"
                ? { background: "rgba(54,137,255,0.05)", color: "#d7e7ff", border: "1px solid #5ea1ff" }
                : candidate.interviewBadges.statusVariant === "green"
                  ? { background: "rgba(29,197,88,0.1)", color: "#4ad179", border: "1px solid rgba(29,197,88,0.35)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.9)" }
            }
          >
            {candidate.interviewBadges.status}
          </span>
        </div>
      )}
    </div>
  );
}

/** One column of the Kanban board — handles drag-over visual + drop */
function KanbanColumnPanel({
  col, candidates, isDragOver,
  onDragOver, onDragLeave, onDrop, onCandidateDragStart, onCardClick,
}: {
  col:                  KanbanCol;
  candidates:           KCandidate[];
  isDragOver:           boolean;
  onDragOver:           (e: React.DragEvent) => void;
  onDragLeave:          (e: React.DragEvent) => void;
  onDrop:               (e: React.DragEvent) => void;
  onCandidateDragStart: (e: React.DragEvent, c: KCandidate) => void;
  onCardClick?:         (c: KCandidate) => void;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-start gap-4 p-4 rounded-xl min-w-0 transition-colors"
      style={{
        background: isDragOver ? "rgba(29,197,88,0.04)" : "rgba(255,255,255,0.05)",
        border: isDragOver ? "1px solid rgba(29,197,88,0.35)" : "none",
        minWidth: 0,
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header pill — Figma: rgba(255,255,255,0.05), text-base, py-[2px] */}
      <div className="flex-shrink-0">
        <span
          className="inline-block px-3 py-[2px] rounded-full text-base font-normal"
          style={{ background: "rgba(255,255,255,0.05)", color: "#f4f4f5" }}
        >
          {KANBAN_LABELS[col]}
        </span>
      </div>

      {candidates.length > 0 ? (
        <div className="flex flex-col gap-4 w-full">
          {candidates.map((c) => (
            <KanbanCardItem
              key={c.id}
              candidate={c}
              onDragStart={(e) => onCandidateDragStart(e, c)}
              onClick={onCardClick ? () => onCardClick(c) : undefined}
            />
          ))}
        </div>
      ) : (
        <div
          className="w-full flex items-center justify-center rounded-xl"
          style={{
            border: "1.5px dashed rgba(255,255,255,0.15)",
            minHeight: 120,
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

/** Candidate Profile Peek Drawer
 *  contexts: talentPool | screening (Figma 6684:36457/36458)
 *            shortlist   (Figma 6684:36455)  → "Book AI Interview" CTA
 *            interview   (Figma 6810:48688)  → blue banner, "View full profile" only */
function CandidateProfileModal({
  profile,
  context,
  isInvited,
  onClose,
  onInvite,
  onAddToShortlist,
  onBookInterview,
  onBookNextInterview,
  onAddFeedback,
  onMakeHiringDecision,
  onAddToHire,
}: {
  profile: CandidateProfileData;
  context: "talentPool" | "screening" | "shortlist" | "interview" | "interview-ai-complete" | "interview-second-booked" | "interview-add-feedback" | "interview-feedback-captured" | "hire-contract-offered" | "hire-contract-accepted";
  isInvited: boolean;
  onClose: () => void;
  onInvite: () => void;
  onAddToShortlist?: () => void;
  onBookInterview?: () => void;
  onBookNextInterview?: () => void;
  onAddFeedback?: () => void;
  onMakeHiringDecision?: () => void;
  onAddToHire?: () => void;
}) {
  // Only one accordion open at a time
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showScoreInfo,   setShowScoreInfo]   = useState(false);
  // Booking flow: "profile" → "booking" (AI) → "confirmed" (AI) OR "booking-next" (human) → "next-confirmed"
  const [bookingStep, setBookingStep] = useState<"profile" | "booking" | "confirmed" | "booking-next" | "next-confirmed">("profile");

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Derive effective context — override after confirmed bookings
  const effectiveContext =
    bookingStep === "confirmed"      ? "interview" :
    bookingStep === "next-confirmed" ? "interview-second-booked" :
    context;

  // Score is 95 (and has increase indicator) after AI interview complete
  const showScoreIncrease = effectiveContext === "interview-ai-complete"
    || effectiveContext === "interview-second-booked"
    || effectiveContext === "interview-add-feedback"
    || effectiveContext === "interview-feedback-captured"
    || effectiveContext === "hire-contract-offered"
    || effectiveContext === "hire-contract-accepted";
  const displayScore = showScoreIncrease ? 95 : profile.score;

  // When closing after a confirmed booking, notify parent
  const handleClose = () => {
    if (bookingStep === "confirmed") {
      onBookInterview?.();
    } else if (bookingStep === "next-confirmed") {
      onBookNextInterview?.();
    }
    onClose();
  };

  return createPortal(
    <motion.div
      key="peek-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={handleClose}
    >
        {/* ── Peek Drawer panel — w=512px, all-corner rounded-[16px], glassmorphic ── */}
        <motion.div
          key="peek-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="h-[calc(100vh-32px)] flex flex-col overflow-hidden"
          style={{
            width: 512,
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            marginRight: 16,
          }}
        >
          {/* ══════════════════════════════════════════════════════════════════
               BOOK AI INTERVIEW VIEW (bookingStep === "booking")
          ══════════════════════════════════════════════════════════════════ */}
          {bookingStep === "booking" && (
            <>
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-8 gap-6">
                {/* Row 1: Back + Close */}
                <div className="flex items-center justify-between flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setBookingStep("profile")}
                    className="flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}
                  >
                    <ChevronLeft size={22} className="text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>

                {/* Title */}
                <p className="text-[32px] font-semibold text-white leading-10 flex-shrink-0">Book AI Interview</p>

                {/* Green info banner */}
                <div
                  className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: "rgba(119,220,155,0.05)", border: "1px solid #4ad179" }}
                >
                  <div style={{ width: 8, background: "#4ad179", alignSelf: "stretch", flexShrink: 0 }} />
                  <div className="flex items-start gap-2 p-4 flex-1">
                    <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#4ad179" }} />
                    <div>
                      <p className="text-sm leading-5 mb-2" style={{ color: "#d2f3de" }}>
                        trAIn will invite the candidate to complete an AI-facilitated interview over the next 48 hours.
                      </p>
                      <p className="text-sm leading-5" style={{ color: "#d2f3de" }}>
                        trAIn will automatically score the interview and share a summary once completed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate card */}
                <div
                  className="flex items-center gap-3 p-4 rounded-xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="overflow-hidden flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffdabf" }}
                  >
                    <img
                      src={profile.avatar || "/sara-khalid.png"}
                      alt={profile.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-normal text-[#fafafa] leading-6">{profile.name}</p>
                    <p className="text-sm text-[#d4d4d8] leading-5">{profile.role}</p>
                  </div>
                  <ScoreCircle score={profile.score} />
                </div>

                {/* Interview details */}
                <div
                  className="rounded-xl p-4 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-3 flex-1">
                      <p className="text-base leading-6" style={{ color: "#fafafa" }}>
                        <span style={{ color: "#d4d4d8" }}>Deadline: </span>
                        <span className="font-medium">5:00pm Monday</span>
                      </p>
                      <p className="text-base leading-6" style={{ color: "#fafafa" }}>
                        <span style={{ color: "#d4d4d8" }}>Focus: </span>
                        <span className="font-medium">Technical skills</span>
                      </p>
                      <p className="text-base leading-6" style={{ color: "#fafafa" }}>
                        <span style={{ color: "#d4d4d8" }}>Language: </span>
                        <span className="font-medium">Candidate preference (English/Arabic)</span>
                      </p>
                    </div>
                    <Pencil size={20} className="flex-shrink-0 mt-1" style={{ color: "#d4d4d8" }} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-4 flex-shrink-0 p-8 pt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep("confirmed")}
                  className="w-full flex items-center justify-center text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
                >
                  Confirm Booking
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep("profile")}
                  className="w-full flex items-center justify-center text-base font-normal text-white transition-colors hover:bg-white/10"
                  style={{ padding: "8px 24px", background: "rgba(255,255,255,0.05)", borderRadius: 4, lineHeight: "24px" }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
               BOOK NEXT INTERVIEW VIEW (bookingStep === "booking-next")  Figma 7383:40086
          ══════════════════════════════════════════════════════════════════ */}
          {bookingStep === "booking-next" && (
            <>
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-8 gap-6">
                {/* Row 1: Back + Close */}
                <div className="flex items-center justify-between flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setBookingStep("profile")}
                    className="flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}
                  >
                    <ChevronLeft size={22} className="text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>

                {/* Title */}
                <p className="text-[32px] font-semibold text-white leading-10 flex-shrink-0">Book Next Interview</p>

                {/* Green info banner */}
                <div
                  className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: "rgba(119,220,155,0.05)", border: "1px solid #4ad179" }}
                >
                  <div style={{ width: 8, background: "#4ad179", alignSelf: "stretch", flexShrink: 0 }} />
                  <div className="flex items-start gap-2 p-4 flex-1">
                    <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#4ad179" }} />
                    <p className="text-sm leading-5" style={{ color: "#d2f3de" }}>
                      trAIn found a suitable time based on your settings and the candidate&apos;s schedule. You can book this time or choose another slot.
                    </p>
                  </div>
                </div>

                {/* Candidate card with score 95 + up arrow */}
                <div
                  className="flex items-center gap-3 p-4 rounded-xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="overflow-hidden flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffdabf" }}
                  >
                    <img
                      src={profile.avatar || "/sara-khalid.png"}
                      alt={profile.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-normal text-[#fafafa] leading-6">{profile.name}</p>
                    <p className="text-sm text-[#d4d4d8] leading-5">{profile.role}</p>
                  </div>
                  <ScoreCircle score={95} scoreIncreased={true} />
                </div>

                {/* Interview details — time + attendees with edit icon */}
                <div
                  className="rounded-xl p-4 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold text-white leading-6">1:00pm Tomorrow</p>
                      <div className="flex items-center gap-3">
                        <span className="text-base text-[#d4d4d8]">Remote</span>
                        <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 4, background: "#d4d4d8" }} />
                        <span className="text-base text-[#d4d4d8]">Arabic</span>
                        <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 4, background: "#d4d4d8" }} />
                        <span className="text-base text-[#d4d4d8]">Omar S, Ahmed W.</span>
                      </div>
                    </div>
                    <Pencil size={20} className="flex-shrink-0 mt-1" style={{ color: "#d4d4d8" }} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-4 flex-shrink-0 p-8 pt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep("next-confirmed")}
                  className="w-full flex items-center justify-center text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
                >
                  Confirm Booking
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep("profile")}
                  className="w-full flex items-center justify-center text-base font-normal text-white transition-colors hover:bg-white/10"
                  style={{ padding: "8px 24px", background: "rgba(255,255,255,0.05)", borderRadius: 4, lineHeight: "24px" }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
               NORMAL PROFILE VIEW (bookingStep !== "booking" and !== "booking-next")
          ══════════════════════════════════════════════════════════════════ */}
          {bookingStep !== "booking" && bookingStep !== "booking-next" && (
          <>
          {/* ── Scrollable content area ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-8 gap-6">

            {/* ── Row 1: Avatar (80px) + Close button ── */}
            <div className="flex items-start justify-between flex-shrink-0">
              {/* Avatar — matches Figma rounded-[133px] ≈ full circle */}
              <div
                className="overflow-hidden flex-shrink-0"
                style={{
                  width: 80, height: 80,
                  borderRadius: "50%",
                  background: "#ffdabf",
                }}
              >
                <img
                  src={profile.avatar || "/sara-khalid.png"}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { e.currentTarget.src = "/sara-khalid.png"; }}
                />
              </div>

              {/* Close button — Figma: bg-rgba(255,255,255,0.05), 40×40, rounded-[4px] */}
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
                style={{
                  width: 40, height: 40,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 4,
                }}
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* ── Row 2: Name + Tag pill ── */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {/* Name row */}
              <div className="flex items-center justify-between">
                <h2
                  className="font-semibold text-white whitespace-nowrap"
                  style={{ fontSize: 32, lineHeight: "40px" }}
                >
                  {profile.name}
                </h2>

                {/* Tag — varies by effectiveContext */}
                {effectiveContext === "talentPool" ? (
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    style={{
                      paddingLeft: 12, paddingRight: 10, paddingTop: 4, paddingBottom: 4,
                      borderRadius: 100,
                      background: isInvited ? "#a5e8bc" : "rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      className="text-base font-normal whitespace-nowrap"
                      style={{ lineHeight: "24px", color: isInvited ? "#18181b" : "#f4f4f5" }}
                    >
                      {isInvited ? "Invitation Sent" : "Talent Pool"}
                    </span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    style={{
                      paddingLeft: 12, paddingRight: 8, paddingTop: 4, paddingBottom: 4,
                      borderRadius: 100,
                      background: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      className="text-base font-normal whitespace-nowrap"
                      style={{ lineHeight: "24px", color: "#f4f4f5" }}
                    >
                      {effectiveContext === "screening" ? "Screening"
                        : effectiveContext === "shortlist" ? "Shortlist"
                        : (effectiveContext === "hire-contract-offered" || effectiveContext === "hire-contract-accepted") ? "Hire"
                        : "Interview"}
                    </span>
                    <ChevronDown size={20} style={{ color: "#f4f4f5", flexShrink: 0 }} />
                  </div>
                )}
              </div>

              {/* Subtitle — "AI Practitioner • Jeddah" in #d4d4d8 */}
              <div className="flex items-center gap-3">
                <span className="text-base text-[#d4d4d8]" style={{ lineHeight: "24px" }}>
                  {profile.role}
                </span>
                <div
                  className="rounded-full flex-shrink-0"
                  style={{ width: 4, height: 4, background: "#d4d4d8" }}
                />
                <span className="text-base text-[#d4d4d8]" style={{ lineHeight: "24px" }}>
                  {profile.location}
                </span>
              </div>
            </div>

            {/* ── Row 3: Banner — varies by effectiveContext ── */}
            {effectiveContext === "interview" ? (
              /* Blue "You have requested Sara completes an AI interview" banner */
              <div
                className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: "rgba(54,137,255,0.05)",
                  border: "1px solid #5ea1ff",
                }}
              >
                <div style={{ width: 8, background: "#5ea1ff", alignSelf: "stretch", flexShrink: 0 }} />
                <div className="flex items-start gap-2 p-4 flex-1">
                  <Info size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#5ea1ff" }} />
                  <p className="text-base leading-6" style={{ color: "#d7e7ff" }}>
                    <span className="font-semibold">
                      You have requested {profile.name.split(" ")[0]} completes an AI interview.{" "}
                    </span>
                    <span className="font-normal">
                      trAIn will automatically share feedback with you once the interview is completed.
                    </span>
                    <br />
                    <span className="font-semibold">Deadline: </span>
                    <span className="font-normal">5pm Monday.</span>
                  </p>
                </div>
              </div>
            ) : effectiveContext === "interview-ai-complete" ? (
              /* Green "Sara's excelled in her AI-facilitated interview" banner (Figma 6819:48765) */
              <div
                className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: "rgba(119,220,155,0.05)",
                  border: "1px solid #4ad179",
                }}
              >
                <div style={{ width: 8, background: "#4ad179", alignSelf: "stretch", flexShrink: 0 }} />
                <div className="flex items-start gap-2 p-4 flex-1">
                  <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#4ad179" }} />
                  <p className="text-base leading-6" style={{ color: "#d2f3de" }}>
                    <span className="font-semibold">
                      Sara&apos;s excelled in her AI-facilitated interview.{" "}
                    </span>
                    <span className="font-normal">
                      Her performance suggests her Generative AI skills are stronger than first thought.
                    </span>
                  </p>
                </div>
              </div>
            ) : effectiveContext === "interview-second-booked" || effectiveContext === "interview-add-feedback"
              || effectiveContext === "interview-feedback-captured" ? (
              /* No banner for these states */
              null
            ) : effectiveContext === "hire-contract-offered" ? (
              /* Blue "You have offered Sara a contract" banner */
              <div
                className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: "rgba(54,137,255,0.05)", border: "1px solid #5ea1ff" }}
              >
                <div style={{ width: 8, background: "#5ea1ff", alignSelf: "stretch", flexShrink: 0 }} />
                <div className="flex items-start gap-2 p-4 flex-1">
                  <Info size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#5ea1ff" }} />
                  <p className="text-base leading-6" style={{ color: "#d7e7ff" }}>
                    <span className="font-semibold">You have offered Sara a contract. </span>
                    <span className="font-normal">You will be notified when Sara makes her decision.</span>
                    <br /><br />
                    <span className="font-semibold">Deadline: </span>
                    <span className="font-normal">5pm Monday.</span>
                  </p>
                </div>
              </div>
            ) : effectiveContext === "hire-contract-accepted" ? (
              /* Blue "Sarah has accepted the contract offer" banner */
              <div
                className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: "rgba(54,137,255,0.05)", border: "1px solid #5ea1ff" }}
              >
                <div style={{ width: 8, background: "#5ea1ff", alignSelf: "stretch", flexShrink: 0 }} />
                <div className="flex items-start gap-2 p-4 flex-1">
                  <Info size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#5ea1ff" }} />
                  <p className="text-base leading-6" style={{ color: "#d7e7ff" }}>
                    <span className="font-semibold">Sarah has accepted the contract offer. </span>
                    <span className="font-normal">trAIn has emailed her with onboarding details.</span>
                  </p>
                </div>
              </div>
            ) : effectiveContext === "talentPool" && isInvited ? (
              /* Blue "You have invited Sara" banner */
              <div
                className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: "rgba(54,137,255,0.08)",
                  border: "1px solid rgba(54,137,255,0.35)",
                }}
              >
                <div style={{ width: 8, background: "#3689ff", alignSelf: "stretch", flexShrink: 0 }} />
                <div className="flex items-start gap-2 p-4 flex-1">
                  <Info size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#3689ff" }} />
                  <p className="text-base leading-6" style={{ color: "#d7e7ff" }}>
                    <span className="font-semibold">
                      You have invited {profile.name.split(" ")[0]} to apply for this role.{" "}
                    </span>
                    <span className="font-normal">
                      {profile.name.split(" ")[0]} will appear as a screened applicant if she decides to submit an application.
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              /* Green AI match banner — shown for talent pool (not yet invited) and screening */
              <div
                className="flex items-start rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: "rgba(119,220,155,0.05)",
                  border: "1px solid #4ad179",
                }}
              >
                <div style={{ width: 8, background: "#4ad179", alignSelf: "stretch", flexShrink: 0 }} />
                <div className="flex items-start gap-2 p-4 flex-1">
                  <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#4ad179" }} />
                  <p className="text-base leading-6" style={{ color: "#d2f3de" }}>
                    <span className="font-semibold">
                      {profile.name.split(" ")[0]}&apos;s profile is an excellent match.{" "}
                    </span>
                    <span className="font-normal">
                      Her 4 years of hands-on Generative AI experience directly covers your top requirement, and her published research on Prompt Engineering is rare at this level.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* ── Row 4: Accordion sections ── */}
            <div className="flex flex-col gap-4 flex-shrink-0">

              {/* — Match Score accordion — */}
              <div
                className="rounded-[12px] overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection("score")}
                  className="w-full flex items-center gap-4 p-4"
                >
                  {/* SVG score ring — 44px, text white, Figma Skill Score % */}
                  <ScoreCircle score={displayScore} size={44} textColor="white" scoreIncreased={showScoreIncrease} />

                  <div className="flex-1 text-left min-w-0">
                    {/* Label row: "Match score" + info icon */}
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>Match score</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowScoreInfo((v) => !v); }}
                        className="flex items-center justify-center"
                        style={{ lineHeight: 0 }}
                      >
                        <Info size={14} style={{ color: showScoreInfo ? "#4ad179" : "rgba(244,244,245,0.6)", flexShrink: 0 }} />
                      </button>
                    </div>
                    <p className="text-base text-[#f4f4f5]" style={{ lineHeight: "24px" }}>
                      <span className="font-semibold">Strong match </span>
                      <span className="font-normal">for this role.</span>
                    </p>
                  </div>

                  <ChevronDown
                    size={24}
                    className="text-white/60 flex-shrink-0 transition-transform duration-200"
                    style={{ transform: expandedSection === "score" ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {/* Expanded: skill list with check icons + level badges */}
                <AnimatePresence initial={false}>
                  {expandedSection === "score" && (
                    <motion.div
                      key="score-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 pb-4 flex flex-col gap-3">
                        {/* HOW THIS SCORE IS CALCULATED — shown only when info icon is active */}
                        <AnimatePresence initial={false}>
                          {showScoreInfo && (
                            <motion.div
                              key="score-info"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{
                                background: "rgba(119,220,155,0.05)",
                                border: "1px solid #4ad179",
                                borderRadius: 12,
                                padding: "16px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "#d2f3de", letterSpacing: "0.05em", lineHeight: "16px" }}>
                                  HOW THIS SCORE IS CALCULATED
                                </p>
                                <div style={{ display: "flex", gap: 16, fontSize: 14, lineHeight: "20px" }}>
                                  <span style={{ color: "#d4d4d8" }}>Skills <span style={{ color: "#f4f4f5" }}>60%</span></span>
                                  <span style={{ color: "#d4d4d8" }}>Experience <span style={{ color: "#f4f4f5" }}>25%</span></span>
                                  <span style={{ color: "#d4d4d8" }}>Certifications <span style={{ color: "#f4f4f5" }}>15%</span></span>
                                </div>
                                <p style={{ fontSize: 12, color: "#d2f3de", lineHeight: "16px" }}>
                                  Skills are weighted by how closely a candidate matches your role requirements. Scores above 80 indicate a strong fit.
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {/* Skill rows */}
                        {profile.skills.map((skill, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {skill.level === "Novice" ? (
                                <Circle
                                  size={20}
                                  style={{ color: "#ffc940", flexShrink: 0 }}
                                />
                              ) : (
                                <CheckCircle
                                  size={20}
                                  style={{ color: "#1dc558", flexShrink: 0 }}
                                />
                              )}
                              <span className="text-base text-[#f4f4f5]">{skill.name}</span>
                            </div>
                            <span
                              className="text-sm px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                background: skill.level === "Novice"
                                  ? "rgba(255,201,64,0.15)"
                                  : "rgba(29,213,94,0.15)",
                                color: skill.level === "Novice" ? "#ffc940" : "#1ed25e",
                              }}
                            >
                              {skill.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* — Work Experience accordion — */}
              <div
                className="rounded-[12px] overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection("experience")}
                  className="w-full flex items-center gap-4 p-4"
                >
                  {/* Icon pill — bg rgba(255,255,255,0.05), 44×44 circle */}
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)" }}
                  >
                    <Briefcase size={22} style={{ color: "#f4f4f5" }} />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>Work Experience</p>
                    <p className="text-base text-[#f4f4f5]" style={{ lineHeight: "24px" }}>
                      <span className="font-semibold">Above average </span>
                      <span className="font-normal">at this level.</span>
                    </p>
                  </div>

                  <ChevronDown
                    size={24}
                    className="text-white/60 flex-shrink-0 transition-transform duration-200"
                    style={{ transform: expandedSection === "experience" ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {/* Expanded: blue-bar timeline */}
                <AnimatePresence initial={false}>
                  {expandedSection === "experience" && (
                    <motion.div
                      key="experience-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 pb-4 flex flex-col gap-3">
                        {profile.workExperience.map((exp, idx) => (
                          <div key={idx} className="flex gap-3 items-stretch">
                            <div
                              className="rounded-full flex-shrink-0"
                              style={{ width: 6, background: "#3689ff", borderRadius: "9999px" }}
                            />
                            <div>
                              <p className="text-base font-semibold text-white leading-6">{exp.title}</p>
                              <p className="text-base font-normal text-white leading-6">
                                {exp.company} · {exp.period}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* — Certifications accordion — */}
              <div
                className="rounded-[12px] overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <button
                  type="button"
                  onClick={() => toggleSection("certifications")}
                  className="w-full flex items-center gap-4 p-4"
                >
                  {/* Icon pill */}
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)" }}
                  >
                    <GraduationCap size={22} style={{ color: "#f4f4f5" }} />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>Certifications</p>
                    <p className="text-base text-[#f4f4f5]" style={{ lineHeight: "24px" }}>
                      <span className="font-semibold">Highly relevant </span>
                      <span className="font-normal">for this industry.</span>
                    </p>
                  </div>

                  <ChevronDown
                    size={24}
                    className="text-white/60 flex-shrink-0 transition-transform duration-200"
                    style={{ transform: expandedSection === "certifications" ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {/* Expanded: cert logo + name + issuer */}
                <AnimatePresence initial={false}>
                  {expandedSection === "certifications" && (
                    <motion.div
                      key="certifications-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 pb-4 flex flex-col gap-3">
                        {profile.certifications.map((cert, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            {/* Logo tile — 44×44, rounded-[11px] */}
                            <div
                              className="flex-shrink-0 flex items-center justify-center"
                              style={{
                                width: 44, height: 44, borderRadius: 11,
                                background: "rgba(255,255,255,0.1)",
                                overflow: "hidden",
                              }}
                            >
                              {cert.logo ? (
                                <img
                                  src={cert.logo}
                                  alt={cert.issuer}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-bold text-white/60">
                                  {cert.issuer.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-white leading-6">{cert.name}</p>
                              <p className="text-base font-normal text-white leading-6">
                                {cert.issuer} · {cert.year}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── AI Interview row — shown for interview-ai-complete and later states (Figma 6819:50425) ── */}
              {showScoreIncrease && effectiveContext !== "interview-feedback-captured"
                && effectiveContext !== "hire-contract-offered" && effectiveContext !== "hire-contract-accepted" && (
                <div
                  className="flex gap-4 items-start p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)" }}
                  >
                    <User size={22} style={{ color: "#f4f4f5" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>AI Interview</p>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold" style={{ color: "#1dc558", lineHeight: "24px" }}>Strong Yes</p>
                      <span
                        className="text-sm underline cursor-pointer"
                        style={{ color: "#f4f4f5", lineHeight: "16px", textDecoration: "underline" }}
                      >
                        View Feedback Summary
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Second Round Interview section — for interview-second-booked and interview-add-feedback ── */}
              {(effectiveContext === "interview-second-booked") && (
                <div
                  className="flex flex-col gap-4 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-white" style={{ lineHeight: "20px" }}>Second Round Interview</p>
                    <Pencil size={20} className="flex-shrink-0" style={{ color: "#d4d4d8" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold text-[#fafafa] leading-6">1:00pm Tomorrow</p>
                    <div className="flex items-center gap-3">
                      <span className="text-base text-[#d4d4d8]">Remote</span>
                      <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 4, background: "#d4d4d8" }} />
                      <span className="text-base text-[#d4d4d8]">Omar S, Ahmed W.</span>
                    </div>
                  </div>
                </div>
              )}

              {effectiveContext === "interview-add-feedback" && (
                <div
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)" }}
                  >
                    <User size={22} style={{ color: "#f4f4f5" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>Second Round Interview</p>
                    <p className="text-base font-semibold text-[#f4f4f5] leading-6">Today at 1:00pm</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddFeedback?.()}
                    className="flex items-center justify-center text-base font-normal transition-all hover:brightness-110 active:scale-[0.98] flex-shrink-0"
                    style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
                  >
                    Add Feedback
                  </button>
                </div>
              )}

              {/* ── Feedback-captured / hire states: both interviews show Strong Yes + View Feedback Summary ── */}
              {(effectiveContext === "interview-feedback-captured" || effectiveContext === "hire-contract-offered" || effectiveContext === "hire-contract-accepted") && (
                <>
                  <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center justify-center flex-shrink-0 rounded-full" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)" }}>
                      <User size={22} style={{ color: "#f4f4f5" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>AI Interview</p>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold" style={{ color: "#1dc558", lineHeight: "24px" }}>Strong Yes</p>
                        <span className="text-sm underline cursor-pointer" style={{ color: "#f4f4f5", lineHeight: "16px", textDecoration: "underline" }}>View Feedback Summary</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center justify-center flex-shrink-0 rounded-full" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)" }}>
                      <User size={22} style={{ color: "#f4f4f5" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#f4f4f5]" style={{ lineHeight: "20px" }}>Second Interview</p>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold" style={{ color: "#1dc558", lineHeight: "24px" }}>Strong Yes</p>
                        <span className="text-sm underline cursor-pointer" style={{ color: "#f4f4f5", lineHeight: "16px", textDecoration: "underline" }}>View Feedback Summary</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

          </div>

          {/* ── Sticky footer: View full profile + Invite to apply ── */}
          <div
            className="flex gap-4 flex-shrink-0 p-8 pt-4"
          >
            {/* View full profile — Figma: bg rgba(255,255,255,0.05), rounded-[4px] */}
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 text-base text-white font-normal transition-colors hover:bg-white/10"
              style={{
                padding: "8px 24px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                lineHeight: "24px",
              }}
            >
              View full profile
              <User size={20} className="text-white flex-shrink-0" />
            </button>

            {/* Action button — varies by effectiveContext */}
            {effectiveContext === "screening" && (
              <button
                type="button"
                onClick={onAddToShortlist}
                className="flex-1 flex items-center justify-center gap-2 text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
              >
                Add to shortlist
                <Star size={20} className="flex-shrink-0" />
              </button>
            )}
            {effectiveContext === "shortlist" && (
              <button
                type="button"
                onClick={() => setBookingStep("booking")}
                className="flex-1 flex items-center justify-center gap-2 text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
              >
                Book AI Interview
                <Sparkles size={20} className="flex-shrink-0" />
              </button>
            )}
            {effectiveContext === "interview-ai-complete" && (
              <button
                type="button"
                onClick={() => setBookingStep("booking-next")}
                className="flex-1 flex items-center justify-center gap-2 text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
              >
                Book Next Interview
              </button>
            )}
            {effectiveContext === "talentPool" && !isInvited && (
              <button
                type="button"
                onClick={onInvite}
                className="flex-1 flex items-center justify-center gap-2 text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
              >
                Invite to apply
                <Mail size={20} className="flex-shrink-0" />
              </button>
            )}
            {effectiveContext === "interview-feedback-captured" && (
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 text-base font-normal transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, lineHeight: "24px" }}
                onClick={onAddToHire ?? onMakeHiringDecision}
              >
                {onAddToHire ? "Move to Compare / Hire" : "Make Hiring Decision"}
                {onAddToHire && <Star size={20} className="flex-shrink-0" />}
              </button>
            )}
            {effectiveContext === "hire-contract-offered" && (
              <button
                type="button"
                className="flex-1 flex items-center justify-center text-base text-white font-normal transition-colors hover:bg-white/10"
                style={{ padding: "8px 24px", background: "rgba(255,255,255,0.05)", borderRadius: 4, lineHeight: "24px" }}
              >
                View Offer Details
              </button>
            )}
            {/* interview / interview-second-booked / interview-add-feedback / hire-contract-accepted: no second button */}
          </div>
          </>
          )}
        </motion.div>
    </motion.div>,
    document.body
  );
}

/** Card in the Talent Pool grid */
function TalentPoolCard({ candidate, onInvite, onClick }: {
  candidate: TalentCandidate;
  onInvite:  () => void;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl transition-all hover:bg-white/5 cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: candidate.invited
          ? "1px solid rgba(29,197,88,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
      onClick={onClick}
    >
      {/* Avatar + name + score */}
      <div className="flex items-center gap-3">
        <CandidateAvatar name={candidate.name} avatar={candidate.avatar} />
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
          onClick={(e) => {
            e.stopPropagation();
            onInvite();
          }}
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
   TOAST NOTIFICATION HELPER
══════════════════════════════════════════════════════════════════════════ */
function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(30,210,94,0.95);
    color: #0d1117;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(toast);
      document.head.removeChild(style);
    }, 300);
  }, 3000);
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
  // Zustand store actions for persistent state
  const getJobDetailState = useVoiceSessionStore((s) => s.getJobDetailState);
  const updateJobKanban = useVoiceSessionStore((s) => s.updateJobKanban);
  const updateJobTalentPool = useVoiceSessionStore((s) => s.updateJobTalentPool);
  const updateJobPendingInvites = useVoiceSessionStore((s) => s.updateJobPendingInvites);
  const updateJobMainTab = useVoiceSessionStore((s) => s.updateJobMainTab);

  // Compute posting ID early (needed for store key)
  const posting = {
    ...MOCK_JOB_POSTING,
    ...Object.fromEntries(Object.entries(jobPosting || {}).filter(([, v]) => v != null && v !== "")),
  } as JobPosting;
  const effectivePostingId = postingId || posting.id;

  // Get persisted state from Zustand or initialize with defaults
  const persistedState = getJobDetailState(effectivePostingId);
  // "Senior AI Developer" starts with the Figma-accurate state (Waleed/Lina/Yousef in Screening,
  // Ahmed/Lama/Tariq in Shortlist, Omar/Faris pre-placed in Interview with badges)
  const SENIOR_AI_DEV_KANBAN: Record<KanbanCol, KCandidate[]> = {
    screening: SCREENING_CANDIDATES,
    shortlist: SHORTLIST_INIT_CANDIDATES,
    interview: INTERVIEW_INIT_CANDIDATES,
    hire:      [],
  };
  const defaultKanban = jobPosting?.title && /ai\s*developer/i.test(jobPosting.title) ? SENIOR_AI_DEV_KANBAN : KANBAN_INIT;

  // Initialize local state from Zustand or defaults
  const [mainTab, setMainTabLocal] = useState<MainTab>(persistedState?.mainTab || "applicants");
  const [kanban, setKanbanLocal] = useState<Record<KanbanCol, KCandidate[]>>(() => {
    const base = persistedState?.kanban || defaultKanban;
    return {
      screening: [...base.screening].sort((a, b) => b.score - a.score),
      shortlist:  [...base.shortlist].sort((a, b) => b.score - a.score),
      interview:  [...base.interview].sort((a, b) => b.score - a.score),
      hire:       [...base.hire].sort((a, b) => b.score - a.score),
    };
  });
  const [talentPool, setTalentPoolLocal] = useState<TalentCandidate[]>(persistedState?.talentPool || TALENT_POOL_INIT);
  const [pendingInvites, setPendingInvitesLocal] = useState<Record<string, number>>(persistedState?.pendingInvites || {});

  // Drag state (local only, doesn't need persistence)
  const [dragOver, setDragOver] = useState<KanbanCol | null>(null);
  const dragRef = useRef<{ candidate: KCandidate; from: KanbanCol } | null>(null);

  // Wrapper setters that sync to Zustand
  // These ensure Zustand state exists before updating (fixes the "if (existing)" guard issue)
  const setMainTab = useCallback((tab: MainTab) => {
    setMainTabLocal(tab);
    
    const store = useVoiceSessionStore.getState();
    const existingState = store.getJobDetailState(effectivePostingId);
    if (!existingState) {
      // Create complete state on first write
      store.setJobDetailState(effectivePostingId, {
        mainTab: tab,
        kanban,
        talentPool,
        pendingInvites,
      });
    } else {
      updateJobMainTab(effectivePostingId, tab);
    }
  }, [effectivePostingId, updateJobMainTab, kanban, talentPool, pendingInvites]);

  const setKanban = useCallback((update: Record<KanbanCol, KCandidate[]> | ((prev: Record<KanbanCol, KCandidate[]>) => Record<KanbanCol, KCandidate[]>)) => {
    setKanbanLocal((prev) => {
      const newKanban = typeof update === 'function' ? update(prev) : update;
      
      const store = useVoiceSessionStore.getState();
      const existingState = store.getJobDetailState(effectivePostingId);
      if (!existingState) {
        // Create complete state on first write
        store.setJobDetailState(effectivePostingId, {
          mainTab,
          kanban: newKanban,
          talentPool,
          pendingInvites,
        });
      } else {
        updateJobKanban(effectivePostingId, newKanban);
      }
      
      return newKanban;
    });
  }, [effectivePostingId, updateJobKanban, mainTab, talentPool, pendingInvites]);

  const setTalentPool = useCallback((update: TalentCandidate[] | ((prev: TalentCandidate[]) => TalentCandidate[])) => {
    setTalentPoolLocal((prev) => {
      const newPool = typeof update === 'function' ? update(prev) : update;
      
      const store = useVoiceSessionStore.getState();
      const existingState = store.getJobDetailState(effectivePostingId);
      if (!existingState) {
        // Create complete state on first write
        store.setJobDetailState(effectivePostingId, {
          mainTab,
          kanban,
          talentPool: newPool,
          pendingInvites,
        });
      } else {
        updateJobTalentPool(effectivePostingId, newPool);
      }
      
      return newPool;
    });
  }, [effectivePostingId, updateJobTalentPool, mainTab, kanban, pendingInvites]);

  const setPendingInvites = useCallback((update: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setPendingInvitesLocal((prev) => {
      const newInvites = typeof update === 'function' ? update(prev) : update;
      
      const store = useVoiceSessionStore.getState();
      const existingState = store.getJobDetailState(effectivePostingId);
      if (!existingState) {
        // Create complete state on first write
        store.setJobDetailState(effectivePostingId, {
          mainTab,
          kanban,
          talentPool,
          pendingInvites: newInvites,
        });
      } else {
        updateJobPendingInvites(effectivePostingId, newInvites);
      }
      
      return newInvites;
    });
  }, [effectivePostingId, updateJobPendingInvites, mainTab, kanban, talentPool]);

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
  const [selectedProfile,     setSelectedProfile]     = useState<CandidateProfileData | null>(null);
  const [selectedProfileContext, setSelectedProfileContext] = useState<"talentPool" | "screening" | "shortlist" | "interview" | "interview-ai-complete" | "interview-second-booked" | "interview-add-feedback" | "interview-feedback-captured" | "hire-contract-offered" | "hire-contract-accepted">("talentPool");
  const [showFeedbackModal,   setShowFeedbackModal]   = useState(false);
  const [hireCompareMode,     setHireCompareMode]     = useState(false);
  const [hireCompareSelected, setHireCompareSelected] = useState<Record<string, boolean>>({});
  const [showCompareModal,    setShowCompareModal]    = useState(false);
  const [showHiringSelectModal,   setShowHiringSelectModal]   = useState(false);
  const [selectedHiringCandidate, setSelectedHiringCandidate] = useState<string | null>(null);
  const [showHiringDecisionConfirm, setShowHiringDecisionConfirm] = useState(false);
  const [hiringDecisionVote,      setHiringDecisionVote]      = useState<string | null>(null);
  const [showOfferContractModal,  setShowOfferContractModal]  = useState(false);
  const [contractTab,             setContractTab]             = useState<"summary" | "salary" | "leave" | "terms">("summary");

  // Sara's interview progression state — drives 5s and 7s timed transitions
  type SaraInterviewState = "none" | "ai_booked" | "ai_feedback" | "second_booked" | "awaiting_feedback" | "feedback_captured" | "hire" | "contract_offered" | "contract_accepted";
  const [saraInterviewState, setSaraInterviewState] = useState<SaraInterviewState>("none");

  // After AI booking: 5 s → ai_feedback (Sara's score 95, "AI Feedback available")
  useEffect(() => {
    if (saraInterviewState !== "ai_booked") return;
    const t = setTimeout(() => {
      setSaraInterviewState("ai_feedback");
      setKanban((prev) => ({
        ...prev,
        interview: prev.interview.map((c) =>
          c.id === "tp1"
            ? { ...c, score: 95, scoreIncreased: true, interviewBadges: { count: "1 of 2", status: "AI Feedback available", statusVariant: "blue" } }
            : c
        ),
      }));
    }, 5000);
    return () => clearTimeout(t);
  }, [saraInterviewState]);

  // After second booking: 5 s → awaiting_feedback ("Awaiting Feedback")
  useEffect(() => {
    if (saraInterviewState !== "second_booked") return;
    const t = setTimeout(() => {
      setSaraInterviewState("awaiting_feedback");
      setKanban((prev) => ({
        ...prev,
        interview: prev.interview.map((c) =>
          c.id === "tp1"
            ? { ...c, interviewBadges: { count: "2 of 2", status: "Awaiting Feedback", statusVariant: "blue" } }
            : c
        ),
      }));
    }, 5000);
    return () => clearTimeout(t);
  }, [saraInterviewState]);

  // 5s after contract is offered → auto-accept (fires in all offer flows)
  useEffect(() => {
    if (saraInterviewState !== "contract_offered") return;
    const t = setTimeout(() => {
      setSaraInterviewState("contract_accepted");
      // If Sara's profile is open showing the offered state, advance it too
      setSelectedProfileContext((prev) =>
        prev === "hire-contract-offered" ? "hire-contract-accepted" : prev
      );
    }, 5000);
    return () => clearTimeout(t);
  }, [saraInterviewState]);

  /* ── hire state ─────────────────────────────────────────────────────── */
  // No hire decisions yet — candidates reach Hire tab after second round completes
  const [hireStatuses,      setHireStatuses]      = useState<Record<string, HireDecisionStatus>>({});
  const [showCloseJobModal, setShowCloseJobModal] = useState(false);

  /* ── derived values ─────────────────────────────────────────────────── */
  // posting and effectivePostingId already defined above for Zustand store key
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

  /* ── sync Kanban with progression state (Senior AI Developer only) ──────── */
  // progression is null for non-"Senior AI Developer" jobs (selector returns null).
  // JobProgressionManager (app root) drives stage transitions via the store.
  // Read jobProgressions map directly from the state snapshot so Zustand diffs
  // the reference correctly and re-renders when the stage advances.
  const allProgressions = useVoiceSessionStore((state) => state.jobProgressions);
  const isAIDeveloper = /ai\s*developer/i.test(posting.title);
  const progression = isAIDeveloper ? allProgressions[effectivePostingId] ?? null : null;

  useEffect(() => {
    if (!isAIDeveloper) return;

    // CRITICAL: If user has already customized this job (invited candidates, moved them, etc.),
    // DO NOT overwrite with progression defaults. persistedState indicates user customizations.
    const hasCustomState = getJobDetailState(effectivePostingId);
    if (hasCustomState) {
      // User has already interacted with this job - respect their changes
      return;
    }

    // No progression tracked for this job (e.g. a mock/static card) — the
    // defaultKanban was already applied on mount; leave it intact.
    if (!progression) return;

    // First time opening this job - initialize from progression
    if (progression.stage === 'initial') {
      setKanban(KANBAN_CANDIDATES_EMPTY);
      return;
    }

    if (progression.stage === 'screening') {
      // Stage 1: all candidates in screening (Omar/Faris included with badges)
      setKanban({
        screening: ALL_SCREENED_CANDIDATES,
        shortlist: [],
        interview: [],
        hire: [],
      });
      return;
    }

    if (progression.stage === 'shortlisted') {
      // Stage 2: Figma-accurate layout — Waleed/Lina/Yousef in Screening,
      // Ahmed/Lama/Tariq in Shortlist, Omar/Faris pre-placed in Interview
      setKanban({
        screening: SCREENING_CANDIDATES,
        shortlist: SHORTLIST_INIT_CANDIDATES,
        interview: INTERVIEW_INIT_CANDIDATES,
        hire:      [],
      });
    }
  }, [posting.title, progression, effectivePostingId, getJobDetailState]);

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

  /* ── kanban column adjacency helpers ────────────────────────────────── */
  const KANBAN_COL_ORDER: KanbanCol[] = ["screening", "shortlist", "interview", "hire"];
  function isAdjacentKanbanColumn(from: KanbanCol, to: KanbanCol): boolean {
    const fi = KANBAN_COL_ORDER.indexOf(from);
    const ti = KANBAN_COL_ORDER.indexOf(to);
    return Math.abs(fi - ti) === 1;
  }
  function isValidKanbanDrop(candidate: KCandidate, from: KanbanCol, to: KanbanCol): boolean {
    // Sara (tp1) may only move between Screening and Shortlist via drag-drop.
    // Her progression to Interview and beyond is handled by the saraInterviewState machine.
    if (candidate.id === "tp1") {
      return (from === "screening" && to === "shortlist") ||
             (from === "shortlist" && to === "screening");
    }
    // All other candidates follow the one-step adjacency rule.
    return isAdjacentKanbanColumn(from, to);
  }

  /* ── kanban drag handlers ────────────────────────────────────────────── */
  function handleKanbanDragStart(e: React.DragEvent, candidate: KCandidate, from: KanbanCol) {
    dragRef.current = { candidate, from };
    e.dataTransfer.effectAllowed = "move";
  }
  function handleKanbanDragOver(e: React.DragEvent, col: KanbanCol) {
    if (!dragRef.current || !isValidKanbanDrop(dragRef.current.candidate, dragRef.current.from, col)) return;
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
    if (!isValidKanbanDrop(candidate, from, to)) return;
    setKanban((prev) => ({
      ...prev,
      [from]: prev[from].filter((c) => c.id !== candidate.id),
      [to]:   [...prev[to], candidate].sort((a, b) => b.score - a.score),
    }));
  }

  /* ── talent pool invite handler ─────────────────────────────────────── */
  function handleTalentInvite(id: string) {
    setTalentPool((prev) =>
      prev.map((c) => (c.id === id ? { ...c, invited: true } : c)),
    );
    // Track invitation time
    setPendingInvites((prev) => ({ ...prev, [id]: Date.now() }));
  }

  /* ── Monitor pending invites and move to screening after 15s ─────────── */
  useEffect(() => {
    const checkInvitations = setInterval(() => {
      const now = Date.now();
      
      Object.entries(pendingInvites).forEach(([candidateId, invitedAt]) => {
        if (now - invitedAt >= 5000) {
          // Find candidate in talent pool
          const candidate = talentPool.find((c) => c.id === candidateId);
          if (!candidate) return;

          // Move to screening Kanban column (sort by score descending after insert)
          setKanban((prev) => ({
            ...prev,
            screening: [
              ...prev.screening,
              {
                id: candidate.id,
                name: candidate.name,
                role: candidate.role,
                score: candidate.score,
                avatar: candidate.avatar,
              },
            ].sort((a, b) => b.score - a.score),
          }));

          // Auto-switch to Applicants tab so user sees the arrival
          setMainTab("applicants");

          // Remove from talent pool
          setTalentPool((prev) => prev.filter((c) => c.id !== candidateId));

          // Remove from pending invites
          setPendingInvites((prev) => {
            const updated = { ...prev };
            delete updated[candidateId];
            return updated;
          });

          // Update progression counts if this is an AI Developer job
          if (/ai\s*developer/i.test(posting.title)) {
            const currentProg = useVoiceSessionStore.getState().getJobProgression(effectivePostingId);
            if (currentProg) {
              useVoiceSessionStore.getState().setJobProgression(effectivePostingId, {
                ...currentProg,
                screeningCount: currentProg.screeningCount + 1,
              });
            }
          }

          // Show toast notification
          showToast(`${candidate.name} has accepted your invitation!`);
        }
      });
    }, 1000);

    return () => clearInterval(checkInvitations);
  }, [pendingInvites, talentPool, effectivePostingId, posting.title]);

  /* ── derived counts for tab badges ─────────────────────────────────── */
  const applicantsCount = Object.values(kanban).reduce((s, col) => s + col.length, 0);
  const talentPoolCount = talentPool.length;
  const invitedCount    = talentPool.filter((c) => c.invited).length;

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <>
    <div className="flex h-full overflow-hidden">

      {/* Main — full width, no sidebar in the new 3-tab detail view */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden px-8 pt-6 pb-0">

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

                  {/* Kanban board — 4 equal columns, items-start so each column hugs its content height */}
                  <div className="flex gap-4 items-start overflow-y-auto">
                    {(["screening", "shortlist", "interview", "hire"] as KanbanCol[]).map((col) => {
                      if (col === "hire" && (saraInterviewState === "hire" || saraInterviewState === "contract_offered" || saraInterviewState === "contract_accepted")) {
                        // Hire column with custom Compare UI
                        const hireCandidates = kanban.hire;
                        const selectedCount = Object.values(hireCompareSelected).filter(Boolean).length;
                        const canCompare = selectedCount >= 2;
                        return (
                          <div
                            key="hire"
                            className="flex-1 flex flex-col gap-3 p-4 rounded-xl min-w-0 self-start"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            <div className="flex-shrink-0">
                              <span className="inline-block px-3 py-1 rounded-full text-sm" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.9)" }}>
                                Hire
                              </span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {hireCandidates.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex flex-col gap-0 rounded-xl overflow-hidden"
                                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
                                  onClick={() => {
                                    if (!hireCompareMode && c.id === "tp1") {
                                      setSelectedProfile(SARA_PROFILE_DATA);
                                      const hireCtxMap: Record<string, typeof selectedProfileContext> = {
                                        hire:               "interview-feedback-captured",
                                        contract_offered:   "hire-contract-offered",
                                        contract_accepted:  "hire-contract-accepted",
                                      };
                                      setSelectedProfileContext(hireCtxMap[saraInterviewState] ?? "interview-feedback-captured");
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3 p-4">
                                    <CandidateAvatar name={c.name} avatar={c.avatar} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-white leading-tight truncate">{c.name}</p>
                                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{c.role}</p>
                                      {(saraInterviewState === "contract_offered" || saraInterviewState === "contract_accepted") && c.id === "tp1" && (
                                        <span style={{
                                          display: "inline-block", marginTop: 4,
                                          background: saraInterviewState === "contract_accepted"
                                            ? "rgba(29,197,88,0.05)"
                                            : "rgba(74,160,255,0.12)",
                                          border: saraInterviewState === "contract_accepted"
                                            ? "1px solid #1dc558"
                                            : "1px solid rgba(74,160,255,0.35)",
                                          color: saraInterviewState === "contract_accepted" ? "#d2f3de" : "#4aa0ff",
                                          fontSize: 11, lineHeight: "16px",
                                          padding: "2px 8px", borderRadius: 100,
                                        }}>
                                          {saraInterviewState === "contract_offered" ? "Contract Offered" : "Contract Accepted"}
                                        </span>
                                      )}
                                    </div>
                                    <ScoreCircle score={c.score} scoreIncreased={c.scoreIncreased} />
                                  </div>
                                  {hireCompareMode && saraInterviewState !== "contract_offered" && saraInterviewState !== "contract_accepted" && (
                                    <div
                                      className="flex items-center justify-end gap-3 px-4 pb-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHireCompareSelected((prev) => ({ ...prev, [c.id]: !prev[c.id] }));
                                      }}
                                    >
                                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Select to compare</span>
                                      <div style={{
                                        width: 18, height: 18, borderRadius: 3, flexShrink: 0, cursor: "pointer",
                                        background: hireCompareSelected[c.id] ? "#1dc558" : "transparent",
                                        border: hireCompareSelected[c.id] ? "1px solid #1dc558" : "1.5px solid rgba(255,255,255,0.5)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                      }}>
                                        {hireCompareSelected[c.id] && (
                                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4L3.5 6.5L9 1" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {/* Compare controls — hidden after contract offered/accepted */}
                            {(saraInterviewState === "contract_offered" || saraInterviewState === "contract_accepted") ? null : !hireCompareMode ? (
                              <button
                                className="mt-auto w-full py-2 rounded-xl text-sm font-normal transition-colors hover:bg-white/10"
                                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
                                onClick={() => {
                                  setHireCompareMode(true);
                                  setHireCompareSelected({});
                                }}
                              >
                                Compare
                              </button>
                            ) : (
                              <div className="mt-auto flex flex-col gap-2">
                                <button
                                  disabled={!canCompare}
                                  onClick={() => {
                                    if (canCompare) {
                                      setShowCompareModal(true);
                                    }
                                  }}
                                  className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
                                  style={{
                                    background: canCompare ? "#1dc558" : "rgba(29,197,88,0.2)",
                                    color: canCompare ? "#18181b" : "rgba(29,197,88,0.5)",
                                    cursor: canCompare ? "pointer" : "not-allowed",
                                    border: "none",
                                  }}
                                >
                                  Compare candidates
                                </button>
                                <button
                                  className="w-full py-2 rounded-xl text-sm font-normal transition-colors hover:bg-white/10"
                                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
                                  onClick={() => {
                                    setHireCompareMode(false);
                                    setHireCompareSelected({});
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                      <KanbanColumnPanel
                        key={col}
                        col={col}
                        candidates={kanban[col]}
                        isDragOver={dragOver === col}
                        onDragOver={(e) => handleKanbanDragOver(e, col)}
                        onDragLeave={handleKanbanDragLeave}
                        onDrop={(e) => handleKanbanDrop(e, col)}
                        onCandidateDragStart={(e, c) => handleKanbanDragStart(e, c, col)}
                        onCardClick={(c) => {
                          if (c.id === "tp1") {
                            setSelectedProfile(SARA_PROFILE_DATA);
                            // Context determined by column + Sara's current interview progression
                            if (col === "screening") {
                              setSelectedProfileContext("screening");
                            } else if (col === "shortlist") {
                              setSelectedProfileContext("shortlist");
                            } else {
                              // Interview / hire column — use saraInterviewState
                              const interviewCtxMap: Record<typeof saraInterviewState, typeof selectedProfileContext> = {
                                none:               "interview",
                                ai_booked:          "interview",
                                ai_feedback:        "interview-ai-complete",
                                second_booked:      "interview-second-booked",
                                awaiting_feedback:  "interview-add-feedback",
                                feedback_captured:  "interview-feedback-captured",
                                hire:               "interview-feedback-captured",
                                contract_offered:   "hire-contract-offered",
                                contract_accepted:  "hire-contract-accepted",
                              };
                              setSelectedProfileContext(interviewCtxMap[saraInterviewState]);
                            }
                          }
                        }}
                      />
                      );
                    })}
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
                        onClick={() => {
                          if (c.id === "tp1") {
                            setSelectedProfile(SARA_PROFILE_DATA);
                            setSelectedProfileContext("talentPool");
                          }
                        }}
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

    {/* ── Candidate Profile Modal ──────────────────────────────────────── */}
    <AnimatePresence>
      {selectedProfile && (
        <CandidateProfileModal
          key="candidate-profile-modal"
          profile={selectedProfile}
          context={selectedProfileContext}
          isInvited={talentPool.find((c) => c.id === selectedProfile.id)?.invited || false}
          onClose={() => {
            if (selectedProfileContext === "interview-feedback-captured" && saraInterviewState === "feedback_captured") {
              // Flow 1: Close after feedback submitted → move Sara + Omar to Hire, update Faris badge
              setSaraInterviewState("hire");
              setKanban((prev) => {
                const sara = prev.interview.find((c) => c.id === "tp1");
                const omar = prev.interview.find((c) => c.id === "k4");
                const restInterview = prev.interview.filter(
                  (c) => c.id !== "tp1" && c.id !== "k4"
                ).map((c) =>
                  c.name === "Faris Saleh"
                    ? { ...c, interviewBadges: { count: "2 of 2", status: "10:00am Friday" } }
                    : c
                );
                const newHire: KCandidate[] = [
                  sara ? { ...sara, interviewBadges: undefined } : null,
                  omar ? { ...omar, interviewBadges: undefined } : null,
                ].filter(Boolean) as KCandidate[];
                return {
                  ...prev,
                  interview: restInterview,
                  hire: [...newHire, ...prev.hire].sort((a, b) => b.score - a.score),
                };
              });
            }
            setSelectedProfile(null);
          }}
          onInvite={() => {
            handleTalentInvite(selectedProfile.id);
          }}
          onAddToShortlist={() => {
            // Move Sara from Screening → Shortlist
            setKanban((prev) => ({
              ...prev,
              screening: prev.screening.filter((c) => c.id !== selectedProfile.id),
              shortlist: [
                ...prev.shortlist,
                {
                  id:     selectedProfile.id,
                  name:   selectedProfile.name,
                  role:   selectedProfile.role,
                  score:  selectedProfile.score,
                  avatar: selectedProfile.avatar,
                },
              ].sort((a, b) => b.score - a.score),
            }));
            setSelectedProfile(null);
          }}
          onBookInterview={() => {
            // Move Sara from Shortlist → Interview (after AI booking confirmed + drawer closed)
            setKanban((prev) => ({
              ...prev,
              shortlist: prev.shortlist.filter((c) => c.id !== selectedProfile.id),
              interview: [
                {
                  id:     selectedProfile.id,
                  name:   selectedProfile.name,
                  role:   selectedProfile.role,
                  score:  selectedProfile.score,
                  avatar: selectedProfile.avatar,
                  interviewBadges: { count: "1 of 2", status: "AI Interview booked" },
                },
                ...prev.interview,
              ].sort((a, b) => b.score - a.score),
            }));
            // Start 5-second timer to advance to AI feedback state
            setSaraInterviewState("ai_booked");
            setSelectedProfile(null);
          }}
          onBookNextInterview={() => {
            // After second round booking confirmed + drawer closed: update Sara's badge to "2 of 2 / 1:00pm Tomorrow"
            setKanban((prev) => ({
              ...prev,
              interview: prev.interview.map((c) =>
                c.id === selectedProfile.id
                  ? { ...c, score: 95, scoreIncreased: true, interviewBadges: { count: "2 of 2", status: "1:00pm Tomorrow" } }
                  : c
              ),
            }));
            // Start 7-second timer to advance to awaiting feedback state
            setSaraInterviewState("second_booked");
            setSelectedProfile(null);
          }}
          onAddFeedback={() => setShowFeedbackModal(true)}
          onAddToHire={saraInterviewState === "feedback_captured" ? () => {
            setSaraInterviewState("hire");
            setKanban((prev) => {
              const sara = prev.interview.find((c) => c.id === "tp1");
              const omar = prev.interview.find((c) => c.id === "k4");
              const restInterview = prev.interview.filter(
                (c) => c.id !== "tp1" && c.id !== "k4"
              ).map((c) =>
                c.name === "Faris Saleh"
                  ? { ...c, interviewBadges: { count: "2 of 2", status: "10:00am Friday" } }
                  : c
              );
              const newHire: KCandidate[] = [
                sara ? { ...sara, interviewBadges: undefined } : null,
                omar ? { ...omar, interviewBadges: undefined } : null,
              ].filter(Boolean) as KCandidate[];
              return {
                ...prev,
                interview: restInterview,
                hire: [...newHire, ...prev.hire].sort((a, b) => b.score - a.score),
              };
            });
            setSelectedProfile(null);
          } : undefined}
          onMakeHiringDecision={() => {
            setSelectedProfile(null);
            setHiringDecisionVote(null);
            setShowHiringDecisionConfirm(true);
          }}
        />
      )}
      {/* Candidate Comparison Modal — opens when "Compare candidates" is clicked in Hire column */}
      {showCompareModal && (
        <CandidateComparisonModal
          key="comparison-modal"
          onClose={() => { setShowCompareModal(false); setHireCompareMode(false); setHireCompareSelected({}); }}
          onViewSara={() => { setShowCompareModal(false); setHireCompareMode(false); setSelectedProfile(SARA_PROFILE_DATA); setSelectedProfileContext("interview-feedback-captured"); }}
          onViewOmar={() => { setShowCompareModal(false); setHireCompareMode(false); }}
          onMakeHiringDecision={() => {
            setShowCompareModal(false);
            setSelectedHiringCandidate(null);
            setShowHiringSelectModal(true);
          }}
        />
      )}
      {/* ── Make Hiring Decision: Select Candidate Modal ── */}
      {showHiringSelectModal && (
        <HiringSelectModal
          key="hiring-select-modal"
          selectedCandidate={selectedHiringCandidate}
          onSelectCandidate={setSelectedHiringCandidate}
          onBack={() => { setShowHiringSelectModal(false); setShowCompareModal(true); }}
          onClose={() => { setShowHiringSelectModal(false); setSelectedHiringCandidate(null); setHireCompareMode(false); setHireCompareSelected({}); }}
          onContinue={() => {
            setShowHiringSelectModal(false);
            setHiringDecisionVote(null);
            setShowHiringDecisionConfirm(true);
          }}
        />
      )}

      {/* ── Hiring Decision: Sara Khalid Modal ── */}
      {showHiringDecisionConfirm && (
        <HiringDecisionConfirmModal
          key="hiring-decision-confirm-modal"
          vote={hiringDecisionVote}
          onVote={setHiringDecisionVote}
          onClose={() => { setShowHiringDecisionConfirm(false); setHiringDecisionVote(null); setHireCompareMode(false); setHireCompareSelected({}); }}
          onNext={() => {
            setShowHiringDecisionConfirm(false);
            setContractTab("summary");
            setShowOfferContractModal(true);
          }}
        />
      )}

      {/* ── Offer Contract: Sara Khalid Modal ── */}
      {showOfferContractModal && (
        <OfferContractModal
          key="offer-contract-modal"
          activeTab={contractTab}
          onTabChange={setContractTab}
          onBack={() => { setShowOfferContractModal(false); setShowHiringDecisionConfirm(true); }}
          onClose={() => { setShowOfferContractModal(false); setHireCompareMode(false); setHireCompareSelected({}); }}
          onSendOffer={() => {
            setShowOfferContractModal(false);
            setHireCompareMode(false);
            setHireCompareSelected({});
            setSaraInterviewState("contract_offered");
            setKanban((prev) => {
              const saraInInterview = prev.interview.some((c) => c.id === "tp1");
              if (saraInInterview) {
                // Path: feedback_captured → profile → Make Hiring Decision → Send Offer
                // Sara + Omar are still in interview; move them to hire now
                const sara = prev.interview.find((c) => c.id === "tp1");
                const omar = prev.interview.find((c) => c.id === "k4");
                const restInterview = prev.interview
                  .filter((c) => c.id !== "tp1" && c.id !== "k4")
                  .map((c) => c.name === "Faris Saleh"
                    ? { ...c, interviewBadges: { count: "2 of 2", status: "10:00am Friday" } }
                    : c);
                const newHire: KCandidate[] = [
                  sara ? { ...sara, interviewBadges: undefined } : null,
                  omar ? { ...omar, interviewBadges: undefined } : null,
                ].filter(Boolean) as KCandidate[];
                return {
                  ...prev,
                  interview: restInterview,
                  hire: [...newHire, ...prev.hire].sort((a, b) => b.score - a.score),
                };
              } else {
                // Path: hire → compare → Make Hiring Decision → Send Offer
                // Sara already in hire; just clear interviewBadges
                return {
                  ...prev,
                  hire: prev.hire.map((c) =>
                    c.id === "tp1" ? { ...c, interviewBadges: undefined } : c
                  ),
                };
              }
            });
          }}
        />
      )}

      {/* Interview Feedback Modal — opens when "Add Feedback" is clicked */}
      {showFeedbackModal && (
        <FeedbackModal
          key="feedback-modal"
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={() => {
            // Simultaneously: update Sara's kanban badge to "Feedback Captured" + open her profile
            setSaraInterviewState("feedback_captured");
            setKanban((prev) => ({
              ...prev,
              interview: prev.interview.map((c) =>
                c.id === "tp1"
                  ? { ...c, interviewBadges: { count: "2 of 2", status: "Feedback Captured", statusVariant: "blue" } }
                  : c
              ),
            }));
            setSelectedProfile(SARA_PROFILE_DATA);
            setSelectedProfileContext("interview-feedback-captured");
            setShowFeedbackModal(false);
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INTERVIEW FEEDBACK MODAL  (Figma 8003-60983 → 4 tabs)
══════════════════════════════════════════════════════════════════════════ */

type FeedbackTab = "overview" | "technical" | "soft" | "behavioural";

/** Horizontal score bar row used in all tab panels */
function FeedbackScoreRow({ label, score, color }: { label: string; score: number; color: "green" | "amber" }) {
  const barColor  = color === "green" ? "#1dc558" : "#f59e0b";
  const badgeBg   = color === "green" ? "rgba(29,197,88,0.15)"   : "rgba(245,158,11,0.15)";
  const badgeText = color === "green" ? "#1dc558"                 : "#f59e0b";
  const badgeLabel = color === "green" ? "Strong" : "Moderate";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, paddingRight: 15, height: 28, width: "100%" }}>
      <span style={{ color: "#d4d4d8", fontSize: 16, lineHeight: "24px", minWidth: 180, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: barColor, borderRadius: 100 }} />
      </div>
      <span style={{ color: "white", fontWeight: 600, fontSize: 16, minWidth: 32, textAlign: "right", flexShrink: 0 }}>{score}</span>
      <span style={{ background: badgeBg, color: badgeText, fontSize: 14, lineHeight: "20px", padding: "4px 12px", borderRadius: 8, minWidth: 72, textAlign: "center", flexShrink: 0 }}>
        {badgeLabel}
      </span>
    </div>
  );
}

/** Section heading inside Technical/Soft Skills tabs */
function FeedbackSectionHead({ title }: { title: string }) {
  return <p style={{ color: "white", fontWeight: 600, fontSize: 16, lineHeight: "24px", marginBottom: 4, marginTop: 8 }}>{title}</p>;
}

function FeedbackModal({ onClose, onSubmit }: { onClose: () => void; onSubmit?: () => void }) {
  const [activeTab, setActiveTab] = useState<FeedbackTab>("overview");
  const [notes, setNotes]               = useState("");
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const tabs: { key: FeedbackTab; label: string }[] = [
    { key: "overview",     label: "Overview" },
    { key: "technical",    label: "Technical Skills" },
    { key: "soft",         label: "Soft Skills" },
    { key: "behavioural",  label: "Behavioural Analysis" },
  ];

  const recOptions = ["Strong No", "No", "Yes", "Strong Yes"];
  const canSubmit = recommendation !== null && notes.length > 0;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      key="feedback-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          width: "100%",
          maxWidth: 1400,
          height: 900,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 32,
          padding: 32,
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Sara's avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
              background: "#ffdabf", overflow: "hidden",
              border: "1.5px solid rgba(255,255,255,0.12)",
            }}>
              <img src="/sara-khalid.png" alt="Sara Khalid"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: "white", lineHeight: "28px" }}>
                Interview Feedback: Sara Khalid
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>Senior AI Developer</span>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4d4d8", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>Interviewed today at 1:00pm</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 40, height: 40, borderRadius: 4,
              background: "rgba(255,255,255,0.05)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <X size={20} color="white" />
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div style={{ display: "flex", gap: 24, width: "100%", alignItems: "flex-start", flex: "1 0 0", minHeight: 1 }}>

          {/* LEFT: Interview Synthesis panel — static, no scroll */}
          <div style={{
            width: 656, height: 752, flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 24,
            overflow: "hidden",
          }}>
            {/* Header row: title + AI badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
              <p style={{ fontSize: 20, fontStyle: "normal", fontWeight: 600, color: "#FFF", lineHeight: "24px", whiteSpace: "nowrap" }}>
                Interview Synthesis
              </p>
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                background: "rgba(29, 197, 88, 0.05)",
                border: "1px solid #1DC558",
                borderRadius: 8,
                padding: "4px 8px",
                flexShrink: 0,
              }}>
                <img src="/Vector.png" alt="" style={{ width: 17.5, height: 17.5, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#fafafa", lineHeight: "20px", whiteSpace: "nowrap" }}>
                  AI-generated from interview transcript
                </span>
              </div>
            </div>

            {/* Tabs row */}
            <div style={{ display: "flex", gap: 24, height: 40, alignItems: "flex-start", flexShrink: 0 }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "0 0 13px 0",
                    fontSize: 16, lineHeight: "24px",
                    color: "white",
                    opacity: activeTab === t.key ? 1 : 0.5,
                    borderBottom: activeTab === t.key ? "3px solid #fafafa" : "3px solid transparent",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content — static */}
            <div style={{ width: "100%" }}>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ color: "white", fontWeight: 600, fontSize: 16, lineHeight: "24px" }}>Summary</p>
                    <div style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 10,
                      alignSelf: "stretch",
                    }}>
                      <div style={{ color: "#d4d4d8", fontSize: 16, fontWeight: 400, lineHeight: 0 }}>
                        <p style={{ lineHeight: "24px", margin: 0 }}>Sara demonstrated strong clarity of thought throughout. She structured answers using concrete examples and showed genuine enthusiasm for the role. Sara&apos;s Generative AI expertise was once again a standout — she further expanded on her previous experience in this space.</p>
                        <p style={{ lineHeight: "24px", margin: 0 }}>&nbsp;</p>
                        <p style={{ lineHeight: "24px", margin: 0 }}>Pacing was confident, with minimal hesitation on core questions.</p>
                        <p style={{ lineHeight: "24px", margin: 0 }}>&nbsp;</p>
                        <p style={{ lineHeight: "24px", margin: 0 }}>One area to probe further: her experience with production-scale model deployment was light on specifics.</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ color: "white", fontWeight: 600, fontSize: 16, lineHeight: "24px" }}>Analysis</p>
                    <div style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 16,
                      alignSelf: "stretch",
                    }}>
                      <FeedbackScoreRow label="Technical depth"     score={84} color="green" />
                      <FeedbackScoreRow label="Communication"       score={91} color="green" />
                      <FeedbackScoreRow label="Problem solving"     score={88} color="green" />
                      <FeedbackScoreRow label="MLOps / deployment"  score={58} color="amber" />
                      <FeedbackScoreRow label="Culture fit"         score={90} color="green" />
                    </div>
                  </div>
                </div>
              )}

              {/* TECHNICAL SKILLS TAB */}
              {activeTab === "technical" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <FeedbackSectionHead title="Generative AI & LLMs" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                    <FeedbackScoreRow label="Fine-tuning & RLHF"   score={90} color="green" />
                    <FeedbackScoreRow label="Prompt engineering"    score={95} color="green" />
                    <FeedbackScoreRow label="Vector databases"      score={82} color="green" />
                  </div>
                  <FeedbackSectionHead title="MLOps & deployment" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                    <FeedbackScoreRow label="CI/CD for ML"          score={52} color="amber" />
                    <FeedbackScoreRow label="Model monitoring"      score={49} color="amber" />
                    <FeedbackScoreRow label="Containerisation"      score={64} color="amber" />
                  </div>
                  <FeedbackSectionHead title="Python & system design" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <FeedbackScoreRow label="Code quality"          score={87} color="green" />
                    <FeedbackScoreRow label="System design"         score={83} color="green" />
                  </div>
                </div>
              )}

              {/* SOFT SKILLS TAB */}
              {activeTab === "soft" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <FeedbackSectionHead title="Interpersonal" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                    <FeedbackScoreRow label="Clarity of communication" score={91} color="green" />
                    <FeedbackScoreRow label="Active listening"         score={86} color="green" />
                    <FeedbackScoreRow label="Collaboration signals"    score={89} color="green" />
                  </div>
                  <FeedbackSectionHead title="Cognitive" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <FeedbackScoreRow label="Structured thinking"      score={88} color="green" />
                    <FeedbackScoreRow label="Ambiguity handling"       score={84} color="green" />
                    <FeedbackScoreRow label="Recovery under pressure"  score={80} color="green" />
                  </div>
                </div>
              )}

              {/* BEHAVIOURAL ANALYSIS TAB */}
              {activeTab === "behavioural" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* 3 metric cards */}
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { label: "Confidence",     value: "High",      score: 82, color: "#1dc558" },
                      { label: "Engagement",     value: "Very high",  score: 91, color: "#1dc558" },
                      { label: "Stress markers", value: "Low",       score: 18, color: "#f59e0b" },
                    ].map((m) => (
                      <div key={m.label} style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10, padding: 20,
                        display: "flex", flexDirection: "column",
                      }}>
                        <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: "20px", marginBottom: 12 }}>{m.label}</p>
                        <p style={{ fontSize: 24, fontWeight: 600, color: "white", lineHeight: "32px", marginBottom: 12 }}>{m.value}</p>
                        <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: "20px", marginBottom: 16 }}>{m.score} / 100</p>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
                          <div style={{ width: `${m.score}%`, height: "100%", background: m.color, borderRadius: 100 }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Confidence signal timeline */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ color: "white", fontWeight: 600, fontSize: 16, lineHeight: "24px" }}>
                      Confidence signal — interview timeline
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#71717a", lineHeight: "18px" }}>
                      <span>Start</span>
                      <span>45 min</span>
                    </div>
                    {/* gradient bar with tick markers */}
                    <div style={{
                      height: 48, borderRadius: 100, position: "relative",
                      background: "linear-gradient(90deg, #1dc558 0%, #60c152 7%, #84bd4b 14%, #a0b843 21%, #b8b33a 29%, #cead30 36%, #e2a622 43%, #f59e0b 50%, #e2a622 57%, #cead30 64%, #b8b33a 71%, #a0b843 79%, #84bd4b 86%, #60c152 93%, #1dc558 100%)",
                    }}>
                      {[10, 63, 91].map((pct) => (
                        <div key={pct} style={{
                          position: "absolute", left: `${pct}%`, top: -6, width: 3, height: 60,
                          background: "white", borderRadius: 100,
                        }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#71717a", lineHeight: "18px" }}>
                      {["0:00", "10:00", "20:00", "30:00", "40:00", "45:00"].map((t) => <span key={t}>{t}</span>)}
                    </div>
                  </div>

                  {/* Key moments */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ color: "white", fontWeight: 600, fontSize: 16, lineHeight: "24px" }}>Key moments</p>
                    {[
                      { time: "12:04", text: " Peak confidence — LLM fine-tuning explanation. Leaned forward, sustained eye contact.", color: "#1dc558" },
                      { time: "28:41", text: " Hesitation spike — CI/CD question. Speech rate increased. Recovered within 30s.",        color: "#f59e0b" },
                      { time: "41:10", text: " High engagement — team culture discussion. Animated posture, frequent nodding.",          color: "#1dc558" },
                    ].map((m) => (
                      <div key={m.time} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0, marginTop: 8 }} />
                        <p style={{
                          width: 570, fontSize: 14, fontStyle: "normal",
                          fontWeight: 400, lineHeight: "24px", color: "#71717a",
                        }}>
                          {m.time}
                          <span style={{ fontSize: 14, fontStyle: "normal", fontWeight: 400, lineHeight: "24px", color: "#a1a1aa" }}>{m.text}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Panel Status + Your Assessment */}
          <div style={{ width: 656, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start", justifyContent: "center" }}>

            {/* Panel Status card */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: 16, padding: 24,
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24,
              width: "100%", overflow: "hidden", flexShrink: 0,
            }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: "#FFF", lineHeight: "24px", flexShrink: 0 }}>Panel Status</p>
              {/* Omar S */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: "#d2f3de", overflow: "hidden",
                  }}>
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={22} color="#0c4f23" />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 128, flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px", whiteSpace: "nowrap" }}>You (Omar S)</p>
                    <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px", whiteSpace: "nowrap" }}>Hiring Manager</p>
                  </div>
                </div>
                <span style={{ background: "#ffe1cc", color: "#401b00", fontSize: 14, lineHeight: "20px", padding: "4px 8px", borderRadius: 100, flexShrink: 0 }}>
                  Pending
                </span>
              </div>
              {/* Ahmed W */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: "#afd0ff", overflow: "hidden",
                  }}>
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={22} color="#0c2f66" />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 128, flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px", whiteSpace: "nowrap" }}>Ahmed W</p>
                    <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px", whiteSpace: "nowrap" }}>Tech Principal</p>
                  </div>
                </div>
                <span style={{ background: "#d2f3de", color: "#0c4f23", fontSize: 14, lineHeight: "20px", padding: "4px 8px", borderRadius: 100, flexShrink: 0 }}>
                  Submitted
                </span>
              </div>
            </div>

            {/* Your assessment card */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: 16, padding: 24,
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              gap: 24, flex: "1 0 0", minHeight: 1, overflow: "hidden", width: "100%",
            }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: "#FFF", lineHeight: "24px", width: "100%" }}>Your assessment</p>

              {/* Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", flex: "1 0 0", minHeight: 1, width: "100%" }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Notes</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, height: 228, alignItems: "flex-end", width: "100%", flexShrink: 0 }}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder="Add your notes: observations, concerns, or anything the AI summary missed..."
                    style={{
                      flex: "1 0 0", minHeight: 1, resize: "none", width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: 16,
                      color: "white", fontSize: 16, lineHeight: "24px",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                  <p style={{ fontSize: 12, color: "#9f9fa9", lineHeight: "16px", flexShrink: 0 }}>
                    {notes.length}/500
                  </p>
                </div>
              </div>

              {/* Hiring recommendation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", flexShrink: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Hiring recommendation</p>
                <div style={{ display: "flex", gap: 16 }}>
                  {recOptions.map((opt) => {
                    const isNegative = opt === "No" || opt === "Strong No";
                    const isSelected = recommendation === opt;
                    const bg = isSelected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)";
                    const border = isSelected
                      ? (isNegative ? "1px solid #FF4040" : "1px solid #1DC558")
                      : "1px solid rgba(255,255,255,0.05)";
                    const color = isSelected
                      ? (isNegative ? "#FF8080" : "#1DC558")
                      : "white";
                    return (
                      <button
                        key={opt}
                        onClick={() => setRecommendation(opt)}
                        style={{
                          flex: "1 0 0", padding: "10px 20px", borderRadius: 12,
                          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16,
                          background: bg, border, color,
                          fontWeight: 600, fontSize: 16, lineHeight: "24px",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit button — aligns to right via parent alignItems: flex-end */}
              <button
                disabled={!canSubmit}
                onClick={() => { if (canSubmit) { onSubmit?.(); onClose(); } }}
                style={{
                  width: 128, height: 44, padding: "8px 16px", borderRadius: 100,
                  background: canSubmit ? "#1dc558" : "rgba(29,197,88,0.5)",
                  opacity: canSubmit ? 1 : 0.35,
                  border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
                  color: "#f4f4f5", fontWeight: 600, fontSize: 16, lineHeight: "24px",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CANDIDATE COMPARISON MODAL  (Figma 8272:26610)
   Tabs: Recommendation | Differentiators | Skill Comparison | Behavioural Analysis
══════════════════════════════════════════════════════════════════════════ */
type CompareTab = "recommendation" | "differentiators" | "skill" | "behavioural";

function CandidateComparisonModal({ onClose, onViewSara, onViewOmar, onMakeHiringDecision }: {
  onClose: () => void;
  onViewSara: () => void;
  onViewOmar: () => void;
  onMakeHiringDecision?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<CompareTab>("recommendation");

  const tabs: { key: CompareTab; label: string }[] = [
    { key: "recommendation", label: "Reccommendation" },
    { key: "differentiators", label: "Differentiators" },
    { key: "skill", label: "Skill Comparison" },
    { key: "behavioural", label: "Behavioural Analysis" },
  ];

  function VerdictPill({ label, strong }: { label: string; strong?: boolean }) {
    return (
      <span style={{
        background: strong ? "rgba(29,197,88,0.15)" : "rgba(29,197,88,0.05)",
        color: "#1dc558", fontSize: 14, lineHeight: "20px",
        padding: "4px 12px", borderRadius: 8, whiteSpace: "nowrap",
      }}>{label}</span>
    );
  }

  return (
    <motion.div
      key="compare-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
          width: "100%", maxWidth: 760,
          height: "min(90vh, 840px)",
          display: "flex", flexDirection: "column", gap: 32,
          padding: 32, flexShrink: 0,
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {/* Two overlapping avatars */}
            <div style={{ position: "relative", width: 88, height: 52, flexShrink: 0 }}>
              <div style={{
                position: "absolute", left: 36, top: 0,
                width: 52, height: 52, borderRadius: "50%", background: "#afd0ff", overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.1)",
              }}>
                <img src="/candidates/omar-abdul.png" alt="Omar Abdul" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              </div>
              <div style={{
                position: "absolute", left: 0, top: 0,
                width: 52, height: 52, borderRadius: "50%", background: "#ffdabf", overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.1)",
              }}>
                <img src="/sara-khalid.png" alt="Sara" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 600, color: "white", lineHeight: "28px" }}>Candidate Comparison</p>
              <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px", marginTop: 4 }}>Senior AI Developer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 40, height: 40, borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={20} color="white" />
          </button>
        </div>

        {/* ── Main panel (tabs + content) ── */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 24 }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "0 0 13px 0",
                  fontSize: 16, fontWeight: 400, lineHeight: "24px",
                  color: activeTab === t.key ? "white" : "rgba(255,255,255,0.5)",
                  borderBottom: activeTab === t.key ? "3px solid #fafafa" : "3px solid transparent",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {activeTab === "recommendation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Panel Verdict */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Panel Verdict</p>
                <div style={{ display: "flex", gap: 16 }}>
                  {/* Sara card */}
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 17, display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffdabf", flexShrink: 0, overflow: "hidden" }}>
                        <img src="/sara-khalid.png" alt="Sara" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px" }}>Sara Khalid</p>
                        <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>AI Practitioner</p>
                      </div>
                      <ScoreCircle score={95} scoreIncreased size={44} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[["AI Facilitator", "Strong Yes", true], ["Ahmed W", "Strong Yes", true], ["Omar S.", "Strong Yes", true]].map(([name, verdict, strong]) => (
                        <div key={String(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 28 }}>
                          <span style={{ fontSize: 16, color: "#d4d4d8", lineHeight: "24px" }}>{String(name)}</span>
                          <VerdictPill label={String(verdict)} strong={!!strong} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Omar card */}
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 17, display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#afd0ff", flexShrink: 0, overflow: "hidden" }}>
                        <img src="/candidates/omar-abdul.png" alt="Omar Abdul" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px" }}>Omar Abdul</p>
                        <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>AI Engineer</p>
                      </div>
                      <ScoreCircle score={88} size={44} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[["AI Facilitator", "Yes"], ["Ahmed W", "Yes"], ["Omar S.", "Yes"]].map(([name, verdict]) => (
                        <div key={String(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 28 }}>
                          <span style={{ fontSize: 16, color: "#d4d4d8", lineHeight: "24px" }}>{String(name)}</span>
                          <VerdictPill label={String(verdict)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Recommendation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>AI Recommendation</p>
                  <Sparkles size={17} color="#1dc558" />
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 17 }}>
                  <p style={{ fontSize: 16, color: "#d4d4d8", lineHeight: "24px" }}>
                    <strong style={{ color: "#fafafa" }}>trAIn recommends Sara Khalid</strong>
                    {" "}for the Senior AI Developer role. Her published research in Prompt Engineering and a Gen AI score of 97 — the highest across all 54 applicants — directly address the role's primary requirements.
                  </p>
                  <p style={{ fontSize: 16, color: "#d4d4d8", lineHeight: "24px", marginTop: 16 }}>
                    Omar is the stronger candidate on system architecture and production deployment. If the team's near-term roadmap is infrastructure-heavy, he warrants serious consideration. Both are strong hires; this is a marginal call.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "differentiators" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Key Strengths */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Key Strengths</p>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "4px solid #10b981", borderRadius: 10, paddingTop: 17, paddingBottom: 17, paddingLeft: 20, paddingRight: 17 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#10b981", letterSpacing: "0.6px", lineHeight: "20px", marginBottom: 12, textTransform: "uppercase" }}>SARA'S EDGE</p>
                    <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>Published Prompt Engineering research. Gen AI score of 95 — highest of all applicants for this role.</p>
                  </div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "4px solid #60a5fa", borderRadius: 10, paddingTop: 17, paddingBottom: 17, paddingLeft: 20, paddingRight: 17 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa", letterSpacing: "0.6px", lineHeight: "20px", marginBottom: 12, textTransform: "uppercase" }}>OMAR'S EDGE</p>
                    <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>Stronger on system architecture and production deployment — better fit if the roadmap is infrastructure-heavy.</p>
                  </div>
                </div>
              </div>
              {/* Development Areas */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Development Areas</p>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "4px solid #fbbf24", borderRadius: 10, paddingTop: 17, paddingBottom: 17, paddingLeft: 20, paddingRight: 17 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24", letterSpacing: "0.6px", lineHeight: "20px", marginBottom: 12, textTransform: "uppercase" }}>SARA — WATCH</p>
                    <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>MLOps depth was light in both sessions. Will need early mentoring or pairing on CI/CD pipelines.</p>
                  </div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "4px solid #fbbf24", borderRadius: 10, paddingTop: 17, paddingBottom: 17, paddingLeft: 20, paddingRight: 17 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24", letterSpacing: "0.6px", lineHeight: "20px", marginBottom: 12, textTransform: "uppercase" }}>OMAR — WATCH</p>
                    <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>Higher stress markers (31 vs 18) and reduced fluency when switching topics rapidly under pressure.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "skill" || activeTab === "behavioural") && (
            <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Content coming soon</p>
            </div>
          )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "flex-end" }}>
          <button
            onClick={() => { onViewSara(); }}
            style={{ padding: "8px 24px", background: "rgba(255,255,255,0.05)", color: "white", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 16, lineHeight: "24px" }}
          >
            View Sara's Profile
          </button>
          <button
            onClick={() => { onViewOmar(); }}
            style={{ padding: "8px 24px", background: "rgba(255,255,255,0.05)", color: "white", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 16, lineHeight: "24px" }}
          >
            View Omar's Profile
          </button>
          <button
            style={{ padding: "8px 24px", background: "#1dc558", color: "#18181b", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 16, lineHeight: "24px", fontWeight: 400 }}
            onClick={onMakeHiringDecision}
          >
            Make Hiring Decision
          </button>
        </div>
      </motion.div>
    </motion.div>
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
   HIRING FLOW MODALS
══════════════════════════════════════════════════════════════════════════ */

const SARA_VERDICTS = [
  { name: "AI Facilitator", verdict: "Strong Yes", strong: true },
  { name: "Ahmed W",        verdict: "Strong Yes", strong: true },
  { name: "Omar S.",        verdict: "Strong Yes", strong: true },
];
const OMAR_VERDICTS = [
  { name: "AI Facilitator", verdict: "Yes", strong: false },
  { name: "Ahmed W",        verdict: "Yes", strong: false },
  { name: "Omar S.",        verdict: "Yes", strong: false },
];

function HiringVerdictBadge({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <span style={{
      background: strong ? "rgba(29,197,88,0.15)" : "rgba(29,197,88,0.05)",
      color: "#1dc558", fontSize: 14, lineHeight: "20px",
      padding: "4px 12px", borderRadius: 8, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function ModalOverlay({ children, onClickOutside, maxHeight, gap, cardPadding }: { children: React.ReactNode; onClickOutside?: () => void; maxHeight?: string; gap?: number; cardPadding?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, zIndex: 210,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClickOutside?.(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)",
          width: "100%", maxWidth: 720,
          display: "flex", flexDirection: "column", gap: gap ?? 32, padding: cardPadding ?? 32,
          ...(maxHeight ? { maxHeight, overflow: "hidden" } : {}),
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function IconBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 40, borderRadius: 4,
      background: "rgba(255,255,255,0.05)", border: "none",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>{children}</button>
  );
}

/* ── Modal 1: Make Hiring Decision — Select Candidate ── */
function HiringSelectModal({ selectedCandidate, onSelectCandidate, onBack, onClose, onContinue }: {
  selectedCandidate: string | null;
  onSelectCandidate: (id: string) => void;
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const canContinue = selectedCandidate !== null;

  const CandidateCard = ({ id, name, role, score, scoreIncreased, verdicts, photo, photoBg }: {
    id: string; name: string; role: string; score: number; scoreIncreased?: boolean;
    verdicts: typeof SARA_VERDICTS; photo: string; photoBg: string;
  }) => {
    const isSelected = selectedCandidate === id;
    return (
      <div
        onClick={() => onSelectCandidate(id)}
        style={{
          flex: 1, minWidth: 0,
          background: isSelected ? "rgba(29,197,88,0.05)" : "rgba(255,255,255,0.04)",
          border: isSelected ? "1px solid #1dc558" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: 17, cursor: "pointer",
          display: "flex", flexDirection: "column", gap: 24,
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: photoBg, flexShrink: 0, overflow: "hidden" }}>
            <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px" }}>{name}</p>
            <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>{role}</p>
          </div>
          <ScoreCircle score={score} scoreIncreased={scoreIncreased} size={44} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {verdicts.map(({ name: vName, verdict, strong }) => (
            <div key={vName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 28 }}>
              <span style={{ fontSize: 16, color: "#d4d4d8", lineHeight: "24px" }}>{vName}</span>
              <HiringVerdictBadge label={verdict} strong={strong} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ModalOverlay onClickOutside={onClose}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <IconBtn onClick={onBack}><ArrowLeft size={20} color="white" /></IconBtn>
          <p style={{ fontSize: 24, fontWeight: 600, color: "white", lineHeight: "28px" }}>Make Hiring Decision</p>
        </div>
        <IconBtn onClick={onClose}><X size={20} color="white" /></IconBtn>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Select candidate</p>
        <div style={{ display: "flex", gap: 16 }}>
          <CandidateCard id="sara" name="Sara Khalid" role="AI Practitioner" score={95} scoreIncreased verdicts={SARA_VERDICTS} photo="/sara-khalid.png" photoBg="#ffdabf" />
          <CandidateCard id="omar" name="Omar Abdul" role="AI Engineer" score={88} verdicts={OMAR_VERDICTS} photo="/candidates/omar-abdul.png" photoBg="#afd0ff" />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          disabled={!canContinue}
          onClick={canContinue ? onContinue : undefined}
          style={{
            padding: "8px 24px", borderRadius: 4, border: "none", fontSize: 16, lineHeight: "24px", fontWeight: 400, cursor: canContinue ? "pointer" : "not-allowed",
            background: canContinue ? "#1dc558" : "rgba(29,197,88,0.25)",
            color: canContinue ? "#18181b" : "rgba(29,197,88,0.6)",
            transition: "all 0.15s",
          }}
        >
          Continue
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ── Modal 2: Hiring Decision — Confirm Sara ── */
function HiringDecisionConfirmModal({ vote, onVote, onClose, onNext }: {
  vote: string | null;
  onVote: (v: string) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const canNext = vote !== null;

  return (
    <ModalOverlay onClickOutside={onClose}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 24, fontWeight: 600, color: "white", lineHeight: "28px" }}>Hiring Decision: Sara Khalid</p>
        <IconBtn onClick={onClose}><X size={20} color="white" /></IconBtn>
      </div>

      {/* Body card */}
      <div style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 16, padding: 24,
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        {/* Panel Verdict */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Panel Verdict</p>
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: 17, display: "flex", flexDirection: "column", gap: 24,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffdabf", flexShrink: 0, overflow: "hidden" }}>
                <img src="/sara-khalid.png" alt="Sara" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", lineHeight: "24px" }}>Sara Khalid</p>
                <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: "20px" }}>AI Practitioner</p>
              </div>
              <ScoreCircle score={95} scoreIncreased size={44} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SARA_VERDICTS.map(({ name, verdict, strong }) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 28 }}>
                  <span style={{ fontSize: 16, color: "#d4d4d8" }}>{name}</span>
                  <HiringVerdictBadge label={verdict} strong={strong} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>AI Recommendation</p>
            <Sparkles size={16} color="#1dc558" />
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 17 }}>
            <p style={{ fontSize: 16, color: "#d4d4d8", lineHeight: "24px" }}>
              <strong style={{ color: "#fafafa" }}>trAIn recommends Sara Khalid</strong>
              {" "}for the Senior AI Developer role. Her published research in Prompt Engineering and a Gen AI score of 97 — the highest across all 54 applicants — directly address the role's primary requirements.
            </p>
          </div>
        </div>

        {/* Hire question */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "white", lineHeight: "24px" }}>Would you like to hire Sara Khalid?</p>
          <div style={{ display: "flex", gap: 16 }}>
            {["No", "Stall", "Yes"].map((opt) => {
              const selected = vote === opt.toLowerCase();
              const isNo = opt === "No";
              const isYes = opt === "Yes";
              const bg = selected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)";
              const border = selected
                ? isNo  ? "1px solid #FF4040"
                : isYes ? "1px solid #1DC558"
                :         "1px solid rgba(245,158,11,0.7)"
                : "1px solid rgba(255,255,255,0.05)";
              const color = selected
                ? isNo  ? "#FF8080"
                : isYes ? "#1DC558"
                :         "#f59e0b"
                : "white";
              return (
                <button
                  key={opt}
                  onClick={() => onVote(opt.toLowerCase())}
                  style={{
                    flex: 1, padding: "10px 20px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer", lineHeight: "24px",
                    background: bg, border, color,
                    transition: "all 0.15s",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          disabled={!canNext}
          onClick={canNext ? onNext : undefined}
          style={{
            padding: "8px 24px", borderRadius: 4, border: "none", fontSize: 16, lineHeight: "24px", fontWeight: 400, cursor: canNext ? "pointer" : "not-allowed",
            background: canNext ? "#1dc558" : "rgba(255,255,255,0.1)",
            color: canNext ? "#18181b" : "rgba(255,255,255,0.25)",
            transition: "all 0.15s",
          }}
        >
          Next
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ── Modal 3: Offer Contract: Sara Khalid ── */
function OfferContractModal({ activeTab, onTabChange, onBack, onClose, onSendOffer }: {
  activeTab: "summary" | "salary" | "leave" | "terms";
  onTabChange: (t: "summary" | "salary" | "leave" | "terms") => void;
  onBack: () => void;
  onClose: () => void;
  onSendOffer: () => void;
}) {
  const tabs: { key: "summary" | "salary" | "leave" | "terms"; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "salary",  label: "Salary and Contract" },
    { key: "leave",   label: "Leave and Benefits" },
    { key: "terms",   label: "Standard Terms" },
  ];

  const summaryRows = [
    { label: "Role",              value: "Senior AI Developer",        green: false },
    { label: "Employment type",   value: "Full-time",                  green: false },
    { label: "Base salary",       value: "SAR 88,000 / year",          green: true  },
    { label: "Start date",        value: "1 March 2026",               green: false },
    { label: "Probation period",  value: "90 days",                    green: false },
    { label: "Location",          value: "Riyadh HQ - Hybrid (3 days)",green: false },
    { label: "Medical insurance", value: "CIGNA Gold",                 green: false },
    { label: "Annual leave",      value: "21 days",                    green: false },
    { label: "Response deadline", value: "7 days from offer",          green: false },
  ];

  // minHeight for tab content = 9 rows × 28px + 8 gaps × 3px = 252 + 24 = 276px
  const TAB_CONTENT_MIN_H = 276;

  return (
    <ModalOverlay onClickOutside={onClose} gap={18} cardPadding={20}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <IconBtn onClick={onBack}><ArrowLeft size={20} color="white" /></IconBtn>
          <p style={{ fontSize: 22, fontWeight: 600, color: "white", lineHeight: "28px" }}>Offer Contract: Sara Khalid</p>
        </div>
        <IconBtn onClick={onClose}><X size={20} color="white" /></IconBtn>
      </div>

      {/* Body — compact, no scrolling */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Sara candidate card */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ffdabf", flexShrink: 0, overflow: "hidden" }}>
            <img src="/sara-khalid.png" alt="Sara" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 400, color: "#fafafa", lineHeight: "22px" }}>Sara Khalid</p>
            <p style={{ fontSize: 13, color: "#d4d4d8", lineHeight: "18px" }}>AI Practitioner</p>
          </div>
          <ScoreCircle score={95} scoreIncreased size={40} />
        </div>

        {/* AI banner */}
        <div style={{ display: "flex", alignItems: "stretch", background: "rgba(119,220,155,0.05)", border: "1px solid #4ad179", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ width: 6, background: "#4ad179", flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", flex: 1 }}>
            <Sparkles size={16} color="#4ad179" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: "#d2f3de", lineHeight: "18px" }}>
              trAIn has prepared the contract based on your job listing and organisation preferences. Please review and configure the contract variables before submitting your offer.
            </p>
          </div>
        </div>

        {/* Configure Contract */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "white", lineHeight: "20px" }}>Configure Contract</p>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 18, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: "0 0 9px 0",
                    fontSize: 13, lineHeight: "18px",
                    color: activeTab === t.key ? "white" : "rgba(255,255,255,0.5)",
                    borderBottom: activeTab === t.key ? "2px solid #fafafa" : "2px solid transparent",
                    marginBottom: -1, whiteSpace: "nowrap", transition: "all 0.15s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content — fixed height so switching tabs doesn't resize the modal */}
            <div style={{ height: TAB_CONTENT_MIN_H, overflowY: "auto" }}>
              {activeTab === "summary" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {summaryRows.map(({ label, value, green }) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "rgba(255,255,255,0.05)", borderRadius: 7, padding: "6px 10px",
                    }}>
                      <span style={{ fontSize: 13, color: "#a1a1aa" }}>{label}</span>
                      <span style={{ fontSize: 13, color: green ? "#1dc558" : "white" }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button style={{
          padding: "8px 20px", borderRadius: 4, fontSize: 14, lineHeight: "20px", fontWeight: 400,
          background: "rgba(255,255,255,0.05)", border: "none", color: "#fafafa", cursor: "pointer",
        }}>Preview Contract</button>
        <button
          onClick={onSendOffer}
          style={{
            padding: "8px 20px", borderRadius: 4, border: "none", fontSize: 14, lineHeight: "20px", fontWeight: 400,
            background: "#1dc558", color: "#18181b", cursor: "pointer",
          }}
        >Send Offer</button>
      </div>
    </ModalOverlay>
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
