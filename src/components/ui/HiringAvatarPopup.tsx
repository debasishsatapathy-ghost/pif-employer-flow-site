'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

// Exact scripted responses — do not paraphrase or shorten
const HIRING_METRICS_SCRIPT =
  `Here's a quick look at your hiring. You have 31 active applicants with a strong average match time of 4.2 days. ` +
  `However, skill readiness has dropped to 79% (down 5% since last month), leading to increased screening time. ` +
  `While your pipeline is healthy, refine your job descriptions to close this quality gap and attract better-fit talent.`;

const BEST_APPLICANTS_SCRIPT =
  `You have two active roles open. ` +
  `The Cloud Engineer role has great momentum with 17 shortlisted and 6 interviews booked. ` +
  `For the Senior AI Developer role, you have 8 strong leads but one standout from the talent pool. ` +
  `Sara Khalid is a perfect match with her generative AI background—she hasn't applied yet, so I'd suggest inviting her to apply.`;

const MARKET_TRENDS_SCRIPT =
  `Here's a look at the market: ` +
  `In Jeddah local AI graduates are showing 5% higher skill readiness than those in Riyadh, which is great for your Senior AI Developer search. ` +
  `While global demand is surging, wage expectations have jumped 12% this quarter. ` +
  `Two of your listings are now below market rate, adjusting those will keep you competitive.`;

const PILLS = [
  {
    id: 'hiring-metrics',
    label: 'Hiring Metrics',
    script: HIRING_METRICS_SCRIPT,
  },
  {
    id: 'best-applicants',
    label: 'Best Applicants',
    script: BEST_APPLICANTS_SCRIPT,
  },
  {
    id: 'market-trends',
    label: 'Market Trends',
    script: MARKET_TRENDS_SCRIPT,
  },
] as const;

interface HiringAvatarPopupProps {
  open: boolean;
  onClose: () => void;
  onOptionClick: (script: string) => void;
}

export function HiringAvatarPopup({ open, onClose, onOptionClick }: HiringAvatarPopupProps) {
  const avatarVideoTrack   = useVoiceSessionStore((s) => s.avatarVideoTrack);
  const avatarEnabled      = useVoiceSessionStore((s) => s.avatarEnabled);
  const avatarAvailable    = useVoiceSessionStore((s) => s.avatarAvailable);
  // Subscribe to audio element so we can forcefully unmute it the moment it arrives
  const avatarAudioElement = useVoiceSessionStore((s) => s.avatarAudioElement);

  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // Attach live video track whenever it arrives or changes
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

  // Forcefully unmute avatar audio the moment it arrives while popup is open.
  // This overrides any muting applied by the platform-level mute loop in
  // EmployerDashboard (which runs before hiringAvatarActiveRef is set to true).
  useEffect(() => {
    if (!open || !avatarAudioElement) return;
    avatarAudioElement.muted = false;
    avatarAudioElement.volume = 1;
    avatarAudioElement.play().catch(() => {});
  }, [avatarAudioElement, open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const showLiveVideo = avatarEnabled && !!avatarVideoTrack;
  // Show spinner any time the avatar is available but live video isn't here yet —
  // this includes the brief window before toggleAvatarHard() response arrives.
  const showLoading = avatarAvailable && !showLiveVideo;
  // Only fall back to the static image when the avatar feature is genuinely unavailable.
  const showStaticFallback = !showLiveVideo && !avatarAvailable;

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
            height: 280,
            pointerEvents: 'none',
          }}
        >
          {/* Green radial glow behind avatar */}
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

          {/* Avatar circle — 174×174px round frame */}
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
              border: '12px solid rgba(255,255,255,0.05)',
              background: 'radial-gradient(circle at 40% 40%, rgba(22,163,74,0.5), rgba(5,46,22,0.8))',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* LIVE video — always in DOM, hidden until track arrives.
                CSS: scale 2.2× anchored at 50% 8% from the top — this zooms
                into the upper face zone of a HeyGen portrait avatar video. */}
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
                objectPosition: 'center top',
                transform: 'scale(2.2)',
                transformOrigin: '50% 8%',
                display: showLiveVideo ? 'block' : 'none',
              }}
            />

            {/* Loading spinner while avatar is enabling but track not yet arrived */}
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

            {/* Static fallback — only shown when avatarAvailable is false */}
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
                  objectPosition: 'center top',
                  transform: 'scale(2.2)',
                  transformOrigin: '50% 8%',
                }}
              />
            )}
          </motion.div>

          {/* Speech bubble "How can I help?" */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, delay: 0.12 }}
            style={{
              position: 'absolute',
              bottom: 195,
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

          {/* Three glassmorphic option pills */}
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              right: 165,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
              pointerEvents: 'auto',
            }}
          >
            {PILLS.map((pill, i) => (
              <motion.button
                key={pill.id}
                initial={{ opacity: 0, x: 20, scale: 0.85 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.85 }}
                transition={{
                  duration: 0.22,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.18 + i * 0.06,
                }}
                onClick={() => onOptionClick(pill.script)}
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
                {pill.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
