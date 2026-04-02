import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const cache = new Map<string, LucideIcon | null>();

/**
 * Look up a Lucide icon by name. Supports exact match, PascalCase,
 * and case-insensitive fallback. Returns null if not found.
 */
export function getIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  if (cache.has(iconName)) return cache.get(iconName)!;

  const icons = LucideIcons as Record<string, unknown>;

  // Exact match
  if (icons[iconName] && typeof icons[iconName] === 'function') {
    cache.set(iconName, icons[iconName] as LucideIcon);
    return icons[iconName] as LucideIcon;
  }

  // kebab → PascalCase: "arrow-right" → "ArrowRight"
  const pascal = iconName
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  if (icons[pascal] && typeof icons[pascal] === 'function') {
    cache.set(iconName, icons[pascal] as LucideIcon);
    return icons[pascal] as LucideIcon;
  }

  // Case-insensitive
  const lower = iconName.toLowerCase();
  for (const key of Object.keys(icons)) {
    if (key.toLowerCase() === lower && typeof icons[key] === 'function') {
      cache.set(iconName, icons[key] as LucideIcon);
      return icons[key] as LucideIcon;
    }
  }

  cache.set(iconName, null);
  return null;
}

export function getIconOrFallback(
  iconName?: string,
  fallback: LucideIcon = LucideIcons.Zap,
): LucideIcon {
  return getIcon(iconName) ?? fallback;
}
