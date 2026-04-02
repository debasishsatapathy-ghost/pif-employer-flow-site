'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingDown, TrendingUp, ChevronLeft, ChevronRight,
  UserPlus, UserCheck, AlertCircle, Briefcase, DollarSign, Plus,
} from 'lucide-react';
import type { JobPostingResponse, MockJobResponse } from '@/lib/employer/employerApi';

const CARD = { background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)' };

const ROLES = ['Senior AI Developer', 'Cloud Engineer'];
const BAR = [
  { label: 'Interview', color: '#1ed25e', pct: 35 },
  { label: 'Shortlisted', color: '#51a2ff', pct: 30 },
  { label: 'Screened', color: '#a78bfa', pct: 25 },
  { label: 'Rejected', color: 'rgba(255,255,255,0.22)', pct: 10 },
];

const INTEL = [
  {
    icon: 'down', iconColor: '#f97316',
    title: 'Pipeline dropoff',
    body: "Based on recent data, candidates were 15% more likely to drop out when waiting over 7 days between interviews.",
    cta: 'Review schedule',
  },
  {
    icon: 'up', iconColor: '#1ed25e',
    title: 'AI readiness in Jeddah',
    body: 'AI graduates in Jeddah are showing a 5% higher skill readiness score than those in Riyadh.',
    noAction: 'No action required.',
  },
  {
    icon: 'up', iconColor: '#f97316',
    title: 'AI Developer compensation',
    body: 'A talent shortage has seen wage demands increase by 12% this quarter.',
    note: '2 listings have fallen below the range.',
    cta: 'Update salary range',
  },
] as const;

const CAL_HEADS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CAL: { d: number; other?: true }[] = [
  {d:25,other:true},{d:26,other:true},{d:27,other:true},{d:28,other:true},{d:29,other:true},{d:30,other:true},{d:1},
  {d:2},{d:3},{d:4},{d:5},{d:6},{d:7},{d:8},
  {d:9},{d:10},{d:11},{d:12},{d:13},{d:14},{d:15},
  {d:16},{d:17},{d:18},{d:19},{d:20},{d:21},{d:22},
  {d:23},{d:24},{d:25},{d:26},{d:27},{d:28},{d:29},
  {d:30},{d:1,other:true},{d:2,other:true},{d:3,other:true},{d:4,other:true},{d:5,other:true},{d:6,other:true},
];
const TODAY_D = 12;

const IVWS = [
  { name: 'Sara Khalid', role: 'Senior AI Developer', type: 'In-person', time: 'Today 10:00', ampm: 'AM' },
  { name: 'Rayan Tosan', role: 'Senior AI Developer', type: 'In-person', time: 'Today 11:00', ampm: 'AM' },
  { name: 'Aisha Malik', role: 'Cloud Engineer', type: 'Remote', time: 'Tomorrow 9:30', ampm: 'AM' },
];

function Dots({ color, solid, faded }: { color: string; solid: number; faded: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({length: solid}).map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{background: color}} />)}
      {Array.from({length: faded}).map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{background: 'rgba(255,255,255,0.25)'}} />)}
    </div>
  );
}

function statusDotColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'open') return '#1ed25e';
  if (s === 'interviewing') return '#f97316';
  if (s === 'screening') return '#51a2ff';
  if (s === 'closed' || s === 'completed') return 'rgba(255,255,255,0.35)';
  return '#a78bfa';
}

function statusDotCount(status: string): { solid: number; faded: number } {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'open') return { solid: 4, faded: 0 };
  if (s === 'interviewing') return { solid: 3, faded: 1 };
  if (s === 'screening') return { solid: 2, faded: 2 };
  if (s === 'closed' || s === 'completed') return { solid: 1, faded: 3 };
  return { solid: 2, faded: 2 };
}

function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

