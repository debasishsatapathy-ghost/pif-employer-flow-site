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
  /**
   * When true: audio unmuting is permanently skipped and option pills are
   * non-interactive. The agent's silent role (system prompt) is the primary
   * guarantee; this is a belt-and-suspenders code-level safety net.
   */
  silent?: boolean;
  /**
   * Fixed option pills shown immediately when popup is ready.
   * When provided, overrides FALLBACK_PILLS and skips the
   * 'hiring-avatar-options' event listener entirely.
   */
  staticOptions?: HiringOption[];
  /**
   * When true the popup is hidden with display:none but stays fully mounted.
   * The <video> element and its live MediaStream are preserved so that when the
   * popup becomes visible again (visuallyHidden → false) the video track is
   * already attached and canplay has already fired — no loading spinner needed.
   */
  visuallyHidden?: boolean;
}

export function HiringAvatarPopup({
  open, onClose, onOptionClick, silent, staticOptions, visuallyHidden,
}: HiringAvatarPopupProps) {
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

  // Sentence-by-sentence caption state.
  // sentenceList is populated via the 'hiring-option-sentences' DOM event that
  // getHiringOptionResponse dispatches when the agent calls it. sentenceIdx is
  // advanced by a transcript-watching effect as each sentence is spoken.
  const [sentenceList, setSentenceList] = useState<string[]>([]);
  const [sentenceIdx, setSentenceIdx] = useState(0);

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

  // Tracks whether the popup has been in a hidden (display:none) state since
  // the last full reset. Used to guard the visuallyHidden reset effect so it
  // only fires on a genuine hidden→visible transition, not on initial mount.
  const wasHiddenRef = useRef(false);

  // ── Reset display state when popup re-appears from a hidden state ────────────
  // Fired when visuallyHidden flips false (e.g. home→hiring mode switch).
  // Resets conversation state (options/view/selected) WITHOUT touching videoReady
  // or popupPhase — the video track is still live so the face shows immediately.
  useEffect(() => {
    if (visuallyHidden) {
      wasHiddenRef.current = true;
      return;
    }
    if (!wasHiddenRef.current) return; // initial mount — skip
    wasHiddenRef.current = false;
    setAgentOptions([]);
    setSelectedOptionLabels([]);
    setPopupView('options');
    optionClickTimeRef.current = null;
    setSentenceList([]);
    setSentenceIdx(0);
  }, [visuallyHidden]);

  // ── Reset on each open/close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setVideoReady(false);
      setPopupView('options');
      setSelectedOptionLabels([]);
      optionClickTimeRef.current = null;
      setSentenceList([]);
      setSentenceIdx(0);
      return;
    }
    setPopupPhase('loading');
    setAgentOptions([]);
    // NOTE: do NOT call setVideoReady(false) here.
    // React 18 batches all state updates from the commit phase (videoRef callback)
    // and passive effects into the same render. When the avatar is already active
    // (e.g. home avatar was open and we left it running), videoRef fires BEFORE
    // this effect and calls setVideoReady(true). If we call setVideoReady(false)
    // here, the last-write-wins batching rule means videoReady ends up false,
    // showLiveVideo never becomes true, and the popup spins forever.
    // videoReady is already false when the popup opens: either from the initial
    // useState(false) or from the setVideoReady(false) in the !open branch above.
    setPopupView('options');
    setSelectedOptionLabels([]);
    optionClickTimeRef.current = null;
    setSentenceList([]);
    setSentenceIdx(0);

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
      // Explicitly call play() after attach. LiveKit's lr() helper only schedules
      // play() on Safari/iOS; on Chrome it relies on the `autoplay` attribute.
      // When the track is re-attached to a new element (e.g. hiring popup opening
      // after home popup already used this track), Chrome may not auto-start
      // because the element was just created and the browser hasn't received a
      // user-gesture-linked play() call for this specific element yet.
      el.play().catch(() => {});
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
        // Null srcObject BEFORE calling LiveKit detach(). LiveKit's detach()
        // internally calls ur() which does element.srcObject.removeTrack(track).
        // If multiple popup instances share the same track (home→hiring reuse),
        // that removeTrack call can corrupt the track's MediaStream state so that
        // subsequent attach() on the next element gets an empty stream and canplay
        // never fires. Nulling srcObject first makes ur() see null and skip the
        // removeTrack call; detach() then only removes el from LiveKit's
        // attachedElements tracking list, which is exactly what we want.
        try { el.srcObject = null; } catch {}
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
  // Also fires when visuallyHidden becomes false (home→hiring mode switch):
  // in that case videoReady is already true (track was preserved) and the popup
  // is now visible, so we re-dispatch the event to trigger the greeting.
  useEffect(() => {
    if (!videoReady || !open || visuallyHidden) return;
    window.dispatchEvent(new CustomEvent('hiring-avatar-video-ready'));
  }, [videoReady, open, visuallyHidden]);

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
  //
  // WHY visuallyHidden is in the deps:
  // With the "hide not disconnect" architecture, silent=false in BOTH the null
  // (hidden, visuallyHidden=true) and hiring (visible, visuallyHidden=false)
  // phases. This means transitioning from null→hiring causes zero dep changes in
  // [avatarAudioElement, open, silent] — the effect never fires and audio stays
  // muted. Adding visuallyHidden to deps ensures the effect fires whenever the
  // popup becomes visible (visuallyHidden: true→false), triggering doUnmute.
  useEffect(() => {
    // silent=true means home mode — audio must stay permanently muted.
    // visuallyHidden=true means popup is display:none — don't unmute yet.
    if (!open || !avatarAudioElement || silent || visuallyHidden) return;

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
  }, [avatarAudioElement, open, silent, visuallyHidden]);

  // ── Listen for agent-driven option bubbles ───────────────────────────────────
  // The Mobeus agent calls callSiteFunction("showHiringOptions", { options: [...] })
  // which dispatches the 'hiring-avatar-options' event on window.
  // When staticOptions are provided (home/silent mode), we skip the listener —
  // options are already set and the agent is not involved.
  useEffect(() => {
    if (!open) {
      setAgentOptions([]);
      return;
    }
    if (staticOptions) return; // fixed options provided — skip event listener
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
  }, [open, staticOptions]);

  // ── Receive sentence list from getHiringOptionResponse ──────────────────────
  // getHiringOptionResponse dispatches 'hiring-option-sentences' synchronously
  // (before the agent starts speaking) so sentenceList is populated before the
  // first transcript arrives. sentenceIdx starts at 0 — first sentence shows
  // immediately, subsequent ones advance as the transcript grows.
  useEffect(() => {
    if (!open || visuallyHidden) return;
    const handler = (e: Event) => {
      const { sentences } = (e as CustomEvent<{ sentences: string[] }>).detail ?? {};
      if (Array.isArray(sentences) && sentences.length > 0) {
        setSentenceList(sentences);
        setSentenceIdx(0);
      }
    };
    window.addEventListener('hiring-option-sentences', handler);
    return () => window.removeEventListener('hiring-option-sentences', handler);
  }, [open, visuallyHidden]);

  // ── Advance sentence index as agent speaks ───────────────────────────────────
  // Watches the live transcript and advances sentenceIdx when the opening words
  // of the next sentence appear in the accumulated agent text. This ensures each
  // sentence bubble updates exactly when the agent starts speaking it, not at a
  // fixed timer interval.
  useEffect(() => {
    if (popupView !== 'speaking' || sentenceList.length === 0) return;
    if (sentenceIdx >= sentenceList.length - 1) return;
    if (!optionClickTimeRef.current) return;

    const cutoff = new Date(optionClickTimeRef.current.getTime() + CAPTION_GRACE_MS);
    const fullText = transcripts
      .filter((t) => t.isAgent && t.timestamp > cutoff)
      .map((t) => t.text)
      .join(' ');

    // Match the first ~18 chars of the next sentence — enough to be unique
    // but short enough to appear early in the streamed transcript.
    const nextSentence = sentenceList[sentenceIdx + 1];
    const matchStr = nextSentence.substring(0, Math.min(18, nextSentence.length));

    if (fullText.toLowerCase().includes(matchStr.toLowerCase())) {
      setSentenceIdx((prev) => Math.min(prev + 1, sentenceList.length - 1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcripts, sentenceList, sentenceIdx, popupView]);

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

  // staticOptions (home mode) > agent-provided options > fallback pills
  const displayOptions: HiringOption[] =
    staticOptions
      ? staticOptions
      : agentOptions.length > 0 ? agentOptions : FALLBACK_PILLS;

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

  // Sentence-by-sentence caption display.
  // When sentenceList is available (getHiringOptionResponse returned sentences),
  // show the current sentence rather than the raw rolling transcript text. This
  // gives clean, complete sentences rather than streaming partial words.
  // Falls back to liveCaptionText for the Back-response path (no sentences event).
  const captionDisplay: string | null =
    sentenceList.length > 0 ? sentenceList[sentenceIdx] : liveCaptionText;

  // Back button is only shown on the last sentence (or immediately when no
  // sentence list is available — preserves existing behaviour for HIRING_BACK).
  const isLastSentence = sentenceList.length > 0
    ? sentenceIdx === sentenceList.length - 1
    : true;

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
    if (silent) return; // display-only mode — pills are non-interactive
    optionClickTimeRef.current = new Date();
    setSentenceList([]);   // cleared now; repopulated by 'hiring-option-sentences' event
    setSentenceIdx(0);
    setSelectedOptionLabels((prev) => [...prev, label]);
    setPopupView('speaking');
    onOptionClick(label);
  };

  // ── Back button handler ──────────────────────────────────────────────────────
  // Sends [HIRING_BACK] which triggers HA-3 in the system prompt. HA-3 calls
  // showHiringOptions then speaks "Do you need anything else?" — distinct from
  // [HIRING_ASSISTANT] (HA-1) which would incorrectly say "Hello! How can I help?".
  const handleBack = () => {
    setSentenceList([]);
    setSentenceIdx(0);
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
            bottom: 16,
            right: 16,
            zIndex: 40,
            width: 480,
            height: 440,
            pointerEvents: 'none',
            // display:none hides the popup visually but keeps the <video> element
            // in the DOM so its MediaStream (live face frames) stays attached.
            // On the next open the track is already ready — no loading spinner.
            display: visuallyHidden ? 'none' : undefined,
          }}
        >
          {/* ── Glow — two-layer radial to match Figma 10954:73901 + 10954:73902 ─── */}
          {/* Layer 1: dark deep-teal base (Figma 10954:73901 / 12055:28623).
              The Figma asset is ~757×813 px centered behind the avatar area. */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '72%',
              transform: 'translate(-50%, -50%)',
              width: 760,
              height: 820,
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(5,42,26,0.97) 0%, rgba(3,25,15,0.72) 42%, transparent 68%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          {/* Layer 2: bright teal-green overlay (Figma 10954:73902). */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '72%',
              transform: 'translate(-50%, -50%)',
              width: 760,
              height: 820,
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(22,120,70,0.46) 0%, rgba(12,78,44,0.22) 44%, transparent 70%)',
              filter: 'blur(55px)',
              pointerEvents: 'none',
            }}
          />
       


          {/* ── Dedicated close button — always visible at top-right of circle ── */}
          {/* Positioned at the top-right corner of the 174×174 avatar circle.
              Circle is at bottom:0, right:0 inside the 480×440 popup container.
              This button is visible in all phases (loading, ready, speaking). */}
          <button
            onClick={onClose}
            aria-label="Close avatar"
            style={{
              position: 'absolute',
              bottom: 162,
              right: -4,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(30, 30, 32, 0.88)',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 15,
              lineHeight: 1,
              zIndex: 10,
              pointerEvents: 'auto',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(50,50,54,0.95)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,30,32,0.88)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
            }}
          >
            ×
          </button>

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
                    bottom: 45,
                    right: 183,
                    width: 'max-content',
                    maxWidth: 215,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
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
                      alignItems: 'flex-start',
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
                            cursor: silent ? 'default' : 'pointer',
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
                          onMouseEnter={silent ? undefined : (e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)';
                          }}
                          onMouseLeave={silent ? undefined : (e) => {
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

            {/* ── PHASE B: speaking — sentence-by-sentence captions + Back button ── */}
            {popupPhase === 'ready' && popupView === 'speaking' && (
              <motion.div
                key="phase-speaking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  bottom: 45,
                  right: 195,
                  width: 'max-content',
                  maxWidth: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 10,
                  pointerEvents: 'auto',
                }}
              >
                {/* Caption bubble — sentence-by-sentence when sentences available */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={sentenceList.length > 0 ? sentenceIdx : 'raw'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      background: 'rgba(39, 39, 42, 0.92)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      borderRadius: '16px 16px 0 16px',
                      padding: '14px 18px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      minHeight: 52,
                      display: 'flex',
                      alignItems: captionDisplay ? 'flex-start' : 'center',
                      justifyContent: captionDisplay ? 'flex-start' : 'center',
                    }}
                  >
                    {captionDisplay ? (
                      <span
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: 15,
                          fontWeight: 400,
                          color: '#f4f4f5',
                          lineHeight: '22px',
                        }}
                      >
                        {captionDisplay}
                      </span>
                    ) : (
                      /* Waiting for agent to begin speaking / sentences to arrive */
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
                  </motion.div>
                </AnimatePresence>

                {/* Back button — shown only on the last sentence (or immediately
                    when no sentence list is available for the HIRING_BACK path) */}
                {isLastSentence && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
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
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
