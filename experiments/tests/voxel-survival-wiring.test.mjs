import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../voxel-frontier/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
test('survival entrypoint is actually loaded by the game', () => {
  const html = read('index.html');
  assert.match(html, /src="\.\/game\.js"/);
  assert.match(html, /src="\.\/survival-app\.mjs"/);
  assert.match(html, /href="\.\/survival\.css"/);
});
test('survival gameplay is connected to the engine API', () => {
  const app = read('survival-app.mjs');
  assert.match(app, /window\.voxelFrontier/);
  assert.match(app, /connectWorld\(api/);
  assert.match(app, /bindCraft\(/);
  assert.match(app, /installTouchControls\(/);
  assert.match(app, /ui\.render\(/);
});
test('crafting is connected to visible buttons and beacon placement', () => {
  assert.match(read('survival-ui.mjs'), /place-beacon/);
  assert.match(read('survival-craft.mjs'), /craft\(state, id\)/);
  assert.match(read('survival-craft.mjs'), /beacon\.show\(\)/);
});
