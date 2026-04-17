'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

interface HiringOption {
  label: string;
  value?: string;
}

// ─── Fallback option pills ────────────────────────────────────────────────────
// Used when the agent has not yet called showHiringOptions. Once the agent
// responds, agentOptions from the 'hiring-avatar-options' DOM event take over.
const FALLBACK_PILLS: HiringOption[] = [
  { label: 'Hiring Metrics',  value: 'hiring-metrics' },
  { label: 'Best Applicants', value: 'best-applicants' },
  { label: 'Market Trends',   value: 'market-trends' },
];

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
  // 'ready'   — live video is rendering frames (canplay fired) OR fallback.
  const [popupPhase, setPopupPhase] = useState<'loading' | 'ready'>('loading');

  // True only when the <video> element has actual frames (canplay / playing).
  // avatarVideoTrack being non-null only means the LiveKit track is subscribed —
  // video frames may not have arrived yet (streaming connection still warming up).
  const [videoReady, setVideoReady] = useState(false);

  // Agent-driven option bubbles received via callSiteFunction → showHiringOptions
  const [agentOptions, setAgentOptions] = useState<HiringOption[]>([]);

  // ── Reset on each open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setVideoReady(false);
      return;
    }
    setPopupPhase('loading');
    setAgentOptions([]);
    setVideoReady(false);

    // Hard fallback: show full UI after 15 s if video never becomes ready.
    // 15 s covers slow streaming connections; canplay normally fires within 3–6 s.
    const fallbackTimer = setTimeout(() => setPopupPhase('ready'), 15_000);
    return () => clearTimeout(fallbackTimer);
  }, [open]);

  // ── Attach live video track + wait for canplay before showing content ────────
  // Only after canplay (frames actually flowing) do we mark videoReady.
  // This prevents the spinner from stopping while the avatar circle is still black.
  useEffect(() => {
    const el = videoElRef.current;
    if (!el || !avatarVideoTrack) {
      setVideoReady(false);
      return;
    }

    avatarVideoTrack.attach(el);
    console.log('[HiringAvatar] Video track attached, waiting for canplay…');

    const onCanPlay = () => {
      console.log('[HiringAvatar] canplay fired — streaming pipeline ready');
      setVideoReady(true);
    };
    const onPlaying = () => {
      console.log('[HiringAvatar] playing fired — video frames flowing');
      setVideoReady(true);
    };

    el.addEventListener('canplay',  onCanPlay);
    el.addEventListener('playing',  onPlaying);

    // If track was already playing before this effect ran (e.g. popup re-opened)
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setVideoReady(true);
    }

    return () => {
      el.removeEventListener('canplay',  onCanPlay);
      el.removeEventListener('playing',  onPlaying);
      setVideoReady(false);
      try { avatarVideoTrack.detach(); } catch {}
    };
  }, [avatarVideoTrack]);

  // ── Transition to ready when video is truly streaming ───────────────────────
  // showLiveVideo now requires videoReady so the 'ready' phase (speech bubble +
  // option pills) only appears once the avatar face is visible in the circle.
  const showLiveVideo = avatarEnabled && !!avatarVideoTrack && videoReady;

  useEffect(() => {
    if (showLiveVideo || !avatarAvailable) {
      console.log('[HiringAvatar] popupPhase → ready', { showLiveVideo, avatarAvailable });
      setPopupPhase('ready');
    }
  }, [showLiveVideo, avatarAvailable]);

  // ── Unlock AudioContext on popup open (user gesture just occurred) ───────────
  // The popup opens from a user click. We use that gesture window to resume
  // any suspended AudioContext so that play() won't be blocked when the avatar
  // audio element arrives ~3-5 s later.
  useEffect(() => {
    if (!open) return;
    try {
      type AnyAudioCtx = typeof AudioContext;
      const AudioCtx: AnyAudioCtx =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: AnyAudioCtx }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      }
    } catch {}
  }, [open]);

  // ── Forcefully unmute avatar audio ───────────────────────────────────────────
  // applyAudioRouting in the store sets muted=false but does not guarantee
  // play() was called successfully (autoplay policy). We retry here.
  useEffect(() => {
    if (!open || !avatarAudioElement) return;

    const tryPlay = () => {
      avatarAudioElement.muted = false;
      avatarAudioElement.volume = 1;
      return avatarAudioElement.play();
    };

    tryPlay().catch(() => {
      // One retry after 500 ms covers cases where the AudioContext resumes
      // slightly after the element is attached.
      setTimeout(() => tryPlay().catch(() => {}), 500);
    });
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
            {/* LIVE video — always in DOM once track arrives so canplay fires.
                visibility:hidden (not display:none) keeps the element in the
                rendering pipeline so the browser fires canplay/playing events
                while the streaming pipeline warms up.
                objectPosition: right top → portrait video shows the top-right
                area where the avatar face lives.
                scale(2) at 85% 20% zooms into the forehead/eyes region — moved
                further right (+5%) and up (-8%) compared to previous values to
                ensure the full face is visible within the circular frame. */}
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
                objectPosition: 'right top',
                transform: 'scale(2)',
                transformOrigin: '85% 20%',
                // Use visibility instead of display so canplay fires while hidden
                visibility: (avatarVideoTrack && !videoReady) ? 'hidden' : (showLiveVideo ? 'visible' : 'hidden'),
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
                  objectPosition: 'right top',
                  transform: 'scale(2)',
                  transformOrigin: '85% 20%',
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
