"use client";

import { useState } from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Zap,
  Shield,
  Database,
  Lock,
} from "lucide-react";

/* ── Design tokens ─────────────────────────────────────────────────────── */
const CARD_BG = "rgba(255,255,255,0.05)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.09)";
const GREEN = "#1dc558";
const ORANGE = "#ff9040";
const BLUE = "#3689ff";
const SUBTLE = "#d4d4d8";
const WHITE = "#fafafa";

/* ── Section header ─────────────────────────────────────────────────────── */
function SectionHeader({
  title,
  onViewAll,
}: {
  title: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between w-full">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <button
        className="flex items-center gap-1 text-[#1dc558] text-base underline underline-offset-2"
        onClick={onViewAll}
      >
        View all
        <ChevronRight size={20} className="text-[#1dc558]" />
      </button>
    </div>
  );
}

/* ── Learning Trends ─────────────────────────────────────────────────────── */
interface TrendCardProps {
  label: string;
  value: string;
  unit: string;
  valueColor: string;
  arrowDir?: "up" | "down";
  arrowColor?: string;
  trendLabel: string;
  viewLink?: boolean;
}

function TrendCard({
  label,
  value,
  unit,
  valueColor,
  arrowDir,
  arrowColor = GREEN,
  trendLabel,
  viewLink,
}: TrendCardProps) {
  const TrendIcon = arrowDir === "up" ? ArrowUp : ArrowDown;

  return (
    <div
      className="flex-1 flex flex-col justify-between p-4 rounded-xl min-w-0"
      style={{ background: CARD_BG, border: CARD_BORDER, height: 164 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-base text-[#d4d4d8]">{label}</span>
        <MoreHorizontal size={20} className="text-[#d4d4d8]" />
      </div>

      <div className="flex items-end gap-2">
        <span
          className="text-[48px] font-semibold leading-none"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        <span className="text-base text-[#d4d4d8] pb-1">{unit}</span>
      </div>

      <div className="flex items-center justify-between">
        {arrowDir ? (
          <div className="flex items-center gap-1">
            <TrendIcon size={16} style={{ color: arrowColor }} />
            <span className="text-sm text-white">{trendLabel}</span>
          </div>
        ) : (
          <span className="text-sm text-white">{trendLabel}</span>
        )}
        {viewLink && (
          <button className="flex items-center gap-0.5 text-[#1dc558] text-sm underline underline-offset-2">
            View
            <ChevronRight size={16} className="text-[#1dc558]" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Skills Requiring Attention ─────────────────────────────────────────── */
interface SkillCardProps {
  name: string;
  belowPct: number;
  employees: number;
  iconColor: string;
  iconBg: string;
  icon: React.ReactNode;
}

function SkillCard({ name, belowPct, employees, iconBg, icon }: SkillCardProps) {
  return (
    <div
      className="flex-1 flex items-center gap-3 p-4 rounded-xl min-w-0"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ background: iconBg, width: 40, height: 40 }}
      >
        {icon}
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span className="text-base text-white">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#d4d4d8]">{belowPct}% below industry</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[#d4d4d8]" />
          <span className="text-xs text-[#d4d4d8]">{employees} employees need upskilling</span>
        </div>
      </div>
      <button
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ background: CARD_BG, border: CARD_BORDER, width: 36, height: 36 }}
      >
        <ChevronRight size={16} className="text-white" />
      </button>
    </div>
  );
}

/* ── Training Program progress bar ─────────────────────────────────────── */
function ProgressBar({
  completedPct,
  inProgressPct,
}: {
  completedPct: number;
  inProgressPct: number;
}) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: CARD_BG }}>
      <div className="h-full flex">
        <div
          className="h-full rounded-l-full"
          style={{
            width: `${completedPct}%`,
            background: GREEN,
          }}
        />
        <div
          className="h-full"
          style={{
            width: `${inProgressPct}%`,
            background: BLUE,
            borderRadius: inProgressPct + completedPct >= 100 ? "0 9999px 9999px 0" : "0",
          }}
        />
      </div>
    </div>
  );
}

