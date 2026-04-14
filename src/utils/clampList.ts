/**
 * clampList — Clamps an array to a max length and returns the overflow count.
 * Used by list-based cards to prevent vertical overflow in the GridView viewport.
 */
export function clampList<T>(items: T[], max: number): { visible: T[]; overflow: number } {
    if (!items || items.length <= max) return { visible: items || [], overflow: 0 };
    return { visible: items.slice(0, max), overflow: items.length - max };
}
