import * as THREE from 'three';
export function startDayNight(api, updateLabel) {
  const sun = api.scene.children.find(node => node.isDirectionalLight);
  const day = new THREE.Color(0x9bc6cf), night = new THREE.Color(0x13213b);
  const started = performance.now();
  let lastLabel = 0;
  function tick(now) {
    const phase = (now - started) / 240000 * Math.PI * 2;
    const brightness = Math.max(.08, (Math.cos(phase) + 1) / 2);
    api.scene.background.copy(night).lerp(day, brightness);
    if (api.scene.fog) api.scene.fog.color.copy(api.scene.background);
    if (sun) sun.intensity = .3 + brightness * 2;
    if (now - lastLabel > 2000) {
      updateLabel(brightness > .34 ? 'DAYLIGHT' : 'NIGHTFALL');
      lastLabel = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
