/**
 * Badge colour keys → Tailwind classes. One shared map so a tenant's chosen
 * option-set colours render identically wherever a status or picklist value
 * is shown — the customization hub, the list panels, everywhere.
 */
export const BADGE_CLASS: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  blue: "bg-blue-50 text-blue-700",
  indigo: "bg-indigo-50 text-indigo-700",
  purple: "bg-purple-50 text-purple-700",
  pink: "bg-pink-50 text-pink-700",
};

/** The eight colour keys a tenant can pick for an option. */
export const BADGE_COLORS = Object.keys(BADGE_CLASS);

/** Resolve a colour key to its badge classes, defaulting to gray. */
export function badgeClass(color: string): string {
  return BADGE_CLASS[color] ?? BADGE_CLASS.gray!;
}
