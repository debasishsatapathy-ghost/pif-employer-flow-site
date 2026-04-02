'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HiringPage } from './HiringPage';
import { JobPostingTemplate } from './JobPostingTemplate';
import type { JobPostingResponse } from '@/lib/employer/employerApi';
import type { SidebarJob } from '../employer/JobPostingSidebar';
import {
  Search, MapPin, Mail, GraduationCap, Plus, Bell,
  ChevronDown, ArrowRight, ArrowUp, Loader2, Building2,
  Users, BookOpen, MessageCircle, X, AlertTriangle, UserCheck,
} from 'lucide-react';
import {
  cacheJobApplicantsFromTool,
  getCachedJobApplicants,
} from '@/lib/employer/employerApplicantsCache';
import type { ApplicationWithProfileListResponse, ApplicationWithProfileResponse } from '@/lib/employer/employerApi';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

/* ── Post-a-Job wizard types ─────────────────────────────────────────────── */
interface SkillSet { mustHave: string[]; preferred: string[]; niceToHave: string[] }
interface JobFormData {
  title: string; department: string; location: string; employmentType: string;
  description: string; skills: SkillSet; salaryMin: string; salaryMax: string;
}
interface PostedJob { title: string; department: string; location: string; postedAt: Date }

const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Internship'];
const TOTAL_STEPS = 5;

function inferDescription(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('ai') || t.includes('ml') || t.includes('machine learning'))
    return `We're looking for a ${title} to design, build, and deploy intelligent systems. You'll work across the full model lifecycle — from data prep and training to evaluation and production rollout.`;
  if (t.includes('backend') || t.includes('back-end') || t.includes('server'))
    return `We're hiring a ${title} to build and maintain scalable APIs and services. You'll collaborate with product and frontend teams to ship reliable, high-performance features.`;
  if (t.includes('frontend') || t.includes('front-end') || t.includes('react'))
    return `We're looking for a ${title} to craft fast, polished user experiences. You'll own the UI layer end-to-end — from component design to performance optimisation.`;
  if (t.includes('cloud') || t.includes('devops') || t.includes('platform'))
    return `We need a ${title} to design and manage our infrastructure at scale. You'll own provisioning, security hardening, and cost optimisation across our cloud environments.`;
  if (t.includes('data analyst') || t.includes('business analyst'))
    return `We're looking for a ${title} to turn raw data into actionable insights. You'll partner with business teams to define metrics, build dashboards, and surface trends that drive decisions.`;
  if (t.includes('product manager') || t.includes('product owner'))
    return `We're hiring a ${title} to own the roadmap for one of our core product areas. You'll translate user needs and business goals into clear, prioritised specs for engineering.`;
  return `We're hiring a ${title} to join our growing team. You'll contribute meaningfully from day one and work alongside talented colleagues to deliver real impact.`;
}

function inferSkills(title: string): SkillSet {
  const t = title.toLowerCase();
  if (t.includes('ai') || t.includes('ml') || t.includes('machine learning'))
    return { mustHave: ['Python', 'PyTorch or TensorFlow', 'Scikit-learn', 'Model evaluation'], preferred: ['MLflow', 'SQL / data pipelines', 'Docker'], niceToHave: ['LLM fine-tuning', 'Kaggle', 'Open-source contributions'] };
  if (t.includes('backend') || t.includes('back-end'))
    return { mustHave: ['Node.js or Python', 'REST API design', 'PostgreSQL / MySQL', 'Git & CI/CD'], preferred: ['Redis', 'Microservices', 'Docker'], niceToHave: ['GraphQL', 'Kafka', 'AWS / GCP'] };
  if (t.includes('frontend') || t.includes('front-end') || t.includes('react'))
    return { mustHave: ['React / Next.js', 'TypeScript', 'CSS / Tailwind', 'REST integration'], preferred: ['Zustand / Redux', 'Vitest / Jest', 'Figma handoff'], niceToHave: ['Framer Motion', 'Web accessibility', 'React Native'] };
  if (t.includes('cloud') || t.includes('devops'))
    return { mustHave: ['AWS / Azure / GCP', 'Terraform', 'Linux & networking', 'IAM & security'], preferred: ['Kubernetes', 'CI/CD pipelines', 'Datadog'], niceToHave: ['FinOps', 'Multi-cloud', 'AWS certifications'] };
  if (t.includes('data analyst'))
    return { mustHave: ['SQL', 'Excel / Google Sheets', 'Tableau / Power BI', 'Statistical thinking'], preferred: ['Python (Pandas)', 'Looker', 'A/B testing'], niceToHave: ['dbt', 'Google Analytics', 'Storytelling'] };
  return { mustHave: ['Relevant technical skills', 'Communication', 'Problem solving'], preferred: ['Domain experience', 'Team collaboration'], niceToHave: ['Industry certifications', 'Mentoring ability'] };
}

function getMarketSalary(title: string): { label: string; min: number; max: number } {
  const t = title.toLowerCase();
  if (t.includes('senior') && (t.includes('ai') || t.includes('ml'))) return { label: 'SAR 55K–75K', min: 55000, max: 75000 };
  if (t.includes('ai') || t.includes('ml')) return { label: 'SAR 35K–55K', min: 35000, max: 55000 };
  if (t.includes('senior')) return { label: 'SAR 45K–65K', min: 45000, max: 65000 };
  if (t.includes('cloud') || t.includes('devops')) return { label: 'SAR 40K–60K', min: 40000, max: 60000 };
  return { label: 'SAR 30K–50K', min: 30000, max: 50000 };
}

