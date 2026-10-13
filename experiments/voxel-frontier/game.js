import * as THREE from 'three';

const game = document.querySelector('#game');
const hud = document.querySelector('#stats');
const toast = document.querySelector('#toast');
const start = document.querySelector('#start');
const error = document.querySelector('#error');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc6cf);
scene.fog = new THREE.Fog(0x9bc6cf, 18, 54);
const camera = new THREE.PerspectiveCamera(77, innerWidth / innerHeight, 0.05, 90);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
game.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe5f4ff, 0x4d5b3e, 2.0));
const sun = new THREE.DirectionalLight(0xfff1c6, 2.2);
sun.position.set(-12, 26, 18);
scene.add(sun);
const size = 13;
const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x729b5d }),
  stone: new THREE.MeshLambertMaterial({ color: 0x8d9da0 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x9e704b })
};
const box = new THREE.BoxGeometry(1, 1, 1);
const map = new Map();
const meshes = [];
const key = (x, y, z) => x + ',' + y + ',' + z;
const groundHeight = (x, z) => Math.max(0, Math.floor(2.1 + Math.sin(x / 3.5) * 1.2 + Math.cos(z / 4.1) * 1.3));
const editsKey = 'voxel-frontier-world-v1';
let edits = {};
try { edits = JSON.parse(localStorage.getItem(editsKey) || '{}') || {}; } catch { edits = {}; }
function notify(message) {
  toast.textContent = message;
}
function addBlock(x, y, z, kind, record = false) {
  const id = key(x, y, z);
  if (map.has(id)) return false;
  const m = new THREE.Mesh(box, materials[kind] || materials.stone);
  m.position.set(x, y, z);
  m.userData = { x, y, z, kind };
  scene.add(m);
  map.set(id, m);
  meshes.push(m);
  if (record) { edits[id] = kind; save(); }
  return true;
}
function removeBlock(m, record = false) {
  const { x, y, z } = m.userData;
  const id = key(x, y, z);
  if (!map.delete(id)) return;
  scene.remove(m);
  const index = meshes.indexOf(m);
  if (index !== -1) meshes.splice(index, 1);
  if (record) { edits[id] = null; save(); }
}
function save() {
  try { localStorage.setItem(editsKey, JSON.stringify(edits)); } catch {}
}
for (let x = -size; x <= size; x++) for (let z = -size; z <= size; z++) {
  const h = groundHeight(x, z);
  for (let y = -1; y <= h; y++) addBlock(x, y, z, y === h ? 'grass' : 'stone');
}
for (let x = -size + 3; x < size - 3; x += 6) {
  for (let z = -size + 3; z < size - 3; z += 7) {
    const h = groundHeight(x, z);
    addBlock(x, h + 1, z, 'wood');
    addBlock(x, h + 2, z, 'wood');
  }
}
for (const [id, kind] of Object.entries(edits)) {
  const [x, y, z] = id.split(',').map(Number);
  const old = map.get(id);
  if (old) removeBlock(old);
  if (kind) addBlock(x, y, z, kind);
}
const player = { x: 0, z: 5, yaw: 0, pitch: -0.12, blocks: 0 };
const pressed = new Set();
let selected = 'grass';
let playing = false;
let lastFrame = performance.now();
player.yaw = -0.2;
function playerHeight() {
  const x = Math.max(-size, Math.min(size, Math.round(player.x)));
  const z = Math.max(-size, Math.min(size, Math.round(player.z)));
  for (let y = 12; y >= -1; y--) if (map.has(key(x, y, z))) return y + 2.18;
  return 3;
}
camera.position.set(player.x, playerHeight(), player.z);
const raycaster = new THREE.Raycaster();
raycaster.far = 7;
function blockAction(place) {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  if (!hit) return notify('Find a block within reach');
  const m = hit.object;
  if (place) {
    const pos = m.position.clone().add(hit.face.normal);
    if (Math.abs(pos.x - player.x) < .7 && Math.abs(pos.z - player.z) < .7 && Math.abs(pos.y - camera.position.y + 1) < 1.5) return;
    if (addBlock(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z), selected, true)) notify('Placed ' + selected);
  } else {
    const { y } = m.userData;
    if (y <= -1) return notify('Bedrock stays intact');
    removeBlock(m, true);
    player.blocks++;
    hud.textContent = 'Blocks mined: ' + player.blocks;
    notify('Mined ' + m.userData.kind + ' · ' + player.blocks + ' blocks');
  }
}
renderer.domElement.addEventListener('click', () => {
  if (!playing) return;
  if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
  else blockAction(false);
});
renderer.domElement.addEventListener('contextmenu', e => { e.preventDefault(); if (playing) blockAction(true); });
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= e.movementX * 0.002;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.002, -1.48, 1.48);
});
document.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  pressed.add(e.code);
  if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
    selected = ['grass', 'stone', 'wood'][Number(e.code.slice(-1)) - 1];
    document.querySelectorAll('#hotbar button').forEach(button => button.classList.toggle('active', button.dataset.block === selected));
    notify('Selected ' + selected);
  }
});
document.addEventListener('keyup', e => pressed.delete(e.code));
document.querySelectorAll('#hotbar button').forEach(button => button.addEventListener('click', () => {
  selected = button.dataset.block;
  document.querySelectorAll('#hotbar button').forEach(b => b.classList.toggle('active', b === button));
}));
document.querySelector('#play').addEventListener('click', () => {
  playing = true;
  start.classList.add('hidden');
  renderer.domElement.requestPointerLock?.().catch(() => {});
  notify('Explore. Mine. Build.');
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (playing) {
    const fwd = Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
    const side = Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft'));
    const len = Math.hypot(fwd, side) || 1;
    const speed = pressed.has('ShiftLeft') ? 8 : 5;
    const dx = (-Math.sin(player.yaw) * fwd + Math.cos(player.yaw) * side) / len * speed * dt;
    const dz = (-Math.cos(player.yaw) * fwd - Math.sin(player.yaw) * side) / len * speed * dt;
    player.x = THREE.MathUtils.clamp(player.x + dx, -size + .7, size - .7);
    player.z = THREE.MathUtils.clamp(player.z + dz, -size + .7, size - .7);
    camera.position.set(player.x, THREE.MathUtils.lerp(camera.position.y, playerHeight(), Math.min(1, dt * 9)), player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }
  renderer.render(scene, camera);
}
window.addEventListener('error', e => { error.textContent = 'Rendering error: ' + e.message; });
requestAnimationFrame(tick);
