// Standalone, deterministic world simulation. No DOM or canvas dependency.
// Keep this module independent of mission state so parallel mission work can integrate cleanly.
export const CITY = 2500;
export const BLOCK = 250;
export const ROAD = 76;
export const MAX_SPEED = 290;
const TAU = Math.PI * 2;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const roadOffset = coordinate => Math.abs(((coordinate + BLOCK / 2) % BLOCK + BLOCK) % BLOCK - BLOCK / 2);

export function isRoad(x, y, margin = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > CITY || y > CITY) return false;
  return roadOffset(x) < ROAD / 2 - margin || roadOffset(y) < ROAD / 2 - margin;
}
export function canDrive(x, y, radius = 11) {
  if (x < radius || y < radius || x > CITY - radius || y > CITY - radius) return false;
  return [[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]].every(([dx,dy]) => isRoad(x + dx,y + dy));
}
export function makeVehicle(x = 500, y = 500, angle = -Math.PI / 2) {
  return { x, y, angle, speed: 0, impactCooldown: 0 };
}
// Integrate in bounded steps so a low frame rate cannot tunnel through buildings.
export function stepVehicle(vehicle, controls, dt) {
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .12);
  const input = clamp(controls.throttle || 0, -1, 1);
  const steer = clamp(controls.steer || 0, -1, 1);
  const handbrake = !!controls.handbrake;
  const oldSpeed = vehicle.speed;
  const acceleration = input * (input * vehicle.speed < 0 ? 510 : (input < 0 ? 225 : 320));
  vehicle.speed = clamp(vehicle.speed + acceleration * dt, -130, MAX_SPEED);
  vehicle.speed *= Math.exp(-(handbrake ? 4.3 : (input ? .26 : 1.9)) * dt);
  if (!input && Math.abs(vehicle.speed) < 1) vehicle.speed = 0;
  const steerScale = Math.min(1, Math.abs(vehicle.speed) / 75);
  vehicle.angle += steer * 2.45 * steerScale * Math.sign(vehicle.speed || 1) * dt;
  vehicle.angle = (vehicle.angle + TAU) % TAU;
  const steps = Math.max(1, Math.ceil(Math.abs(vehicle.speed * dt) / 6));
  const stepX = Math.cos(vehicle.angle) * vehicle.speed * dt / steps;
  const stepY = Math.sin(vehicle.angle) * vehicle.speed * dt / steps;
  let collided = false;
  for (let i = 0; i < steps; i++) {
    if (canDrive(vehicle.x + stepX, vehicle.y + stepY)) {
      vehicle.x += stepX;
      vehicle.y += stepY;
    } else {
      vehicle.speed = -oldSpeed * .13;
      collided = true;
      break;
    }
  }
  vehicle.impactCooldown = Math.max(0, (vehicle.impactCooldown || 0) - dt);
  return { collided, impactSpeed: Math.abs(oldSpeed) };
}
const PAINTS = ['#f6be70','#b16bba','#82caca','#80b66f','#cdd0e2','#dc7c83','#f0d180'];
export function createTraffic(count = 26) {
  return Array.from({ length: count }, (_, i) => {
    const horizontal = i % 2 === 0;
    const sign = i % 4 < 2 ? 1 : -1;
    const row = 1 + ((i * 7 + 3) % 9);
    const col = 1 + ((i * 11 + 5) % 9);
    const progress = ((i * 173 + 89) % (CITY - 220)) + 100;
    return {
      id: i, x: horizontal ? progress : col * BLOCK - sign * 17,
      y: horizontal ? row * BLOCK + sign * 17 : progress,
      axis: horizontal ? 'x' : 'y', sign, speed: 58 + (i * 17 % 47),
      angle: horizontal ? (sign > 0 ? 0 : Math.PI) : (sign > 0 ? Math.PI / 2 : -Math.PI / 2),
      tint: PAINTS[i % PAINTS.length], wait: 0, turnAt: -1, emergency: false
    };
  });
}
function wrapTraffic(t) {
  // Wrap at the boundary without leaving the drivable lanes.
  if (t.axis === 'x') {
    if (t.x > CITY - 18) t.x = 18;
    if (t.x < 18) t.x = CITY - 18;
  } else {
    if (t.y > CITY - 18) t.y = 18;
    if (t.y < 18) t.y = CITY - 18;
  }
}
export function stepTraffic(traffic, dt, seconds, player) {
  dt = clamp(dt, 0, .08);
  for (const t of traffic) {
    const coordinate = t.axis === 'x' ? t.x : t.y;
    const cross = Math.round(coordinate / BLOCK) * BLOCK;
    const nextCross = t.sign > 0 ? Math.ceil((coordinate + 1) / BLOCK) * BLOCK : Math.floor((coordinate - 1) / BLOCK) * BLOCK;
    const approach = (nextCross - coordinate) * t.sign;
    const lane = t.axis === 'x' ? t.y : t.x;
    const crossStreet = Math.round(lane / BLOCK) * BLOCK;
    const red = (Math.floor(seconds / 6 + (Math.round(nextCross / BLOCK) + Math.round(crossStreet / BLOCK)) % 2) % 2) === (t.axis === 'x' ? 0 : 1);
    let blocked = false;
    if (approach > 5 && approach < 48 && red) blocked = true;
    if (player && Math.hypot(player.x - t.x, player.y - t.y) < 48) blocked = true;
    for (const other of traffic) {
      if (other === t || other.axis !== t.axis || other.sign !== t.sign) continue;
      const lateral = Math.abs((t.axis === 'x' ? other.y - t.y : other.x - t.x));
      const forward = (t.axis === 'x' ? other.x - t.x : other.y - t.y) * t.sign;
      if (lateral < 10 && forward > 0 && forward < 43) { blocked = true; break; }
    }
    const desired = blocked ? 0 : t.speed;
    t.wait = clamp(t.wait + (desired - t.wait) * Math.min(1, dt * (blocked ? 5 : 2.4)), 0, t.speed);
    const movement = t.sign * t.wait * dt;
    if (t.axis === 'x') t.x += movement;
    else t.y += movement;
    wrapTraffic(t);
  }
}
// Road-grid navigation means pursuers turn at intersections rather than drive through buildings.
export function createPolice(player, id = 0) {
  const px = clamp(Math.round(player.x / BLOCK) * BLOCK + (id % 2 ? -2 : 2) * BLOCK, BLOCK, CITY - BLOCK);
  const py = clamp(Math.round(player.y / BLOCK) * BLOCK + (id % 2 ? 1 : -1) * BLOCK, BLOCK, CITY - BLOCK);
  return { id, x: px, y: py, tx: px, ty: py, dir: 0, speed: 135 + id * 16, tint: '#4d95f5', angle: 0, siren: 0 };
}
const DIRS = [[1,0],[0,1],[-1,0],[0,-1]];
// Follow explicit intersection-to-intersection waypoints. Never repeatedly snap to a nearby junction.
export function stepPolice(police, player, dt) {
  dt = clamp(dt, 0, .08);
  for (const p of police) {
    if (!Number.isFinite(p.tx)) { p.tx = p.x; p.ty = p.y; }
    let remaining = p.speed * dt;
    let iterations = 0;
    while (remaining > 0 && iterations++ < 3) {
      const toTarget = Math.hypot(p.tx - p.x, p.ty - p.y);
      if (toTarget < 1e-5) {
        const choices = DIRS.map(([dx,dy],dir) => ({
          dir, dx, dy, nx: p.x + dx * BLOCK, ny: p.y + dy * BLOCK
        })).filter(q => q.nx >= 0 && q.nx <= CITY && q.ny >= 0 && q.ny <= CITY);
        choices.sort((a,b) => {
          const score = q => Math.abs(q.nx - player.x) + Math.abs(q.ny - player.y)
            + (q.dir === ((p.dir + 2) % 4) ? 25 : 0);
          return score(a) - score(b);
        });
        const next = choices[0];
        if (!next) break;
        p.dir = next.dir;
        p.tx = next.nx;
        p.ty = next.ny;
        p.angle = Math.atan2(next.dy,next.dx);
        continue;
      }
      const move = Math.min(remaining, toTarget);
      p.x += (p.tx - p.x) / toTarget * move;
      p.y += (p.ty - p.y) / toTarget * move;
      remaining -= move;
      if (move >= toTarget - 1e-5) { p.x = p.tx; p.y = p.ty; }
    }
    p.siren += dt * 8;
  }
}
export function collidePlayerWithActors(player, traffic, police) {
  if ((player.impactCooldown || 0) > 0) return { impact: false, police: false };
  const policeHit = police.some(p => distance(player,p) < 27);
  const trafficHit = traffic.some(t => distance(player,t) < 26);
  if (policeHit || trafficHit) {
    player.speed *= -.22;
    player.impactCooldown = .85;
  }
  return { impact: policeHit || trafficHit, police: policeHit };
}
export function createPedestrians(count = 35) {
  return Array.from({ length: count }, (_, i) => {
    const horizontal = i % 2 === 0;
    const row = 1 + ((i * 7 + 1) % 9), col = 1 + ((i * 13 + 2) % 9);
    const side = i % 4 < 2 ? 1 : -1;
    return {
      x: horizontal ? 80 + ((i * 137) % 2320) : col * BLOCK + side * 59,
      y: horizontal ? row * BLOCK + side * 59 : 80 + ((i * 179) % 2320),
      horizontal, direction: i % 3 ? 1 : -1, speed: 12 + (i * 7 % 14),
      color: PAINTS[(i + 3) % PAINTS.length]
    };
  });
}
export function stepPedestrians(pedestrians, dt) {
  for (const p of pedestrians) {
    if (p.horizontal) p.x += p.direction * p.speed * dt;
    else p.y += p.direction * p.speed * dt;
    if (p.x < 55 || p.x > CITY - 55 || p.y < 55 || p.y > CITY - 55) p.direction *= -1;
    p.x = clamp(p.x,55,CITY-55);
    p.y = clamp(p.y,55,CITY-55);
  }
}
