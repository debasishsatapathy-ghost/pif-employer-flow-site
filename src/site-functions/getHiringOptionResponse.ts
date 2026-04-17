/**
 * getHiringOptionResponse
 *
 * Source-of-truth for all hiring assistant spoken responses.
 * The agent calls this FIRST (before speaking), reads the `speakText` field
 * from the result, and speaks that text verbatim.  This guarantees consistent,
 * correct responses regardless of what the LLM would otherwise generate.
 *
 * Called by the Mobeus agent via:
 *   callSiteFunction("getHiringOptionResponse", { option: "hiring-metrics" })
 */

const RESPONSES: Record<string, string> = {
  'hiring-metrics':
    "Here's a quick look at your hiring. You have 31 active applicants " +
    "with a strong average match time of 4.2 days. Skill readiness has dropped to 79% " +
    "— down 5% since last month — leading to increased screening time. " +
    "Your pipeline is healthy, but refining your job descriptions will close this quality gap.",

  'best-applicants':
    "You have two active roles open. The Cloud Engineer role has great momentum " +
    "— 17 shortlisted and 6 interviews booked. For the Senior AI Developer role, " +
    "you have 8 strong leads, but one clear standout: Sara Khalid. " +
    "Her generative AI background is a perfect fit and she hasn't applied yet " +
    "— I'd suggest inviting her directly.",

  'market-trends':
    "Here's the market picture. In Jeddah, local AI graduates are showing " +
    "5% higher skill readiness than those in Riyadh — great for your Senior AI Developer search. " +
    "Global demand is surging but wage expectations jumped 12% this quarter. " +
    "Two of your listings are now below market rate; adjusting those will keep you competitive.",
};

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

  return {
    ok: true,
    key,
    speakText,
    // false → agent IS allowed to speak the speakText in this same turn
    disableNewResponseCreation: false,
  };
}
