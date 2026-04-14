'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { registerSiteFunctions } from '@/site-functions/register';

interface VoiceSessionProviderProps {
  children: React.ReactNode;
}

export function VoiceSessionProvider({ children }: VoiceSessionProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const disconnect = useVoiceSessionStore((state) => state.disconnect);
  const preWarm = useVoiceSessionStore((state) => state.preWarm);
  const pushToTalkRef = useRef(false);

  // Initialize dark theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  // Pre-warm the LiveKit room on page load.
  useEffect(() => {
    preWarm();
  }, [preWarm]);

  // Listen for agent navigation commands
  useEffect(() => {
    const handleAgentNavigate = (event: CustomEvent) => {
      const { page, params } = event.detail;

      let url = page;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url = `${page}?${searchParams.toString()}`;
      }

      const { sceneActive, clearScene, informAgent } = useVoiceSessionStore.getState();
      if (sceneActive) {
        clearScene();
      }

      router.push(url);
      informAgent(`User navigated to ${url}. The scene has been dismissed.`);
    };

    window.addEventListener('agent-navigate', handleAgentNavigate as EventListener);

    return () => {
      window.removeEventListener('agent-navigate', handleAgentNavigate as EventListener);
    };
  }, [router]);

  // Inform agent when user navigates while scene is active
  useEffect(() => {
    const { sceneActive, clearScene, informAgent, sessionState } = useVoiceSessionStore.getState();

    if (sceneActive && sessionState === 'connected') {
      clearScene();
      informAgent(`User navigated to ${pathname}. The scene has been dismissed.`);
    }
  }, [pathname]);

  // Register site functions on window.__siteFunctions
  useEffect(() => {
    registerSiteFunctions();
  }, []);

  // ── Keyboard shortcuts ──
  // SHIFT+M  → toggle mic mute
  // SHIFT+A  → toggle avatar visibility
  // SHIFT+V  → toggle volume (output mute)
  // SHIFT+S  → toggle chat sidebar
  // SPACE    → push-to-talk (hold to unmute while muted)
  const isTextInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      (el as HTMLElement).isContentEditable
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextInputFocused()) return;

      const { sessionState, isMuted, toggleMute, toggleVolume, toggleAvatarVisible, toggleChatPanel } =
        useVoiceSessionStore.getState();
      if (sessionState !== 'connected') return;

      // SHIFT + key shortcuts
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toUpperCase()) {
          case 'M':
            e.preventDefault();
            toggleMute();
            return;
          case 'A':
            e.preventDefault();
            toggleAvatarVisible();
            return;
          case 'V':
            e.preventDefault();
            toggleVolume();
            return;
          case 'S':
            e.preventDefault();
            toggleChatPanel();
            return;
        }
      }

      // SPACEBAR push-to-talk (only when muted, no modifiers)
      if (e.code === 'Space' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isMuted && !pushToTalkRef.current) {
          e.preventDefault();
          pushToTalkRef.current = true;
          toggleMute(); // unmute
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && pushToTalkRef.current) {
        e.preventDefault();
        pushToTalkRef.current = false;
        const { sessionState, toggleMute } = useVoiceSessionStore.getState();
        if (sessionState === 'connected') {
          toggleMute(); // re-mute
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTextInputFocused]);

  // Cleanup on unmount (app close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disconnect]);

  return <>{children}</>;
}
