'use client';

import { useCallback } from 'react';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { assets } from '@/assets';

export function BackgroundLayer() {
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const agentState = useVoiceSessionStore((s) => s.agentState);
  const avatarVideoTrack = useVoiceSessionStore((s) => s.avatarVideoTrack);
  const avatarEnabled = useVoiceSessionStore((s) => s.avatarEnabled);
  const avatarVisible = useVoiceSessionStore((s) => s.avatarVisible);
  const avatarThumbnailUrl = useVoiceSessionStore((s) => s.avatarThumbnailUrl);

  const isConnected = sessionState === 'connected';
  const isConnecting = sessionState === 'connecting';
  const showPulse = isConnecting || (isConnected && agentState === 'thinking');
  const showAvatarVideo = avatarEnabled && avatarVisible && !!avatarVideoTrack;
  const bgImage = avatarThumbnailUrl || assets.backgroundHero;

  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && avatarVideoTrack) {
        avatarVideoTrack.attach(el);
      }
    },
    [avatarVideoTrack]
  );

  return (
    <>
      {/* Base hero background — fallback when avatar video is not active */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'right top',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          minWidth: '100vw',
          minHeight: '100vh',
          opacity: showAvatarVideo ? 0 : isConnected ? 1 : 0.8,
          filter: `brightness(var(--theme-video-brightness)) saturate(var(--theme-video-saturate))`,
          transition: 'opacity 0.6s ease, filter 0.6s ease',
        }}
      />

      {/* Avatar video — full viewport, visible through scene gradient AND chat panel */}
      {showAvatarVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'right center',
              filter: `brightness(var(--theme-video-brightness)) saturate(var(--theme-video-saturate))`,
            }}
          />
        </div>
      )}

      {/* Pulsing overlay — visible while connecting or thinking */}
      {showPulse && !showAvatarVideo && (
        <div
          className="hero-pulse-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            backgroundImage: `url(${bgImage})`,
            backgroundPosition: 'right top',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            minWidth: '100vw',
            minHeight: '100vh',
            filter: `brightness(var(--theme-video-brightness)) saturate(var(--theme-video-saturate))`,
          }}
        />
      )}
    </>
  );
}
