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

function SkillLevelTrendsChart() {
  // Multi-series area chart: AI (green), Cloud (blue), Data (purple), DevOps (teal)
  const months = ["Feb", "Mar", "Apr", "May"];
  const series = [
    { label: "AI", color: "#1dc558", data: [20, 35, 50, 70] },
    { label: "Cloud", color: "#3689ff", data: [15, 28, 40, 60] },
    { label: "Data", color: "#8b5cf6", data: [10, 22, 35, 52] },
    { label: "DevOps", color: "#ff9040", data: [8, 18, 30, 45] },
  ];
  const W = 280;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 20, left: 24 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxVal = 80;

  const toX = (i: number) => PAD.left + (i / (series[0].data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const makePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");

  const makeArea = (data: number[]) =>
    `${makePath(data)} L${toX(data.length - 1)},${PAD.top + chartH} L${toX(0)},${PAD.top + chartH} Z`;

  return (
    <div
      className="flex flex-col p-4 rounded-xl gap-3"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-white font-medium">Skill Level Trends</span>
        <div className="flex items-center gap-2">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-[10px] text-[#d4d4d8]">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Y axis ticks */}
        {[0, 25, 50, 75].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={toY(tick)}
              x2={W - PAD.right}
              y2={toY(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 4}
              y={toY(tick) + 4}
              fontSize={8}
              fill="#71717b"
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}
        {/* Month labels */}
        {months.map((m, i) => (
          <text
            key={m}
            x={toX(i)}
            y={H - 4}
            fontSize={8}
            fill="#71717b"
            textAnchor="middle"
          >
            {m}
          </text>
        ))}
        {/* Areas (reverse to get correct stacking) */}
        {[...series].reverse().map((s, idx) => (
          <g key={idx}>
            <defs>
              <linearGradient id={`grad-${s.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <path d={makeArea(s.data)} fill={`url(#grad-${s.label})`} />
            <path
              d={makePath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function CurrentVsRequiredChart() {
  const W = 280;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 20, left: 24 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxVal = 100;
  const pts = 5;

  const required = [85, 80, 78, 70, 65];
  const current = [60, 58, 54, 50, 46];
  const labels = ["Feb", "Mar", "Apr", "May", "Jun"];

  const toX = (i: number) => PAD.left + (i / (pts - 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const makePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");

  const makeArea = (data: number[]) =>
    `${makePath(data)} L${toX(data.length - 1)},${PAD.top + chartH} L${toX(0)},${PAD.top + chartH} Z`;

  return (
    <div
      className="flex flex-col p-4 rounded-xl gap-3"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <span className="text-xs text-white font-medium">Current vs Required Skills</span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="grad-required" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="grad-current" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1dc558" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#1dc558" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={toY(tick)}
              x2={W - PAD.right}
              y2={toY(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text x={PAD.left - 4} y={toY(tick) + 4} fontSize={8} fill="#71717b" textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l} x={toX(i)} y={H - 4} fontSize={8} fill="#71717b" textAnchor="middle">
            {l}
          </text>
        ))}
        <path d={makeArea(required)} fill="url(#grad-required)" />
        <path d={makePath(required)} fill="none" stroke="#8b5cf6" strokeWidth={1.5} />
        <path d={makeArea(current)} fill="url(#grad-current)" />
        <path d={makePath(current)} fill="none" stroke="#1dc558" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

function SkillBarChart() {
  const W = 280;
  const H = 130;
  const PAD = { top: 8, right: 16, bottom: 8, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const skills = [
    { label: "Engineering", value: 75 },
    { label: "Product", value: 65 },
    { label: "Data", value: 60 },
    { label: "Design", value: 55 },
    { label: "Sales", value: 50 },
  ];
  const barH = Math.floor(chartH / skills.length) - 4;
  const maxVal = 100;

  return (
    <div
      className="flex flex-col p-4 rounded-xl gap-3"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <span className="text-xs text-white font-medium">Skill Level Trends</span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1dc558" />
            <stop offset="100%" stopColor="#3689ff" />
          </linearGradient>
        </defs>
        {skills.map((s, i) => {
          const y = PAD.top + i * (barH + 4);
          const bw = (s.value / maxVal) * chartW;
          return (
            <g key={s.label}>
              <text
                x={PAD.left - 6}
                y={y + barH / 2 + 4}
                fontSize={9}
                fill={SUBTLE}
                textAnchor="end"
              >
                {s.label}
              </text>
              <rect
                x={PAD.left}
                y={y}
                width={chartW}
                height={barH}
                rx={3}
                fill="rgba(255,255,255,0.07)"
              />
              <rect
                x={PAD.left}
                y={y}
                width={bw}
                height={barH}
                rx={3}
                fill="url(#bar-grad)"
              />
            </g>
          );
        })}
        {[0, 25, 50, 75].map((tick) => (
          <text
            key={tick}
            x={PAD.left + (tick / maxVal) * chartW}
            y={H - 2}
            fontSize={7}
            fill="#71717b"
            textAnchor="middle"
          >
            {tick}
          </text>
        ))}
      </svg>
    </div>
  );
}

function MonthlyGrowthChart() {
  const W = 280;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 20, left: 24 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const data = [2, 5, 8, 12, 18, 25, 30];
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const maxVal = 35;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const pathD = data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");

  return (
    <div
      className="flex flex-col p-4 rounded-xl gap-3"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <span className="text-xs text-white font-medium">Monthly Skill Growth Rate</span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="grad-growth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3689ff" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3689ff" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        {[0, 10, 20, 30].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={toY(tick)}
              x2={W - PAD.right}
              y2={toY(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text x={PAD.left - 4} y={toY(tick) + 4} fontSize={8} fill="#71717b" textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l} x={toX(i)} y={H - 4} fontSize={8} fill="#71717b" textAnchor="middle">
            {l}
          </text>
        ))}
        <path
          d={`${pathD} L${toX(data.length - 1)},${PAD.top + chartH} L${toX(0)},${PAD.top + chartH} Z`}
          fill="url(#grad-growth)"
        />
        <path d={pathD} fill="none" stroke="#3689ff" strokeWidth={2} />
        {data.map((v, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={3}
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
