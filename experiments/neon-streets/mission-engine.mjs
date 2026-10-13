// Original deterministic mission/progression rules. No DOM, canvas or framework dependency.
export const STORAGE_KEY = 'neon-streets-career-v1';
export const PICKUPS = Object.freeze([[750,500],[1000,1000],[1750,1250],[500,1750],[2000,2000],[1250,750],[750,2000]]);
export const DROPS = Object.freeze([[1500,500],[500,1250],[750,1750],[2000,750],[1000,2000],[1750,1500],[250,250]]);
export const MISSION_TYPES = Object.freeze(['courier','rush','escape']);
const radius = 38;
const clampInt = (value, max = 1e9) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : 0;

export class MissionCampaign {
  constructor(storage = null) {
    this.storage = storage;
    let saved = {};
    try { saved = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}') || {}; } catch { saved = {}; }
    this.state = {
      cash: clampInt(saved.cash),
      completed: clampInt(saved.completed, 100000),
      failed: clampInt(saved.failed, 100000),
      stage: 'pickup',
      timeLeft: 0
    };
    this.lastEvent = 'Find the yellow pickup marker.';
  }
  get type() { return MISSION_TYPES[this.state.completed % MISSION_TYPES.length]; }
  get marker() {
    const index = this.state.completed % PICKUPS.length;
    return this.state.stage === 'pickup' ? PICKUPS[index] : DROPS[index];
  }
  get reward() { return 300 + this.state.completed * 50; }
  get label() {
    return this.type === 'courier' ? 'COURIER' : this.type === 'rush' ? 'EXPRESS' : 'GETAWAY';
  }
  get description() {
    const s = this.state;
    const prefix = 'JOB ' + (s.completed + 1) + ' · ' + this.label + ' / ';
    if (s.stage === 'pickup') return prefix + 'Collect the yellow package.';
    if (this.type === 'rush') return prefix + 'Deliver before time runs out · ' + Math.ceil(s.timeLeft) + 's';
    if (this.type === 'escape') return prefix + 'Reach the purple marker with heat below 3.';
    return prefix + 'Deliver the package to the purple marker.';
  }
  save() {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify({
      cash: this.state.cash, completed: this.state.completed, failed: this.state.failed
    })); } catch { /* private mode or storage disabled; gameplay still works */ }
  }
  resetActive() {
    this.state.stage = 'pickup';
    this.state.timeLeft = 0;
    this.lastEvent = 'Mission restarted.';
    return { type: 'restart', message: this.lastEvent };
  }
  newCareer() {
    this.state = { cash: 0, completed: 0, failed: 0, stage: 'pickup', timeLeft: 0 };
    this.lastEvent = 'New career started.';
    this.save();
    return { type: 'new-career', message: this.lastEvent };
  }
  fail() {
    const penalty = Math.min(this.state.cash, 75);
    this.state.cash -= penalty;
    this.state.failed++;
    this.state.stage = 'pickup';
    this.state.timeLeft = 0;
    this.lastEvent = 'Delivery failed. -$' + penalty + ' · Try again.';
    this.save();
    return { type: 'failed', message: this.lastEvent, penalty };
  }
  complete() {
    const bonus = this.type === 'rush' ? Math.ceil(this.state.timeLeft) * 4 : 0;
    const reward = this.reward + bonus;
    this.state.cash += reward;
    this.state.completed++;
    this.state.stage = 'pickup';
    this.state.timeLeft = 0;
    this.lastEvent = 'JOB COMPLETE +$' + reward;
    this.save();
    return { type: 'completed', reward, message: this.lastEvent };
  }
  // dt is elapsed unpaused seconds; collision and police heat are provided by the world engine.
  advance(dt, car, heat = 0) {
    if (!Number.isFinite(dt) || dt < 0 || dt > 1) return null;
    if (!Number.isFinite(car?.x) || !Number.isFinite(car?.y)) return null;
    const s = this.state;
    if (s.stage === 'drop' && this.type === 'rush') {
      s.timeLeft = Math.max(0, s.timeLeft - dt);
      if (s.timeLeft === 0) return this.fail();
    }
    const [mx, my] = this.marker;
    if (Math.hypot(car.x - mx, car.y - my) >= radius) return null;
    if (s.stage === 'pickup') {
      s.stage = 'drop';
      s.timeLeft = this.type === 'rush' ? 85 : 0;
      this.lastEvent = this.type === 'rush' ? 'EXPRESS JOB: 85 seconds!' :
        this.type === 'escape' ? 'GETAWAY: lose the heat, reach the drop!' : 'PACKAGE COLLECTED';
      return { type: 'pickup', message: this.lastEvent, heatDelta: this.type === 'escape' ? 3.4 : 0 };
    }
    if (this.type === 'escape' && heat >= 3) return { type: 'heat-blocked', message: 'Lose the heat before delivering!' };
    return this.complete();
  }
}
