import * as THREE from 'three';
export function installBeacon(api, state, persist) {
  let crystal = null;
  function show() {
    if (crystal || !state.beacon) return false;
    const x = state.beaconPosition?.x ?? Math.round(api.player.x);
    const z = state.beaconPosition?.z ?? Math.round(api.player.z);
    const y = state.beaconPosition?.y ?? api.world.highestAt(x, z) + 1.5;
    crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.7),
      new THREE.MeshStandardMaterial({ color: 0xffd590, emissive: 0xffac40, emissiveIntensity: 2.2 }));
    crystal.position.set(x, y, z);
    api.scene.add(crystal);
    const lamp = new THREE.PointLight(0xffca79, 5, 12);
    lamp.position.set(x, y, z);
    api.scene.add(lamp);
    state.beaconPosition = { x, y, z };
    persist();
    return true;
  }
  if (state.beacon && state.beaconPosition) show();
  function tick(now) {
    if (crystal) {
      crystal.rotation.y += .012;
      crystal.position.y = state.beaconPosition.y + Math.sin(now / 400) * .12;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { show };
}
