(() => {
'use strict';
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const cashEl = document.getElementById('cash');
const missionsEl = document.getElementById('missions');
const speedEl = document.getElementById('speed');
const missionEl = document.getElementById('mission');
const startEl = document.getElementById('start');
let campaign = null, renderMiniMap = null, paused = false, hudAt = 0;
const ready = Promise.all([import('./mission-engine.mjs'),import('./mission-hud.mjs')]).then(([m,h])=>{
  let storage = null;
  try { storage = window.localStorage; } catch {}
  campaign = new m.MissionCampaign(storage);
  renderMiniMap = h.drawMiniMap;
  resetMission();
});
const CITY = 2500, BLOCK = 250, ROAD = 76;
let w = 0, h = 0, dpr = 1, last = performance.now(), playing = false;
let cash = 0, deliveries = 0, policeHeat = 0, stage = 'pickup';
const keys = new Set();
const car = { x: 500, y: 500, angle: -Math.PI / 2, speed: 0 };
let marker = [750, 500];
const traffic = [];
window.neonHooks={active:()=>playing,pause:v=>{paused=v;keys.clear()},status:()=>({cash,completed:deliveries}),restart:f=>{f?campaign?.newCareer():campaign?.resetActive();car.x=500;car.y=500;car.angle=-Math.PI/2;car.speed=0;policeHeat=0;resetMission();announce('Mission restarted.')}};
for (let i = 0; i < 24; i++) {
  const row = 1 + (i * 7 % 9);
  const col = 1 + (i * 11 % 9);
  const horizontal = i % 2 === 0;
  traffic.push({ x: col * BLOCK, y: row * BLOCK, dx: horizontal ? (i % 4 === 0 ? 1 : -1) : 0, dy: !horizontal ? (i % 3 === 0 ? 1 : -1) : 0, speed: 60 + i % 5 * 14, tint: ['#f6be70','#b16bba','#82caca','#80b66f'][i % 4] });
}
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
function isRoad(x, y, margin = 0) {
  const dx = Math.abs(((x + BLOCK / 2) % BLOCK + BLOCK) % BLOCK - BLOCK / 2);
  const dy = Math.abs(((y + BLOCK / 2) % BLOCK + BLOCK) % BLOCK - BLOCK / 2);
  return dx < ROAD / 2 - margin || dy < ROAD / 2 - margin;
}
const seed = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
function roundedRect(x, y, width, height, radius, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}
function worldBackground(cx, cy) {
  ctx.fillStyle = '#161522';
  ctx.fillRect(-cx, -cy, CITY, CITY);
  const minX = Math.max(0, Math.floor((cx - 200) / BLOCK));
  const maxX = Math.min(11, Math.ceil((cx + w + 200) / BLOCK));
  const minY = Math.max(0, Math.floor((cy - 200) / BLOCK));
  const maxY = Math.min(11, Math.ceil((cy + h + 200) / BLOCK));
  for (let i = minX; i <= maxX; i++) {
    const x = i * BLOCK - cx;
    ctx.fillStyle = '#262333';
    ctx.fillRect(x - ROAD / 2 - 8, -cy, ROAD + 16, CITY);
    ctx.fillStyle = '#171922';
    ctx.fillRect(x - ROAD / 2, -cy, ROAD, CITY);
    ctx.fillStyle = '#aba36b';
    for (let sy = Math.floor(cy / 42) * 42 - cy; sy < h; sy += 42) ctx.fillRect(x - 1, sy, 2, 18);
  }
  for (let j = minY; j <= maxY; j++) {
    const y = j * BLOCK - cy;
    ctx.fillStyle = '#262333';
    ctx.fillRect(-cx, y - ROAD / 2 - 8, CITY, ROAD + 16);
    ctx.fillStyle = '#171922';
    ctx.fillRect(-cx, y - ROAD / 2, CITY, ROAD);
    ctx.fillStyle = '#aba36b';
    for (let sx = Math.floor(cx / 42) * 42 - cx; sx < w; sx += 42) ctx.fillRect(sx, y - 1, 18, 2);
  }
  for (let i = minX; i <= maxX; i++) for (let j = minY; j <= maxY; j++) {
    const bx = (i + .5) * BLOCK - cx, by = (j + .5) * BLOCK - cy;
    const type = Math.floor(seed(i,j) * 4);
    const colors = ['#373247','#2c354a','#4a344b','#2c4246'];
    roundedRect(bx - 72, by - 73, 144, 146, 8, '#100d1a');
    roundedRect(bx - 67, by - 69, 134, 137, 6, colors[type]);
    roundedRect(bx - 54, by - 56, 108, 109, 3, '#1d1c2e');
    for (let wx = -44; wx < 47; wx += 21) for (let wy = -45; wy < 47; wy += 23) {
      const lit = seed(i * 17 + wx,j * 13 + wy) > .5;
      ctx.fillStyle = lit ? (type % 2 ? '#79bbcc' : '#e8a37a') : '#32394b';
      ctx.fillRect(bx + wx, by + wy, 11, 12);
    }
    ctx.strokeStyle = '#403951';
    ctx.strokeRect(bx - 72, by - 73, 144, 146);
  }
}
function drawCar(x, y, angle, tint, isPlayer) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  if (isPlayer) {
    ctx.shadowColor = '#ff61ae'; ctx.shadowBlur = 25;
  }
  roundedRect(-13, -21, 26, 42, 6, '#100c1b');
  roundedRect(-11, -20, 22, 39, 5, tint);
  ctx.shadowBlur = 0;
  roundedRect(-9, -9, 18, 13, 2, '#2e2249');
  ctx.fillStyle = '#fffbd7';
  ctx.fillRect(-9, -21, 6, 3);
  ctx.fillRect(3, -21, 6, 3);
  ctx.fillStyle = '#ee496a';
  ctx.fillRect(-9, 18, 6, 2);
  ctx.fillRect(3, 18, 6, 2);
  ctx.restore();
}
function drawMarker(x, y, label, color, now) {
  const bob = Math.sin(now / 180) * 4;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 24 + bob, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 35 + bob);
  ctx.lineTo(x - 13, y - 53 + bob);
  ctx.lineTo(x + 13, y - 53 + bob);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(label, x, y + 4);
  ctx.restore();
}
function resetMission() {
  if (!campaign) return;
  marker = campaign.marker;
  stage = campaign.state.stage;
  cash = campaign.state.cash;
  deliveries = campaign.state.completed;
  cashEl.textContent = '$' + cash.toLocaleString();
  missionsEl.textContent = String(deliveries);
  missionEl.textContent = campaign.description();
}

