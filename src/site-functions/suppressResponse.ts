/**
 * suppressResponse
 *
 * Called by the agent when its role is silent visual presence
 * (e.g. the Home Dashboard avatar context [HOME_ASSISTANT_SILENT]).
 * Returns disableNewResponseCreation: true — instructs the Mobeus
 * platform not to generate any speech or follow-up agent turn.
 */
export default function suppressResponse(_args?: Record<string, unknown>) {
  return {
    ok: true,
    disableNewResponseCreation: true,
    next: 'HARD STOP',
  };
}
