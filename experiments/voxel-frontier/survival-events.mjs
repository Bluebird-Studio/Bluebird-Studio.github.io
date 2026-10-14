import { mine, place } from './inventory.mjs';
export function connectWorld(api, state, onUpdate, notify, sound) {
  const world = api.world;
  const originalSet = world.set.bind(world);
  world.set = (x, y, z, kind) => {
    const previous = world.get(x, y, z);
    const building = previous === null && kind !== null;
    if (building && !(state.inventory[kind] > 0)) {
      notify('Out of ' + kind + ' - mine some first');
      sound(180);
      return false;
    }
    const result = originalSet(x, y, z, kind);
    if (!result) return false;
    if (previous !== null && kind === null) {
      const gained = mine(state, previous);
      notify('+' + gained + ' ' + previous);
      sound(340 + gained * 60);
    } else if (building) {
      place(state, kind);
      sound(240);
    }
    onUpdate();
    return true;
  };
}
