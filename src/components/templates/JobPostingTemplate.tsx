'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Star, Sparkles } from 'lucide-react';
import { JobCandidateView, type ApplicantWithScore } from './JobCandidateView';
import { Breadcrumb } from '../employer/Breadcrumb';
import { JobPostingSidebar, type SidebarJob } from '../employer/JobPostingSidebar';

interface CandidateSkill {
  name: string;
  level: string;
  years: number;
}

interface CandidateProfile {
  id: string;
  name: string;
  city?: string;
  location?: string;
  experience_years?: number;
  skills: CandidateSkill[];
  experience?: Array<{ title?: string; company?: string; years?: number }>;
  education?: Array<{ degree?: string; institution?: string; field_of_study?: string; graduation_year?: number }>;
  job_preferences?: string[];
}

interface Applicant {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  candidate_name: string | null;
  status: 'applied' | 'reviewing' | 'shortlisted' | 'rejected';
  applied_at: string;
  updated_at: string;
  candidate_profile?: CandidateProfile;
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  posted_at?: string;
}

interface JobPostingTemplateProps {
  jobPosting?: JobPosting;
  postingId?: string;
  onNavigateToHiring?: () => void;
  jobs?: SidebarJob[];
  onSelectJob?: (id: string, job: SidebarJob) => void;
}

const MOCK_JOB_POSTING: JobPosting = {
  id: 'job_004',
  title: 'Senior AI Developer',
  department: 'Engineering',
  location: 'Jeddah',
  status: 'active',
  posted_at: '2d ago',
};

function calculateMatchScore(profile: CandidateProfile): number {
  const skillCount = profile.skills?.length || 0;
  const experienceYears = profile.experience_years || 0;
  const hasEducation = (profile.education?.length || 0) > 0;
  let score = 60;
  score += Math.min(skillCount * 3, 25);
  score += Math.min(experienceYears * 2, 10);
  if (hasEducation) score += 5;
  return Math.min(Math.max(score, 65), 97);
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch {
    return 'recently';
  }
}

function ApplicantCard({
  applicant,
  delay = 0,
  compact = false,
  onClick,
}: {
  applicant: Applicant & { matchScore?: number };
  delay?: number;
  compact?: boolean;
  onClick?: (id: string) => void;
}) {
  const profile = applicant.candidate_profile;
  const name = applicant.candidate_name || profile?.name || 'Unknown';
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const title = profile?.experience?.[0]?.title || 'AI Practitioner';
  const matchScore = applicant.matchScore || Math.floor(Math.random() * 20) + 75;
  const topSkills = profile?.skills?.slice(0, 3) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => onClick?.(applicant.id)}
        className="w-full text-left rounded-2xl p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="size-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: 'linear-gradient(135deg, #1ed25e 0%, #51a2ff 100%)', color: 'white' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white text-base font-semibold truncate">{name}</p>
              {applicant.status === 'shortlisted' && (
                <Star size={14} className="text-[#1ed25e] fill-[#1ed25e] shrink-0" />
              )}
            </div>
            <p className="text-white/50 text-sm truncate">{title}</p>
          </div>
          <div
            className="size-11 rounded-full flex items-center justify-center shrink-0 font-bold text-base"
            style={{
              background: matchScore >= 90 ? 'rgba(52,211,153,0.15)' : matchScore >= 80 ? 'rgba(81,162,255,0.15)' : 'rgba(251,191,36,0.15)',
              border: matchScore >= 90 ? '2px solid rgba(52,211,153,0.4)' : matchScore >= 80 ? '2px solid rgba(81,162,255,0.4)' : '2px solid rgba(251,191,36,0.4)',
              color: matchScore >= 90 ? '#34d399' : matchScore >= 80 ? '#51a2ff' : '#fbbf24',
            }}
          >
            {matchScore}
          </div>
        </div>
        {!compact && topSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <span key={skill.name} className="px-2.5 py-1 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                {skill.name}
              </span>
            ))}
          </div>
        )}
        {!compact && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-white/30">Applied {formatRelativeTime(applicant.applied_at)}</span>
            <ChevronRight size={16} className="text-white/30" />
          </div>
        )}
      </button>
    </motion.div>
  );
}

