import test from 'node:test';
import assert from 'node:assert/strict';
import { MissionCampaign, PICKUPS, DROPS, STORAGE_KEY } from './mission-engine.mjs';
function store() {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), data };
}
const car = ([x,y]) => ({x,y});
test('courier pickup, delivery, cash and next mission', () => {
  const c = new MissionCampaign(store());
  assert.equal(c.type, 'courier');
  assert.equal(c.advance(0.1, car(PICKUPS[0])).type, 'pickup');
  assert.equal(c.state.stage, 'drop');
  assert.deepEqual(c.marker, DROPS[0]);
  const result = c.advance(.1, car(DROPS[0]));
  assert.equal(result.type, 'completed');
  assert.equal(c.state.completed, 1);
  assert.equal(c.state.cash, 300);
  assert.equal(c.type, 'rush');
});
test('rush mission countdown, reward bonus, timeout and repeat', () => {
  const storage = store();
  const c = new MissionCampaign(storage);
  c.advance(.1, car(PICKUPS[0])); c.advance(.1, car(DROPS[0]));
  c.advance(.1, car(PICKUPS[1]));
  assert.equal(c.state.timeLeft, 85);
  assert.equal(c.advance(.5, {x: 0,y: 0}), null);
  assert.equal(c.state.timeLeft, 84.5);
  const complete = c.advance(.1, car(DROPS[1]));
  assert.equal(complete.type, 'completed');
  assert.ok(complete.reward > 350);
  assert.equal(c.state.completed, 2);
  assert.equal(c.type, 'escape');
  assert.equal(new MissionCampaign(storage).state.completed, 2);
  const timed = new MissionCampaign({getItem:()=>JSON.stringify({completed:1,cash:0}),setItem:()=>{}});
  timed.advance(.1, car(PICKUPS[1]));
  for(let i=0;i<85;i++) timed.advance(1, {x:0,y:0});
  assert.equal(timed.state.failed, 1);
  assert.equal(timed.state.completed, 1);
  assert.equal(timed.state.stage, 'pickup');
});
test('escape requires cool heat and starts a pursuit', () => {
  const c = new MissionCampaign({getItem:()=>JSON.stringify({completed:2}),setItem:()=>{}});
  const pickup = c.advance(.1, car(PICKUPS[2]));
  assert.equal(pickup.heatDelta, 2.5);
  assert.equal(c.advance(.1, car(DROPS[2]), 4).type, 'heat-blocked');
  assert.equal(c.advance(.1, car(DROPS[2]), 2).type, 'completed');
  assert.equal(c.state.completed, 3);
});
test('career state persists, corrupted data is safe, reset/new career work', () => {
  const storage = store();
  const c = new MissionCampaign(storage);
  c.advance(.1, car(PICKUPS[0]));
  c.advance(.1, car(DROPS[0]));
  assert.equal(JSON.parse(storage.data.get(STORAGE_KEY)).cash, 300);
  const restored = new MissionCampaign(storage);
  assert.equal(restored.state.cash, 300);
  assert.equal(restored.state.completed, 1);
  restored.advance(.1, car(PICKUPS[1]));
  restored.resetActive();
  assert.equal(restored.state.stage, 'pickup');
  restored.newCareer();
  assert.equal(new MissionCampaign(storage).state.completed, 0);
  const bad = new MissionCampaign({getItem:()=>'{',setItem:()=>{throw Error('denied')}});
  assert.equal(bad.state.completed, 0);
  assert.doesNotThrow(()=>bad.save());
});
test('invalid inputs and non-contact cannot change mission state', () => {
  const c = new MissionCampaign();
  assert.equal(c.advance(-1, car(PICKUPS[0])), null);
  assert.equal(c.advance(.1, {x:NaN,y:0}), null);
  assert.equal(c.advance(.1, {x:0,y:0}), null);
  assert.equal(c.state.stage, 'pickup');
});
