/**
 * getHiringOptionResponse
 *
 * Source-of-truth for all hiring assistant spoken responses.
 * The agent calls this FIRST (before speaking), reads the `speakText` field
 * from the result, and speaks that text verbatim.  This guarantees consistent,
 * correct responses regardless of what the LLM would otherwise generate.
 *
 * The `sentences` array drives the sentence-by-sentence caption display in
 * HiringAvatarPopup. Each element is shown one at a time as the agent speaks,
 * advancing when the next sentence's opening words appear in the transcript.
 *
 * Called by the Mobeus agent via:
 *   callSiteFunction("getHiringOptionResponse", { option: "hiring-metrics" })
 */

// Each response is broken into display sentences. The full speakText is the
// sentences joined by a space — what the agent actually speaks verbatim.
const SENTENCES: Record<string, string[]> = {
  'hiring-metrics': [
    "Here's a quick look at your hiring.",
    "You have 107 active applicants with a strong average match time of 4.2 days.",
    "However, skill readiness has dropped to 79% — down 5% since last month — leading to increased screening time.",
    "While your pipeline is healthy, refine your job descriptions to close this quality gap and attract better-fit talent.",
  ],

  'best-applicants': [
    "You have two active roles open.",
    "The Cloud Engineer role has great momentum with 17 shortlisted and 6 interviews booked.",
    "For the Senior AI Developer role, you have 8 strong leads but one standout from the talent pool.",
    "Sara Khalid is a perfect match with her generative AI background — she hasn't applied yet, so I'd suggest inviting her to apply.",
  ],

  'market-trends': [
    "Here's a look at the market:",
    "In Jeddah, local AI graduates are showing 5% higher skill readiness than those in Riyadh, which is great for your Senior AI Developer search.",
    "While global demand is surging, wage expectations have jumped 12% this quarter.",
    "Two of your listings are now below market rate — adjusting those will keep you competitive.",
  ],
};

// speakText = sentences joined — agent speaks this verbatim
const RESPONSES: Record<string, string> = Object.fromEntries(
  Object.entries(SENTENCES).map(([key, sents]) => [key, sents.join(' ')]),
);

// Normalise user-facing labels → internal keys
const LABEL_TO_KEY: Record<string, string> = {
  'hiring metrics':  'hiring-metrics',
  'best applicants': 'best-applicants',
  'market trends':   'market-trends',
  // Also accept the exact value strings
  'hiring-metrics':  'hiring-metrics',
  'best-applicants': 'best-applicants',
  'market-trends':   'market-trends',
};

export default function getHiringOptionResponse(
  args: { option?: string; label?: string; value?: string }
) {
  if (typeof window === 'undefined') return { ok: false };

  const raw = (args?.option ?? args?.label ?? args?.value ?? '').toLowerCase().trim();
  const key = LABEL_TO_KEY[raw] ?? raw;
  const speakText = RESPONSES[key];

  if (!speakText) {
    console.warn('[getHiringOptionResponse] Unknown option:', raw);
    return { ok: false, error: `Unknown option: ${raw}` };
  }

  const sentences = SENTENCES[key] ?? [];

  // Dispatch a DOM event so HiringAvatarPopup can drive sentence-by-sentence
  // caption display. Fires synchronously before the agent starts speaking so
  // the first sentence is already showing when audio begins.
  window.dispatchEvent(
    new CustomEvent('hiring-option-sentences', { detail: { key, sentences } }),
  );

  return {
    ok: true,
    key,
    speakText,
    sentences,
    // false → agent IS allowed to speak the speakText in this same turn
    disableNewResponseCreation: false,
  };
}
