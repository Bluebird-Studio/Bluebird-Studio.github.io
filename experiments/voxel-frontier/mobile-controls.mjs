/** Touch buttons use the engine's existing keyboard bindings and public action API. */
export function installTouchControls(api) {
  const root = document.querySelector('#mobile-controls');
  const canvas = document.querySelector('#game canvas');
  const releaseAll = new Set();
  for (const button of root.querySelectorAll('[data-code]')) {
    const code = button.dataset.code;
    const dispatch = type => document.dispatchEvent(new KeyboardEvent(type, { bubbles: true, code }));
    const release = () => { dispatch('keyup'); button.classList.remove('pressed'); };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      dispatch('keydown');
      button.classList.add('pressed');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    releaseAll.add(release);
  }
  window.addEventListener('blur', () => { for (const release of releaseAll) release(); });
  for (const action of ['mine', 'place']) {
    root.querySelector('[data-action="' + action + '"]').addEventListener('pointerdown', event => {
      event.preventDefault();
      if (api.playing) api[action]();
    });
  }
  let touchId = null, lastX = 0, lastY = 0;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    if (!api.playing || touchId !== null) return;
    const touch = event.changedTouches[0];
    touchId = touch.identifier;
    lastX = touch.clientX;
    lastY = touch.clientY;
  }, { passive: false });
  canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    if (touchId === null) return;
    const touch = Array.from(event.changedTouches).find(item => item.identifier === touchId);
    if (!touch) return;
    api.player.yaw -= (touch.clientX - lastX) * .005;
    api.player.pitch = Math.max(-1.48, Math.min(1.48, api.player.pitch - (touch.clientY - lastY) * .005));
    lastX = touch.clientX;
    lastY = touch.clientY;
  }, { passive: false });
  for (const name of ['touchend', 'touchcancel'])
    canvas.addEventListener(name, event => {
      if (Array.from(event.changedTouches).some(touch => touch.identifier === touchId)) touchId = null;
    });
}
