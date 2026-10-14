import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const game of ['voxel-frontier', 'neon-streets']) {
  test(game + ': HTML script mode matches JavaScript import syntax', () => {
    const dir = resolve(root, game);
    const html = readFileSync(resolve(dir, 'index.html'), 'utf8');
    const js = readFileSync(resolve(dir, 'game.js'), 'utf8');
    const script = [...html.matchAll(/<script\b([^>]*)><\/script>/g)].find(match => /\bsrc=["']\.\/game\.js["']/.test(match[1]));
    assert.ok(script, 'game.js must be loaded by a script tag');
    const moduleScript = /\btype=["']module["']/.test(script[1]);
    const staticImports = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"]+['"]\s*;?/m.test(js);
    assert.ok(!staticImports || moduleScript, 'game.js has static imports but index.html uses a classic script: browser SyntaxError');
    for (const match of js.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
      assert.ok(existsSync(resolve(dir, match[1])), 'Missing local import: ' + match[1]);
    }
  });
}
