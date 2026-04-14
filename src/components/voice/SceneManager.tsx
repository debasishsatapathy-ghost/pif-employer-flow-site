'use client';

import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import GridView from '@/components/cards/GridView';
import { LAYOUT_MAP } from '@/components/layouts';
import { Suspense, useCallback, useMemo } from 'react';

/**
 * SceneManager — Renders the current scene as the main page content.
 *
 * This is NOT an overlay. The scene IS the page content (minus the chat sidebar).
 * When no scene is active, this renders nothing and the static page content shows.
 * When a scene is set, it replaces the main content area.
 * When the session disconnects, the last scene remains visible.
 * There is no close button — scenes persist until replaced.
 *
 * Layout resolution:
 *   - LAYOUT|layout:<name>  → resolves to a custom layout from LAYOUT_MAP
 *   - LAYOUT|2x3, LAYOUT|1-2-3, etc. → standard GridView grid layouts
 *   - No LAYOUT directive → GridView with auto-layout
 */
export function SceneManager() {
  const currentScene = useVoiceSessionStore((s) => s.currentScene);
  const sceneActive = useVoiceSessionStore((s) => s.sceneActive);
  const navigateSceneBack = useVoiceSessionStore((s) => s.navigateSceneBack);
  const sceneHistory = useVoiceSessionStore((s) => s.sceneHistory);
  const tellAgent = useVoiceSessionStore((s) => s.tellAgent);
  const avatarVideoTrack = useVoiceSessionStore((s) => s.avatarVideoTrack);
  const avatarEnabled = useVoiceSessionStore((s) => s.avatarEnabled);
  const avatarVisible = useVoiceSessionStore((s) => s.avatarVisible);
  const skeletonLayout = useVoiceSessionStore((s) => s.skeletonLayout);

  const handleAction = useCallback(
    (phrase: string) => {
      tellAgent(phrase);
    },
    [tellAgent],
  );

  // Resolve custom layout: LAYOUT|layout:<name> → LAYOUT_MAP lookup
  const customLayout = useMemo(() => {
    const raw = currentScene?.layout;
    if (!raw) return null;
    // Only match "layout:<name>" prefix (case-insensitive)
    const match = raw.match(/^layout:(.+)$/i);
    if (!match) return null;
    const name = match[1].toLowerCase().trim();
    return LAYOUT_MAP[name] || null;
  }, [currentScene?.layout]);

  // Nothing to show — let static page content through
  if (!sceneActive && !currentScene) return null;
  if (!currentScene && !skeletonLayout) return null;

  const hasHistory = sceneHistory.length > 1;

  return (
    <div id="scene-root" className="relative flex flex-col w-full h-full min-h-0 text-white">
      {/* Avatar background layer */}
      {avatarEnabled && avatarVisible && avatarVideoTrack && (
        <div className="absolute inset-0 z-0 opacity-30">
          <video
            ref={(el) => {
              if (el && avatarVideoTrack) {
                avatarVideoTrack.attach(el);
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 scene-gradient-overlay" />
        </div>
      )}

      {/* Header — badge + optional back button */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          {hasHistory && (
            <button
              onClick={navigateSceneBack}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </button>
          )}
        </div>
        {currentScene?.badge && (
          <span className="text-xs font-medium text-white/50 tracking-wider uppercase font-data">
            {currentScene.badge}
          </span>
        )}
      </header>

      {/* Title area */}
      {(currentScene?.title || currentScene?.subtitle) && (
        <div className="relative z-10 px-6 pb-4 shrink-0">
          {currentScene?.title && (
            <h1 className="text-2xl font-bold tracking-tight font-hero">
              {currentScene.title}
            </h1>
          )}
          {currentScene?.subtitle && (
            <p className="text-sm text-white/60 mt-1 font-voice">
              {currentScene.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Main content — Custom Layout, GridView, or Skeleton */}
      <main className="relative z-10 flex-1 px-6 pb-4 overflow-auto min-h-0">
        {skeletonLayout ? (
          <SceneSkeleton layout={skeletonLayout} />
        ) : customLayout && currentScene ? (
          /* Custom layout: full control over rendering */
          <Suspense
            fallback={
              <div className="animate-pulse h-full bg-white/5 rounded-xl" />
            }
          >
            {(() => {
              const LayoutComponent = customLayout;
              return (
                <LayoutComponent
                  cards={currentScene.cards || []}
                  badge={currentScene.badge}
                  layout={currentScene.layout}
                  maxRows={currentScene.maxRows}
                />
              );
            })()}
          </Suspense>
        ) : currentScene?.cards && currentScene.cards.length > 0 ? (
          /* Standard GridView: grid/mosaic/vertical layouts */
          <Suspense
            fallback={
              <div className="animate-pulse h-full bg-white/5 rounded-xl" />
            }
          >
            <GridView
              badge={currentScene.badge}
              layout={currentScene.layout}
              cards={currentScene.cards}
              maxRows={currentScene.maxRows}
            />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 font-data">
            Awaiting data...
          </div>
        )}
      </main>

      {/* Footer */}
      {(currentScene?.footerLeft || currentScene?.footerRight) && (
        <footer className="relative z-10 flex items-center justify-between px-6 py-3 text-xs text-white/40 shrink-0 font-data">
          <span>{currentScene.footerLeft || ''}</span>
          <span>{currentScene.footerRight || ''}</span>
        </footer>
      )}
    </div>
  );
}

/** Skeleton loading grid — shows shimmer cards matching the layout */
function SceneSkeleton({ layout }: { layout: string }) {
  const rows = layout.includes('x')
    ? (() => {
        const [cols, rowCount] = layout.split('x').map(Number);
        return Array(rowCount).fill(cols);
      })()
    : layout.split('-').map(Number);

  return (
    <div className="h-full flex flex-col gap-3">
      {rows.map((colCount, rowIdx) => (
        <div
          key={rowIdx}
          className="flex-1 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
        >
          {Array(colCount)
            .fill(0)
            .map((_, colIdx) => {
              const delay = `${(rowIdx * colCount + colIdx) * 120}ms`;
              return (
                <div
                  key={colIdx}
                  className="rounded-xl animate-skeleton-bounce skeleton-shimmer-bg"
                  style={{
                    minHeight: rowIdx === 0 ? '60px' : '120px',
                    animationDelay: delay,
                  }}
                >
                  <div className="p-4 space-y-3">
                    <div
                      className="h-3 rounded-full w-1/3"
                      style={{ background: 'rgba(255,255,255,0.12)', animationDelay: delay }}
                    />
                    <div
                      className="h-2 rounded-full w-2/3"
                      style={{ background: 'rgba(255,255,255,0.08)', animationDelay: `calc(${delay} + 80ms)` }}
                    />
                    {rowIdx > 0 && (
                      <>
                        <div
                          className="h-2 rounded-full w-1/2"
                          style={{ background: 'rgba(255,255,255,0.06)', animationDelay: `calc(${delay} + 160ms)` }}
                        />
                        <div
                          className="h-8 rounded-lg w-full mt-2"
                          style={{ background: 'rgba(255,255,255,0.05)', animationDelay: `calc(${delay} + 240ms)` }}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
