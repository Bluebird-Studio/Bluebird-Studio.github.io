import test from 'node:test';
import assert from 'node:assert/strict';
import { newInventory, canCraft, craft, mine } from '../voxel-frontier/inventory.mjs';
import { connectWorld } from '../voxel-frontier/survival-events.mjs';

test('complete expedition resources: mine, craft pickaxe, craft beacon', () => {
  const s = newInventory();
  for (let i=0;i<3;i++) mine(s,'stone');
  for (let i=0;i<2;i++) mine(s,'wood');
  assert.equal(canCraft(s,'pickaxe'),true);
  assert.equal(craft(s,'pickaxe'),true);
  for (let i=0;i<4;i++) mine(s,'stone');
  for (let i=0;i<4;i++) mine(s,'wood');
  assert.equal(s.inventory.stone,8);
  assert.equal(canCraft(s,'beacon'),true);
  assert.equal(craft(s,'beacon'),true);
  assert.equal(s.beacon,true);
  assert.equal(s.inventory.stone,0);
  assert.equal(s.inventory.wood,0);
  assert.equal(craft(s,'beacon'),false);
});
test('world mining credits inventory and placement debits only on success', () => {
  const s = newInventory(), cells = new Map([['0,0,0','wood']]);
  let updates=0;
  const world = {
    get(x,y,z) { return cells.get([x,y,z].join(',')) ?? null; },
    set(x,y,z,type) {
      if (x<0 || this.get(x,y,z)===type) return false;
      const key=[x,y,z].join(',');
      if (type===null) cells.delete(key); else cells.set(key,type);
      return true;
    }
  };
  connectWorld({world},s,()=>updates++,()=>{},()=>{});
  assert.equal(world.set(0,0,0,null),true);
  assert.equal(s.inventory.wood,1);
  assert.equal(world.set(2,0,0,'wood'),true);
  assert.equal(s.inventory.wood,0);
  assert.equal(world.set(3,0,0,'wood'),false);
  assert.equal(world.set(-1,0,0,'grass'),false);
  assert.equal(s.inventory.grass,8);
  assert.equal(updates,2);
});
test('saved expedition is restored with sanitized quantities',()=>{
  const s=newInventory({version:1,inventory:{grass:8,stone:-1,wood:100000},pickaxe:true,mined:6});
  assert.equal(s.pickaxe,true);
  assert.equal(s.inventory.stone,0);
  assert.equal(s.inventory.wood,9999);
  assert.equal(s.mined,6);
});
