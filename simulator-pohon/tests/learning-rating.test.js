import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rateLearningStars } from '../src/learning-rating.js';
import { createSimulation, performAction } from '../src/simulation.js';
import { DAY_MS, createInitialState, completeLearningModule, rateLearningModule, setGamificationSettings } from '../src/engine/gamification.js';

const now = Date.UTC(2026, 10, 17, 3);
const completed = () => completeLearningModule(createInitialState(now), 'lesson-1', { wallNow: now }).state;
afterEach(() => setGamificationSettings(null));

test('simulator stars do not require or fabricate a Learning comment', () => {
  const before = completed(), copy = structuredClone(before);
  const result = rateLearningStars(before, 'lesson-1', 5, { wallNow: now });
  assert.equal(result.awarded, true);
  assert.equal(result.state.air, before.air + 1);
  assert.equal(result.state.learningRatings['lesson-1'], 5);
  assert.deepEqual(result.state.learningComments, {});
  assert.equal(Object.hasOwn(result.state.history[0], 'comment'), false);
  assert.match(result.state.history[0].detail, /Rating 5\/5/);
  assert.deepEqual(before, copy);
});
test('stars still require a completed module and reward only once', () => {
  assert.equal(rateLearningStars(createInitialState(now), 'lesson-1', 5, { wallNow: now }).reason, 'not-completed');
  const first = rateLearningStars(completed(), 'lesson-1', 5, { wallNow: now });
  const repeated = rateLearningStars(first.state, 'lesson-1', 1, { wallNow: now });
  assert.equal(repeated.reason, 'already-rated');
  assert.equal(repeated.state.air, first.state.air);
  assert.equal(repeated.state.learningRatings['lesson-1'], 5);
  assert.equal(repeated.state.history.length, first.state.history.length);
});
test('stars are integers from one through five', () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.equal(rateLearningStars(completed(), 'lesson-1', rating, { wallNow: now }).awarded, true);
  }
  for (const rating of [0, 6, 2.5, '5', null]) {
    assert.throws(() => rateLearningStars(completed(), 'lesson-1', rating, { wallNow: now }), /1 sampai 5/);
  }
});
test('star reward changes Storage only, not growth, care, fruit, or other rewards', () => {
  const before = completed();
  const after = rateLearningStars(before, 'lesson-1', 5, { wallNow: now }).state;
  for (const key of ['level', 'growthAir', 'growthFertilizerUnits', 'careAir', 'careFertilizerUnits', 'fertilizerUnits', 'fruitsOnTree', 'fruitsInStorage', 'lastAccessRewardDay']) {
    assert.deepEqual(after[key], before[key], key);
  }
  assert.deepEqual(after.fruitLedger, before.fruitLedger);
});
test('star reward follows the configured Learning rating amount, including zero', () => {
  for (const air of [0, 3]) {
    setGamificationSettings({ learningRatingAir: air });
    const before = completed();
    const result = rateLearningStars(before, 'lesson-1', 5, { wallNow: now });
    assert.equal(result.awarded, true);
    assert.equal(result.state.air, before.air + air);
    assert.deepEqual(result.state.learningComments, {});
  }
});
test('valid star activity preserves existing clock and decay behavior', () => {
  const at = now + 6 * DAY_MS;
  const after = rateLearningStars(completed(), 'lesson-1', 5, { wallNow: at }).state;
  assert.equal(after.lastValidActivityAt, at);
  assert.equal(after.lastDecayResetAt, at);
  assert.equal(after.lastDecayAt, at);
});
test('star rating history stays bounded and does not accept a comment payload', () => {
  const before = completed();
  before.history = Array.from({ length: 30 }, (_, index) => ({ id: `old-${index}`, at: now, type: 'activity' }));
  const after = rateLearningStars(before, 'lesson-1', 5, { wallNow: now, comment: 'Do not store this.' }).state;
  assert.equal(after.history.length, 30);
  assert.deepEqual(after.learningComments, {});
  assert.equal(Object.hasOwn(after.history[0], 'comment'), false);
});
test('the simulator rate button records stars without a hidden example comment', () => {
  let sim = performAction(createSimulation(now), 'learn').sim;
  const result = performAction(sim, 'rate');
  assert.deepEqual(result.sim.state.learningComments, {});
  assert.match(result.message, /5 bintang/);
  assert.doesNotMatch(result.message, /komentar/);
  assert.equal(result.sim.state.history[0].rating, 5);
});
test('the shared KMS engine still requires comments and is not relaxed by the simulator policy', () => {
  assert.throws(() => rateLearningModule(completed(), 'lesson-1', 5, { wallNow: now }), /komentar/);
});
