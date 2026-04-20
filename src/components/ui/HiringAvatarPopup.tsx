'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
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

  // ── Phase state ─────────────────────────────────────────────────────────────
  // 'loading' — avatar is starting up; show only the pulsing circle + spinner.
  // 'ready'   — live video has actual frames (canplay fired) OR 20 s fallback.
  const [popupPhase, setPopupPhase] = useState<'loading' | 'ready'>('loading');

  // True only when the <video> element has actual decoded frames.
  // avatarVideoTrack being non-null only means LiveKit subscribed the track —
  // the streaming pipeline may still be warming up with no frames yet.
  const [videoReady, setVideoReady] = useState(false);

  // Agent-driven option bubbles received via callSiteFunction → showHiringOptions
  const [agentOptions, setAgentOptions] = useState<HiringOption[]>([]);

  // Two-phase view: show option pills OR show live captions while agent speaks
  const [popupView, setPopupView] = useState<'options' | 'speaking'>('options');

  // Accumulates the labels of every option the user has clicked (never cleared
  // within a session — used to filter remaining pills on subsequent phases).
  const [selectedOptionLabels, setSelectedOptionLabels] = useState<string[]>([]);

  // Snapshot of agent transcript IDs that existed BEFORE the most recent option
  // click. Used to isolate captions that belong to the current answer only.
  const baseTranscriptIdsRef = useRef<Set<string>>(new Set());

  // Live transcript subscription for real-time closed captions
  const transcripts = useVoiceSessionStore((s) => s.transcripts);

  // Stores cleanup for the current video element's listeners + track detach.
  const videoCleanupRef = useRef<(() => void) | null>(null);

  // ── Reset on each open/close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setVideoReady(false);
      setPopupView('options');
      setSelectedOptionLabels([]);
      baseTranscriptIdsRef.current = new Set();
      return;
    }
    setPopupPhase('loading');
    setAgentOptions([]);
    setVideoReady(false);
    setPopupView('options');
    setSelectedOptionLabels([]);
    baseTranscriptIdsRef.current = new Set();

    // Hard fallback: show full UI after 20 s if video never becomes ready.
    const fallbackTimer = setTimeout(() => setPopupPhase('ready'), 20_000);
    return () => clearTimeout(fallbackTimer);
  }, [open]);

  // ── useCallback ref — the candidate-experiment-site pattern ─────────────────
  // Unlike useRef + useEffect([avatarVideoTrack]):
  //   • When the track arrives BEFORE the popup opens, useRef.current is null
  //     so the effect returns early — attach() is never called.
  //   • useCallback ref fires every time EITHER the element mounts OR
  //     avatarVideoTrack changes, covering both orderings.
  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      // Run any previous cleanup (detach old track, remove old listeners)
      videoCleanupRef.current?.();
      videoCleanupRef.current = null;

      if (!el) {
        setVideoReady(false);
        return;
      }
      if (!avatarVideoTrack) return;

      // Attach LiveKit track → sets el.srcObject = new MediaStream([track])
      avatarVideoTrack.attach(el);
      console.log('[HiringAvatar] track attached to <video>, waiting for canplay…');

      const onReady = () => {
        console.log('[HiringAvatar] video ready (canplay/playing) — frames flowing');
        setVideoReady(true);
      };

      el.addEventListener('canplay', onReady);
      el.addEventListener('playing', onReady);

      // Already has frames (e.g. popup opened a second time in the same session)
      if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setVideoReady(true);
      }

      videoCleanupRef.current = () => {
        el.removeEventListener('canplay', onReady);
        el.removeEventListener('playing', onReady);
        try { avatarVideoTrack.detach(el); } catch {}
        setVideoReady(false);
      };
    },
    [avatarVideoTrack],
  );

  // ── Transition to ready when video is truly streaming ───────────────────────
  const showLiveVideo = avatarEnabled && !!avatarVideoTrack && videoReady;

  useEffect(() => {
    if (showLiveVideo || !avatarAvailable) {
      setPopupPhase('ready');
    }
  }, [showLiveVideo, avatarAvailable]);

  // ── Notify EmployerDashboard when video is ready so it fires the greeting ────
  // The greeting kick (sendText lk.chat) is sent AFTER frames are flowing so the
  // agent speaks only once the avatar face is already visible in the circle.
  useEffect(() => {
    if (!videoReady || !open) return;
    window.dispatchEvent(new CustomEvent('hiring-avatar-video-ready'));
  }, [videoReady, open]);

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
        // Do NOT force popupPhase→ready here; that is driven by videoReady so
        // options only appear once the avatar face is actually visible.
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

  // Caption text that arrived strictly AFTER the current option click.
  // Shows the most recent agent segment (final or non-final) for real-time
  // closed-caption feel. Returns null while waiting for the agent to start.
  const liveCaptionText = (() => {
    const newAgentSegments = transcripts.filter(
      (t) => t.isAgent && !baseTranscriptIdsRef.current.has(t.id),
    );
    if (newAgentSegments.length === 0) return null;
    return newAgentSegments[newAgentSegments.length - 1].text || null;
  })();

  // Remaining selectable options = all display options minus already-clicked ones.
  const remainingOptions = displayOptions.filter(
    (opt) => !selectedOptionLabels.includes(opt.label),
  );

  // Question text changes after the first selection to feel conversational.
  const questionText = selectedOptionLabels.length === 0 ? 'How can I help?' : 'Anything else?';

  // ── Option pill click handler ────────────────────────────────────────────────
  // Snapshots existing agent transcript IDs so liveCaptionText only shows
  // segments that arrive AFTER this click (isolates this answer's captions).
  const handleOptionClick = (label: string) => {
    baseTranscriptIdsRef.current = new Set(
      transcripts.filter((t) => t.isAgent).map((t) => t.id),
    );
    setSelectedOptionLabels((prev) => [...prev, label]);
    setPopupView('speaking');
    onOptionClick(label);
  };

  // ── Back button handler ──────────────────────────────────────────────────────
  // Transitions the UI back to the options view and triggers the agent to ask
  // "Do you need anything else?" so the follow-up feels conversational.
  const handleBack = () => {
    setPopupView('options');
    const { room: liveRoom } = useVoiceSessionStore.getState();
    liveRoom?.localParticipant
      ?.sendText('[HIRING_ASSISTANT] back to options', { topic: 'lk.chat' })
      .catch(() => {});
  };

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
            height: 420,        // FIX 2: expanded from 300 to clear speech bubble + pills
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
            {/* LIVE video — useCallback ref (videoRef) attaches the LiveKit
                track when EITHER this element mounts OR the track arrives,
                solving the race condition where track arrives before popup opens.
                Hidden until videoReady (canplay fired) so the circle never
                shows a black frame while the stream warms up. */}
            <video
              ref={videoRef}
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
                transformOrigin: '90% 10%',   // FIX 1: was '85% 20%' — shifts crop right+up
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
                  objectPosition: 'right top',
                  transform: 'scale(2)',
                  transformOrigin: '90% 10%',  // FIX 1: was '85% 20%' — shifts crop right+up
                }}
              />
            )}
          </motion.div>

          {/* ── Speech bubble + option pills / captions — only in 'ready' phase */}
          <AnimatePresence mode="wait">
            {popupPhase === 'ready' && popupView === 'options' && (
              <motion.div
                key="phase-options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                {/* Question speech bubble */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  style={{
                    position: 'absolute',
                    bottom: 325,             // FIX 2: was 210 — pushed up to clear pills
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
                    {questionText}
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

                {/* Option pills — remaining unselected options, or "That's all" */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 175,             // FIX 2: was 70 — raised to clear avatar circle
                    right: 165,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 8,
                    pointerEvents: 'auto',
                  }}
                >
                  {remainingOptions.length > 0 ? (
                    remainingOptions.map((opt, i) => (
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
                        onClick={() => handleOptionClick(opt.label)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.14)',
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
                    ))
                  ) : (
                    /* All options used — graceful exit pill */
                    <motion.button
                      key="thats-all"
                      initial={{ opacity: 0, x: 20, scale: 0.85 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                      onClick={onClose}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 24,
                        padding: '10px 18px',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        cursor: 'pointer',
                        outline: 'none',
                        whiteSpace: 'nowrap',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 15,
                        fontWeight: 400,
                        color: '#f4f4f5',
                        lineHeight: '24px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                      }}
                    >
                      That&apos;s all
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── PHASE B: speaking — real-time closed captions + Back button ── */}
            {popupPhase === 'ready' && popupView === 'speaking' && (
              <motion.div
                key="phase-speaking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  bottom: 60,
                  right: 185,
                  maxWidth: 245,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 10,
                  pointerEvents: 'auto',
                }}
              >
                {/* Caption bubble */}
                <div
                  style={{
                    background: 'rgba(39, 39, 42, 0.92)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '16px 16px 0 16px',
                    padding: '14px 18px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    width: '100%',
                    minHeight: 52,
                    display: 'flex',
                    alignItems: liveCaptionText ? 'flex-start' : 'center',
                    justifyContent: liveCaptionText ? 'flex-start' : 'center',
                  }}
                >
                  {liveCaptionText ? (
                    <span
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 15,
                        fontWeight: 400,
                        color: '#f4f4f5',
                        lineHeight: '22px',
                      }}
                    >
                      {liveCaptionText}
                    </span>
                  ) : (
                    /* Waiting for agent to begin speaking */
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.15)',
                        borderTopColor: 'rgba(134,239,172,0.85)',
                        animation: 'hiring-avatar-spin 0.8s linear infinite',
                      }}
                    />
                  )}
                </div>

                {/* Back button */}
                <button
                  onClick={handleBack}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 24,
                    padding: '8px 18px',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.60)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                  }}
                >
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
