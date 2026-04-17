'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

// ─── Fallback option pills ────────────────────────────────────────────────────
// Used when the agent has not yet called showHiringOptions. Once the agent
// responds, agentOptions from the 'hiring-avatar-options' DOM event take over.
const FALLBACK_PILLS = [
  { label: 'Hiring Metrics',  value: 'hiring-metrics' },
  { label: 'Best Applicants', value: 'best-applicants' },
  { label: 'Market Trends',   value: 'market-trends' },
] as const;

interface HiringOption {
  label: string;
  value?: string;
}

interface HiringAvatarPopupProps {
  open: boolean;
  onClose: () => void;
  /** Called with the option label when the employer clicks a bubble. */
  onOptionClick: (label: string) => void;
}

export function HiringAvatarPopup({ open, onClose, onOptionClick }: HiringAvatarPopupProps) {
  const avatarVideoTrack   = useVoiceSessionStore((s) => s.avatarVideoTrack);
  const avatarEnabled      = useVoiceSessionStore((s) => s.avatarEnabled);
  const avatarAvailable    = useVoiceSessionStore((s) => s.avatarAvailable);
  const avatarAudioElement = useVoiceSessionStore((s) => s.avatarAudioElement);

  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // ── Phase state ─────────────────────────────────────────────────────────────
  // 'loading' — avatar is starting up; show only the pulsing circle, no speech
  //             bubble or option pills yet.
  // 'ready'   — avatar video has arrived (or a fallback timeout fired); show the
  //             full popup with the speech bubble + option pills.
  const [popupPhase, setPopupPhase] = useState<'loading' | 'ready'>('loading');

  // Agent-driven option bubbles received via callSiteFunction → showHiringOptions
  const [agentOptions, setAgentOptions] = useState<HiringOption[]>([]);

  // ── Reset on each open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setPopupPhase('loading');
    setAgentOptions([]);

    // Hard fallback: show full UI after 8 s even if avatar never loads
    const fallbackTimer = setTimeout(() => setPopupPhase('ready'), 8000);
    return () => clearTimeout(fallbackTimer);
  }, [open]);

  // ── Transition to ready when avatar video arrives ────────────────────────────
  const showLiveVideo = avatarEnabled && !!avatarVideoTrack;

  useEffect(() => {
    // If avatar is available, wait for the live video before showing content.
    // If not available (static fallback), go ready immediately.
    if (showLiveVideo || !avatarAvailable) {
      setPopupPhase('ready');
    }
  }, [showLiveVideo, avatarAvailable]);

  // ── Attach live video track ──────────────────────────────────────────────────
  useEffect(() => {
    const el = videoElRef.current;
    if (el && avatarVideoTrack) {
      avatarVideoTrack.attach(el);
    }
    return () => {
      if (avatarVideoTrack) {
        try { avatarVideoTrack.detach(); } catch {}
      }
    };
  }, [avatarVideoTrack]);

  // ── Forcefully unmute avatar audio ───────────────────────────────────────────
  // applyAudioRouting in the store sets muted=false but never restores volume.
  // We do both here as a belt-and-suspenders override.
  useEffect(() => {
    if (!open || !avatarAudioElement) return;
    avatarAudioElement.muted = false;
    avatarAudioElement.volume = 1;
    avatarAudioElement.play().catch(() => {});
  }, [avatarAudioElement, open]);

  // ── Listen for agent-driven option bubbles ───────────────────────────────────
  // The Mobeus agent calls callSiteFunction("showHiringOptions", { options: [...] })
  // which dispatches the 'hiring-avatar-options' event on window.
  useEffect(() => {
    if (!open) {
      setAgentOptions([]);
      return;
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ options: HiringOption[] }>).detail;
      if (Array.isArray(detail?.options) && detail.options.length > 0) {
        setAgentOptions(detail.options);
        // Upgrade to 'ready' as soon as the agent confirms the overlay is active
        setPopupPhase('ready');
      }
    };
    window.addEventListener('hiring-avatar-options', handler);
    return () => window.removeEventListener('hiring-avatar-options', handler);
  }, [open]);

  // ── Close on Escape ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Derived display state ────────────────────────────────────────────────────
  // Spinner while avatar is available but live video hasn't arrived yet
  const showLoading        = avatarAvailable && !showLiveVideo;
  // Static fallback only when avatar feature is genuinely unavailable
  const showStaticFallback = !showLiveVideo && !avatarAvailable;

  // Use agent-provided options when available, otherwise fallback pills
  const displayOptions: HiringOption[] =
    agentOptions.length > 0 ? agentOptions : FALLBACK_PILLS;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hiring-avatar-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            zIndex: 40,
            width: 460,
            height: 300,
            pointerEvents: 'none',
          }}
        >
          {/* ── Green radial glow ─────────────────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 320,
              height: 320,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(22,163,74,0.45) 0%, rgba(16,185,129,0.22) 35%, transparent 70%)',
              filter: 'blur(28px)',
              pointerEvents: 'none',
            }}
          />

          {/* ── Avatar circle — 174×174 px ────────────────────────────────── */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 30 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 174,
              height: 174,
              borderRadius: 1000,
              overflow: 'hidden',
              // Pulsing border while loading, solid border when ready
              border: popupPhase === 'loading'
                ? '12px solid rgba(22,163,74,0.35)'
                : '12px solid rgba(255,255,255,0.05)',
              animation: popupPhase === 'loading' ? 'hiring-avatar-pulse 1.6s ease-in-out infinite' : 'none',
              background: 'radial-gradient(circle at 40% 40%, rgba(22,163,74,0.5), rgba(5,46,22,0.8))',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* LIVE video — always in DOM so ref is set when track arrives.
                Face position: the Benny/Mobeus avatar sits on the RIGHT side
                of the video frame → objectPosition: right center matches the
                reference repo (BackgroundLayer.tsx) exactly.
                scale(2) anchored at 80% 35% zooms into that right-center face zone. */}
            <video
              ref={videoElRef}
              autoPlay
              playsInline
              muted={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'right center',
                transform: 'scale(2)',
                transformOrigin: '80% 35%',
                display: showLiveVideo ? 'block' : 'none',
              }}
            />

            {/* Spinner while avatar worker is connecting */}
            {showLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.15)',
                    borderTopColor: 'rgba(255,255,255,0.7)',
                    animation: 'hiring-avatar-spin 0.8s linear infinite',
                  }}
                />
              </div>
            )}

            {/* Static fallback — only when avatarAvailable is false */}
            {showStaticFallback && (
              <img
                src="/avatar/avatar-full.png"
                alt="AI Assistant"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'right center',
                  transform: 'scale(2)',
                  transformOrigin: '80% 35%',
                }}
              />
            )}
          </motion.div>

          {/* ── Speech bubble + option pills — only in 'ready' phase ─────── */}
          <AnimatePresence>
            {popupPhase === 'ready' && (
              <>
                {/* Speech bubble */}
                <motion.div
                  key="speech-bubble"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  style={{
                    position: 'absolute',
                    bottom: 210,
                    right: 130,
                    background: 'rgba(39, 39, 42, 0.88)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '16px 16px 0 16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'auto',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 18,
                      fontWeight: 400,
                      color: '#f4f4f5',
                      lineHeight: '24px',
                    }}
                  >
                    How can I help?
                  </span>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 18,
                      lineHeight: 1,
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      outline: 'none',
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </motion.div>

                {/* Option bubbles — agent-provided or fallback */}
                <div
                  key="option-pills"
                  style={{
                    position: 'absolute',
                    bottom: 70,
                    right: 165,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 8,
                    pointerEvents: 'auto',
                  }}
                >
                  {displayOptions.map((opt, i) => (
                    <motion.button
                      key={opt.value ?? opt.label}
                      initial={{ opacity: 0, x: 20, scale: 0.85 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 16, scale: 0.85 }}
                      transition={{
                        duration: 0.22,
                        ease: [0.34, 1.56, 0.64, 1],
                        delay: 0.15 + i * 0.07,
                      }}
                      onClick={() => onOptionClick(opt.label)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 24,
                        padding: '10px 18px',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        cursor: 'pointer',
                        outline: 'none',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.15s ease, border-color 0.15s ease',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 15,
                        fontWeight: 400,
                        color: '#f4f4f5',
                        lineHeight: '24px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)';
                      }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