function MiniCalendar() {
  return (
    <div className="rounded-xl p-3" style={CARD}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">June 2026</span>
        <div className="flex gap-0.5">
          <button type="button" className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65"><ChevronLeft size={12} /></button>
          <button type="button" className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65"><ChevronRight size={12} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-0.5">
        {CAL_HEADS.map((h, i) => <div key={i} className="text-center text-[9px] font-medium text-white/30 py-0.5">{h}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {CAL.map((c, i) => (
          <div key={i} className="flex items-center justify-center" style={{padding: '1px 0'}}>
            <span
              className="w-[22px] h-[22px] flex items-center justify-center text-[10px] font-medium rounded-full"
              style={
                !c.other && c.d === TODAY_D
                  ? { background: '#1ed25e', color: '#0d1117', fontWeight: 700 }
                  : c.other ? { color: 'rgba(255,255,255,0.25)' } : { color: 'rgba(255,255,255,0.8)' }
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

function LiveJobCard({ job, onClick }: { job: JobPostingResponse; onClick?: () => void }) {
  const dotColor = statusDotColor(job.status);
  const { solid, faded } = statusDotCount(job.status);
  const hasSalary = job.salary_min || job.salary_max;
  const salaryText = hasSalary ? [job.salary_min, job.salary_max].filter(Boolean).join(' – ') : null;
  const skillCount = (job.skills?.mustHave?.length ?? 0) + (job.skills?.preferred?.length ?? 0) + (job.skills?.niceToHave?.length ?? 0);
  const meta = [job.department, job.location, relativeDate(job.created_at)].filter(Boolean).join(' · ');

  return (
    <button type="button" onClick={onClick} className="rounded-xl p-4 w-full text-left transition-all hover:scale-[1.01] active:scale-[0.99]" style={CARD}>
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-tight truncate">{job.title}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{meta}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2 mt-0.5">
          <Dots color={dotColor} solid={solid} faded={faded} />
          <span className="text-[10px] text-white/65 font-medium">{job.status}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {job.employment_type && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <Briefcase size={9} className="flex-shrink-0" />{job.employment_type}
          </span>
        )}
        {salaryText && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <DollarSign size={9} className="flex-shrink-0" />{salaryText}
          </span>
        )}
        {skillCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            {skillCount} skills required
          </span>
        )}
      </div>
      {job.description && <p className="text-[10px] text-white/35 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>}
    </button>
  );
}

function MockJobCard({ job, onClick }: { job: MockJobResponse; onClick?: () => void }) {
  const skillCount = (job.required_skills?.length ?? 0) + (job.recommended_skills?.length ?? 0);
  return (
    <button type="button" onClick={onClick} className="rounded-xl p-4 w-full text-left transition-all hover:scale-[1.01] active:scale-[0.99]" style={CARD}>
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-tight truncate">{job.title}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{[job.company, job.location, job.category].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {job.salary_range && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <DollarSign size={9} className="flex-shrink-0" />{job.salary_range}
          </span>
        )}
        {skillCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            {skillCount} skills
          </span>
        )}
      </div>
      {job.description && <p className="text-[10px] text-white/35 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>}
    </button>
  );
}

interface HiringPageProps {
  onSelectJob?: (id: string, job: { title: string; department: string; location: string; status: string; posted_at?: string }) => void;
  onPostJob?: () => void;
  apiJobs?: JobPostingResponse[];
  apiJobsLoading?: boolean;
  mockJobs?: MockJobResponse[];
}

export function HiringPage({ onSelectJob, onPostJob, apiJobs = [], apiJobsLoading = false, mockJobs = [] }: HiringPageProps) {
  const [roleIdx, setRoleIdx] = useState(0);
  const [intelIdx, setIntelIdx] = useState(0);

  const allJobs = apiJobs;
  const showMock = allJobs.length === 0 && !apiJobsLoading;

  return (
    <div className="flex h-full overflow-hidden gap-4 p-4">
      {/* Left column */}
      <div className="flex flex-col gap-4 flex-1 min-w-0 overflow-y-auto">
        {/* Pipeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-xl p-4" style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Pipeline</p>
              <div className="flex items-center gap-2 mt-1">
                {ROLES.map((r, i) => (
                  <button key={r} onClick={() => setRoleIdx(i)}
                    className="text-sm font-medium transition-colors"
                    style={{ color: i === roleIdx ? 'white' : 'rgba(255,255,255,0.35)' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">47</p>
              <p className="text-[10px] text-white/40">total applicants</p>
            </div>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            {BAR.map((b) => <div key={b.label} className="rounded-full transition-all" style={{ background: b.color, width: `${b.pct}%` }} />)}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {BAR.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
                <span className="text-[10px] text-white/50">{b.label} {b.pct}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="rounded-xl p-4" style={CARD}>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg. time to match</p>
            <p className="text-2xl font-bold text-white mt-1">4.2 <span className="text-sm font-normal text-white/40">days</span></p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown size={12} className="text-[#1ed25e]" />
              <span className="text-[10px] text-[#1ed25e]">12% faster this month</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="rounded-xl p-4" style={CARD}>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg. skill readiness</p>
            <p className="text-2xl font-bold text-white mt-1">78 <span className="text-sm font-normal text-white/40">/ 100</span></p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={12} className="text-[#51a2ff]" />
              <span className="text-[10px] text-[#51a2ff]">+5 pts vs last quarter</span>
            </div>
          </motion.div>
        </div>

        {/* Hiring Intelligence */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-xl p-4" style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Hiring Intelligence</p>
            <div className="flex gap-0.5">
              <button type="button" onClick={() => setIntelIdx((i) => Math.max(0, i - 1))} disabled={intelIdx === 0}
                className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65 disabled:opacity-20">
                <ChevronLeft size={12} />
              </button>
              <button type="button" onClick={() => setIntelIdx((i) => Math.min(INTEL.length - 1, i + 1))} disabled={intelIdx === INTEL.length - 1}
                className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/65 disabled:opacity-20">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
          {INTEL.map((item, i) => i === intelIdx && (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {item.icon === 'down' ? <TrendingDown size={14} style={{ color: item.iconColor }} /> : <TrendingUp size={14} style={{ color: item.iconColor }} />}
                <p className="text-sm font-semibold text-white">{item.title}</p>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{item.body}</p>
              {'note' in item && item.note && <p className="text-[10px] text-[#f97316]">{item.note}</p>}
              {'noAction' in item && item.noAction && <p className="text-[10px] text-[#1ed25e]">{item.noAction}</p>}
              {'cta' in item && item.cta && (
                <button type="button" className="self-start text-[11px] px-3 py-1 rounded-lg font-medium text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {item.cta}
                </button>
              )}
            </div>
          ))}
        </motion.div>

        {/* Job Postings */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="rounded-xl p-4" style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Job Postings</p>
            <button type="button" onClick={onPostJob}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium text-white transition-all hover:scale-[1.02]"
              style={{ background: '#1ed25e', color: '#0d1117' }}>
              <Plus size={11} />Post a job
            </button>
          </div>
          {apiJobsLoading && <p className="text-xs text-white/30 py-4 text-center">Loading postings…</p>}
          {!apiJobsLoading && allJobs.length > 0 && (
            <div className="flex flex-col gap-2">
              {allJobs.map((job) => (
                <LiveJobCard key={job.id} job={job} onClick={() => onSelectJob?.(job.id, { title: job.title, department: job.department || '', location: job.location || '', status: job.status, posted_at: relativeDate(job.created_at) })} />
              ))}
            </div>
          )}
          {showMock && mockJobs.length > 0 && (
            <div className="flex flex-col gap-2">
              {mockJobs.map((job) => <MockJobCard key={job.id} job={job} />)}
            </div>
          )}
          {!apiJobsLoading && allJobs.length === 0 && mockJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-xs text-white/30">No job postings yet.</p>
              <button type="button" onClick={onPostJob} className="text-xs text-[#1ed25e] hover:underline">Post your first job</button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right column — Upcoming Interviews + Calendar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-xl p-4 flex flex-col gap-3" style={CARD}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Upcoming Interviews</p>
          {IVWS.map((iv, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2e5e50)' }}>
                {iv.name.split(' ').map((w) => w[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{iv.name}</p>
                <p className="text-[10px] text-white/40 truncate">{iv.role}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>{iv.type}</span>
                  <span className="text-[9px] text-white/40">{iv.time} {iv.ampm}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <MiniCalendar />
        </motion.div>
      </div>
    </div>
  );
}
