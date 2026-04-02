'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';

export interface SidebarJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  postedAt?: string;
  status: string;
}

export interface JobPostingSidebarProps {
  jobs: SidebarJob[];
  selectedId?: string;
  onSelect?: (id: string, job: SidebarJob) => void;
}

function JobCard({
  job,
  selected,
  onClick,
}: {
  job: SidebarJob;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = [job.department, job.location, job.postedAt].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition-all duration-150"
      style={{
        background: selected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-white">{job.title}</p>
        {meta.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {meta.map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20" />}
                <span className="text-xs text-white/40">{text}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function JobPostingSidebar({ jobs, selectedId, onSelect }: JobPostingSidebarProps) {
  const activeJobs = useMemo(
    () => jobs.filter((j) => {
      const s = j.status.toLowerCase();
      return s !== 'closed' && s !== 'completed';
    }),
    [jobs],
  );

  const completedJobs = useMemo(
    () => jobs.filter((j) => {
      const s = j.status.toLowerCase();
      return s === 'closed' || s === 'completed';
    }),
    [jobs],
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col rounded-2xl h-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="p-6 pb-0 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">Job Postings</h2>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6 flex-1 min-h-0 overflow-y-auto">
        {activeJobs.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-2">Active</h3>
            <div className="flex flex-col gap-2">
              {activeJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedId === job.id}
                  onClick={() => onSelect?.(job.id, job)}
                />
              ))}
            </div>
          </section>
        )}

        {completedJobs.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-2">Completed</h3>
            <div className="flex flex-col gap-2">
              {completedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedId === job.id}
                  onClick={() => onSelect?.(job.id, job)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
