import * as THREE from 'three';
import { VoxelWorld, BLOCK_TYPES } from './world-core.mjs';
import { spawnPlayer, stepPlayer, canOccupy, PLAYER_RADIUS, PLAYER_HEIGHT, EYE_HEIGHT } from './player-physics.mjs';
import { ChunkRenderer } from './world-render.mjs';

const game = document.querySelector('#game');
const hud = document.querySelector('#stats');
const toast = document.querySelector('#toast');
const start = document.querySelector('#start');
const error = document.querySelector('#error');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc6cf);
scene.fog = new THREE.Fog(0x9bc6cf, 18, 57);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .05, 90);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
game.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe6f3ff, 0x56633d, 2));
const sun = new THREE.DirectionalLight(0xffefc4, 2.3);
sun.position.set(-12, 26, 18);
scene.add(sun);
const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x729b5d }),
  stone: new THREE.MeshLambertMaterial({ color: 0x8d9da0 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x9e704b })
};
const editsKey = 'voxel-frontier-world-v1';
let savedEdits = {};
try { savedEdits = JSON.parse(localStorage.getItem(editsKey) || '{}'); } catch {}
let chunks;
const world = new VoxelWorld({
  edits: savedEdits,
  onChange(change) {
    try { localStorage.setItem(editsKey, JSON.stringify(world.exportEdits())); } catch {}
    chunks?.updateAt(change.x, change.z);
    window.dispatchEvent(new CustomEvent('voxel:block-change', { detail: change }));
  }
});
chunks = new ChunkRenderer(THREE, scene, world, materials);
const player = spawnPlayer(world);
const pressed = new Set();
let selected = 'grass', playing = false, mined = 0;
let lastFrame = performance.now();
const raycaster = new THREE.Raycaster();
raycaster.far = 6.5;
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012, 1.012, 1.012)),
  new THREE.LineBasicMaterial({ color: 0xfff4d4, transparent: true, opacity: .72 })
);
highlight.visible = false;
scene.add(highlight);
function notify(message) { toast.textContent = message; }
function selectBlock(kind) {
  if (!BLOCK_TYPES.includes(kind)) return false;
  selected = kind;
  document.querySelectorAll('#hotbar button').forEach(button =>
    button.classList.toggle('active', button.dataset.block === kind));
  notify('Selected ' + kind);
  return true;
}
function target() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  return chunks.pick(raycaster);
}
function intersectsPlayer(x, y, z) {
  return Math.abs(player.x - x) < PLAYER_RADIUS + .5
    && Math.abs(player.z - z) < PLAYER_RADIUS + .5
    && player.y < y + .5 && player.y + PLAYER_HEIGHT > y - .5;
}
function blockAction(place) {
  const hit = target();
  if (!hit) { notify('Move closer to a block'); return false; }
  if (place) {
    const { x, y, z } = hit.adjacent;
    if (intersectsPlayer(x, y, z)) { notify('Cannot build inside yourself'); return false; }
    if (!world.set(x, y, z, selected)) { notify('Cannot place a block there'); return false; }
    notify('Placed ' + selected);
    return true;
  }
  if (hit.y <= -1) { notify('Bedrock stays intact'); return false; }
  const kind = world.get(hit.x, hit.y, hit.z);
  if (!kind || !world.set(hit.x, hit.y, hit.z, null)) return false;
  mined++;
  hud.textContent = 'Blocks mined: ' + mined;
  notify('Mined ' + kind + ' · ' + mined + ' blocks');
  return true;
}
renderer.domElement.addEventListener('mousedown', event => {
  if (!playing) return;
  if (event.button === 2) { event.preventDefault(); blockAction(true); return; }
  if (event.button !== 0) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock?.().catch(() => notify('Mouse lock unavailable. Use keyboard controls.'));
    return;
  }
  blockAction(false);
});
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= event.movementX * .002;
  player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * .002, -1.48, 1.48);
});
document.addEventListener('pointerlockchange', () => {
  if (playing && document.pointerLockElement !== renderer.domElement) notify('Click the world to capture your mouse');
});
document.addEventListener('keydown', event => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
  pressed.add(event.code);
  if (/^Digit[123]$/.test(event.code)) selectBlock(BLOCK_TYPES[Number(event.code.slice(-1)) - 1]);
});
document.addEventListener('keyup', event => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());
document.querySelectorAll('#hotbar button').forEach(button =>
  button.addEventListener('click', () => selectBlock(button.dataset.block)));
document.querySelector('#play').addEventListener('click', () => {
  playing = true;
  start.classList.add('hidden');
  renderer.domElement.requestPointerLock?.().catch(() => notify('Click the world to capture your mouse'));
  notify('WASD move · Space jump · Shift sprint · Mine and build');
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
window.addEventListener('error', event => { error.textContent = 'Game error: ' + event.message; });

window.voxelFrontier = Object.freeze({
  world, player, camera, scene,
  selectBlock,
  get selectedBlock() { return selected; },
  get playing() { return playing; },
  get minedBlocks() { return mined; },
  mine: () => blockAction(false),
  place: () => blockAction(true),
  resetWorld() { try { localStorage.removeItem(editsKey); } catch {} location.reload(); }
});

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (playing) {
    const forward = Number(pressed.has('KeyW') || pressed.has('ArrowUp')) -
      Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
    const strafe = Number(pressed.has('KeyD') || pressed.has('ArrowRight')) -
      Number(pressed.has('KeyA') || pressed.has('ArrowLeft'));
    stepPlayer(world, player, {
      forward, strafe, sprint: pressed.has('ShiftLeft') || pressed.has('ShiftRight'),
      jump: pressed.has('Space')
    }, dt);
  }
  camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  if (playing && document.pointerLockElement === renderer.domElement) {
    const hit = target();
    highlight.visible = !!hit;
    if (hit) highlight.position.set(hit.x, hit.y, hit.z);
  } else highlight.visible = false;
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