interface TrainingProgramCardProps {
  title: string;
  weeks: number;
  participants: number;
  tags: string[];
  completed?: number;
  inProgress?: number;
  completionPct?: number;
  showLaunch?: boolean;
}

function TrainingProgramCard({
  title,
  weeks,
  participants,
  tags,
  completed,
  inProgress,
  completionPct,
  showLaunch,
}: TrainingProgramCardProps) {
  const total = (completed ?? 0) + (inProgress ?? 0);
  const completedBarPct = total > 0 ? ((completed ?? 0) / total) * 100 : 0;
  const inProgressBarPct = total > 0 ? ((inProgress ?? 0) / total) * 100 : 0;

  return (
    <div
      className="flex-1 flex flex-col gap-4 p-4 rounded-xl min-w-0"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      {/* Header */}
      <div className="flex items-start gap-1">
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-base font-semibold text-white leading-tight">{title}</span>
            <MoreHorizontal size={20} className="text-[#d4d4d8] shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#d4d4d8]">{weeks} Weeks</span>
            <span className="w-1 h-1 rounded-full bg-[#d4d4d8]" />
            <span className="text-sm text-[#d4d4d8]">{participants} Participants</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-sm text-white px-2 py-1 rounded-lg"
            style={{ background: "rgba(39,39,42,0.5)" }}
          >
            {tag}
          </span>
        ))}
      </div>

      {showLaunch ? (
        <div className="mt-auto">
          <button
            className="w-full py-2.5 text-base font-semibold text-[#f4f4f5] rounded-full"
            style={{ background: CARD_BG, border: CARD_BORDER }}
          >
            Launch Program
          </button>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <ProgressBar
            completedPct={completedBarPct}
            inProgressPct={inProgressBarPct}
          />

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-xl font-semibold" style={{ color: GREEN }}>
                {completed}
              </span>
              <span className="text-[10px] text-[#71717b]">Completed</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-xl font-semibold" style={{ color: BLUE }}>
                {inProgress}
              </span>
              <span className="text-[10px] text-[#71717b]">In Progress</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-xl font-semibold text-white">{completionPct}%</span>
              <span className="text-[10px] text-[#71717b]">Completion</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Skill Insights Charts ──────────────────────────────────────────────── */

/*
 * Shared chart geometry helper.
 * Uses a fixed 500×175 viewBox (matching the Figma canvas).
 * SVG is rendered with width="100%" so it scales to the card width while
 * preserving aspect ratio (no preserveAspectRatio="none").
 */
const VB_W = 500;
const VB_H = 175;
const C_PAD = { top: 12, right: 8, bottom: 22, left: 32 };
const C_CW = VB_W - C_PAD.left - C_PAD.right;
const C_CH = VB_H - C_PAD.top - C_PAD.bottom;

function cx(i: number, total: number) {
  return C_PAD.left + (i / (total - 1)) * C_CW;
}
function cy(v: number, maxV: number) {
  return C_PAD.top + C_CH - (v / maxV) * C_CH;
}
function linePath(pts: number[], maxV: number) {
  return pts.map((v, i) => `${i === 0 ? "M" : "L"}${cx(i, pts.length).toFixed(1)},${cy(v, maxV).toFixed(1)}`).join(" ");
}
function areaPath(pts: number[], maxV: number) {
  const n = pts.length;
  return `${linePath(pts, maxV)} L${cx(n - 1, n).toFixed(1)},${(C_PAD.top + C_CH).toFixed(1)} L${cx(0, n).toFixed(1)},${(C_PAD.top + C_CH).toFixed(1)} Z`;
}

function ChartGrid({ maxV, yTicks, xLabels }: { maxV: number; yTicks: number[]; xLabels: string[] }) {
  const n = xLabels.length;
  return (
    <>
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={C_PAD.left} y1={cy(t, maxV)}
            x2={VB_W - C_PAD.right} y2={cy(t, maxV)}
            stroke="rgba(255,255,255,0.07)" strokeWidth={1}
          />
          <text x={C_PAD.left - 5} y={cy(t, maxV) + 3.5} fontSize={9} fill="#52525b" textAnchor="end">{t}</text>
        </g>
      ))}
      {xLabels.map((l, i) => (
        <text key={l} x={cx(i, n)} y={VB_H - 6} fontSize={9} fill="#52525b" textAnchor="middle">{l}</text>
      ))}
    </>
  );
}

