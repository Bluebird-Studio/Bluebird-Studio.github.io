import test from 'node:test';
import assert from 'node:assert/strict';
import { VoxelWorld, groundHeight, chunkIndex, blockKey } from '../voxel-frontier/world-core.mjs';
import { canOccupy, spawnPlayer, stepPlayer, EYE_HEIGHT } from '../voxel-frontier/player-physics.mjs';

test('terrain is deterministic and has continuous bedrock', () => {
  const a = new VoxelWorld({ radius: 4 }), b = new VoxelWorld({ radius: 4 });
  assert.deepEqual([...a.blocks], [...b.blocks]);
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    assert.equal(a.get(x, -1, z), 'stone');
    assert.equal(a.get(x, groundHeight(x, z), z), 'grass');
  }
});

test('block edits can be persisted, replayed, and deleted', () => {
  const changes = [];
  const world = new VoxelWorld({ radius: 4, onChange: c => changes.push(c) });
  assert.equal(world.set(0, 10, 0, 'wood'), true);
  assert.equal(world.get(0, 10, 0), 'wood');
  assert.equal(world.set(0, 10, 0, 'wood'), false);
  assert.equal(world.set(0, 10, 0, null), true);
  assert.equal(world.get(0, 10, 0), null);
  assert.equal(changes.length, 2);
  const reloaded = new VoxelWorld({ radius: 4, edits: world.exportEdits() });
  assert.equal(reloaded.get(0, 10, 0), null);
  assert.equal(reloaded.get(0, -1, 0), 'stone');
});

test('invalid coordinates and bedrock edits are rejected', () => {
  const world = new VoxelWorld({ radius: 4 });
  assert.equal(world.set(0, -1, 0, null), false);
  assert.equal(world.set(10, 2, 0, 'wood'), false);
  assert.equal(world.set(0, 100, 0, 'wood'), false);
  assert.equal(world.set(0, 8, 0, 'unknown'), false);
  assert.equal(world.get(0, -1, 0), 'stone');
});

test('malformed saved edits cannot inject blocks outside the playable world', () => {
  const world = new VoxelWorld({ radius: 4, edits: {
    '999,2,2': 'stone', '0,-1,0': null, '0,10,0': 'wood', '0,11,0': 'lava',
    '__proto__': 'stone'
  } });
  assert.equal(world.get(0, 10, 0), 'wood');
  assert.equal(world.get(0, 11, 0), null);
  assert.equal(world.get(0, -1, 0), 'stone');
  assert.equal(world.get(999, 2, 2), null);
});

test('negative chunk coordinates use mathematical floor', () => {
  assert.equal(chunkIndex(-1), -1);
  assert.equal(chunkIndex(-8), -1);
  assert.equal(chunkIndex(-9), -2);
  assert.equal(chunkIndex(8), 1);
  assert.equal(blockKey(-1, 2, 3), '-1,2,3');
});

const floorWorld = obstacle => ({
  radius: 20,
  solid(x, y, z) {
    return y <= 0 || (x === 1 && z === 0 && obstacle.includes(y));
  },
  highestAt() { return 0; }
});

test('player spawns above solid ground and has eye height', () => {
  const world = floorWorld([]);
  const p = spawnPlayer(world, 0, 0);
  assert.equal(p.y, .5);
  assert.equal(p.y + EYE_HEIGHT, 2.1);
  assert.equal(canOccupy(world, p.x, p.y, p.z), true);
  assert.equal(canOccupy(world, p.x, p.y - .1, p.z), false);
});

test('player cannot walk through a two-block wall', () => {
  const world = floorWorld([1, 2]);
  const p = spawnPlayer(world, 0, 0);
  p.yaw = 0;
  for (let i = 0; i < 12; i++) stepPlayer(world, p, { strafe: 1 }, .05);
  assert.ok(p.x < .23, 'player should stop before wall');
  assert.ok(p.y < .6, 'player should not step up a two-block wall');
});

test('player can climb a one-block step', () => {
  const world = floorWorld([1]);
  const p = spawnPlayer(world, 0, 0);
  p.yaw = 0;
  for (let i = 0; i < 12; i++) stepPlayer(world, p, { strafe: 1 }, .05);
  assert.ok(p.x > .3, 'player should move across the step');
  assert.ok(p.y >= 1.49, 'player should stand on top of step');
});

test('jump arcs and lands on the ground', () => {
  const world = floorWorld([]);
  const p = spawnPlayer(world, 0, 0);
  stepPlayer(world, p, { jump: true }, .016);
  assert.ok(p.y > .5);
  assert.ok(p.vy > 0);
  for (let i = 0; i < 160; i++) stepPlayer(world, p, {}, .016);
  assert.ok(Math.abs(p.y - .5) < .001, 'jump should land exactly on ground');
  assert.equal(p.grounded, true);
});

test('long falls do not tunnel through solid terrain', () => {
  const world = floorWorld([]);
  const p = spawnPlayer(world, 0, 0);
  p.y = 30; p.vy = 0; p.grounded = false;
  for (let i = 0; i < 200; i++) stepPlayer(world, p, {}, .05);
  assert.ok(Math.abs(p.y - .5) < .001);
});
