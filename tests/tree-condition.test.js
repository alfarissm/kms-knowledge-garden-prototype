import { expect, it } from 'vitest';
import { createInitialState, getTreeCondition, applyCare, advanceDemoDays, applyDemoLevelBoost } from '../src/gamification.js';
import { memoryApp } from './helpers/memory-db.js';

const now = 1000;
for (const [air, pupuk, expected] of [[1,2,'healthy'], [0,2,'thirsty'], [1,0,'healthy'], [0,0,'dead']]) {
  it(`uses both care values: Air ${air}, fertilizer units ${pupuk} => ${expected}`, () => {
    expect(getTreeCondition({ ...createInitialState(now), careAir: air, careFertilizerUnits: pupuk })).toBe(expected);
  });
}
it('keeps Storage separate from care condition', () => {
  expect(getTreeCondition({ ...createInitialState(now), air: 99, fertilizerUnits: 99, careAir: 0, careFertilizerUnits: 0 })).toBe('dead');
});
it('turns yellow before dying as both care resources decay', () => {
  const start = createInitialState(now);
  expect(getTreeCondition(advanceDemoDays(start, 7, now))).toBe('thirsty');
  expect(getTreeCondition(advanceDemoDays(start, 14, now))).toBe('dead');
});
it('does not die when only fertilizer depletes', () => {
  const start = { ...createInitialState(now), careAir: 3, careFertilizerUnits: 1 };
  const after = advanceDemoDays(start, 7, now);
  expect(after.careFertilizerUnits).toBe(0);
  expect(getTreeCondition(after)).toBe('healthy');
});
it('restores green with Air alone and yellow with Pupuk alone', () => {
  const dead = { ...createInitialState(now), careAir: 0, careFertilizerUnits: 0 };
  expect(getTreeCondition(applyCare(dead, 'air', { wallNow: now }).state)).toBe('healthy');
  expect(getTreeCondition(applyCare(dead, 'fertilizer', { wallNow: now }).state)).toBe('thirsty');
});
it('keeps the achieved level while condition changes', () => {
  const start = applyDemoLevelBoost(createInitialState(now), now);
  const after = advanceDemoDays(start, 14, now);
  expect(after.level).toBe(start.level);
});
it('demo L3 seeds 9 Air and 6 Pupuk care instead of hidden near-empty reserves', () => {
  let state = createInitialState(now);
  for (let i = 0; i < 3; i++) state = applyDemoLevelBoost(state, now);
  expect(state.careAir).toBe(9);
  expect(state.careFertilizerUnits).toBe(12);
  const once = advanceDemoDays(state, 7, now);
  const twice = advanceDemoDays(once, 7, now);
  expect(once.careAir).toBe(8);
  expect(once.careFertilizerUnits).toBe(11);
  expect(twice.careAir).toBe(7);
  expect(twice.careFertilizerUnits).toBe(10);
  expect(getTreeCondition(twice)).toBe('healthy');
  expect(getTreeCondition(advanceDemoDays(state, 9 * 7, now))).toBe('thirsty');
  expect(getTreeCondition(advanceDemoDays(state, 12 * 7, now))).toBe('dead');
});
it('applies the corrected rule through server-owned care actions', async () => {
  const f = memoryApp({ state: { ...createInitialState(), careAir: 0, careFertilizerUnits: 0 } });
  const response = await f.action('care', { resource: 'air' });
  expect(response.status).toBe(200);
  const { treeState } = await response.json();
  expect(treeState.careFertilizerUnits).toBe(0);
  expect(getTreeCondition(treeState)).toBe('healthy');
  expect(getTreeCondition(f.states.get(1))).toBe('healthy');
});
