/**
 * Destination categories store their icon as either an emoji (picked in the admin screen) or a
 * plain name from the original seed data ("waves", "bed"…). Printing a name as text showed the
 * word itself, cut off inside the icon badge ("bed", "mo", "wav"). Always show an emoji.
 */
const NAMED: Record<string, string> = {
  waves: '🌊', wave: '🌊', beach: '🏖', tree: '🌳', nature: '🌿', leaf: '🌿',
  landmark: '🏛', culture: '🏛', mountain: '⛰', adventure: '🧗', utensils: '🍽', food: '🍽',
  bed: '🛏', hotel: '🏨', shopping: '🛍', boat: '⛵', bird: '🦅', camera: '📷', church: '⛪',
  water: '💧', waterfall: '💧', island: '🏝', park: '🌳', star: '⭐',
};

export function categoryEmoji(icon: string | null | undefined): string {
  const v = (icon ?? '').trim();
  if (!v) return '📍';
  // Anything that isn't plain ASCII letters is already an emoji/symbol.
  if (!/^[a-z_\- ]+$/i.test(v)) return v;
  return NAMED[v.toLowerCase()] ?? '📍';
}
