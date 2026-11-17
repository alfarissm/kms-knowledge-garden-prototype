import { getGamificationSettings, tickState } from './engine/gamification.js';

// Simulator-only policy: stars are sufficient. Keep the shared engine snapshot
// and the authenticated KMS comment requirement unchanged.
export function rateLearningStars(currentState, moduleId, rating, options = {}) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating harus dipilih dari 1 sampai 5.');
  }
  const state = tickState(currentState, options.wallNow ?? Date.now());
  if (!state.completedLearningIds.includes(moduleId)) {
    return { state, awarded: false, reason: 'not-completed' };
  }
  if (Object.hasOwn(state.learningRatings, moduleId)) {
    return { state, awarded: false, reason: 'already-rated' };
  }
  const air = getGamificationSettings().learningRatingAir;
  state.learningRatings[moduleId] = rating;
  state.air += air;
  state.history.unshift({
    id: `${state.history.length}-${state.clockMs}`, at: state.clockMs,
    type: 'activity', title: `Rating Learning: ${options.title ?? moduleId}`,
    detail: air > 0 ? `Rating ${rating}/5 · +${air} Air masuk Storage` : `Rating ${rating}/5 · tanpa reward Air`,
    status: air > 0 ? 'reward' : 'activity', metadata: null, rating,
    airDelta: air, fertilizerDeltaUnits: 0, fruitDelta: 0,
    growthAirDelta: 0, growthFertilizerDeltaUnits: 0,
    careAirDelta: 0, careFertilizerDeltaUnits: 0,
  });
  state.history = state.history.slice(0, 30);
  state.lastValidActivityAt = state.clockMs;
  state.lastDecayResetAt = state.clockMs;
  state.lastDecayAt = state.clockMs;
  return { state, awarded: true };
}