function SkillLevelTrendsChart() {
  // All series cluster in the 50–80 range — this creates the single blended dark area
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const series = [
    { label: "AI",     color: "#1dc558", data: [56, 61, 65, 69, 73, 78] },
    { label: "Cloud",  color: "#3689ff", data: [53, 58, 62, 66, 70, 75] },
    { label: "Data",   color: "#ff6b35", data: [51, 56, 60, 64, 68, 72] },
    { label: "DevOps", color: "#a855f7", data: [49, 54, 58, 62, 66, 70] },
  ];
  const MAX = 100;
  // Envelope = max across all series at each x — fills one large blended area
  const envelope = MONTHS.map((_, i) => Math.max(...series.map(s => s.data[i])));

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-sm font-semibold text-white">Skill Level Trends</span>
        <div className="flex items-center gap-3">
          {series.map(s => (
            <span key={s.label} className="flex items-center gap-1 text-[10px]" style={{ color: "#71717b" }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="slt-env-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b21b6" stopOpacity={0.82} />
            <stop offset="60%" stopColor="#2e1065" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#0f0525" stopOpacity={0.10} />
          </linearGradient>
        </defs>
        <ChartGrid maxV={MAX} yTicks={[0, 25, 50, 75, 100]} xLabels={MONTHS} />
        {/* Single dark envelope fill */}
        <path d={areaPath(envelope, MAX)} fill="url(#slt-env-grad)" />
        {/* Individual series lines on top (subtle, close together) */}
        {series.map(s => (
          <path key={s.label} d={linePath(s.data, MAX)} fill="none" stroke={s.color} strokeWidth={1.5} strokeOpacity={0.9} />
        ))}
      </svg>
    </div>
  );
}

function CurrentVsRequiredChart() {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  // Required: starts high and slowly declines (goal is lowering the gap)
  // Current:  also high and rises slightly to meet required
  const required = [82, 81, 79, 78, 77, 76];
  const current  = [56, 59, 63, 66, 69, 73];
  const MAX = 100;
  // Envelope for the combined dark area
  const envelope = MONTHS.map((_, i) => Math.max(required[i], current[i]));

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <span className="text-sm font-semibold text-white">Current vs Required Skills</span>
      <svg width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="cvr-env-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity={0.88} />
            <stop offset="60%" stopColor="#2e1065" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#0a0218" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="cvr-cur-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <ChartGrid maxV={MAX} yTicks={[0, 25, 50, 75, 100]} xLabels={MONTHS} />
        {/* Dark envelope fill */}
        <path d={areaPath(envelope, MAX)} fill="url(#cvr-env-grad)" />
        {/* Current area — lighter fill on top to show the gap */}
        <path d={areaPath(current, MAX)} fill="url(#cvr-cur-grad)" />
        {/* Lines */}
        <path d={linePath(required, MAX)} fill="none" stroke="#a855f7" strokeWidth={1.5} />
        <path d={linePath(current, MAX)} fill="none" stroke="#8b5cf6" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

function SkillBarChart() {
  // Uses VB_W × VB_H viewBox to match Figma proportions
  const BAR_PAD = { top: 10, right: 20, bottom: 22, left: 72 };
  const bCW = VB_W - BAR_PAD.left - BAR_PAD.right;
  const bCH = VB_H - BAR_PAD.top - BAR_PAD.bottom;

  const skills = [
    { label: "Engineering", value: 83 },
    { label: "Product",     value: 74 },
    { label: "Data",        value: 76 },
    { label: "Design",      value: 71 },
    { label: "Sales",       value: 65 },
  ];
  const maxVal = 100;
  const gap = 6;
  const barH = Math.floor((bCH - gap * (skills.length - 1)) / skills.length);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <span className="text-sm font-semibold text-white">Skill Level Trends</span>
      <svg width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1dc558" />
            <stop offset="100%" stopColor="#3689ff" />
          </linearGradient>
        </defs>
        {skills.map((s, i) => {
          const y = BAR_PAD.top + i * (barH + gap);
          const bw = (s.value / maxVal) * bCW;
          return (
            <g key={s.label}>
              <text x={BAR_PAD.left - 8} y={y + barH / 2 + 3.5} fontSize={9} fill="#71717b" textAnchor="end">
                {s.label}
              </text>
              <rect x={BAR_PAD.left} y={y} width={bCW} height={barH} rx={3} fill="rgba(255,255,255,0.06)" />
              <rect x={BAR_PAD.left} y={y} width={bw} height={barH} rx={3} fill="url(#bar-grad)" />
            </g>
          );
        })}
        {[0, 25, 50, 75, 100].map((tick) => (
          <text key={tick} x={BAR_PAD.left + (tick / maxVal) * bCW} y={VB_H - 6} fontSize={8} fill="#52525b" textAnchor="middle">
            {tick}
          </text>
        ))}
      </svg>
    </div>
  );
}

function MonthlyGrowthChart() {
  // Gentle upward slope matching the Figma (starts ~65, ends ~78)
  const data = [65, 67, 70, 71, 74, 76, 78];
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const MAX = 100;
  const n = data.length;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <span className="text-sm font-semibold text-white">Monthly Skill Growth Rate</span>
      <svg width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="grad-growth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3689ff" stopOpacity={0.20} />
            <stop offset="100%" stopColor="#3689ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <ChartGrid maxV={MAX} yTicks={[0, 25, 50, 75, 100]} xLabels={labels} />
        <path
          d={`${linePath(data, MAX)} L${cx(n - 1, n).toFixed(1)},${(C_PAD.top + C_CH).toFixed(1)} L${cx(0, n).toFixed(1)},${(C_PAD.top + C_CH).toFixed(1)} Z`}
          fill="url(#grad-growth)"
        />
        <path d={linePath(data, MAX)} fill="none" stroke="#3689ff" strokeWidth={2} />
        {data.map((v, i) => (
          <circle
            key={i}
            cx={cx(i, n)}
            cy={cy(v, MAX)}
            r={3.5}
            fill="#3689ff"
            stroke="#09090b"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Agentic Recommendations ─────────────────────────────────────────────── */
const RECOMMENDATIONS = [
  { trend: "up" as const, color: GREEN },
  { trend: "up" as const, color: GREEN },
  { trend: "down" as const, color: ORANGE },
  { trend: "up" as const, color: GREEN },
];

function RecommendationCard({
  trend,
  color,
}: {
  trend: "up" | "down";
  color: string;
}) {
  const Icon = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <div
      className="flex-1 flex flex-col gap-2 p-4 rounded-xl min-w-0"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color }} />
        <span className="text-sm font-medium text-white">Recommendation</span>
      </div>
      <span className="text-sm text-[#d4d4d8]">Lorem ipsum</span>
    </div>
  );
}

/* ── Main WorkforcePage ──────────────────────────────────────────────────── */
export default function WorkforcePage() {
  const [programTab, setProgramTab] = useState<"all" | "active" | "complete">("all");

  return (
    <div className="flex flex-col gap-8 py-6 w-full">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-[40px] font-semibold text-white leading-tight">Workforce</h1>
        <button
          className="px-4 h-10 rounded-full text-base font-semibold text-white"
          style={{ background: "rgba(29,197,88,0.5)" }}
        >
          Create Training Program
        </button>
      </div>

      {/* ── Learning Trends ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Learning Trends" />
        <div className="flex gap-4">
          <TrendCard
            label="Avg. completion"
            value="4.2"
            unit="days to complete"
            valueColor={GREEN}
            arrowDir="down"
            arrowColor={GREEN}
            trendLabel="15% from last month"
          />
          <TrendCard
            label="Compliance risk"
            value="9"
            unit="expiring certifications"
            valueColor={ORANGE}
            arrowDir="up"
            arrowColor={ORANGE}
            trendLabel="15% non compliant"
            viewLink
          />
          <TrendCard
            label="Internal upskill success"
            value="12"
            unit="hires from upskilling"
            valueColor={GREEN}
            arrowDir="up"
            arrowColor={GREEN}
            trendLabel="4 more than Q3"
          />
          <TrendCard
            label="Peer-to-peer training"
            value="3.8"
            unit="shares per course"
            valueColor={BLUE}
            trendLabel="0% change"
            viewLink
          />
        </div>
      </div>

      {/* ── Skills Requiring Attention ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Skills Requiring Attention" />
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <SkillCard
              name="Generative AI"
              belowPct={34}
              employees={45}
              iconColor="#ff6b35"
              iconBg="rgba(255,107,53,0.15)"
              icon={<Zap size={20} className="text-[#ff6b35]" />}
            />
            <SkillCard
              name="ML Ops"
              belowPct={11}
              employees={10}
              iconColor="#3689ff"
              iconBg="rgba(54,137,255,0.15)"
              icon={<Database size={20} className="text-[#3689ff]" />}
            />
          </div>
          <div className="flex gap-4">
            <SkillCard
              name="Kubernetes"
              belowPct={13}
              employees={15}
              iconColor="#3689ff"
              iconBg="rgba(54,137,255,0.15)"
              icon={<Shield size={20} className="text-[#3689ff]" />}
            />
            <SkillCard
              name="Cybersecurity"
              belowPct={23}
              employees={19}
              iconColor="#3689ff"
              iconBg="rgba(54,137,255,0.15)"
              icon={<Lock size={20} className="text-[#3689ff]" />}
            />
          </div>
        </div>
      </div>

      {/* ── Current Training Programs ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-white">Current Training Programs</h2>
            <div className="flex items-center gap-2">
              {(["all", "active", "complete"] as const).map((tab) => {
                const label = tab === "all" ? "All Postings" : tab === "active" ? "Active" : "Complete";
                const isActive = programTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setProgramTab(tab)}
                    className="px-3 py-1 rounded-full text-sm text-white"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
                      border: isActive ? CARD_BORDER : CARD_BORDER,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="flex items-center gap-1 text-[#1dc558] text-base underline underline-offset-2">
            View all
            <ChevronRight size={20} className="text-[#1dc558]" />
          </button>
        </div>

        <div className="flex gap-4 items-start">
          <TrainingProgramCard
            title="Advanced AI and Machine Learning"
            weeks={8}
            participants={45}
            tags={["Gen AI", "Python", "SQL"]}
            completed={28}
            inProgress={17}
            completionPct={62}
          />
          <TrainingProgramCard
            title="Cloud Architecture Mastery"
            weeks={6}
            participants={32}
            tags={["AWS", "Azure", "DevOps"]}
            completed={32}
            inProgress={0}
            completionPct={100}
          />
          <TrainingProgramCard
            title="Data Science Fundamentals"
            weeks={10}
            participants={0}
            tags={["Python", "Statistics", "SQL"]}
            showLaunch
          />
        </div>
      </div>

      {/* ── Skill Insights ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Skill Insights" />
        <div className="grid grid-cols-2 gap-4">
          <SkillLevelTrendsChart />
          <CurrentVsRequiredChart />
          <SkillBarChart />
          <MonthlyGrowthChart />
        </div>
      </div>

      {/* ── Agentic Recommendations ── */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Agentic Recommendations" />
        <div className="flex gap-4">
          {RECOMMENDATIONS.map((r, i) => (
            <RecommendationCard key={i} trend={r.trend} color={r.color} />
          ))}
        </div>
      </div>
    </div>
  );
}
