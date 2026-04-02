/**
 * Minimal footer resolver for the starter template.
 * The Small Lift version has Tesla-specific rules — this is generic.
 */
export function resolveFooters(badge?: string): { left: string; right: string } {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    left: badge ? `${badge} · ${timestamp}` : timestamp,
    right: 'Powered by Mobeus',
  };
}
