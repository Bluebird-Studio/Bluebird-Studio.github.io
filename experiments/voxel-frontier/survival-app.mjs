import { newInventory } from './inventory.mjs';
import { mountLayout } from './survival-layout.mjs';
import { makeUI } from './survival-ui.mjs';
import { bindCraft } from './survival-craft.mjs';
import { bindMenu } from './survival-menu.mjs';
import { connectWorld } from './survival-events.mjs';
import { installBeacon } from './beacon.mjs';
import { startDayNight } from './daynight.mjs';
import { installTouchControls } from './mobile-controls.mjs';

const STORAGE = 'voxel-frontier-survival-v1';
function boot(attempt = 0) {
  const api = window.voxelFrontier;
  if (!api) {
    if (attempt < 200) setTimeout(() => boot(attempt + 1), 100);
    else document.querySelector('#error').textContent = 'Survival mode requires the updated voxel engine.';
    return;
  }
  let raw;
  try { raw = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch {}
  const state = newInventory(raw);
  const root = mountLayout();
  const ui = makeUI(root, state);
  const notice = message => { document.querySelector('#toast').textContent = message; };
  function save() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {} ui.render(); }
  connectWorld(api, state, save, notice, () => {});
  const beacon = installBeacon(api, state, save);
  startDayNight(api, label => { ui.$('day-clock').textContent = label; });
  installTouchControls(api);
  bindCraft(root, state, save, notice, beacon);
  bindMenu(root, api);
  ui.render();
}
boot();
