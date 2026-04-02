'use client';

import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { SceneManager } from '@/components/voice/SceneManager';
import { useEffect } from 'react';

/** Always-mounted keyboard navigation for scene back/forward */
function SceneKeyboardNav() {
  const navigateSceneBack = useVoiceSessionStore((s) => s.navigateSceneBack);
  const navigateSceneForward = useVoiceSessionStore((s) => s.navigateSceneForward);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      const { sceneActive, sceneFuture, sceneHistory } = useVoiceSessionStore.getState();

      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (sceneActive && sceneHistory.length > 0) {
          e.preventDefault();
          navigateSceneBack();
        }
      } else if (e.key === 'ArrowRight') {
        if (sceneFuture.length > 0) {
          e.preventDefault();
          navigateSceneForward();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateSceneBack, navigateSceneForward]);

  return null;
}

/**
 * SceneLayout — Renders SceneManager as page content when a scene is active,
 * otherwise shows the page's static children. Scene replaces page content
 * (not an overlay) and persists after session disconnect.
 */
export function SceneLayout({ children }: { children: React.ReactNode }) {
  const currentScene = useVoiceSessionStore((s) => s.currentScene);
  const sceneActive = useVoiceSessionStore((s) => s.sceneActive);
  const skeletonLayout = useVoiceSessionStore((s) => s.skeletonLayout);

  // Show SceneManager when scene is active OR when there's content to show
  const showScene = sceneActive || currentScene || skeletonLayout;

  return (
    <>
      <SceneKeyboardNav />
      {showScene ? (
        <SceneManager />
      ) : (
        children
      )}
    </>
  );
}
