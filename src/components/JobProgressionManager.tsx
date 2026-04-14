'use client';

/**
 * JobProgressionManager — singleton component mounted at the app root.
 *
 * Previously owned a timer that auto-advanced job stages (initial → screening
 * → shortlisted).  That timed-transition behaviour has been removed.
 *
 * On mount it still evicts stale progressions that were created in a prior
 * browser session (older than 5 min), so stale IDs never linger in the store.
 *
 * The toast helper is kept here so other parts of the UI (e.g. the invite-to-
 * screening flow) can call showProgressionToast without a separate import.
 */

import { useEffect, useRef } from 'react';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

// Progressions older than this at mount time come from a prior browser session
// and will never match a job in the current UI.  Evict them on startup.
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/* ── Toast helper ─────────────────────────────────────────────────────────── */
// Pure DOM manipulation — no React dependency — so it can be called from
// anywhere without causing re-renders.
export function showProgressionToast(title: string, body: string) {
  if (typeof document === 'undefined') return;

  // Inject keyframes once
  if (!document.getElementById('__pif-toast-styles')) {
    const style = document.createElement('style');
    style.id = '__pif-toast-styles';
    style.textContent = `
      @keyframes __pif-slide-in  { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes __pif-slide-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(80px); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 320px;
    padding: 14px 18px;
    border-radius: 14px;
    background: rgba(20, 20, 28, 0.92);
    border: 1px solid rgba(255,255,255,0.10);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    animation: __pif-slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
    pointer-events: none;
  `;

  const titleEl = document.createElement('span');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 0.01em;';

  const bodyEl = document.createElement('span');
  bodyEl.textContent = body;
  bodyEl.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.60); line-height: 1.5;';

  toast.appendChild(titleEl);
  toast.appendChild(bodyEl);
  document.body.appendChild(toast);

  // Auto-dismiss after 4 s
  setTimeout(() => {
    toast.style.animation = '__pif-slide-out 0.3s cubic-bezier(0.4,0,1,1) both';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 320);
  }, 4000);
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function JobProgressionManager() {
  const setJobProgression = useVoiceSessionStore((s) => s.setJobProgression);
  const clearJobProgressions = useVoiceSessionStore((s) => s.clearJobProgressions);

  const storeRef = useRef({ setJobProgression });
  useEffect(() => {
    storeRef.current = { setJobProgression };
  });

  // On mount: evict progressions from a prior browser session that are older
  // than STALE_THRESHOLD_MS.  They can never match a current job card.
  useEffect(() => {
    const now = Date.now();
    const current = useVoiceSessionStore.getState().jobProgressions;
    const staleIds = Object.keys(current).filter(
      (id) => now - current[id].postedAt > STALE_THRESHOLD_MS
    );
    if (staleIds.length === 0) return;

    const freshCount = Object.keys(current).length - staleIds.length;
    if (freshCount === 0) {
      clearJobProgressions();
    } else {
      for (const id of staleIds) {
        storeRef.current.setJobProgression(id, { ...current[id] });
      }
    }
  }, []); // run once on mount

  return null;
}
