/**
 * showHiringOptions
 *
 * Called by the Mobeus voice agent via callSiteFunction RPC when the hiring
 * assistant overlay is open. Dispatches a custom DOM event that
 * HiringAvatarPopup listens to, driving the option bubbles purely from the
 * agent rather than from hardcoded React state.
 *
 * Expected args shape:
 *   { options: Array<{ label: string; value?: string }> }
 */
export default function showHiringOptions(
  args: { options?: Array<{ label: string; value?: string }> }
) {
  if (typeof window === 'undefined') return { success: false };

  const options = args?.options ?? [];
  window.dispatchEvent(
    new CustomEvent('hiring-avatar-options', { detail: { options } })
  );
  return { success: true };
}
