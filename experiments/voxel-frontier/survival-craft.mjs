import { craft } from './inventory.mjs';
export function bindCraft(root, state, save, notice, beacon) {
  const $ = id => root.querySelector('#' + id);
  $('craft-grid').addEventListener('click', event => {
    const id = event.target.closest('button[data-recipe]')?.dataset.recipe;
    if (!id || !craft(state, id)) return;
    save();
    notice(id === 'pickaxe' ? 'STONE PICKAXE: 2× STONE!' : 'BEACON CRAFTED: PLACE IT!');
  });
  $('place-beacon').addEventListener('click', () => {
    if (!state.beacon || state.beaconPosition) return;
    beacon.show(); save(); notice('EXPEDITION COMPLETE: SIGNAL LIT!');
  });
}
