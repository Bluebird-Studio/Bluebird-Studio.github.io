// Actual Chromium runtime smoke tests, separate from Node syntax checks.
// Run with: npm install --no-save playwright && npx playwright install chromium && node experiments/tests/browser-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, relative, sep, join } from 'node:path';
import { once } from 'node:events';

const root = resolve('.');
const screenshots = resolve('experiments', 'browser-artifacts');
await mkdir(screenshots, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const path = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith('..' + sep) || path === root) { res.writeHead(403).end('Forbidden'); return; }
    const bytes = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(bytes);
  } catch (e) { res.writeHead(404).end('Not found'); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage']
  });
  for (const game of ['voxel-frontier', 'neon-streets']) {
    for (const mode of ['desktop', 'mobile']) {
      const mobile = mode === 'mobile';
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 1
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('Uncaught: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('Console: ' + m.text()); });
      page.on('requestfailed', req => errors.push('Network: ' + req.url() + ' ' + (req.failure()?.errorText || 'failed')));
      try {
        const response = await page.goto(origin + '/experiments/' + game + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (!response?.ok()) throw new Error('Entrypoint returned ' + response?.status());
        const canvas = page.locator(game === 'voxel-frontier' ? '#game canvas' : '#canvas');
        await canvas.waitFor({ state: 'visible', timeout: 30000 });
        await page.waitForTimeout(game === 'voxel-frontier' ? 1800 : 350);
        const state = await canvas.evaluate(c => {
          const rect = c.getBoundingClientRect();
          const gl = c.getContext('webgl2');
          const ctx = c.getContext('2d');
          return { width: rect.width, height: rect.height, backingWidth: c.width, backingHeight: c.height,
            webgl: Boolean(gl && !gl.isContextLost()), canvas2d: Boolean(ctx),
            pixel: ctx ? Array.from(ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data) : null };
        });
        if (state.width < 200 || state.height < 200 || state.backingWidth < 200 || state.backingHeight < 200) {
          throw new Error('Canvas missing or incorrectly sized: ' + JSON.stringify(state));
        }
        if (game === 'voxel-frontier' && !state.webgl) throw new Error('Three.js did not establish a live WebGL2 context');
        if (game === 'neon-streets' && (!state.canvas2d || !state.pixel || state.pixel[3] === 0)) throw new Error('Canvas 2D did not draw');
        if (mobile) await page.locator('#play').tap();
        else await page.locator('#play').click();
        await page.waitForFunction(() => document.querySelector('#start')?.classList.contains('hidden'), { timeout: 5000 });
        if (game === 'neon-streets') {
          if (mobile) {
            const button = page.locator('[data-key="ArrowUp"]');
            await button.dispatchEvent('pointerdown', { pointerId: 1, bubbles: true });
            await page.waitForTimeout(700);
            await button.dispatchEvent('pointerup', { pointerId: 1, bubbles: true });
          } else {
            await page.keyboard.down('ArrowUp');
            await page.waitForTimeout(700);
            await page.keyboard.up('ArrowUp');
          }
          const speed = Number((await page.locator('#speed').innerText()).match(/\d+/)?.[0] || 0);
          if (speed < 1) throw new Error('Throttle input did not accelerate vehicle');
        } else if (!mobile) {
          await page.keyboard.press('Digit2');
          const selected = await page.locator('#hotbar button.active').getAttribute('data-block');
          if (selected !== 'stone') throw new Error('Hotbar selection did not respond to keyboard');
        }
        await page.waitForTimeout(300);
        await page.screenshot({ path: join(screenshots, game + '-' + mode + '.png') });
        if (errors.length) throw new Error(errors.join('\n').slice(0, 2000));
        results.push({ game, mode, status: 'PASS', ...state });
      } catch (e) {
        try { await page.screenshot({ path: join(screenshots, game + '-' + mode + '-FAILED.png') }); } catch {}
        results.push({ game, mode, status: 'FAIL', error: String(e) });
        process.exitCode = 1;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
for (const result of results) console.log(JSON.stringify(result));
if (process.exitCode) console.error('Browser smoke FAILED: see screenshots and errors above.');
