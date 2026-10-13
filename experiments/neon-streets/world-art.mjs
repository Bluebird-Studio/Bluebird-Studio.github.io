import { BLOCK, CITY } from './world-sim.mjs';
// Visual details are viewport-culled and do not modify collision geometry.
export function drawCityDetails(ctx, cx, cy, w, h, seconds) {
  const firstX = Math.max(0, Math.floor((cx - 90) / BLOCK));
  const lastX = Math.min(CITY / BLOCK, Math.ceil((cx + w + 90) / BLOCK));
  const firstY = Math.max(0, Math.floor((cy - 90) / BLOCK));
  const lastY = Math.min(CITY / BLOCK, Math.ceil((cy + h + 90) / BLOCK));
  for (let i = firstX; i <= lastX; i++) for (let j = firstY; j <= lastY; j++) {
    const x = i * BLOCK - cx, y = j * BLOCK - cy;
    // Four high-contrast pedestrian crossings, kept outside the road centre.
    ctx.fillStyle = '#e5d7cc50';
    for (let k = -3; k <= 3; k++) {
      const off = k * 8;
      ctx.fillRect(x + off - 2, y - 55, 4, 17);
      ctx.fillRect(x + off - 2, y + 38, 4, 17);
      ctx.fillRect(x - 55, y + off - 2, 17, 4);
      ctx.fillRect(x + 38, y + off - 2, 17, 4);
    }
    // Animated opposing signal phases at junction corners.
    const eastWestGreen = Math.floor(seconds / 6 + (i + j) % 2) % 2 === 1;
    ctx.fillStyle = '#0b111c';
    ctx.fillRect(x - 42, y - 42, 10, 19);
    ctx.fillRect(x + 32, y + 23, 10, 19);
    ctx.fillStyle = eastWestGreen ? '#48f4a3' : '#f65d79';
    ctx.fillRect(x - 40, y - 39, 6, 6);
    ctx.fillRect(x + 34, y + 26, 6, 6);
    ctx.fillStyle = eastWestGreen ? '#f65d79' : '#48f4a3';
    ctx.fillRect(x - 40, y - 30, 6, 5);
    ctx.fillRect(x + 34, y + 35, 6, 5);
    // Neon pools around intersection lamp posts.
    for (const [dx,dy] of [[-57,-57],[57,57]]) {
      const lx = x + dx, ly = y + dy;
      const glow = ctx.createRadialGradient(lx,ly,1,lx,ly,36);
      glow.addColorStop(0,'#f3a4dc48');
      glow.addColorStop(1,'#f3a4dc00');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 36,ly - 36,72,72);
      ctx.fillStyle = '#d4a7d9';
      ctx.fillRect(lx - 2,ly - 2,4,4);
    }
    // Street labels for wayfinding and visual texture.
    if (i < CITY / BLOCK && j < CITY / BLOCK) {
      ctx.save();
      ctx.translate(x + 52, y - 13);
      ctx.fillStyle = '#c4a9e477';
      ctx.font = '9px monospace';
      ctx.fillText('SECTOR ' + (i + j * 11).toString(16).toUpperCase().padStart(2,'0'), 0, 0);
      ctx.restore();
    }
  }
}
export function drawPedestrians(ctx, pedestrians, cx, cy, w, h, seconds) {
  for (const p of pedestrians) {
    const x = p.x - cx, y = p.y - cy;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    ctx.fillStyle = '#0008';
    ctx.beginPath(); ctx.ellipse(x + 2,y + 4,4,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();ctx.arc(x,y,3.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = '#f7d9bd';
    ctx.beginPath();ctx.arc(x,y - 2,1.6,0,Math.PI*2);ctx.fill();
  }
}
export function drawPoliceCar(ctx, x, y, angle, seconds) {
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.shadowColor = '#629bff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#131b36';
  ctx.fillRect(-13,-20,26,40);
  ctx.fillStyle = '#e7e5ef';
  ctx.fillRect(-10,-17,20,34);
  ctx.fillStyle = '#1b2947';
  ctx.fillRect(-8,-8,16,13);
  ctx.shadowBlur = 0;
  ctx.fillStyle = Math.sin(seconds * 18) > 0 ? '#f04e78' : '#50a9ff';
  ctx.fillRect(-9,-4,9,4);
  ctx.fillStyle = Math.sin(seconds * 18) > 0 ? '#50a9ff' : '#f04e78';
  ctx.fillRect(0,-4,9,4);
  ctx.fillStyle = '#fff7c7';
  ctx.fillRect(-9,-19,6,2);ctx.fillRect(3,-19,6,2);
  ctx.restore();
}
