import { useMemo } from "react";
import { motion } from "framer-motion";

/* ── Types ───────────────────────────────────────────────────────────────── */

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

/* ── Job card ────────────────────────────────────────────────────────────── */

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
      className="w-full text-left rounded-xl p-5 transition-all duration-150"
      style={{
        background: selected
          ? "rgba(255,255,255,0.15)"
          : "rgba(255,255,255,0.05)",
        border: selected
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-[var(--text-primary)]">
          {job.title}
        </p>
        {meta.length > 0 && (
          <div className="flex items-center gap-3" style={{ fontSize: 14 }}>
            {meta.map((text, i) => (
              <span key={i} className="flex items-center gap-3">
                {i > 0 && (
                  <span className="size-1 rounded-full bg-[var(--text-subtle)]" />
                )}
                <span className="text-[var(--text-subtle)]">{text}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function JobPostingSidebar({
  jobs,
  selectedId,
  onSelect,
}: JobPostingSidebarProps) {
  const activeJobs = useMemo(
    () => jobs.filter((j) => {
      const s = j.status.toLowerCase();
      return s !== "closed" && s !== "completed";
    }),
    [jobs],
  );

  const completedJobs = useMemo(
    () => jobs.filter((j) => {
      const s = j.status.toLowerCase();
      return s === "closed" || s === "completed";
    }),
    [jobs],
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col rounded-2xl h-full overflow-hidden"
      style={{ background: "var(--surface-elevated)" }}
    >
      {/* Title — pinned */}
      <div className="p-8 pb-0 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-white">Job Postings</h2>
      </div>

      {/* Scrollable sections */}
      <div className="flex flex-col gap-6 px-8 pt-6 pb-8 flex-1 min-h-0 overflow-y-auto">
        {activeJobs.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-white">Active</h3>
            <div className="flex flex-col gap-4">
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
          <section className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-white">Completed</h3>
            <div className="flex flex-col gap-4">
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
