/**
 * setTheme — Switch the website theme dynamically.
 *
 * @param args.theme - 'light' | 'dark' | 'system'
 *
 * Registered as window.__siteFunctions.setTheme
 * The voice agent can call this via the callSiteFunction RPC.
 */
export default function setTheme(args: { theme: 'light' | 'dark' | 'system' }): { success: boolean; theme: string } {
  const { theme } = args;

  if (!['light', 'dark', 'system'].includes(theme)) {
    return { success: false, theme: 'unknown' };
  }

  const root = document.documentElement;

  if (theme === 'system') {
    root.classList.remove('light', 'dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }

  // Persist choice
  try {
    localStorage.setItem('theme-preference', theme);
  } catch {
    // ignore
  }

  return { success: true, theme };
}
