import { describe, expect, it } from 'vitest';
import {
  advanceDemoDays,
  addDemoResource,
  applyActivity,
  applyCare,
  applyDemoBoost,
  completeLearningModule,
  createInitialState,
  getTreeCondition,
  getLevelForProgress,
  rateLearningModule,
  reviewSharingMaterial,
  simulateDemoTreeCondition,
  submitSharingMaterial,
} from '../src/gamification.js';

describe('gamification prototype logic', () => {
  it('uses cumulative Air/Pupuk thresholds and requires both bars for each level', () => {
    expect(getLevelForProgress(0, 0)).toBe(0);
    expect(getLevelForProgress(1, 2)).toBe(1);
    expect(getLevelForProgress(3, 4)).toBe(2);
    expect(getLevelForProgress(9, 12)).toBe(3);
    expect(getLevelForProgress(27, 36)).toBe(4);
    expect(getLevelForProgress(101, 108)).toBe(5);
    expect(getLevelForProgress(101, 107)).toBe(4);
    expect(getLevelForProgress(100, 108)).toBe(4);
  });

  it('starts at Level 0 with initial Air and Pupuk that do not count as growth progress', () => {
    const state = createInitialState(1_000);

    expect(state.level).toBe(0);
    expect(state.air).toBe(1);
    expect(state.fertilizerUnits / 2).toBe(1);
    expect(state.growthAir).toBe(0);
    expect(state.growthFertilizerUnits).toBe(0);
    expect(getTreeCondition(state)).toBe('healthy');
  });

  it('awards valid activity resources to Storage without changing tree progress', () => {
    const start = createInitialState(1_000);
    const afterAccess = applyActivity(start, 'access', { wallNow: 2_000 });
    const afterLearning = completeLearningModule(afterAccess, 'kms-fundamentals', {
      title: 'Dasar Knowledge Management',
      wallNow: 3_000,
    });

    expect(afterAccess.air).toBe(2);
    expect(afterAccess.growthAir).toBe(0);
    expect(afterLearning.awarded).toBe(true);
    expect(afterLearning.state.air).toBe(2);
    expect(afterLearning.state.fertilizerUnits / 2).toBe(2);
    expect(afterLearning.state.level).toBe(0);
    expect(afterLearning.state.growthAir).toBe(0);
    expect(afterLearning.state.growthFertilizerUnits).toBe(0);
    expect(afterLearning.state.history[0].title).toBe('Learning selesai: Dasar Knowledge Management');
    expect(afterLearning.state.history[0].detail).toContain('+1 Pupuk masuk Storage');
  });

  it('awards +1 Air for the first valid Login per local calendar day only', () => {
    const firstLoginAt = new Date(2026, 8, 29, 8, 0).getTime();
    const nextDayAt = new Date(2026, 8, 30, 0, 1).getTime();
    const start = createInitialState(firstLoginAt);
    const firstLogin = applyActivity(start, 'access', { wallNow: firstLoginAt });

    expect(firstLogin.air).toBe(start.air + 1);
    expect(firstLogin.lastAccessRewardDay).toBe('2026-09-29');

    const legacyState = structuredClone(firstLogin);
    delete legacyState.lastAccessRewardDay;
    const repeatLogin = applyActivity(legacyState, 'access', { wallNow: firstLoginAt + (60 * 60 * 1000) });

    expect(repeatLogin.air).toBe(firstLogin.air);
    expect(repeatLogin.history[0].detail).toContain('sudah diterima hari ini');
    expect(repeatLogin.lastValidActivityAt).toBe(repeatLogin.clockMs);
    expect(repeatLogin.lastDecayResetAt).toBe(repeatLogin.clockMs);

    const nextDayLogin = applyActivity(repeatLogin, 'access', { wallNow: nextDayAt });
    expect(nextDayLogin.air).toBe(repeatLogin.air + 1);
    expect(nextDayLogin.lastAccessRewardDay).toBe('2026-09-30');
  });

  it('awards Sharing only after a submitted material is validated', () => {
    const start = createInitialState(1_000);
    const material = {
      title: 'Panduan orientasi',
      type: 'document',
      url: 'https://example.com/panduan',
      summary: 'Panduan kerja untuk anggota baru.',
    };
    const pending = submitSharingMaterial(start, material, { wallNow: 2_000 });
    const validated = reviewSharingMaterial(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });

    expect(pending.submission.status).toBe('pending');
    expect(pending.state.air).toBe(start.air);
    expect(pending.state.fertilizerUnits).toBe(start.fertilizerUnits);
    expect(pending.state.fruitsInStorage).toBe(0);
    expect(validated.state.air).toBe(4);
    expect(validated.state.fertilizerUnits / 2).toBe(3);
    expect(validated.state.fruitsInStorage).toBe(1);
    expect(validated.state.level).toBe(0);
    expect(validated.state.growthAir).toBe(0);
    expect(validated.state.growthFertilizerUnits).toBe(0);
    expect(validated.state.sharingSubmissions[0].status).toBe('validated');
    expect(validated.state.lastValidActivityAt).toBe(validated.state.clockMs);
    expect(validated.state.lastDecayAt).toBe(validated.state.clockMs);
  });

  it('credits fruit from a validated Sharing to a healthy Level 3 tree without double-counting growth', () => {
    const mature = createInitialState(1_000);
    mature.level = 3;
    mature.growthAir = 9;
    mature.growthFertilizerUnits = 12;
    const pending = submitSharingMaterial(mature, {
      title: 'Panduan berbagi pengetahuan',
      type: 'article',
      summary: 'Cara berbagi pengetahuan di KMS.',
    }, { wallNow: 2_000 });
    const validated = reviewSharingMaterial(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });

    expect(validated.state.air).toBe(mature.air + 3);
    expect(validated.state.fertilizerUnits).toBe(mature.fertilizerUnits + 4);
    expect(validated.state.fruitsInStorage).toBe(0);
    expect(validated.state.fruitsOnTree).toBe(1);
    expect(validated.state.growthAir).toBe(mature.growthAir);
    expect(validated.state.growthFertilizerUnits).toBe(mature.growthFertilizerUnits);
  });

  it('allows Sharing without a video attachment and records an optional upload', () => {
    const start = createInitialState(1_000);
    const material = {
      title: 'Video orientasi',
      type: 'video',
      summary: 'Pengenalan singkat untuk anggota baru.',
    };
    const withoutVideo = submitSharingMaterial(start, material, { wallNow: 2_000 });
    const withVideo = submitSharingMaterial(start, {
      ...material,
      attachment: { name: 'orientasi.mp4', type: 'video/mp4', size: 12_345 },
    }, { wallNow: 2_500 });
    const duplicateVideo = submitSharingMaterial(withVideo.state, {
      ...material,
      attachment: { name: 'orientasi.mp4', type: 'video/mp4', size: 12_345 },
    }, { wallNow: 3_000 });

    expect(withoutVideo.submission.status).toBe('pending');
    expect(withoutVideo.submission.attachment).toBeNull();
    expect(withoutVideo.submission.url).toBe('');
    expect(withVideo.submission.attachment).toEqual({ name: 'orientasi.mp4', type: 'video/mp4', size: 12_345 });
    expect(duplicateVideo.submission.status).toBe('duplicate');
    expect(duplicateVideo.state.air).toBe(start.air);
  });

  it('does not reward pending, rejected, or duplicate Sharing and prevents a second review', () => {
    const start = createInitialState(1_000);
    const material = {
      title: 'Panduan orientasi',
      type: 'document',
      url: 'https://example.com/panduan',
      summary: 'Panduan kerja untuk anggota baru.',
    };
    const pending = submitSharingMaterial(start, material, { wallNow: 2_000 });
    const rejected = reviewSharingMaterial(pending.state, pending.submission.id, 'rejected', { wallNow: 3_000 });
    const duplicate = submitSharingMaterial(rejected.state, {
      ...material,
      title: 'Salinan panduan',
      url: 'https://EXAMPLE.com/panduan/#ringkasan',
    }, { wallNow: 4_000 });
    const duplicateReview = reviewSharingMaterial(duplicate.state, duplicate.submission.id, 'validated', { wallNow: 5_000 });

    expect(rejected.state.air).toBe(start.air);
    expect(rejected.state.fertilizerUnits).toBe(start.fertilizerUnits);
    expect(duplicate.submission.status).toBe('duplicate');
    expect(duplicate.state.air).toBe(start.air);
    expect(duplicate.state.fertilizerUnits).toBe(start.fertilizerUnits);
    expect(duplicate.state.fruitsInStorage).toBe(0);
    expect(duplicateReview.applied).toBe(false);
    expect(duplicateReview.state.air).toBe(start.air);
  });

  it('allows one Air reward for rating a completed Learning module only once', () => {
    const start = createInitialState(1_000);
    const earlyRating = rateLearningModule(start, 'kms-fundamentals', 5, { wallNow: 2_000 });
    const completed = completeLearningModule(start, 'kms-fundamentals', { wallNow: 3_000 });
    const rated = rateLearningModule(completed.state, 'kms-fundamentals', 4, { wallNow: 4_000 });
    const repeatedRating = rateLearningModule(rated.state, 'kms-fundamentals', 5, { wallNow: 5_000 });

    expect(earlyRating.reason).toBe('not-completed');
    expect(earlyRating.state.air).toBe(start.air);
    expect(rated.awarded).toBe(true);
    expect(rated.state.air).toBe(start.air + 1);
    expect(rated.state.growthAir).toBe(0);
    expect(rated.state.level).toBe(0);
    expect(rated.state.history[0].detail).toContain('+1 Air masuk Storage');
    expect(rated.state.learningRatings['kms-fundamentals']).toBe(4);
    expect(repeatedRating.reason).toBe('already-rated');
    expect(repeatedRating.state.air).toBe(start.air + 1);
  });

  it('keeps the Learning rating record attached to its reward when fruit is reconciled', () => {
    const mature = createInitialState(1_000);
    mature.level = 3;
    mature.growthAir = 9;
    mature.growthFertilizerUnits = 12;
    mature.completedLearningIds = ['kms-fundamentals'];
    mature.fruitsInStorage = 2;
    const rated = rateLearningModule(mature, 'kms-fundamentals', 5, { wallNow: 2_000 });

    expect(rated.state.history[0].title).toBe('Rating Learning: kms-fundamentals');
    expect(rated.state.history[0].rating).toBe(5);
    expect(rated.state.history[0].detail).toBe('Rating 5/5 · +1 Air masuk Storage');
    expect(rated.state.history[1].title).toBe('Buah kembali terlihat di pohon');
    expect(rated.state.fruitsOnTree).toBe(2);
  });

  it('awards one Air for Review without resetting the decay clock', () => {
    const start = createInitialState(1_000);
    const afterDecay = advanceDemoDays(start, 7, 1_000);
    const beforeReviewAir = afterDecay.air;
    const lastDecayAt = afterDecay.lastDecayAt;
    const lastDecayResetAt = afterDecay.lastDecayResetAt;
    const lastValidActivityAt = afterDecay.lastValidActivityAt;
    const reviewed = applyActivity(afterDecay, 'review', { wallNow: 1_000 });

    expect(reviewed.air).toBe(beforeReviewAir + 1);
    expect(reviewed.fertilizerUnits).toBe(afterDecay.fertilizerUnits);
    expect(reviewed.growthAir).toBe(afterDecay.growthAir);
    expect(reviewed.growthFertilizerUnits).toBe(afterDecay.growthFertilizerUnits);
    expect(reviewed.lastValidActivityAt).toBe(lastValidActivityAt);
    expect(reviewed.lastDecayResetAt).toBe(lastDecayResetAt);
    expect(reviewed.lastDecayAt).toBe(lastDecayAt);
    expect(reviewed.history[0].detail).toBe('+1 Air masuk Storage');

    const weekLater = advanceDemoDays(reviewed, 7, 1_000);
    expect(weekLater.lastDecayAt).toBe(lastDecayAt + (7 * 24 * 60 * 60 * 1000));
    expect(weekLater.air).toBe(reviewed.air);
  });

  it('reduces growth bars and care each week without spending Storage', () => {
    const start = createInitialState(1_000);
    const watered = applyCare(start, 'air', { wallNow: 1_000 }).state;
    const state = applyCare(watered, 'fertilizer', { wallNow: 1_000 }).state;
    const decayed = advanceDemoDays(state, 7, 1_000);

    expect(decayed.air).toBe(state.air);
    expect(decayed.fertilizerUnits).toBe(state.fertilizerUnits);
    expect(decayed.careAir).toBe(1);
    expect(decayed.careFertilizerUnits).toBe(3);
    expect(decayed.growthAir).toBe(Math.max(0, state.growthAir - 1));
    expect(decayed.growthFertilizerUnits).toBe(Math.max(0, state.growthFertilizerUnits - 1));
    expect(getTreeCondition(decayed)).toBe('healthy');
    expect(state.level).toBe(1);
    expect(decayed.level).toBe(1);
    expect(decayed.history[0].growthAirDelta).toBe(-1);
    expect(decayed.history[0].growthFertilizerDeltaUnits).toBe(-1);
    expect(decayed.history[0].careAirDelta).toBe(-1);
    expect(decayed.history[0].careFertilizerDeltaUnits).toBe(-1);
    expect(decayed.history[0].airDelta).toBe(0);
    expect(decayed.history[0].fertilizerDeltaUnits).toBe(0);
    expect(decayed.history.some((entry) => entry.type === 'decay'
      && entry.detail.includes('progres Air −1')
      && entry.detail.includes('progres Pupuk −0,5'))).toBe(true);
  });

  it('decreases progress across multiple weeks, floors it at zero, and preserves the level', () => {
    const start = createInitialState(1_000);
    const watered = applyCare(start, 'air', { wallNow: 1_000 }).state;
    const state = applyCare(watered, 'fertilizer', { wallNow: 1_000 }).state;
    const decayed = advanceDemoDays(state, 21, 1_000);

    expect(decayed.growthAir).toBe(0);
    expect(decayed.growthFertilizerUnits).toBe(0);
    expect(decayed.level).toBe(state.level);
  });

  it('uses one stored Air to restore the tree and advance its Air progress', () => {
    const start = createInitialState(1_000);
    const thirsty = advanceDemoDays(start, 7, 1_000);
    const result = applyCare(thirsty, 'air', { wallNow: 1_000 });

    expect(getTreeCondition(thirsty)).toBe('thirsty');
    expect(result.applied).toBe(true);
    expect(result.state.air).toBe(0);
    expect(result.state.careAir).toBe(1);
    expect(getTreeCondition(result.state)).toBe('healthy');
    expect(result.state.growthAir).toBe(thirsty.growthAir + 1);
    expect(result.state.growthFertilizerUnits).toBe(thirsty.growthFertilizerUnits);
  });

  it('uses stored Air and Pupuk to fill progress, then advances the cumulative level', () => {
    const start = createInitialState(1_000);
    const watered = applyCare(start, 'air', { wallNow: 1_000 });
    const fertilized = applyCare(watered.state, 'fertilizer', { wallNow: 1_000 });

    expect(watered.state.growthAir).toBe(1);
    expect(watered.state.level).toBe(0);
    expect(fertilized.state.growthFertilizerUnits).toBe(2);
    expect(fertilized.state.level).toBe(1);
    expect(fertilized.state.air).toBe(0);
    expect(fertilized.state.fertilizerUnits).toBe(0);
  });

  it('resets the decay clock on tree care without mislabeling care as KMS activity', () => {
    const start = createInitialState(1_000);
    const watered = applyCare(start, 'air', { wallNow: 2_000 });

    expect(watered.state.lastValidActivityAt).toBe(start.lastValidActivityAt);
    expect(watered.state.lastCareAt).toBe(watered.state.clockMs);
    expect(watered.state.lastDecayResetAt).toBe(watered.state.clockMs);
    expect(watered.state.lastDecayAt).toBe(watered.state.clockMs);
  });

  it('uses one stored Pupuk to restore fertilizer care and rejects care without enough Storage', () => {
    const start = createInitialState(1_000);
    const dead = advanceDemoDays(start, 14, 1_000);
    const fertilized = applyCare(dead, 'fertilizer', { wallNow: 1_000 });

    expect(getTreeCondition(dead)).toBe('dead');
    expect(fertilized.applied).toBe(true);
    expect(fertilized.state.fertilizerUnits).toBe(0);
    expect(fertilized.state.careFertilizerUnits).toBe(2);
    expect(getTreeCondition(fertilized.state)).toBe('thirsty');

    const watered = applyCare(fertilized.state, 'air', { wallNow: 1_000 });
    const insufficient = applyCare(watered.state, 'fertilizer', { wallNow: 1_000 });
    expect(insufficient.applied).toBe(false);
    expect(insufficient.state.careFertilizerUnits).toBe(fertilized.state.careFertilizerUnits);
    expect(insufficient.state.history[0].status).toBe('insufficient');
  });

  it('keeps unused Storage when that resource progress is full, then advances level from the paired resource', () => {
    const start = createInitialState(1_000);
    start.growthFertilizerUnits = 2;
    const learned = completeLearningModule(start, 'first-module', { wallNow: 1_000 });
    const blockedCare = applyCare(learned.state, 'fertilizer', { wallNow: 1_000 });
    const afterAccess = applyActivity(learned.state, 'access', { wallNow: 1_000 });
    const afterWatering = applyCare(afterAccess, 'air', { wallNow: 1_000 });

    expect(learned.state.level).toBe(0);
    expect(learned.state.growthFertilizerUnits).toBe(2);
    expect(learned.state.fertilizerUnits).toBe(start.fertilizerUnits + 2);
    expect(blockedCare.applied).toBe(false);
    expect(blockedCare.reason).toBe('progress-full');
    expect(blockedCare.state.fertilizerUnits).toBe(learned.state.fertilizerUnits);
    expect(afterAccess.level).toBe(0);
    expect(afterAccess.growthAir).toBe(0);
    expect(afterWatering.state.level).toBe(1);
    expect(afterWatering.state.growthAir).toBe(1);
    expect(afterWatering.state.growthFertilizerUnits).toBe(2);
  });

  it('allows care recovery at the Level 5 progress cap without adding progress past the cap', () => {
    const maxed = createInitialState(1_000);
    maxed.level = 5;
    maxed.growthAir = 101;
    maxed.growthFertilizerUnits = 108;
    maxed.careAir = 1;
    maxed.careFertilizerUnits = 2;
    maxed.fruitsOnTree = 3;
    const dead = simulateDemoTreeCondition(maxed, 'dead');
    const watered = applyCare(dead, 'air', { wallNow: 1_000 });
    const fertilized = applyCare(watered.state, 'fertilizer', { wallNow: 1_000 });

    expect(getTreeCondition(dead)).toBe('dead');
    expect(watered.applied).toBe(true);
    expect(watered.progressApplied).toBe(false);
    expect(getTreeCondition(watered.state)).toBe('dead');
    expect(fertilized.applied).toBe(true);
    expect(fertilized.progressApplied).toBe(false);
    expect(getTreeCondition(fertilized.state)).toBe('healthy');
    expect(fertilized.state.level).toBe(5);
    expect(fertilized.state.growthAir).toBe(101);
    expect(fertilized.state.growthFertilizerUnits).toBe(108);
    expect(fertilized.state.fruitsOnTree).toBe(3);
    expect(fertilized.state.fruitsInStorage).toBe(0);
  });

  it('holds sharing fruit in Storage until Level 3, then displays the exact amount and preserves level on decay', () => {
    let state = createInitialState(1_000);
    for (let index = 0; index < 3; index += 1) {
      const pending = submitSharingMaterial(state, {
        title: `Panduan ${index + 1}`,
        type: 'document',
        url: `https://example.com/panduan-${index + 1}`,
        summary: 'Materi pengetahuan untuk pengujian demo.',
      }, { wallNow: 1_000 });
      state = reviewSharingMaterial(pending.state, pending.submission.id, 'validated', { wallNow: 1_000 }).state;
    }

    expect(state.level).toBe(0);
    expect(state.growthAir).toBe(0);
    expect(state.growthFertilizerUnits).toBe(0);
    expect(state.fruitsInStorage).toBe(3);
    expect(state.fruitsOnTree).toBe(0);

    const airTargets = [1, 3, 9];
    const fertilizerTargets = [2, 4, 12];
    while (state.level < 3) {
      const targetAir = airTargets[state.level];
      const targetFertilizer = fertilizerTargets[state.level];
      while (state.growthAir < targetAir) {
        const result = applyCare(state, 'air', { wallNow: 1_000 });
        if (!result.applied) break;
        state = result.state;
      }
      while (state.growthFertilizerUnits < targetFertilizer) {
        const result = applyCare(state, 'fertilizer', { wallNow: 1_000 });
        if (!result.applied) break;
        state = result.state;
      }
    }

    expect(state.level).toBe(3);
    expect(state.growthAir).toBe(9);
    expect(state.growthFertilizerUnits).toBe(12);
    expect(state.fruitsInStorage).toBe(0);
    expect(state.fruitsOnTree).toBe(3);

    const decayed = advanceDemoDays(state, 98, 1_000);
    expect(decayed.level).toBe(3);
    expect(getTreeCondition(decayed)).toBe('dead');
    expect(decayed.fruitsOnTree).toBe(0);
    expect(decayed.fruitsInStorage).toBe(3);
  });

  it('stores fruit while the tree is yellow or dead and restores it after the tree is healthy again', () => {
    const mature = createInitialState(1_000);
    mature.level = 3;
    mature.growthAir = 9;
    mature.growthFertilizerUnits = 12;
    mature.fruitsOnTree = 5;

    const yellow = advanceDemoDays(mature, 7, 1_000);
    expect(getTreeCondition(yellow)).toBe('thirsty');
    expect(yellow.careAir).toBe(0);
    expect(yellow.careFertilizerUnits).toBe(1);
    expect(yellow.lastDecayAt).toBe(mature.lastDecayAt + (7 * 24 * 60 * 60 * 1000));
    expect(yellow.fruitsOnTree).toBe(0);
    expect(yellow.fruitsInStorage).toBe(5);
    expect(yellow.history[0].type).toBe('fruit');
    expect(yellow.history.some((entry) => entry.type === 'decay')).toBe(true);

    const healthyAgain = applyCare(yellow, 'air', { wallNow: 1_000 }).state;
    expect(getTreeCondition(healthyAgain)).toBe('healthy');
    expect(healthyAgain.fruitsOnTree).toBe(5);
    expect(healthyAgain.fruitsInStorage).toBe(0);

    const dead = advanceDemoDays(healthyAgain, 14, 1_000);
    expect(getTreeCondition(dead)).toBe('dead');
    expect(dead.fruitsOnTree).toBe(0);
    expect(dead.fruitsInStorage).toBe(5);

    const stocked = addDemoResource(dead, 'air', 1, { wallNow: 1_000 });
    const thirstyAgain = applyCare(stocked, 'fertilizer', { wallNow: 1_000 }).state;
    expect(getTreeCondition(thirstyAgain)).toBe('thirsty');
    expect(thirstyAgain.fruitsOnTree).toBe(0);
    expect(thirstyAgain.fruitsInStorage).toBe(5);

    const restored = applyCare(thirstyAgain, 'air', { wallNow: 1_000 }).state;
    expect(getTreeCondition(restored)).toBe('healthy');
    expect(restored.fruitsOnTree).toBe(5);
    expect(restored.fruitsInStorage).toBe(0);
  });

  it('lets demo condition controls show yellow and dead states without changing growth or Storage balances', () => {
    const mature = createInitialState(1_000);
    mature.level = 3;
    mature.growthAir = 9;
    mature.growthFertilizerUnits = 12;
    mature.fruitsOnTree = 4;
    const yellow = simulateDemoTreeCondition(mature, 'thirsty');

    expect(getTreeCondition(yellow)).toBe('thirsty');
    expect(yellow.fruitsOnTree).toBe(0);
    expect(yellow.fruitsInStorage).toBe(4);
    expect(yellow.air).toBe(mature.air);
    expect(yellow.fertilizerUnits).toBe(mature.fertilizerUnits);
    expect(yellow.growthAir).toBe(mature.growthAir);
    expect(yellow.growthFertilizerUnits).toBe(mature.growthFertilizerUnits);

    const dead = simulateDemoTreeCondition(yellow, 'dead');
    expect(getTreeCondition(dead)).toBe('dead');
    expect(dead.fruitsOnTree).toBe(0);
    expect(dead.fruitsInStorage).toBe(4);
    expect(dead.history[0].title).toBe('Demo: uji pohon mati');
  });

  it('moves exactly five stored fruits onto the tree when Level 3 is reached', () => {
    const nearlyMature = createInitialState(1_000);
    nearlyMature.level = 2;
    nearlyMature.growthAir = 8;
    nearlyMature.growthFertilizerUnits = 12;
    const stocked = addDemoResource(nearlyMature, 'fruit', 5, { wallNow: 1_000 });
    const mature = applyCare(stocked, 'air', { wallNow: 1_000 }).state;

    expect(mature.level).toBe(3);
    expect(mature.fruitsOnTree).toBe(5);
    expect(mature.fruitsInStorage).toBe(0);
  });

  it('supports the demo boost without changing the normal activity reward rules', () => {
    const boosted = applyDemoBoost(createInitialState(1_000), 2_000);

    expect(boosted.air).toBe(11);
    expect(boosted.fertilizerUnits / 2).toBe(7);
    expect(boosted.level).toBe(0);
    expect(boosted.fruitsInStorage).toBe(1);
    expect(boosted.fruitsOnTree).toBe(0);
    expect(boosted.growthAir).toBe(0);
    expect(boosted.growthFertilizerUnits).toBe(0);
    expect(boosted.lastDecayAt).toBe(1_000);
  });

  it('adds demo resources to Storage only without changing the tree or resetting the decay clock', () => {
    const start = createInitialState(1_000);
    const withAir = addDemoResource(start, 'air', 2, { wallNow: 2_000 });
    const withFertilizer = addDemoResource(withAir, 'fertilizer', 0.5, { wallNow: 2_000 });
    const matureTree = structuredClone(withFertilizer);
    matureTree.level = 3;
    matureTree.fruitsOnTree = 2;
    const withFruit = addDemoResource(matureTree, 'fruit', 3, { wallNow: 2_000 });

    expect(withAir.air).toBe(start.air + 2);
    expect(withAir.growthAir).toBe(start.growthAir);
    expect(withAir.careAir).toBe(start.careAir);
    expect(withAir.level).toBe(start.level);
    expect(withFertilizer.fertilizerUnits).toBe(start.fertilizerUnits + 1);
    expect(withFertilizer.growthFertilizerUnits).toBe(start.growthFertilizerUnits);
    expect(withFertilizer.careFertilizerUnits).toBe(start.careFertilizerUnits);
    expect(withFruit.fruitsInStorage).toBe(matureTree.fruitsInStorage);
    expect(withFruit.fruitsOnTree).toBe(matureTree.fruitsOnTree + 3);
    expect(withFruit.level).toBe(matureTree.level);
    expect(withFruit.lastDecayAt).toBe(start.lastDecayAt);
    expect(withFruit.lastValidActivityAt).toBe(start.lastValidActivityAt);
    expect(withFruit.history[0].detail).toContain('langsung ditampilkan');
    expect(() => addDemoResource(start, 'fertilizer', 0.25)).toThrow('kelipatan 0,5');
    expect(() => addDemoResource(start, 'fruit', 1.5)).toThrow('bilangan bulat');
  });

  it('applies elapsed decay before demo Storage additions without treating the addition as valid activity', () => {
    const start = createInitialState(1_000);
    start.growthAir = 3;
    start.growthFertilizerUnits = 4;
    start.level = 2;
    const oneWeekLater = addDemoResource(start, 'air', 2, { wallNow: 1_000 + (7 * 24 * 60 * 60 * 1000) });

    expect(oneWeekLater.air).toBe(start.air + 2);
    expect(oneWeekLater.growthAir).toBe(2);
    expect(oneWeekLater.growthFertilizerUnits).toBe(3);
    expect(oneWeekLater.level).toBe(2);
    expect(oneWeekLater.lastDecayAt).toBe(start.lastDecayAt + (7 * 24 * 60 * 60 * 1000));
    expect(oneWeekLater.lastValidActivityAt).toBe(start.lastValidActivityAt);
  });

  it('normalizes legacy or incomplete tree state before applying decay', () => {
    const legacy = {
      level: 1,
      air: 2,
      fertilizerUnits: 2,
      clockMs: 1_000,
      wallClockSyncedAt: 1_000,
      lastDecayAt: 1_000,
      history: [],
    };
    const decayed = advanceDemoDays(legacy, 7, 1_000);

    expect(Number.isFinite(decayed.growthAir)).toBe(true);
    expect(Number.isFinite(decayed.growthFertilizerUnits)).toBe(true);
    expect(decayed.growthAir).toBe(0);
    expect(decayed.growthFertilizerUnits).toBe(0);
  });
});
