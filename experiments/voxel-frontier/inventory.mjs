export const RECIPES = {
  pickaxe: { name: 'Stone Pickaxe', cost: { stone: 3, wood: 2 } },
  beacon: { name: 'Signal Beacon', cost: { stone: 8, wood: 4, grass: 2 }, requires: 'pickaxe' }
};
export function newInventory(raw) {
  const ok = raw && raw.version === 1;
  const safe = x => Number.isSafeInteger(x) ? Math.max(0, Math.min(9999, x)) : 0;
  const inventory = ok ? {
    grass: safe(raw.inventory?.grass),
    stone: safe(raw.inventory?.stone),
    wood: safe(raw.inventory?.wood)
  } : { grass: 8, stone: 0, wood: 0 };
  return { version: 1, inventory, pickaxe: !!(ok && raw.pickaxe),
    beacon: !!(ok && raw.beacon), mined: ok ? safe(raw.mined) : 0,
    placed: ok ? safe(raw.placed) : 0, beaconPosition: ok ? raw.beaconPosition || null : null };
}
export function canCraft(s, name) {
  const recipe = RECIPES[name];
  return !!recipe && !s[name] && (!recipe.requires || s[recipe.requires]) &&
    Object.entries(recipe.cost).every(([type, n]) => s.inventory[type] >= n);
}
export function craft(s, name) {
  if (!canCraft(s, name)) return false;
  for (const [type, n] of Object.entries(RECIPES[name].cost)) s.inventory[type] -= n;
  s[name] = true;
  return true;
}
export function mine(s, type) {
  if (!(type in s.inventory)) return 0;
  const amount = type === 'stone' && s.pickaxe ? 2 : 1;
  s.inventory[type] += amount;
  s.mined++;
  return amount;
}
export function place(s, type) {
  if (!(type in s.inventory) || s.inventory[type] <= 0) return false;
  s.inventory[type]--;
  s.placed++;
  return true;
}
