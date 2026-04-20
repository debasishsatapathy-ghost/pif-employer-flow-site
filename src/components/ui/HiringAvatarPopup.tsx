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

  // Timestamp of the most recent option pill click. Only transcripts that
  // arrive CAPTION_GRACE_MS after this time are shown as live captions,
  // filtering out any in-flight greeting or stale Back-response transcripts.
  const optionClickTimeRef = useRef<Date | null>(null);
  const CAPTION_GRACE_MS = 600;

  // Timestamp when the popup last became open. Used to compute how much of the
  // audio swallow window (AUDIO_SWALLOW_MS) has already elapsed when the avatar
  // audio element arrives, so unmuting is delayed relative to popup-open time
  // rather than element-arrival time. This swallows any "Success! This role has
  // been posted." speech that the Mobeus platform replays on avatar reconnect.
  const popupOpenTimeRef = useRef<number | null>(null);
  const AUDIO_SWALLOW_MS = 2500;

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
      optionClickTimeRef.current = null;
      return;
    }
    setPopupPhase('loading');
    setAgentOptions([]);
    setVideoReady(false);
    setPopupView('options');
    setSelectedOptionLabels([]);
    optionClickTimeRef.current = null;

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

  // ── Record popup-open timestamp ──────────────────────────────────────────────
  useEffect(() => {
    popupOpenTimeRef.current = open ? Date.now() : null;
  }, [open]);

  // ── Unmute avatar audio after swallow window ──────────────────────────────────
  // We delay unmuting by up to AUDIO_SWALLOW_MS from popup-open time. If the
  // avatar audio element arrives late (e.g. slow reconnect), the remaining delay
  // is (AUDIO_SWALLOW_MS - elapsed). If it arrives early, the full delay applies.
  // This silently discards any replayed prior-session speech (e.g. "Success! This
  // role has been posted.") that the Mobeus platform streams when the avatar
  // worker reconnects. The greeting ([HIRING_ASSISTANT]) is sent 2 s after video-
  // ready, which is always well past the swallow window.
  useEffect(() => {
    if (!open || !avatarAudioElement) return;

    const elapsed = popupOpenTimeRef.current ? Date.now() - popupOpenTimeRef.current : 0;
    const delay = Math.max(0, AUDIO_SWALLOW_MS - elapsed);

    const doUnmute = () => {
      avatarAudioElement.muted = false;
      avatarAudioElement.volume = 1;
      avatarAudioElement.play().catch(() => {
        // One retry — covers AudioContext resuming slightly after attachment.
        setTimeout(() => {
          avatarAudioElement.muted = false;
          avatarAudioElement.volume = 1;
          avatarAudioElement.play().catch(() => {});
        }, 500);
      });
    };

    const timer = setTimeout(doUnmute, delay);
    return () => clearTimeout(timer);
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

  // Caption text for the current answer — only shows transcripts that arrived
  // at least CAPTION_GRACE_MS after the option was clicked. This filters out
  // any in-flight greeting ("Hello! How can I help?") or stale Back-response
  // transcript that races with the snapshot. The agent's actual answer always
  // arrives 1–3 s after the click, well outside the 600 ms grace window.
  const liveCaptionText = (() => {
    if (!optionClickTimeRef.current) return null;
    const cutoff = new Date(optionClickTimeRef.current.getTime() + CAPTION_GRACE_MS);
    const newAgentSegments = transcripts.filter(
      (t) => t.isAgent && t.timestamp > cutoff,
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
  // Records the click timestamp so liveCaptionText can filter out any
  // in-flight transcripts (greeting / stale Back response) via the grace window.
  const handleOptionClick = (label: string) => {
    optionClickTimeRef.current = new Date();
    setSelectedOptionLabels((prev) => [...prev, label]);
    setPopupView('speaking');
    onOptionClick(label);
  };

  // ── Back button handler ──────────────────────────────────────────────────────
  // Sends [HIRING_BACK] which triggers HA-3 in the system prompt. HA-3 calls
  // showHiringOptions then speaks "Do you need anything else?" — distinct from
  // [HIRING_ASSISTANT] (HA-1) which would incorrectly say "Hello! How can I help?".
  const handleBack = () => {
    setPopupView('options');
    const { room: liveRoom } = useVoiceSessionStore.getState();
    liveRoom?.localParticipant
      ?.sendText('[HIRING_BACK]', { topic: 'lk.chat' })
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
              bottom: -70,
              right: -70,
              width: 320,
              height: 320,
             
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse 55.48% 55.48% at 50.00% 43.01%, rgba(30, 210, 94, 0.60) 34%, rgba(54, 137, 255, 0.60) 100%)',
              filter: 'blur(96px)',
              pointerEvents: 'none',
            }}
          />
       


          {/* ── Avatar circle — 174×174 px ────────────────────────────────── */}
          {/*
<div style={{
  position: 'absolute',
  left: '0',
  top: '0',
  width: '96px',
  height: '96px',
  background: 'radial-gradient(ellipse 55.48% 55.48% at 50.00% 43.01%, rgba(30, 210, 94, 0.60) 34%, rgba(54, 137, 255, 0.60) 100%)',
  borderRadius: '50%',
  blur: '96px',
}}></div>
            intentionally. When overflow:hidden and border-radius share a
            container with a scale(2)-transformed child, browsers can produce
            dark rectangular artifacts at the rounded corners where GPU
            compositing doesn't align perfectly with the CSS clip. Separating
            them ensures the border is drawn cleanly and the inner clip element
            uses translateZ(0) + WebkitMaskImage to force a dedicated GPU layer
            that clips the scaled video without any bleed-through.
          */}
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
              // Pulsing border while loading, solid border when ready
              border: popupPhase === 'loading'
                ? '12px solid rgba(22,163,74,0.35)'
                : '12px solid rgba(22,163,74,0.55)',
              animation: popupPhase === 'loading' ? 'hiring-avatar-pulse 1.6s ease-in-out infinite' : 'none',
              background: 'radial-gradient(circle at 40% 40%, rgba(22,163,74,0.5), rgba(5,46,22,0.8))',
              pointerEvents: 'none',
            }}
          >
            {/* Inner clip layer — separated from the border element so that
                overflow:hidden + border-radius correctly clips the scaled video
                without dark rectangular corner artifacts. GPU compositing via
                translateZ(0) and WebkitMaskImage ensures a clean circular clip. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 1000,
                overflow: 'hidden',
                transform: 'translateZ(0)',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: popupPhase === 'ready' ? '#5B676B' : 'transparent',
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
                  transformOrigin: '103% 2.5%',
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
                    transformOrigin: '100% 2.5%',
                  }}
                />
              )}
            </div>
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
                {/*
                  Single flex column anchored at bottom: 185, right: 130.
                  Bubble sits on top, pills stack below with a fixed 12px gap.
                  This eliminates the fixed-position empty space that appeared
                  when fewer pills were shown (e.g. after one option is selected).
                */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  style={{
                    position: 'absolute',
                    bottom: 185,
                    right: 130,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 12,
                    pointerEvents: 'none',
                  }}
                >
                  {/* Question speech bubble */}
                  <div
                    style={{
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
                  </div>

                  {/* Option pills — remaining unselected options, or "That's all" */}
                  <div
                    style={{
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
