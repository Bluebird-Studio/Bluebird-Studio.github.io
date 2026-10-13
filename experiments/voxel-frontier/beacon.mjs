import * as THREE from 'three';
export function installBeacon(api, state, persist) {
  let crystal;
  function show() {
    if (crystal) return;
    const x = state.beaconPosition?.x ?? Math.round(api.player.x + 2);
    const z = state.beaconPosition?.z ?? Math.round(api.player.z);
    const y = state.beaconPosition?.y ?? api.world.highestAt(x, z) + 1.6;
    crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.7),
      new THREE.MeshStandardMaterial({ color: 0xffd590, emissive: 0xffac40, emissiveIntensity: 2 }));
    crystal.position.set(x, y, z);
    api.scene.add(crystal);
    const lamp = new THREE.PointLight(0xffca79, 5, 10);
    lamp.position.set(x, y, z);
    api.scene.add(lamp);
    state.beaconPosition = { x, y, z };
    persist();
  }
  if (state.beacon) show();
  function tick() { if (crystal) crystal.rotation.y += .01; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  return { show };
}
