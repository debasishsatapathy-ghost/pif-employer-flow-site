'use client';

import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

export interface SidebarCandidate {
  id: string;
  name: string;
  matchScore: number;
  starred?: boolean;
  status?: string;
}

export interface SidebarJobPosting {
  title: string;
  department?: string;
  location?: string;
  postedAt?: string;
}

export interface CandidateSidebarProps {
  jobPosting: SidebarJobPosting;
  candidates: SidebarCandidate[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

function CandidateRow({
  candidate,
  selected,
  showStar,
  onClick,
}: {
  candidate: SidebarCandidate;
  selected: boolean;
  showStar: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all duration-150"
      style={{
        background: selected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-white truncate">{candidate.name}</span>
          {showStar && (
            <Star size={14} className="fill-current text-[#1ed25e] flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-semibold text-white">{candidate.matchScore}</span>
          <div className="w-1 h-3 rounded-sm flex-shrink-0" style={{ background: '#1ed25e' }} />
        </div>
      </div>
    </button>
  );
}

export function CandidateSidebar({ jobPosting, candidates, selectedId, onSelect }: CandidateSidebarProps) {
  const shortlisted = useMemo(
    () => candidates.filter((c) => c.status === 'shortlisted').sort((a, b) => b.matchScore - a.matchScore),
    [candidates],
  );

  const topRecommendations = useMemo(
    () => candidates.filter((c) => c.status !== 'shortlisted').sort((a, b) => b.matchScore - a.matchScore),
    [candidates],
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col rounded-2xl h-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <section className="flex flex-col gap-3 p-5 pb-0 flex-shrink-0">
        <h2 className="text-base font-semibold text-white">Job Posting</h2>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-white">{jobPosting.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {jobPosting.department && <span className="text-xs text-white/40">{jobPosting.department}</span>}
            {jobPosting.department && jobPosting.location && <span className="w-1 h-1 rounded-full bg-white/20" />}
            {jobPosting.location && <span className="text-xs text-white/40">{jobPosting.location}</span>}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-5 flex-1 min-h-0 overflow-y-auto">
        {shortlisted.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Shortlisted</h3>
            <div className="flex flex-col gap-1.5">
              {shortlisted.map((c) => (
                <CandidateRow key={c.id} candidate={c} selected={selectedId === c.id} showStar onClick={() => onSelect?.(c.id)} />
              ))}
            </div>
          </section>
        )}

        {topRecommendations.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Top Recommendations</h3>
            <div className="flex flex-col gap-1.5">
              {topRecommendations.map((c) => (
                <CandidateRow key={c.id} candidate={c} selected={selectedId === c.id} showStar={false} onClick={() => onSelect?.(c.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
