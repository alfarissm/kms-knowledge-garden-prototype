import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, performAction, canLogin } from '../src/simulation.js';
import { LEVELS, getTreeCondition, getFruitView, getLevelForProgress } from '../src/engine/gamification.js';
import { makeTreeSvg } from '../src/engine/tree-svg.js';

const now = Date.UTC(2026,10,4,9);
const fresh = () => createSimulation(now);
const step = (sim, action) => performAction(sim,action).sim;

test('fresh simulation uses isolated initial resources',()=>{
  const sim=fresh();assert.equal(sim.state.level,0);assert.equal(sim.state.air,1);assert.equal(sim.state.fertilizerUnits,2);
});
for (const [air,pupuk,expected] of [[1,2,'healthy'],[0,2,'thirsty'],[1,0,'healthy'],[0,0,'dead']]) {
  test(`condition: care Air ${air}, fertilizer units ${pupuk} => ${expected}`,()=>{
    assert.equal(getTreeCondition({...fresh().state,careAir:air,careFertilizerUnits:pupuk}),expected);
  });
}
test('Storage does not mask empty care resources',()=>{
  assert.equal(getTreeCondition({...fresh().state,air:999,fertilizerUnits:999,careAir:0,careFertilizerUnits:0}),'dead');
});
test('normal decay turns yellow first, then dead when both are empty',()=>{
  let sim=step(fresh(),'advance');assert.equal(getTreeCondition(sim.state),'thirsty');
  sim=step(sim,'advance');assert.equal(getTreeCondition(sim.state),'dead');
});
test('fertilizer depletion alone does not kill the tree or remove hanging fruit',()=>{
  let sim=step(fresh(),'example');sim.state.careAir=3;sim.state.careFertilizerUnits=1;
  sim=step(sim,'advance');assert.equal(sim.state.careAir,2);assert.equal(sim.state.careFertilizerUnits,0);
  assert.equal(getTreeCondition(sim.state),'healthy');assert.equal(sim.state.fruitsOnTree,3);
  sim=step(step(sim,'advance'),'advance');assert.equal(getTreeCondition(sim.state),'dead');assert.equal(sim.state.fruitsOnTree,0);
});
test('watering a dead tree restores green even if fertilizer is empty',()=>{
  let sim=step(step(fresh(),'dead'),'care-air');assert.equal(getTreeCondition(sim.state),'healthy');assert.equal(sim.state.careFertilizerUnits,0);
});
test('fertilizing a dead tree without water only restores yellow',()=>{
  let sim=step(step(fresh(),'dead'),'care-fertilizer');assert.equal(getTreeCondition(sim.state),'thirsty');assert.equal(sim.state.careAir,0);
});
test('actions do not mutate their inputs',()=>{
  const sim=fresh(),copy=structuredClone(sim);step(sim,'boost');assert.deepEqual(sim,copy);
});
test('resource reward alone never raises level',()=>{
  const sim=step(fresh(),'boost');assert.equal(sim.state.level,0);assert.equal(sim.state.air,11);assert.equal(sim.state.fertilizerUnits,14);assert.equal(sim.state.growthAir,0);
});
test('Air AND Pupuk need to be applied to reach Level 1',()=>{
  let sim=step(fresh(),'care-air');assert.equal(sim.state.level,0);sim=step(sim,'care-fertilizer');assert.equal(sim.state.level,1);assert.equal(sim.state.air,0);assert.equal(sim.state.fertilizerUnits,0);
});
test('login gives one Air per simulated day',()=>{
  let sim=step(fresh(),'login');assert.equal(sim.state.air,2);assert.equal(canLogin(sim.state),false);
  sim=step(sim,'login');assert.equal(sim.state.air,2);sim=step(sim,'advance');assert.equal(canLogin(sim.state),true);sim=step(sim,'login');assert.equal(sim.state.air,3);
});
test('each Learning click represents a distinct completed module',()=>{
  let sim=step(fresh(),'learn');sim=step(sim,'learn');assert.equal(sim.state.completedLearningIds.length,2);assert.equal(sim.state.fertilizerUnits,6);
});
test('rating requires completion and rewards only once',()=>{
  assert.throws(()=>step(fresh(),'rate'),/Tuntaskan/);
  let sim=step(fresh(),'learn');sim=step(sim,'rate');const air=sim.state.air;sim=step(sim,'rate');assert.equal(sim.state.air,air);assert.equal(sim.state.learningRatings['lesson-1'],5);
});
test('Sharing pending grants no reward and no fruit',()=>{
  const sim=step(fresh(),'share');assert.equal(sim.state.air,1);assert.equal(sim.state.fruitsInStorage,0);assert.equal(sim.selectedId,'content-1');assert.equal(sim.state.sharingSubmissions[0].status,'pending');
});
test('first ACC gives 3 Air, 2 Pupuk and one content-bound fruit',()=>{
  let sim=step(step(fresh(),'share'),'acc');assert.equal(sim.state.air,4);assert.equal(sim.state.fertilizerUnits,6);assert.equal(sim.state.fruitsInStorage,1);assert.equal(sim.state.fruitLedger[0].submissionId,'content-1');
  sim=step(sim,'acc');assert.equal(sim.state.air,4);assert.equal(sim.state.fruitLedger.length,1);
});
test('example loads a healthy Level 3 tree with 3 bound fruit',()=>{
  const sim=step(fresh(),'example');assert.equal(sim.state.level,3);assert.equal(getTreeCondition(sim.state),'healthy');assert.equal(sim.state.fruitsOnTree,3);assert.equal(sim.state.sharingSubmissions.length,3);assert.equal(sim.events.length,1);
});
test('stale fruit rests on ground and renders brown',()=>{
  const sim=step(step(fresh(),'example'),'stale');assert.equal(sim.state.fruitsOnTree,2);assert.equal(getFruitView(sim.state).ground.length,1);
  assert.match(makeTreeSvg(3,'healthy',getFruitView(sim.state)),/fruit-ground-lying/);
});
for (const action of ['rejected','duplicate']) test(`${action} removes fruit without moving other slots`,()=>{
  let sim=step(fresh(),'example');const slots=sim.state.fruitLedger.map(x=>x.slot);sim=step(sim,action);
  assert.deepEqual(sim.state.fruitLedger.map(x=>x.slot),slots);assert.equal(sim.state.fruitLedger[2].placement,'gone');assert.equal(sim.state.fruitsOnTree,2);
});
test('ACC again restores the same slot without resource reward',()=>{
  let sim=step(step(fresh(),'example'),'stale');const air=sim.state.air,pup=sim.state.fertilizerUnits;sim=step(sim,'acc');assert.equal(sim.state.air,air);assert.equal(sim.state.fertilizerUnits,pup);assert.equal(sim.state.fruitLedger[2].slot,3);assert.equal(sim.state.fruitLedger[2].placement,'tree');
});
test('unhealthy trees return active fruit to storage',()=>{
  let sim=step(step(fresh(),'example'),'thirsty');assert.equal(getTreeCondition(sim.state),'thirsty');assert.equal(sim.state.fruitsOnTree,0);assert.equal(sim.state.fruitsInStorage,3);
  sim=step(sim,'healthy');assert.equal(sim.state.fruitsOnTree,0);sim=step(sim,'care-fruit');assert.equal(sim.state.fruitsOnTree,1);
});
test('stale fruit remains on ground when tree dies',()=>{
  let sim=step(step(fresh(),'example'),'stale');sim=step(sim,'dead');assert.equal(getTreeCondition(sim.state),'dead');assert.equal(getFruitView(sim.state).ground.length,1);assert.equal(sim.state.fruitsInStorage,2);
});
test('seven-day decay reduces progress/care but not level or Storage',()=>{
  const before=step(fresh(),'example'),after=step(before,'advance');assert.equal(after.state.growthAir,before.state.growthAir-1);assert.equal(after.state.growthFertilizerUnits,before.state.growthFertilizerUnits-1);assert.equal(after.state.careAir,before.state.careAir-1);assert.equal(after.state.air,before.state.air);assert.equal(after.state.level,before.state.level);assert.equal(after.state.clockMs-before.state.clockMs,7*86400000);
});
test('demo level buttons respect bounds',()=>{
  let sim=fresh();for(let i=0;i<10;i++)sim=step(sim,'level-up');assert.equal(sim.state.level,7);for(let i=0;i<10;i++)sim=step(sim,'level-down');assert.equal(sim.state.level,0);
});
test('reset clears only the isolated simulation',()=>{
  const sim=step(step(fresh(),'example'),'reset');assert.equal(sim.state.level,0);assert.equal(sim.state.sharingSubmissions.length,0);assert.equal(sim.state.fruitLedger.length,0);assert.equal(sim.state.air,1);
});
test('review cannot run without selected content',()=>{assert.throws(()=>step(fresh(),'acc'),/Pilih konten/);});
test('unknown actions fail safely',()=>{assert.throws(()=>step(fresh(),'api-delete'),/tidak dikenal/);});
test('history is bounded to 8 simulation actions',()=>{let sim=fresh();for(let i=0;i<20;i++)sim=step(sim,'learn');assert.equal(sim.events.length,8);});
for(const level of LEVELS) test(`Level ${level.level} threshold and SVG remain valid`,()=>{
  assert.equal(getLevelForProgress(level.air,level.fertilizerUnits),level.level);
  const svg=makeTreeSvg(level.level,'healthy',{tree:[],ground:[]});assert.match(svg,/<svg/);assert.doesNotMatch(svg,/NaN|undefined/);
});