/* ── Post-a-Job Wizard ───────────────────────────────────────────────────── */
function PostJobWizardCard({ onClose, onFinish, initialData }: {
  onClose: () => void;
  onFinish: (formData: JobFormData) => void;
  initialData?: Partial<JobFormData>;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<JobFormData>({
    title: initialData?.title || '',
    department: initialData?.department || '',
    location: initialData?.location || '',
    employmentType: initialData?.employmentType || '',
    description: initialData?.description || '',
    skills: initialData?.skills || { mustHave: [], preferred: [], niceToHave: [] },
    salaryMin: initialData?.salaryMin || '',
    salaryMax: initialData?.salaryMax || '',
  });
  const [addingSkillTier, setAddingSkillTier] = useState<keyof SkillSet | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const set = (k: keyof JobFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const goNext = () => {
    if (step === 1 && form.title.trim()) {
      setForm((f) => ({
        ...f,
        description: f.description || inferDescription(f.title),
        skills: {
          mustHave: f.skills.mustHave.length ? f.skills.mustHave : inferSkills(f.title).mustHave,
          preferred: f.skills.preferred.length ? f.skills.preferred : inferSkills(f.title).preferred,
          niceToHave: f.skills.niceToHave.length ? f.skills.niceToHave : inferSkills(f.title).niceToHave,
        },
      }));
    }
    setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => s - 1);

  const removeSkill = (skill: string, tier: keyof SkillSet) => {
    setForm((f) => ({ ...f, skills: { ...f.skills, [tier]: f.skills[tier].filter((s) => s !== skill) } }));
  };

  const addSkill = (tier: keyof SkillSet) => {
    const s = newSkill.trim();
    if (!s) return;
    setForm((f) => ({ ...f, skills: { ...f.skills, [tier]: [...f.skills[tier], s] } }));
    setNewSkill(''); setAddingSkillTier(null);
  };

  const market = getMarketSalary(form.title);
  const salaryMinNum = parseInt(form.salaryMin.replace(/\D/g, '')) || 0;
  const salaryMaxNum = parseInt(form.salaryMax.replace(/\D/g, '')) || 0;
  const belowMarket = (salaryMaxNum > 0 && salaryMaxNum < market.min) || (salaryMinNum > 0 && salaryMinNum < market.min * 0.7);

  const handleFinish = () => {
    setSending(true);
    setSendError(null);
    onFinish(form);
    setSending(false);
  };

  const tierLabels: { key: keyof SkillSet; label: string; color: string }[] = [
    { key: 'mustHave', label: 'MUST-HAVE', color: '#1ed25e' },
    { key: 'preferred', label: 'PREFERRED', color: '#51a2ff' },
    { key: 'niceToHave', label: 'NICE-TO-HAVE', color: '#a78bfa' },
  ];

  const step1Valid = form.title.trim().length > 0;

  return (
    <div className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden" style={{ background: 'rgba(15,20,28,0.95)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 'calc(100vh - 180px)' }}>
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-white">Post a job</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-400" style={{ background: i < step ? '#1ed25e' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-5">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-5">
              <p className="text-sm text-white/50">Let&apos;s start with the basics. What role are you hiring for?</p>
              <div>
                <p className="text-sm font-semibold text-white mb-3">Role details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Title', key: 'title' as const, placeholder: 'Eg. Senior Engineer' },
                    { label: 'Department', key: 'department' as const, placeholder: 'Eg. Engineering' },
                    { label: 'Location', key: 'location' as const, placeholder: 'Eg. Riyadh' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className={key === 'title' ? 'col-span-2 sm:col-span-1' : ''}>
                      <label className="block text-xs text-white/45 mb-1.5">{label}</label>
                      <input value={form[key] as string} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-white/45 mb-1.5">Employment Type</label>
                    <div className="relative">
                      <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none appearance-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: form.employmentType ? 'white' : 'rgba(255,255,255,0.2)' }}>
                        <option value="" disabled>Eg. Full Time</option>
                        {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t} style={{ background: '#0f141c' }}>{t}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
              <p className="text-sm text-white/50">I&apos;ve generated a job description for you. You may edit this.</p>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={8}
                className="w-full px-4 py-3 rounded-xl text-sm text-white/85 outline-none resize-none leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
              <p className="text-sm text-white/50">AI has categorized skill requirements. Edit as needed.</p>
              <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {tierLabels.map(({ key, label, color }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[10px] font-semibold tracking-wider" style={{ color }}>{label}</span>
                      </div>
                      {addingSkillTier !== key && (
                        <button onClick={() => setAddingSkillTier(key)} className="flex items-center gap-1 text-[10px] text-white/35 hover:text-white/65 transition-colors">
                          <Plus size={10} /> Add
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.skills[key].map((skill) => (
                        <div key={skill} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/80"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <span>{skill}</span>
                          <button onClick={() => removeSkill(skill, key)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400"><X size={10} /></button>
                        </div>
                      ))}
                      {addingSkillTier === key && (
                        <div className="flex items-center gap-1.5">
                          <input autoFocus value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addSkill(key); if (e.key === 'Escape') { setAddingSkillTier(null); setNewSkill(''); } }}
                            className="px-3 py-1.5 rounded-full text-xs text-white outline-none w-28"
                            style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${color}60` }}
                            placeholder="Skill name" />
                          <button onClick={() => addSkill(key)} className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: color, color: '#0d1117' }}>Add</button>
                          <button onClick={() => { setAddingSkillTier(null); setNewSkill(''); }} className="text-white/30 hover:text-white/60 transition-colors"><X size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
              <p className="text-sm text-white/50">Set the salary range. I&apos;ll check it against market data.</p>
              <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Lower Boundary', key: 'salaryMin' as const, placeholder: 'SAR 1,000' },
                    { label: 'Upper Boundary', key: 'salaryMax' as const, placeholder: 'SAR 5,000' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs text-white/45 mb-1.5">{label}</label>
                      <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  ))}
                </div>
                {belowMarket && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">Below market: {form.title || 'this role'} median is {market.label}. This may reduce your candidate pool by ~40%.</p>
                  </div>
                )}
                {!belowMarket && (form.salaryMin || form.salaryMax) && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(30,210,94,0.08)', border: '1px solid rgba(30,210,94,0.2)' }}>
                    <span className="text-xs text-[#1ed25e]">✓</span>
                    <p className="text-xs text-[#1ed25e] leading-relaxed">Competitive range. Market benchmark: {market.label}.</p>
                  </div>
                )}
                <p className="text-[11px] text-white/30">Market benchmark for {form.title || 'this role'}: {market.label}</p>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3">
              <p className="text-sm text-white/50">Here&apos;s the full description people will see.</p>
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white">{form.title || 'Untitled role'}</p>
                <p className="text-xs text-white/40">{[form.department, form.location, form.salaryMin && form.salaryMax ? `SAR ${form.salaryMin} – ${form.salaryMax}` : market.label].filter(Boolean).join(' · ')}</p>
                <p className="text-sm text-white/70 leading-relaxed mt-1">{form.description}</p>
                {tierLabels.map(({ key, label, color }) =>
                  form.skills[key].length > 0 ? (
                    <div key={key} className="mt-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.skills[key].map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-full text-xs text-white/70" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sendError && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{sendError}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 flex-shrink-0">
          {step > 1 ? (
            <button onClick={goBack} disabled={sending} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back
            </button>
          ) : <div />}
          <button
            onClick={step === TOTAL_STEPS ? handleFinish : goNext}
            disabled={(step === 1 && !step1Valid) || sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all"
            style={{ background: ((step === 1 && !step1Valid) || sending) ? 'rgba(30,210,94,0.4)' : '#1ed25e' }}>
            {step === TOTAL_STEPS
              ? sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Finish'
              : <>'Continue' <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Nav tab type ────────────────────────────────────────────────────────── */
type NavTab = 'home' | 'hiring' | 'workforce';

/* ── Review-applicants UI data types ─────────────────────────────────────── */
interface CandidateCard {
  id: string; name: string; title: string; location: string;
  experienceYears: number; matchScore: number; skills: string[];
}

interface ApplicantsViewData {
  jobTitle: string; jobMeta: string; jobId: string;
  totalApplicants: number; closeMatchCount: number;
  recommended: CandidateCard[]; suggestions: CandidateCard[];
}

interface CandidateDetailData {
  id: string; name: string; title: string; location: string;
  experienceYears: number; matchScore: number; skills: string[]; jobTitle: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  type?: 'text' | 'job-posted' | 'applicants-view' | 'candidate-detail';
  job?: PostedJob;
  options?: string[];
  jobCard?: {
    title: string; location: string; description: string;
    skills: string[]; mustHave: string[]; preferred: string[]; niceToHave: string[];
  };
  applicantsView?: ApplicantsViewData;
  candidateDetail?: CandidateDetailData;
}

interface PromptStepOptions { step1: string[]; step2: string[]; step3: string[] }

/* ── Employer prompt loader ──────────────────────────────────────────────── */
async function loadEmployerPrompt(): Promise<string> {
  const res = await fetch('/prompts/speak-llm-system-prompt.md');
  if (!res.ok) throw new Error('Failed to load speak-llm-system-prompt.md');
  return await res.text();
}

/* ── Parsing helpers ─────────────────────────────────────────────────────── */
function parseInlineOptions(text: string): { displayText: string; options: string[] } {
  const match = text.match(/`?\[OPTIONS:\s*([^\]]+)\]\s*`?/i);
  if (!match) return { displayText: text, options: [] };
  const options = match[1].split('|').map((s) => s.trim()).filter(Boolean);
  const displayText = text.replace(/`?\[OPTIONS:[^\]]*\]\s*`?/gi, '').trim();
  return { displayText, options };
}

function extractOptionsFromPrompt(promptText: string): PromptStepOptions {
  const getStepOptions = (stepNum: number): string[] => {
    const pattern = new RegExp(`\\*\\*Step\\s+${stepNum}[^*]*\\*\\*[\\s\\S]{0,600}?\\[OPTIONS:\\s*([^\\]]+)\\]`, 'i');
    const match = promptText.match(pattern);
    if (!match) return [];
    return match[1].split('|').map((s) => s.trim()).filter(Boolean);
  };
  return { step1: getStepOptions(1), step2: getStepOptions(2), step3: getStepOptions(3) };
}

function resolveFallbackOptions(text: string, opts: PromptStepOptions): string[] {
  if (/what role|which role|role are you (hiring|looking)|role.*hire for/i.test(text)) return opts.step1;
  if (/experience level are you looking|what experience level|experience level.*looking/i.test(text)) return opts.step2;
  if (/where is this .* role based|where is this role based|role based\?/i.test(text)) return opts.step3;
  return [];
}

const REVIEW_APPLICANTS_FOLLOW_UP_OPTIONS = ['Detailed analysis', 'Help creating a shortlist', 'Something else'];

function parseViewApplicants(text: string): { displayText: string; jobTitle: string | null; postingId: string | null } {
  const block = text.match(/`?\[VIEW_APPLICANTS:\s*([^\]]+)\]\s*`?/i);
  if (!block) return { displayText: text, jobTitle: null, postingId: null };
  const inner = block[1].trim();
  const jtQuoted = inner.match(/job_title\s*=\s*"([^"]*)"/i);
  const jtUnquoted = inner.match(/job_title\s*=\s*([^\s|]+)/i);
  const jobTitle = (jtQuoted?.[1] ?? jtUnquoted?.[1])?.trim() ?? null;
  const pidQuoted = inner.match(/posting_id\s*=\s*"([^"]*)"/i);
  const pidUnquoted = inner.match(/posting_id\s*=\s*([^\s\]]+)/i);
  const postingId = (pidQuoted?.[1] ?? pidUnquoted?.[1])?.trim() || null;
  const displayText = text.replace(/`?\[VIEW_APPLICANTS:[^\]]*\]`?/gi, '').trim();
  return { displayText, jobTitle, postingId };
}

function parseCandidateDetail(text: string): { displayText: string; candidateName: string | null; postingId: string | null } {
  const block = text.match(/`?\[CANDIDATE_DETAIL:\s*([^\]]+)\]\s*`?/i);
  if (!block) return { displayText: text, candidateName: null, postingId: null };
  const inner = block[1].trim();
  const cnQuoted = inner.match(/candidate_name\s*=\s*"([^"]*)"/i);
  const cnUnquoted = inner.match(/candidate_name\s*=\s*([^\s|]+)/i);
  const candidateName = (cnQuoted?.[1] ?? cnUnquoted?.[1])?.trim() ?? null;
  const pidQuoted = inner.match(/posting_id\s*=\s*"([^"]*)"/i);
  const pidUnquoted = inner.match(/posting_id\s*=\s*([^\s\]]+)/i);
  const postingId = (pidQuoted?.[1] ?? pidUnquoted?.[1])?.trim() || null;
  const displayText = text.replace(/`?\[CANDIDATE_DETAIL:[^\]]*\]`?/gi, '').trim();
  return { displayText, candidateName, postingId };
}

function parseJobData(text: string): { displayText: string; jobCard: NonNullable<ChatMessage['jobCard']> | null } {
  const match = text.match(/`?\[JOB_DATA:\s*([\s\S]*?)\]`?/i);
  if (!match) return { displayText: text, jobCard: null };
  const displayText = text.replace(/`?\[JOB_DATA:[\s\S]*?\]`?/gi, '').replace(/[\s([{]*$/, '').replace(/[)\]}`]+$/, '').trim();
  const raw = match[1];
  const get = (key: string) => {
    const quoted = raw.match(new RegExp(`${key}="([^"]*)"`, 'i'));
    if (quoted) return quoted[1].trim();
    const unquoted = raw.match(new RegExp(`${key}=([^|\\]]+)`, 'i'));
    return unquoted ? unquoted[1].trim() : '';
  };
  const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const title = get('title').replace(/\s*\(\d+[–\-+]?\d*\s*yrs?\)/gi, '').replace(/\s+/g, ' ').trim();
  if (!title || /^\[|seniority|role name/i.test(title)) return { displayText: text, jobCard: null };
  const location = get('location') || 'Remote';
  const description = get('description');
  const mustHave = parseList(get('must_have'));
  const preferred = parseList(get('preferred'));
  const niceToHave = parseList(get('nice_to_have'));
  return { displayText, jobCard: { title, location, description, skills: mustHave.slice(0, 3), mustHave, preferred, niceToHave } };
}

function statusToMatchScore(status: string): number {
  if (status === 'shortlisted') return 92;
  if (status === 'reviewing') return 85;
  return 74;
}

function applicationToCandidateCard(a: ApplicationWithProfileResponse, fallbackJobTitle: string): CandidateCard {
  const p = a.candidate_profile as Record<string, unknown> | null | undefined;
  let experienceYears = 3;
  if (p && typeof p.experience_years === 'number') experienceYears = p.experience_years;
  const skills: string[] = [];
  if (p && Array.isArray(p.skills)) {
    for (const s of p.skills as { name?: string }[]) { if (s?.name) skills.push(s.name); }
  }
  let title = fallbackJobTitle;
  if (p && Array.isArray(p.experience) && p.experience.length > 0) {
    const ex0 = p.experience[0] as { title?: string };
    if (ex0?.title) title = ex0.title;
  }
  let location = '—';
  if (p?.city) location = String(p.city);
  else if (p?.location) location = String(p.location);
  return { id: a.candidate_id, name: a.candidate_name ?? 'Candidate', title, location, experienceYears, matchScore: statusToMatchScore(a.status), skills: skills.slice(0, 12) };
}

function buildApplicantsViewData(postingId: string, jobTitle: string, jobMeta: string, res: ApplicationWithProfileListResponse): ApplicantsViewData {
  const items = res.items;
  let recommended = items.filter((x) => x.status === 'shortlisted' || x.status === 'reviewing').map((x) => applicationToCandidateCard(x, jobTitle));
  let suggestions = items.filter((x) => x.status === 'applied').map((x) => applicationToCandidateCard(x, jobTitle));
  if (recommended.length === 0 && suggestions.length === 0 && items.length > 0) {
    recommended = items.map((x) => applicationToCandidateCard(x, jobTitle));
  }
  const shortlisted = items.filter((x) => x.status === 'shortlisted' || x.status === 'reviewing').length;
  const closeMatchCount = shortlisted > 0 ? shortlisted : Math.min(3, items.length);
  return { jobTitle, jobMeta: jobMeta || `${items.length} applicants`, jobId: postingId, totalApplicants: res.total, closeMatchCount, recommended, suggestions };
}

/* ── Sidebar icons ───────────────────────────────────────────────────────── */
const sidebarIcons = [
  { icon: Search, label: 'Search' },
  { icon: MapPin, label: 'Locations' },
  { icon: Mail, label: 'Messages' },
  { icon: GraduationCap, label: 'Training' },
  { icon: Plus, label: 'New' },
];

/* ── Action card ─────────────────────────────────────────────────────────── */
function ActionCard({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left flex-1 min-w-0"
      style={{
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: hovered ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.08)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span style={{ color, background: `${color}18`, borderRadius: 8, padding: '5px 6px', display: 'flex', alignItems: 'center' }} className="flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium text-white truncate">{label}</span>
      </div>
      <ArrowRight size={13} className="flex-shrink-0 text-white/25" />
    </button>
  );
}

/* ── Suggestion chip ─────────────────────────────────────────────────────── */
function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-200 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {label}
    </button>
  );
}

