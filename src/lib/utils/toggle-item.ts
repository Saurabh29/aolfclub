/**
 * Generic array toggle helper — adds item if absent, removes if present.
 * Used by all filter panes and selection UIs.
 */
export function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}
