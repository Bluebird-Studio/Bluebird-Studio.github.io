import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVehicle, stepVehicle } from './world-sim.mjs';
test('car moves',()=>{const car=makeVehicle();stepVehicle(car,{throttle:1,steer:0},0.1);assert.ok(car.speed>0);});
