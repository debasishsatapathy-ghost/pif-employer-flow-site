'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Star, Maximize2, ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';

export interface CandidateSection {
  label: string;
  content?: React.ReactNode;
}

export interface CandidateDrawerProps {
  jobTitle: string;
  name: string;
  role?: string;
  location?: string;
  avatarUrl?: string;
  starred?: boolean;
  matchLabel?: string;
  matchDescription?: string;
  matchScore?: number;
  sections?: CandidateSection[];
  defaultExpanded?: boolean;
  onClose?: () => void;
  onChat?: () => void;
  onToggleStar?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="size-14 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1ed25e 0%, #51a2ff 100%)' }}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-white">{initials}</span>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="size-11 rounded-full border-[3px] flex items-center justify-center flex-shrink-0" style={{ borderColor: '#1ed25e' }}>
      <span className="text-sm font-semibold text-white">{score}</span>
    </div>
  );
}

function MatchCard({ label, description, score }: { label: string; description?: string; score?: number }) {
  return (
    <div className="flex items-start justify-between rounded-xl p-4 w-full" style={{ background: 'rgba(30,210,94,0.1)', border: '1px solid rgba(30,210,94,0.2)' }}>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-white/60 leading-relaxed">{description}</p>}
      </div>
      {score != null && <ScoreBadge score={score} />}
    </div>
  );
}

function SectionCard({ section, className = '' }: { section: CandidateSection; className?: string }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col ${className}`} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', minHeight: 80 }}>
      <p className="text-sm font-semibold text-white">{section.label}</p>
      {section.content && <div className="mt-2 flex-1">{section.content}</div>}
    </div>
  );
}

function ChatButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 self-end h-10 px-4 rounded-full text-sm font-semibold transition-colors flex-shrink-0"
      style={{ background: 'rgba(30,210,94,0.15)', color: '#1ed25e' }}
    >
      <MessageCircle size={18} />
      Chat about this candidate
    </button>
  );
}

const DEFAULT_SECTION_LABELS = ['Application Progress', 'Skill Match', 'Certifications', 'Experience', 'Education'];

function mergedSections(provided: CandidateSection[]): CandidateSection[] {
  const byLabel = new Map(provided.map((s) => [s.label, s]));
  return DEFAULT_SECTION_LABELS.map((label) => byLabel.get(label) ?? { label });
}

export function CandidateDrawer({
  jobTitle, name, role, location, avatarUrl, starred = false,
  matchLabel = 'Close Match', matchDescription, matchScore, sections = [],
  defaultExpanded = false, onClose, onChat, onToggleStar, onNext, onPrev,
}: CandidateDrawerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggleExpand = useCallback(() => setExpanded((v) => !v), []);
  const allSections = mergedSections(sections);
  const topSections = allSections.slice(0, 1);
  const gridSections = allSections.slice(1);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', width: expanded ? '100%' : 676, maxWidth: '100%' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4 p-8 size-full overflow-y-auto">
            <div className="flex items-start gap-4">
              <Avatar url={avatarUrl} name={name} />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-white truncate">{name}</h2>
                  <button type="button" onClick={onToggleStar} className="flex-shrink-0">
                    <Star size={20} className={starred ? 'fill-current text-[#1ed25e]' : 'text-white/30'} />
                  </button>
                </div>
                {(role || location) && (
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    {role && <span>{role}</span>}
                    {role && location && <span className="size-1 rounded-full bg-white/50" />}
                    {location && <span>{location}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
                <button type="button" onClick={onPrev} className="p-0.5 rounded text-white/30 hover:text-white/70 transition-colors"><ChevronUp size={20} /></button>
                <button type="button" onClick={() => { setExpanded(false); onNext?.(); }} className="p-0.5 rounded text-white/30 hover:text-white/70 transition-colors"><ChevronDown size={20} /></button>
              </div>
            </div>
            <MatchCard label={matchLabel} description={matchDescription} score={matchScore} />
            {topSections.map((s) => <SectionCard key={s.label} section={s} className="h-[167px]" />)}
            {gridSections.length > 0 && (
              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                {gridSections.map((s) => <SectionCard key={s.label} section={s} className="h-full" />)}
              </div>
            )}
            <ChatButton onClick={onChat} />
          </motion.div>
        ) : (
          <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6 p-8 size-full overflow-y-auto">
            <div className="flex items-center justify-between flex-shrink-0">
              <button type="button" onClick={onClose} className="flex items-center gap-2">
                <ArrowLeft size={20} className="text-white" />
                <span className="text-lg text-white">{jobTitle}</span>
              </button>
              <button type="button" onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X size={22} /></button>
            </div>
            <div className="flex flex-col flex-1 min-h-0 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-start gap-4 flex-shrink-0">
                <Avatar url={avatarUrl} name={name} />
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white truncate">{name}</h2>
                      <button type="button" onClick={onToggleStar} className="flex-shrink-0">
                        <Star size={20} className={starred ? 'fill-current text-[#1ed25e]' : 'text-white/30'} />
                      </button>
                    </div>
                    <button type="button" onClick={toggleExpand} className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"><Maximize2 size={20} /></button>
                  </div>
                  {(role || location) && (
                    <div className="flex items-center gap-3 text-sm text-white/50">
                      {role && <span>{role}</span>}
                      {role && location && <span className="size-1 rounded-full bg-white/50" />}
                      {location && <span>{location}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex-shrink-0">
                <MatchCard label={(matchScore ?? 0) >= 75 ? 'Top Applicant' : 'Close Match'} description={matchDescription} score={matchScore} />
              </div>
              <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0 overflow-y-auto">
                {allSections.map((s) => <SectionCard key={s.label} section={s} className="flex-1" />)}
              </div>
              <div className="mt-4 flex-shrink-0"><ChatButton onClick={onChat} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