export function JobPostingTemplate({ jobPosting, postingId, onNavigateToHiring, jobs, onSelectJob }: JobPostingTemplateProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'screened' | 'shortlist' | 'interview' | 'hire'>('screened');
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);

  const posting = {
    ...MOCK_JOB_POSTING,
    ...Object.fromEntries(Object.entries(jobPosting || {}).filter(([, v]) => v != null && v !== '')),
  } as JobPosting;
  const effectivePostingId = postingId || posting.id;

  useEffect(() => {
    const fetchForPosting = async (pid: string) => {
      try {
        const res = await fetch('/api/invoke/get_job_applicants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posting_id: pid, include_profile: true, limit: 100 }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []) as Applicant[];
      } catch {
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
      } catch (error) {
        console.error('[JobPostingTemplate] Failed to fetch applicants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicants();
  }, [effectivePostingId]);

  const stats = useMemo(() => ({
    screened: applicants.filter((a) => a.status === 'applied' || a.status === 'reviewing').length,
    shortlist: applicants.filter((a) => a.status === 'shortlisted').length,
    interview: 0,
    hire: 0,
  }), [applicants]);

  const recommendedApplicants = useMemo(() =>
    applicants.filter((a) => a.candidate_profile)
      .map((a) => ({ ...a, matchScore: calculateMatchScore(a.candidate_profile!) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6),
    [applicants],
  );

  const aiSuggestions = useMemo(() =>
    applicants.filter((a) => a.candidate_profile)
      .map((a) => ({ ...a, matchScore: calculateMatchScore(a.candidate_profile!) }))
      .filter((a) => a.matchScore >= 80)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8),
    [applicants],
  );

  const filteredApplicants = useMemo(() => {
    switch (activeTab) {
      case 'screened': return applicants.filter((a) => a.status === 'applied' || a.status === 'reviewing');
      case 'shortlist': return applicants.filter((a) => a.status === 'shortlisted');
      default: return [];
    }
  }, [applicants, activeTab]);

  const scoredApplicants: ApplicantWithScore[] = useMemo(() =>
    applicants.filter((a) => a.candidate_profile)
      .map((a) => ({ ...a, matchScore: calculateMatchScore(a.candidate_profile!) }))
      .sort((a, b) => b.matchScore - a.matchScore),
    [applicants],
  );

  const handleApplicantClick = useCallback((id: string) => setSelectedApplicantId(id), []);
  const handleBackFromCandidate = useCallback(() => setSelectedApplicantId(null), []);

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

  return (
    <div className="flex h-full overflow-hidden gap-6 p-6">
      {jobs && jobs.length > 0 && (
        <div className="w-72 flex-shrink-0 h-full">
          <JobPostingSidebar jobs={jobs} selectedId={effectivePostingId} onSelect={onSelectJob} />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pb-4 flex-shrink-0">
          <div className="mb-2">
            <Breadcrumb segments={[{ label: 'Hiring', onClick: onNavigateToHiring }, { label: posting.title }]} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{posting.title}</h1>
          <div className="flex items-center gap-3 text-sm text-white/40">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(29,197,88,0.15)', color: '#1ed25e', border: '1px solid rgba(29,197,88,0.3)' }}>
              {posting.status}
            </span>
            {[posting.department, posting.location, posting.posted_at || '2d ago'].filter(Boolean).map((text, i) => (
              <span key={i} className="flex items-center gap-3">
                {i > 0 && <span>•</span>}
                <span>{text}</span>
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="pb-3 flex-shrink-0">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['screened', 'shortlist', 'interview', 'hire'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2"
                style={activeTab === tab ? { background: 'rgba(255,255,255,0.1)', color: 'white' } : { color: 'rgba(255,255,255,0.5)' }}
              >
                <span className="capitalize">{tab}</span>
                <span className="text-xs opacity-70">{stats[tab]}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto pb-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-16">
                <div className="text-white/30 text-sm">Loading applicants...</div>
              </motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6">
                {activeTab === 'screened' && recommendedApplicants.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-[#1ed25e]" />
                        <h2 className="text-base font-semibold text-white">Recommended Applicants</h2>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(29,197,88,0.15)', color: '#1ed25e' }}>
                          {recommendedApplicants.length}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(29,197,88,0.08)', border: '1px solid rgba(29,197,88,0.2)' }}>
                      <p className="text-sm text-[#1ed25e]/80 leading-relaxed">
                        Top applicants ranked by skill match and experience. Review and shortlist the best candidates.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {recommendedApplicants.map((applicant, idx) => (
                        <ApplicantCard key={applicant.id} applicant={applicant} delay={idx * 0.05} onClick={handleApplicantClick} />
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === 'screened' && aiSuggestions.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-[#1ed25e]" />
                        <h2 className="text-base font-semibold text-white">AI Suggestions: Invite to apply</h2>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(29,197,88,0.15)', color: '#1ed25e' }}>
                          {aiSuggestions.length}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(29,197,88,0.08)', border: '1px solid rgba(29,197,88,0.2)' }}>
                      <p className="text-sm text-[#1ed25e]/80 leading-relaxed">
                        Additional candidates with strong skill match scores. Add them to your shortlist and invite them to apply.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {aiSuggestions.map((applicant, idx) => (
                        <ApplicantCard key={applicant.id} applicant={applicant} delay={idx * 0.05} compact onClick={handleApplicantClick} />
                      ))}
                    </div>
                  </section>
                )}

                {filteredApplicants.length === 0 && !loading && activeTab !== 'screened' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Star size={28} className="text-white/20" />
                    </div>
                    <p className="text-white/30 text-sm">No applicants in this stage yet.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
