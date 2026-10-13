export function bindMenu(root, api) {
  const $ = id => root.querySelector('#' + id);
  const panel = $('pack-panel'), toggle = $('pack-toggle');
  function open(show) {
    panel.hidden = !show;
    toggle.setAttribute('aria-expanded', String(show));
    if (show) { document.exitPointerLock?.(); $('pack-close').focus(); }
  }
  toggle.addEventListener('click', () => open(panel.hidden));
  $('pack-close').addEventListener('click', () => open(false));
  $('resume-game').addEventListener('click', () => open(false));
  document.addEventListener('keydown', event => {
    if (event.code === 'KeyE' && api.playing && !event.repeat) {
      event.preventDefault(); open(panel.hidden);
    }
    if (event.code === 'Escape' && !panel.hidden) open(false);
  });
  $('reset-world').addEventListener('click', () => {
    if (!confirm('Erase world and expedition progress?')) return;
    try { localStorage.removeItem('voxel-frontier-survival-v1'); } catch {}
    api.resetWorld();
  });
  $('sound-toggle').hidden = true;
}
