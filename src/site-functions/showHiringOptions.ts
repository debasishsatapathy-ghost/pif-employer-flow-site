/**
 * showHiringOptions
 *
 * Called by the Mobeus voice agent via callSiteFunction RPC.
 * - BEFORE greeting: agent calls this first → bubbles appear → agent speaks
 * - AFTER each option response: agent calls this again → bubbles reappear
 *
 * Returns disableNewResponseCreation: true so the platform does not
 * auto-generate a follow-up turn after the agent speaks — matching the
 * HARD STOP pattern from the candidate welcome journey.
 *
 * Expected args shape:
 *   { options: Array<{ label: string; value?: string }> }
 */
export default function showHiringOptions(
  args: { options?: Array<{ label: string; value?: string }> }
) {
  if (typeof window === 'undefined') return { ok: false };

  const options = args?.options ?? [];
  window.dispatchEvent(
    new CustomEvent('hiring-avatar-options', { detail: { options } })
  );

  return {
    ok: true,
    // Tells Mobeus platform: don't auto-create another agent turn.
    // The agent speaks its scripted line in THIS turn, then waits.
    disableNewResponseCreation: true,
    next: 'HARD STOP',
  };
}
