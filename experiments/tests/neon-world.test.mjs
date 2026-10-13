import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isRoad, canDrive, makeVehicle, stepVehicle, createTraffic, stepTraffic } from '../neon-streets/world-sim.mjs';

test('roads are drivable and buildings are not', () => {
  assert.equal(isRoad(500,500), true);
  assert.equal(canDrive(625,625), false);
});
test('vehicle accelerates and stays on road', () => {
  const car = makeVehicle(500,500,0);
  for(let i=0;i<60;i++) stepVehicle(car,{throttle:1,steer:0},.05);
  assert.ok(canDrive(car.x,car.y));
  assert.ok(car.x > 600, 'eastbound road continues past x=600');
});
test('diagonal motion collides with a building while road motion stays valid', () => {
  const car = makeVehicle(500, 500, Math.PI / 4);
  let blocked = false;
  for (let i = 0; i < 120; i++) {
    const result = stepVehicle(car, { throttle: 1, steer: 0 }, .05);
    blocked ||= result.collided;
    assert.equal(canDrive(car.x, car.y), true);
  }
  assert.equal(blocked, true);
  assert.ok(car.x < 540 && car.y < 540);
});

test('traffic remains finite', () => {
  const traffic = createTraffic(8);
  stepTraffic(traffic,.05,1,makeVehicle());
  assert.ok(traffic.every(t=>Number.isFinite(t.x)&&Number.isFinite(t.y)));
});
test('game module is loaded and actually uses world physics', () => {
  const html=readFileSync(new URL('../neon-streets/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../neon-streets/game.js',import.meta.url),'utf8');
  assert.match(html,/type="module" src="\.\/game\.js"/);
  assert.match(js,/stepVehicle\(/);
  assert.match(js,/stepTraffic\(/);
  assert.match(js,/drawCityDetails\(/);
  assert.match(js,/stepPedestrians\(/);
  assert.match(js,/stepPolice\(/);
  assert.match(js,/collidePlayerWithActors\(/);
  assert.match(js,/drawPedestrians\(/);
  assert.match(js,/drawPoliceCar\(/);
});
