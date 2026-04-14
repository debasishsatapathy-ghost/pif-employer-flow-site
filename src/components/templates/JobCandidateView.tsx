'use client';

import { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandidateSidebar, type SidebarCandidate, type SidebarJobPosting } from '../employer/CandidateSidebar';
import { CandidateDrawer, type CandidateSection } from '../employer/CandidateDrawer';
import { Breadcrumb } from '../employer/Breadcrumb';

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
}

export interface ApplicantWithScore {
  id: string;
  candidate_name: string | null;
  status: 'applied' | 'reviewing' | 'shortlisted' | 'rejected';
  matchScore: number;
  candidate_profile?: CandidateProfile;
}

export interface JobCandidateViewProps {
  jobPosting: SidebarJobPosting;
  applicants: ApplicantWithScore[];
  selectedId: string;
  onSelectCandidate: (id: string) => void;
  onBack: () => void;
  onNavigateToHiring?: () => void;
}

function buildSections(profile?: CandidateProfile): CandidateSection[] {
  const sections: CandidateSection[] = [];

  if (profile?.skills && profile.skills.length > 0) {
    sections.push({
      label: 'Skills',
      content: (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {profile.skills.map((s) => (
            <span
              key={s.name}
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              {s.name} · {s.years}y
            </span>
          ))}
        </div>
      ),
    });
  }

  if (profile?.experience && profile.experience.length > 0) {
    sections.push({
      label: 'Experience',
      content: (
        <div className="flex flex-col gap-2 mt-2">
          {profile.experience.map((e, i) => (
            <div key={i} className="text-xs text-white/50">
              <span className="text-white font-medium">{e.title || 'Role'}</span>
              {e.company && <span> at {e.company}</span>}
              {e.years != null && <span> · {e.years}y</span>}
            </div>
          ))}
        </div>
      ),
    });
  }

  if (profile?.education && profile.education.length > 0) {
    sections.push({
      label: 'Education',
      content: (
        <div className="flex flex-col gap-2 mt-2">
          {profile.education.map((e, i) => (
            <div key={i} className="text-xs text-white/50">
              <span className="text-white font-medium">{e.degree || 'Degree'}</span>
              {e.institution && <span> · {e.institution}</span>}
              {e.graduation_year && <span> · {e.graduation_year}</span>}
            </div>
          ))}
        </div>
      ),
    });
  }

  return sections;
}

export function JobCandidateView({
  jobPosting,
  applicants,
  selectedId,
  onSelectCandidate,
  onBack,
  onNavigateToHiring,
}: JobCandidateViewProps) {
  const selected = useMemo(
    () => applicants.find((a) => a.id === selectedId),
    [applicants, selectedId],
  );

  const sidebarCandidates = useMemo(
    (): SidebarCandidate[] =>
      applicants.map((a) => ({
        id: a.id,
        name: a.candidate_name ?? a.candidate_profile?.name ?? 'Candidate',
        matchScore: a.matchScore,
        starred: a.status === 'shortlisted',
        status: a.status,
      })),
    [applicants],
  );

  const selectedIdx = useMemo(
    () => applicants.findIndex((a) => a.id === selectedId),
    [applicants, selectedId],
  );

  const handlePrev = useCallback(() => {
    if (selectedIdx > 0) onSelectCandidate(applicants[selectedIdx - 1].id);
  }, [selectedIdx, applicants, onSelectCandidate]);

  const handleNext = useCallback(() => {
    if (selectedIdx < applicants.length - 1) onSelectCandidate(applicants[selectedIdx + 1].id);
  }, [selectedIdx, applicants, onSelectCandidate]);

  const profile = selected?.candidate_profile;
  const name = selected?.candidate_name ?? profile?.name ?? 'Candidate';
  const role = profile?.experience?.[0]?.title;
  const location = profile?.city ?? profile?.location;
  const sections = buildSections(profile);

  return (
    <div className="flex h-full overflow-hidden gap-6 p-6">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 h-full">
        <CandidateSidebar
          jobPosting={jobPosting}
          candidates={sidebarCandidates}
          selectedId={selectedId}
          onSelect={onSelectCandidate}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pb-4 flex-shrink-0"
        >
          <Breadcrumb
            segments={[
              { label: 'Hiring', onClick: onNavigateToHiring },
              { label: jobPosting.title, onClick: onBack },
              { label: name },
            ]}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-h-0"
          >
            <CandidateDrawer
              jobTitle={jobPosting.title}
              name={name}
              role={role}
              location={location}
              matchScore={selected?.matchScore}
              sections={sections}
              onClose={onBack}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
