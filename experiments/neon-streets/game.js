import { isRoad, CITY, BLOCK, ROAD, makeVehicle, stepVehicle, createTraffic, stepTraffic, createPolice, stepPolice, collidePlayerWithActors, createPedestrians, stepPedestrians } from './world-sim.mjs';
import { drawCityDetails, drawPedestrians, drawPoliceCar } from './world-art.mjs';
(() => {
'use strict';
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const cashEl = document.getElementById('cash');
const missionsEl = document.getElementById('missions');
const speedEl = document.getElementById('speed');
const missionEl = document.getElementById('mission');
const startEl = document.getElementById('start');
let w = 0, h = 0, dpr = 1, last = performance.now(), playing = false;
let cash = 0, deliveries = 0, policeHeat = 0, stage = 'pickup';
const keys = new Set();
const car = makeVehicle();
const pickups = [[750,500],[1000,1000],[1750,1250],[500,1750],[2000,2000],[1250,750],[750,2000]];
const drops = [[1500,500],[500,1250],[750,1750],[2000,750],[1000,2000],[1750,1500],[250,250]];
let marker = pickups[0];
const traffic = createTraffic(28);
const pedestrians = createPedestrians(48);
const police = [];
let worldTime = 0, impactFlash = 0, policeSpawnCooldown = 0;
let lastImpactTime = -10;
// World simulation is activated in the frame loop.
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
  const i = deliveries % pickups.length;
  marker = pickups[i];
  stage = 'pickup';
  missionEl.textContent = 'JOB ' + (deliveries + 1) + '  /  Collect the yellow package marker.';
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (playing) {
    worldTime += dt;
    const throttle = Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS'));
    const steer = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
    const physics = stepVehicle(car, { throttle, steer, handbrake: keys.has('Space') }, dt);
    if (physics.collided && physics.impactSpeed > 55) {
      policeHeat = Math.min(5, policeHeat + .5);
      impactFlash = .3;
      lastImpactTime = worldTime;
    }
    if (Math.hypot(car.x - marker[0], car.y - marker[1]) < 37) {
      if (stage === 'pickup') {
        stage = 'drop';
        marker = drops[deliveries % drops.length];
        missionEl.textContent = 'PACKAGE COLLECTED  /  Deliver to the purple destination.';
      } else {
        deliveries++;
        cash += 250 + deliveries * 50;
        cashEl.textContent = '$' + cash.toLocaleString();
        missionsEl.textContent = String(deliveries);
        resetMission();
      }
    }
    stepTraffic(traffic, dt, worldTime, car);
    stepPedestrians(pedestrians, dt);
    policeSpawnCooldown = Math.max(0, policeSpawnCooldown - dt);
    const desiredPolice = Math.min(3, Math.floor(policeHeat + .2));
    if (police.length < desiredPolice && policeSpawnCooldown === 0) {
      police.push(createPolice(car, police.length));
      policeSpawnCooldown = 2;
    }
    if (police.length > desiredPolice && policeHeat < .5) police.length = 0;
    stepPolice(police, car, dt);
    const actorCollision = collidePlayerWithActors(car, traffic, police);
    if (actorCollision.impact) {
      impactFlash = .32;
      lastImpactTime = worldTime;
      policeHeat = Math.min(5, policeHeat + (actorCollision.police ? 1.1 : .55));
      if (actorCollision.police && cash >= 100) {
        cash -= 100;
        cashEl.textContent = '$' + cash.toLocaleString();
      }
    }
    impactFlash = Math.max(0, impactFlash - dt);
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
  drawCityDetails(ctx, cx, cy, w, h, worldTime);
  drawPedestrians(ctx, pedestrians, cx, cy, w, h, worldTime);
  for (const t of traffic) {
    const x = t.x - cx, y = t.y - cy;
    if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
    drawCar(x, y, t.angle, t.tint, false);
  }
  for (const p of police) {
    const x = p.x - cx, y = p.y - cy;
    if (x >= -45 && y >= -45 && x <= w + 45 && y <= h + 45) drawPoliceCar(ctx, x, y, p.angle, worldTime);
  }
  drawMarker(marker[0] - cx, marker[1] - cy, stage === 'pickup' ? 'PICKUP' : 'DROP', stage === 'pickup' ? '#ffd65c' : '#f68cff', now);
  drawCar(w / 2, h / 2, car.angle, '#f777ac', true);
  ctx.restore();
  const glow = ctx.createRadialGradient(w/2,h/2,w*.18,w/2,h/2,Math.max(w,h)*.77);
  glow.addColorStop(0,'#09031800');
  glow.addColorStop(1,'#070411a3');
  ctx.fillStyle=glow;
  ctx.fillRect(0,0,w,h);
  if (impactFlash > 0) {
    ctx.fillStyle = 'rgba(255, 80, 120, ' + (impactFlash * .24) + ')';
    ctx.fillRect(0, 0, w, h);
  }
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
  startEl.classList.add('hidden');
  playing=true;
  resetMission();
});
requestAnimationFrame(tick);
})();