/* ── Circular match-score badge ──────────────────────────────────────────── */
function ScoreCircle({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 85 ? '#1ed25e' : score >= 70 ? '#51a2ff' : '#f97316';
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42 }}>
      <svg width="42" height="42" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="absolute font-bold text-white" style={{ fontSize: 11, color }}>{score}</span>
    </div>
  );
}

/* ── Single applicant card tile ──────────────────────────────────────────── */
function ApplicantCardTile({ c, onSelect }: { c: CandidateCard; onSelect: (c: CandidateCard) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={() => onSelect(c)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="flex flex-col gap-2.5 p-3 rounded-xl transition-all duration-150 text-left w-full"
      style={{ background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'}` }}>
      <div className="flex items-start gap-2">
        <div className="size-[34px] rounded-xl flex items-center justify-center font-semibold text-white flex-shrink-0 text-xs"
          style={{ background: '#1a3a5c', fontSize: Math.round(34 * 0.3) }}>
          {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-snug truncate">{c.name}</p>
          <p className="text-[11px] text-white/50 mt-0.5 leading-snug truncate">{c.title}</p>
        </div>
        <ScoreCircle score={c.matchScore} />
      </div>
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <span className="flex items-center gap-0.5"><MapPin size={8} />{c.location}</span>
        <span>{c.experienceYears} yrs</span>
      </div>
    </button>
  );
}

/* ── Paginated applicant section ─────────────────────────────────────────── */
function ApplicantSection({ label, count, candidates, onSelect }: { label: string; count: number; candidates: CandidateCard[]; onSelect: (c: CandidateCard) => void }) {
  const [page, setPage] = useState(0);
  const PAGE = 3;
  const pages = Math.ceil(candidates.length / PAGE);
  const slice = candidates.slice(page * PAGE, (page + 1) * PAGE);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{label}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>{count}</span>
        </div>
        {pages > 1 && (
          <div className="flex gap-0.5">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 disabled:opacity-20 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              ‹
            </button>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 disabled:opacity-20 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              ›
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slice.map((c) => <ApplicantCardTile key={c.id} c={c} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

/* ── Applicants view message ─────────────────────────────────────────────── */
function ApplicantsViewMessage({ data, onCandidateSelect }: { data: ApplicantsViewData; onCandidateSelect: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 540 }}>
      <div className="rounded-xl px-4 py-3 flex items-start justify-between" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <div>
          <p className="text-sm font-semibold text-white">{data.jobTitle}</p>
          <p className="text-xs text-white/40 mt-0.5">{data.jobMeta}</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5" style={{ background: 'rgba(30,210,94,0.12)', color: '#1ed25e', border: '1px solid rgba(30,210,94,0.2)' }}>Screening</span>
      </div>
      <ul className="text-xs text-white/60 leading-relaxed space-y-1 list-none pl-0">
        <li>• Of {data.totalApplicants} applicants, there are {data.closeMatchCount} close matches I&apos;d recommend considering.</li>
        {data.suggestions.length > 0 && <li>• I&apos;ve also found {data.suggestions.length} additional candidates who are a strong fit.</li>}
      </ul>
      {data.recommended.length > 0 && <ApplicantSection label="Recommended applicants" count={data.recommended.length} candidates={data.recommended} onSelect={(c) => onCandidateSelect(`Tell me more about ${c.name}`)} />}
      {data.suggestions.length > 0 && <ApplicantSection label="AI suggestions — invite to apply" count={data.suggestions.length} candidates={data.suggestions} onSelect={(c) => onCandidateSelect(`Tell me more about ${c.name}`)} />}
    </div>
  );
}

/* ── Candidate detail card ───────────────────────────────────────────────── */
function CandidateDetailCard({ data }: { data: CandidateDetailData }) {
  return (
    <div className="rounded-xl p-4 w-full" style={{ maxWidth: 300, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-xl flex items-center justify-center font-semibold text-white flex-shrink-0" style={{ background: '#1a3a5c', fontSize: 13 }}>
          {data.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{data.name}</p>
              <p className="text-xs text-white/50 mt-0.5 leading-tight truncate">{data.title}</p>
            </div>
            <ScoreCircle score={data.matchScore} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            <span className="flex items-center gap-1"><MapPin size={9} />{data.location}</span>
            <span>{data.experienceYears} yrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Chat input bar ──────────────────────────────────────────────────────── */
function ChatInputBar({ onSend, waiting = false, placeholder = 'Ask anything' }: { onSend: (text: string) => void; waiting?: boolean; placeholder?: string }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const msg = value.trim();
    if (!msg || waiting) return;
    onSend(msg);
    setValue('');
  };
  return (
    <div className="rounded-2xl overflow-hidden w-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
      <div className="px-4 pt-3 pb-1">
        <input type="text" value={value} disabled={waiting} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={placeholder} className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none disabled:cursor-wait" />
      </div>
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <Plus size={14} />
        </button>
        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div key="spin" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Loader2 size={15} className="animate-spin text-[#1ed25e]" />
            </motion.div>
          ) : value.trim() ? (
            <motion.button key="send" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={submit} className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: '#1ed25e' }}>
              <ArrowUp size={14} />
            </motion.button>
          ) : (
            <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-7 h-7 flex items-center justify-center text-white/35">
              <MessageCircle size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Job card in chat ────────────────────────────────────────────────────── */
function JobCardMessage({ jobCard, onConfirm }: { jobCard: NonNullable<ChatMessage['jobCard']>; onConfirm: () => void }) {
  const tierLabels = [
    { key: 'mustHave' as const, label: 'MUST-HAVE', color: '#1ed25e' },
    { key: 'preferred' as const, label: 'PREFERRED', color: '#51a2ff' },
    { key: 'niceToHave' as const, label: 'NICE-TO-HAVE', color: '#a78bfa' },
  ];
  return (
    <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 400 }}>
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <div>
          <p className="text-sm font-semibold text-white">{jobCard.title}</p>
          <p className="text-xs text-white/40 mt-0.5">{jobCard.location}</p>
        </div>
        {jobCard.description && <p className="text-xs text-white/60 leading-relaxed">{jobCard.description}</p>}
        {tierLabels.map(({ key, label, color }) =>
          jobCard[key].length > 0 ? (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {jobCard[key].map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full text-xs text-white/70" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>{s}</span>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
      <button onClick={onConfirm} className="self-start px-4 py-2 rounded-xl text-sm font-semibold text-black transition-all hover:scale-[1.02]" style={{ background: '#1ed25e' }}>
        Create job posting
      </button>
    </div>
  );
}

/* ── Hiring tab with sub-navigation ──────────────────────────────────────── */
interface SelectedJob { id: string; title: string; department: string; location: string; status: string; posted_at?: string }

function toRelativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return `${Math.floor(diff / 2592000)}mo`;
}

function toSidebarJobs(apiJobs: JobPostingResponse[]): SidebarJob[] {
  return apiJobs.map((j) => ({
    id: j.id, title: j.title, department: j.department || undefined,
    location: j.location || undefined, postedAt: toRelativeDate(j.created_at), status: j.status,
  }));
}

function HiringTabContent({ onPostJob }: { onPostJob: () => void }) {
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  const [apiJobs, setApiJobs] = useState<JobPostingResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setJobsLoading(true);
    fetch('/api/invoke/list_job_postings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 50, offset: 0 }) })
      .then((r) => { if (!r.ok) throw new Error(`list_job_postings failed (${r.status})`); return r.json(); })
      .then((data) => { if (!cancelled) setApiJobs(data.items ?? []); })
      .catch((e: unknown) => console.error('[HiringTabContent] fetch jobs:', e))
      .finally(() => { if (!cancelled) setJobsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sidebarJobs = toSidebarJobs(apiJobs);

  if (selectedJob) {
    return (
      <JobPostingTemplate
        jobPosting={selectedJob} postingId={selectedJob.id}
        onNavigateToHiring={() => setSelectedJob(null)}
        jobs={sidebarJobs}
        onSelectJob={(id, job) => setSelectedJob({ id, title: job.title, department: job.department || '', location: job.location || '', status: job.status, posted_at: job.postedAt })}
      />
    );
  }

  return <HiringPage onSelectJob={(id, job) => setSelectedJob({ id, ...job })} onPostJob={onPostJob} apiJobs={apiJobs} apiJobsLoading={jobsLoading} />;
}

function WorkforceTabContent() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'rgba(81,162,255,0.1)', border: '1px solid rgba(81,162,255,0.2)' }}>
        <BookOpen size={28} className="text-[#51a2ff]" />
      </div>
      <h3 className="text-lg font-semibold text-white">Workforce Development</h3>
      <p className="text-sm text-white/40 text-center max-w-xs">Track training programs, skill coverage, and employee development across your organisation.</p>
      <button className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'rgba(81,162,255,0.1)', border: '1px solid rgba(81,162,255,0.2)' }}>
        View training programs
      </button>
    </div>
  );
}

/* ── Main EmployerDashboard ──────────────────────────────────────────────── */
export interface EmployerDashboardProps {
  onBack?: () => void;
}

export function EmployerDashboard({ onBack }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<Partial<JobFormData> | undefined>();
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([]);
  const [promptOptions, setPromptOptions] = useState<PromptStepOptions>({ step1: [], step2: [], step3: [] });
  const [lastPostingId, setLastPostingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const promptSentRef = useRef(false);

  // LiveKit store bindings
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const transcripts = useVoiceSessionStore((s) => s.transcripts);
  const connect = useVoiceSessionStore((s) => s.connect);
  const sendTextMessage = useVoiceSessionStore((s) => s.sendTextMessage);
  const informAgent = useVoiceSessionStore((s) => s.informAgent);

  // Load prompt + options on mount, then connect
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__employerMode = true;
    const init = async () => {
      try {
        const prompt = await loadEmployerPrompt();
        setPromptOptions(extractOptionsFromPrompt(prompt));
        await connect();
      } catch (e) {
        console.error('[EmployerDashboard] session init failed:', e);
        setSessionError('Could not connect to AI assistant. Please refresh.');
      }
    };
    init();
    return () => {
      (window as unknown as Record<string, unknown>).__employerMode = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once connected, inject the employer system prompt via informAgent (once only)
  useEffect(() => {
    if (sessionState !== 'connected' || promptSentRef.current) return;
    promptSentRef.current = true;
    setSessionReady(true);
    loadEmployerPrompt()
      .then((prompt) => informAgent(`[SYSTEM CONTEXT — EMPLOYER MODE]\n${prompt}`))
      .catch((e) => console.warn('[EmployerDashboard] prompt inject failed:', e));
  }, [sessionState, informAgent]);

  // Surface session errors from the store
  useEffect(() => {
    if (sessionState === 'error') {
      setSessionError('Could not connect to AI assistant. Please refresh.');
    }
  }, [sessionState]);

  // Register cacheJobApplicants site function
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.cacheJobApplicants = (postingId: string, data: unknown) => {
      cacheJobApplicantsFromTool(postingId, data);
    };
    return () => { delete w.cacheJobApplicants; };
  }, []);

  // Convert final agent transcripts into chat messages
  const processedTranscriptIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const agentEntries = transcripts.filter(
      (t) => t.isAgent && t.isFinal && !processedTranscriptIdsRef.current.has(t.id),
    );
    if (agentEntries.length === 0) return;

    for (const entry of agentEntries) {
      processedTranscriptIdsRef.current.add(entry.id);
      const rawText = entry.text;

      const { displayText: afterViewApplicants, jobTitle: vaJobTitle, postingId: vaPostingId } = parseViewApplicants(rawText);
      const { displayText: afterCandidateDetail, candidateName: cdName, postingId: cdPostingId } = parseCandidateDetail(rawText);
      const { displayText: afterJobData, jobCard } = parseJobData(rawText);
      const { displayText: cleanText, options } = parseInlineOptions(afterJobData);

      let type: ChatMessage['type'] = 'text';
      let applicantsView: ApplicantsViewData | undefined;
      let candidateDetail: CandidateDetailData | undefined;

      if (vaJobTitle && vaPostingId) {
        type = 'applicants-view';
        const cached = getCachedJobApplicants(vaPostingId);
        if (cached) {
          applicantsView = buildApplicantsViewData(vaPostingId, vaJobTitle, `${cached.total} applicants`, cached);
        }
        setLastPostingId(vaPostingId);
      } else if (cdName) {
        type = 'candidate-detail';
        const postingId = cdPostingId || lastPostingId;
        const cached = postingId ? getCachedJobApplicants(postingId) : null;
        if (cached) {
          const found = cached.items.find((item) => item.candidate_name?.toLowerCase().includes(cdName.toLowerCase()));
          if (found) {
            const p = found.candidate_profile as Record<string, unknown> | null | undefined;
            const skills: string[] = [];
            if (p && Array.isArray(p.skills)) {
              for (const s of p.skills as { name?: string }[]) { if (s?.name) skills.push(s.name); }
            }
            let title = vaJobTitle || 'Candidate';
            if (p && Array.isArray(p.experience) && p.experience.length > 0) {
              const ex0 = p.experience[0] as { title?: string };
              if (ex0?.title) title = ex0.title;
            }
            candidateDetail = {
              id: found.candidate_id, name: found.candidate_name ?? cdName, title,
              location: (p?.city as string) || (p?.location as string) || '—',
              experienceYears: (p?.experience_years as number) || 3,
              matchScore: statusToMatchScore(found.status), skills: skills.slice(0, 8), jobTitle: vaJobTitle || '',
            };
          }
        }
        if (!candidateDetail) {
          candidateDetail = { id: cdName, name: cdName, title: 'Candidate', location: '—', experienceYears: 3, matchScore: 80, skills: [], jobTitle: vaJobTitle || '' };
        }
      }

      const fallbackOpts = resolveFallbackOptions(cleanText, promptOptions);
      const finalOptions = options.length > 0 ? options : (type === 'applicants-view' ? REVIEW_APPLICANTS_FOLLOW_UP_OPTIONS : fallbackOpts);

      const msg: ChatMessage = {
        id: entry.id,
        role: 'assistant',
        text: cleanText || afterViewApplicants || afterCandidateDetail,
        type,
        options: finalOptions.length > 0 ? finalOptions : undefined,
        jobCard: jobCard || undefined,
        applicantsView,
        candidateDetail,
      };
      setMessages((prev) => [...prev, msg]);
      setWaiting(false);
    }
  }, [transcripts, promptOptions, lastPostingId]);

  // Also track user transcripts to show them in chat
  const processedUserTranscriptIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const userEntries = transcripts.filter(
      (t) => !t.isAgent && t.isFinal && t.participant === 'user' && !processedUserTranscriptIdsRef.current.has(t.id),
    );
    if (userEntries.length === 0) return;
    for (const entry of userEntries) {
      processedUserTranscriptIdsRef.current.add(entry.id);
      setMessages((prev) => {
        // Avoid duplicates (handleSend already adds user messages optimistically)
        if (prev.some((m) => m.id === entry.id || (m.role === 'user' && m.text === entry.text))) return prev;
        return [...prev, { id: entry.id, role: 'user', text: entry.text }];
      });
    }
  }, [transcripts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback((text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setWaiting(true);
    sendTextMessage(text);
  }, [sendTextMessage]);

  const handleOptionClick = useCallback((option: string) => {
    handleSend(option);
  }, [handleSend]);

  const handleJobCardConfirm = useCallback((jobCard: NonNullable<ChatMessage['jobCard']>) => {
    setWizardInitialData({
      title: jobCard.title,
      location: jobCard.location,
      description: jobCard.description,
      skills: { mustHave: jobCard.mustHave, preferred: jobCard.preferred, niceToHave: jobCard.niceToHave },
    });
    setShowWizard(true);
  }, []);

  const handleWizardFinish = useCallback((formData: JobFormData) => {
    setShowWizard(false);
    const newJob: PostedJob = { title: formData.title, department: formData.department, location: formData.location, postedAt: new Date() };
    setPostedJobs((prev) => [...prev, newJob]);
    const details = [
      `title: ${formData.title}`,
      formData.department && `department: ${formData.department}`,
      formData.location && `location: ${formData.location}`,
      formData.employmentType && `employment_type: ${formData.employmentType}`,
      formData.description && `description: ${formData.description}`,
      formData.skills.mustHave.length && `must_have: ${formData.skills.mustHave.join(', ')}`,
      formData.skills.preferred.length && `preferred: ${formData.skills.preferred.join(', ')}`,
      formData.skills.niceToHave.length && `nice_to_have: ${formData.skills.niceToHave.join(', ')}`,
      formData.salaryMin && `salary_min: ${formData.salaryMin}`,
      formData.salaryMax && `salary_max: ${formData.salaryMax}`,
      'posted_by: Omar S.',
    ].filter(Boolean).join('\n');
    sendTextMessage(`Create job posting with the following details:\n${details}`);
    setWaiting(true);
  }, [sendTextMessage]);

  const SUGGESTIONS = ['Post a job', 'Review applicants', 'Hiring insights', 'Workforce training'];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0e16', color: 'white' }}>
      {/* Sidebar */}
      <div className="w-16 flex flex-col items-center py-6 gap-6 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1ed25e, #51a2ff)' }}>
          <Building2 size={16} className="text-white" />
        </div>
        <div className="flex flex-col gap-4 flex-1">
          {sidebarIcons.map(({ icon: Icon, label }) => (
            <button key={label} title={label} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
              <Icon size={18} />
            </button>
          ))}
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2e5e50)' }}>OS</div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top nav */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-6">
            {onBack && (
              <button onClick={onBack} className="text-white/40 hover:text-white transition-colors text-sm">← Back</button>
            )}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {([
                { id: 'home', label: 'Home', icon: Building2 },
                { id: 'hiring', label: 'Hiring', icon: Users },
                { id: 'workforce', label: 'Workforce', icon: UserCheck },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={activeTab === id ? { background: 'rgba(255,255,255,0.1)', color: 'white' } : { color: 'rgba(255,255,255,0.45)' }}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/40">Omar S.</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2e5e50)' }}>OS</div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-1 min-h-0 overflow-hidden">
                {/* Chat panel */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
                    {messages.length === 0 && !sessionReady && !sessionError && (
                      <div className="flex items-center justify-center flex-1">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={24} className="animate-spin text-[#1ed25e]" />
                          <p className="text-sm text-white/40">Connecting to AI assistant…</p>
                        </div>
                      </div>
                    )}
                    {sessionError && (
                      <div className="flex items-center justify-center flex-1">
                        <p className="text-sm text-red-400">{sessionError}</p>
                      </div>
                    )}
                    {messages.length === 0 && sessionReady && (
                      <div className="flex flex-col items-start gap-6 flex-1 justify-end pb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">Good morning, Omar.</h2>
                          <p className="text-white/40 text-sm">What would you like to work on today?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                          <ActionCard icon={<Plus size={16} />} label="Post a job" color="#1ed25e" onClick={() => handleSend('Post a job')} />
                          <ActionCard icon={<Users size={16} />} label="Review applicants" color="#51a2ff" onClick={() => handleSend('Review applicants')} />
                          <ActionCard icon={<UserCheck size={16} />} label="Hiring insights" color="#a78bfa" onClick={() => handleSend('Hiring insights')} />
                          <ActionCard icon={<BookOpen size={16} />} label="Workforce training" color="#f97316" onClick={() => handleSend('Workforce training')} />
                        </div>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: 'linear-gradient(135deg, #1ed25e, #51a2ff)' }}>
                            <Building2 size={14} className="text-white" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2 max-w-[80%]">
                          {msg.role === 'user' ? (
                            <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                              {msg.text}
                            </div>
                          ) : (
                            <>
                              {msg.text && (
                                <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-white/85 leading-relaxed" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  {msg.text}
                                </div>
                              )}
                              {msg.type === 'applicants-view' && msg.applicantsView && (
                                <ApplicantsViewMessage data={msg.applicantsView} onCandidateSelect={handleSend} />
                              )}
                              {msg.type === 'candidate-detail' && msg.candidateDetail && (
                                <CandidateDetailCard data={msg.candidateDetail} />
                              )}
                              {msg.jobCard && (
                                <JobCardMessage jobCard={msg.jobCard} onConfirm={() => handleJobCardConfirm(msg.jobCard!)} />
                              )}
                              {msg.options && msg.options.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {msg.options.map((opt) => (
                                    <SuggestionChip key={opt} label={opt} onClick={() => handleOptionClick(opt)} />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {waiting && (
                      <div className="flex justify-start gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1ed25e, #51a2ff)' }}>
                          <Building2 size={14} className="text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40"
                                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestions + input */}
                  <div className="px-6 pb-6 flex flex-col gap-3 flex-shrink-0">
                    {messages.length === 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {SUGGESTIONS.map((s) => <SuggestionChip key={s} label={s} onClick={() => handleSend(s)} />)}
                      </div>
                    )}
                    <ChatInputBar onSend={handleSend} waiting={waiting} placeholder="Ask about hiring, applicants, or workforce…" />
                  </div>
                </div>

                {/* Right panel — posted jobs */}
                {postedJobs.length > 0 && (
                  <div className="w-72 flex-shrink-0 border-l border-white/6 p-5 overflow-y-auto flex flex-col gap-4">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recently Posted</p>
                    {postedJobs.map((job, i) => (
                      <div key={i} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-sm font-semibold text-white">{job.title}</p>
                        <p className="text-xs text-white/40">{[job.department, job.location].filter(Boolean).join(' · ')}</p>
                        <p className="text-[10px] text-[#1ed25e] mt-1">Posted {job.postedAt.toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'hiring' && (
              <motion.div key="hiring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 min-h-0 overflow-hidden">
                <HiringTabContent onPostJob={() => setShowWizard(true)} />
              </motion.div>
            )}

            {activeTab === 'workforce' && (
              <motion.div key="workforce" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <WorkforceTabContent />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Post-a-Job wizard overlay */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowWizard(false); }}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <PostJobWizardCard
                onClose={() => setShowWizard(false)}
                onFinish={handleWizardFinish}
                initialData={wizardInitialData}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
