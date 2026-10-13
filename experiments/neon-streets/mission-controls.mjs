// Controls are isolated from world simulation to avoid competing edits to game.js.
const pausePanel = document.getElementById('pause-panel');
const pauseButton = document.getElementById('pause-toggle');
const stats = document.getElementById('pause-stats');
let paused = false;
const game = () => window.neonHooks;
function setPause(next) {
  if (!game()?.active()) return;
  paused = Boolean(next);
  game().pause(paused);
  pausePanel.classList.toggle('hidden', !paused);
  pauseButton.textContent = paused ? 'RESUME / P' : 'PAUSE / P';
  const status = game().status();
  stats.textContent = 'Jobs: ' + status.completed + ' · Cash: $' + status.cash.toLocaleString();
}
pauseButton.addEventListener('click', () => setPause(!paused));
document.getElementById('resume').addEventListener('click', () => setPause(false));
document.getElementById('restart-run').addEventListener('click', () => {
  game()?.restart(false);
  setPause(false);
});
document.getElementById('new-career').addEventListener('click', () => {
  game()?.restart(true);
  setPause(false);
});
window.addEventListener('keydown', event => {
  if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setPause(!paused);
  }
}, true);
window.addEventListener('blur', () => { if (!paused) setPause(true); });
