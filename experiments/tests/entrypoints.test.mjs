import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

for (const game of ['voxel-frontier', 'neon-streets']) {
  test(game + ' has complete standalone browser entrypoint', () => {
    const base = new URL('../' + game + '/', import.meta.url);
    const html = readFileSync(new URL('index.html', base), 'utf8');
    const js = readFileSync(new URL('game.js', base), 'utf8');
    const css = readFileSync(new URL('style.css', base), 'utf8');
    assert.match(html, /<canvas|<main/);
    assert.match(html, /game\.js/);
    assert.match(html, /style\.css/);
    assert.ok(js.length > 1500, 'Game needs actual implementation, not a placeholder');
    assert.ok(css.length > 300, 'Game needs real styling');
    assert.ok(existsSync(new URL('index.html', base)));
  });
}