function announce(message) {
  const el = document.getElementById('mission-toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => el.classList.remove('visible'), 2600);
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (playing && !paused) {
    const throttle = Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS'));
    const steer = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    car.speed += throttle * 260 * dt;
    car.speed *= Math.pow(.982, dt * 60);
    if (!throttle && Math.abs(car.speed) < .5) car.speed = 0;
    car.speed = Math.max(-100, Math.min(275, car.speed));
    car.angle += steer * dt * 2.25 * Math.min(1, Math.abs(car.speed) / 60) * (car.speed < 0 ? -1 : 1);
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    if (isRoad(nextX, nextY, 6) && nextX > 20 && nextX < CITY - 20 && nextY > 20 && nextY < CITY - 20) {
      car.x = nextX;
      car.y = nextY;
    } else {
      if (Math.abs(car.speed) > 75) policeHeat = Math.min(5, policeHeat + dt);
      car.speed *= -.25;
    }
    if (campaign) {
      const event = campaign.advance(dt, car, policeHeat);
      if (event) {
        policeHeat = Math.min(5, policeHeat + (event.heatDelta || 0));
        resetMission();
        if (event.type !== 'heat-blocked') announce(event.message);
      }
      if (now - hudAt > 250) { resetMission(); hudAt = now; }
    }
    for (const t of traffic) {
      t.x += t.dx * t.speed * dt;
      t.y += t.dy * t.speed * dt;
      if (t.x < 0) t.x = CITY;
      if (t.x > CITY) t.x = 0;
      if (t.y < 0) t.y = CITY;
      if (t.y > CITY) t.y = 0;
      if (Math.hypot(car.x - t.x, car.y - t.y) < 25 && Math.abs(car.speed) > 10) {
        car.speed *= -.3;
        policeHeat = Math.min(5, policeHeat + .5);
      }
    }
    speedEl.innerHTML = String(Math.round(Math.abs(car.speed) * .65)).padStart(2,'0') + ' <span>KM/H</span>';
    policeHeat = Math.max(0, policeHeat - dt * .025);
  }
  const cx = car.x - w / 2, cy = car.y - h / 2;
  ctx.fillStyle = '#100d1d';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  worldBackground(cx, cy);
  for (const t of traffic) {
    const x = t.x - cx, y = t.y - cy;
    if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
    drawCar(x, y, Math.atan2(t.dy, t.dx), t.tint, false);
  }
  drawMarker(marker[0] - cx, marker[1] - cy, stage === 'pickup' ? 'PICKUP' : 'DROP', stage === 'pickup' ? '#ffd65c' : '#f68cff', now);
  drawCar(w / 2, h / 2, car.angle, '#f777ac', true);
  ctx.restore();
  const glow = ctx.createRadialGradient(w/2,h/2,w*.18,w/2,h/2,Math.max(w,h)*.77);
  glow.addColorStop(0,'#09031800');
  glow.addColorStop(1,'#070411a3');
  ctx.fillStyle=glow;
  ctx.fillRect(0,0,w,h);
  if(renderMiniMap&&now-hudAt<30)renderMiniMap(document.getElementById('minimap'),car,marker,CITY,BLOCK);
  if (policeHeat > .2) {
    ctx.fillStyle='#ffa4b4';
    ctx.font='bold 12px monospace';
    ctx.textAlign='center';
    ctx.fillText('HEAT ' + '◆'.repeat(Math.ceil(policeHeat)), w / 2, h - 28);
  }
}
const keyStart = e => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault(); keys.add(e.code); };
const keyStop = e => keys.delete(e.code);
window.addEventListener('keydown',keyStart);
window.addEventListener('keyup',keyStop);
window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('#controls button').forEach(button => {
  const k=button.dataset.key;
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k);button.setPointerCapture?.(e.pointerId);});
  for(const t of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(t,()=>keys.delete(k));
});
document.querySelector('#play').addEventListener('click',()=>{
  ready.then(() => { startEl.classList.add('hidden'); playing=true; resetMission(); }).catch(error => {
    console.error(error);
    missionEl.textContent = 'Unable to load missions. Reload to retry.';
  });
});
requestAnimationFrame(tick);
})();