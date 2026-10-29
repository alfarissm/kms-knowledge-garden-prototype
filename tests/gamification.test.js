import { describe, expect, it } from 'vitest';
import {
  advanceDemoDays,
  addDemoResource,
  addSharingReport,
  applyActivity,
  applyCare,
  applyDemoBoost,
  applyDemoLevelBoost,
  applyDemoLevelDecrease,
  completeLearningModule,
  createInitialState,
  getFruitView,
  getTreeCondition,
  getLevelForProgress,
  rateLearningModule,
  setSharingCondition,
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
    expect(getLevelForProgress(52, 60)).toBe(5);
    expect(getLevelForProgress(77, 84)).toBe(6);
    expect(getLevelForProgress(101, 108)).toBe(7);
    expect(getLevelForProgress(101, 107)).toBe(6);
    expect(getLevelForProgress(100, 108)).toBe(6);
    expect(getLevelForProgress(52, 59)).toBe(4);
  });

  it('upgrades old saved Level 5 trees to Level 7 even after their bars have decayed', () => {
    const oldMaxLevel = createInitialState(1_000);
    oldMaxLevel.level = 5;
    oldMaxLevel.growthAir = 12;
    oldMaxLevel.growthFertilizerUnits = 18;
    delete oldMaxLevel.levelSystemVersion;

    const upgraded = advanceDemoDays(oldMaxLevel, 0, 1_000);

    expect(upgraded.level).toBe(7);
    expect(upgraded.growthAir).toBe(12);
    expect(upgraded.growthFertilizerUnits).toBe(18);
  });

  it('starts at Level 0 with initial Air and Pupuk that do not count as growth progress', () => {
    const state = createInitialState(1_000);

    expect(state.level).toBe(0);
    expect(state.air).toBe(1);
    expect(state.fertilizerUnits / 2).toBe(1);
    expect(state.growthAir).toBe(0);
    expect(state.growthFertilizerUnits).toBe(0);
    expect(getTreeCondition(state)).toBe('healthy');
    expect(state.stateRev).toBe(0);
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
    const validated = setSharingCondition(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });

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

  it('credits validated Sharing fruit to Storage even when the Level 3 tree is healthy', () => {
    const mature = createInitialState(1_000);
    mature.level = 3;
    mature.growthAir = 9;
    mature.growthFertilizerUnits = 12;
    const pending = submitSharingMaterial(mature, {
      title: 'Panduan berbagi pengetahuan',
      type: 'article',
      summary: 'Cara berbagi pengetahuan di KMS.',
    }, { wallNow: 2_000 });
    const validated = setSharingCondition(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });

    expect(validated.state.air).toBe(mature.air + 3);
    expect(validated.state.fertilizerUnits).toBe(mature.fertilizerUnits + 4);
    expect(validated.state.fruitsInStorage).toBe(1);
    expect(validated.state.fruitsOnTree).toBe(0);
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

  it('records admin re-marks (basi / tidak relevan) without extra rewards', () => {
    const start = createInitialState(1_000);
    const material = {
      title: 'Panduan orientasi',
      type: 'document',
      url: 'https://example.com/panduan',
      summary: 'Panduan kerja untuk anggota baru.',
    };
    const pending = submitSharingMaterial(start, material, { wallNow: 2_000 });
    const rejected = setSharingCondition(pending.state, pending.submission.id, 'rejected', { wallNow: 3_000 });
    const duplicate = submitSharingMaterial(rejected.state, {
      ...material,
      title: 'Salinan panduan',
      url: 'https://EXAMPLE.com/panduan/#ringkasan',
    }, { wallNow: 4_000 });
    const duplicateReAcc = setSharingCondition(duplicate.state, duplicate.submission.id, 'validated', { wallNow: 5_000 });

    // Reject dan duplikat tidak pernah memberi reward.
    expect(rejected.state.air).toBe(start.air);
    expect(rejected.state.fertilizerUnits).toBe(start.fertilizerUnits);
    expect(duplicate.submission.status).toBe('duplicate');
    expect(duplicate.state.air).toBe(start.air);
    expect(duplicate.state.fruitsInStorage).toBe(0);
    // Admin dapat menandai ulang, tetapi reward pertama hanya dari pending.
    expect(duplicateReAcc.applied).toBe(true);
    expect(duplicateReAcc.rewarded).toBe(false);
    expect(duplicateReAcc.state.air).toBe(start.air);

    const stale = setSharingCondition(duplicateReAcc.state, duplicate.submission.id, 'stale', { wallNow: 6_000 });
    expect(stale.applied).toBe(true);
    expect(stale.rewarded).toBe(false);
    expect(stale.state.air).toBe(start.air);
    expect(stale.state.sharingSubmissions[0].status).toBe('stale');
    expect(stale.state.history[0].title).toBe('Konten basi: Salinan panduan');

    const unchanged = setSharingCondition(stale.state, duplicate.submission.id, 'stale', { wallNow: 7_000 });
    expect(unchanged.applied).toBe(false);
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

  it('keeps Learning rating reward history and stored fruit separate', () => {
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
    expect(rated.state.fruitsInStorage).toBe(2);
    expect(rated.state.fruitsOnTree).toBe(0);
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

  it('allows care recovery at the Level 7 progress cap without adding progress past the cap', () => {
    const maxed = createInitialState(1_000);
    maxed.level = 7;
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
    expect(fertilized.state.level).toBe(7);
    expect(fertilized.state.growthAir).toBe(101);
    expect(fertilized.state.growthFertilizerUnits).toBe(108);
    expect(fertilized.state.fruitsOnTree).toBe(0);
    expect(fertilized.state.fruitsInStorage).toBe(3);
  });

  it('keeps Sharing fruit in Storage until manually placed on a healthy Level 3 tree', () => {
    let state = createInitialState(1_000);
    for (let index = 0; index < 3; index += 1) {
      const pending = submitSharingMaterial(state, {
        title: `Panduan ${index + 1}`,
        type: 'document',
        url: `https://example.com/panduan-${index + 1}`,
        summary: 'Materi pengetahuan untuk pengujian demo.',
      }, { wallNow: 1_000 });
      state = setSharingCondition(pending.state, pending.submission.id, 'validated', { wallNow: 1_000 }).state;
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
    expect(state.fruitsInStorage).toBe(3);
    expect(state.fruitsOnTree).toBe(0);

    for (let index = 0; index < 3; index += 1) {
      const placed = applyCare(state, 'fruit', { wallNow: 1_000 });
      expect(placed.applied).toBe(true);
      state = placed.state;
    }
    expect(state.fruitsInStorage).toBe(0);
    expect(state.fruitsOnTree).toBe(3);

    const decayed = advanceDemoDays(state, 98, 1_000);
    expect(decayed.level).toBe(3);
    expect(getTreeCondition(decayed)).toBe('dead');
    expect(decayed.fruitsOnTree).toBe(0);
    expect(decayed.fruitsInStorage).toBe(3);
  });

  it('returns tree fruit to Storage when unhealthy and requires manual placement after recovery', () => {
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
    expect(healthyAgain.fruitsOnTree).toBe(0);
    expect(healthyAgain.fruitsInStorage).toBe(5);

    const placedAfterYellow = applyCare(healthyAgain, 'fruit', { wallNow: 1_000 });
    expect(placedAfterYellow.applied).toBe(true);
    expect(placedAfterYellow.state.fruitsOnTree).toBe(1);
    expect(placedAfterYellow.state.fruitsInStorage).toBe(4);

    const dead = advanceDemoDays(placedAfterYellow.state, 14, 1_000);
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
    expect(restored.fruitsOnTree).toBe(0);
    expect(restored.fruitsInStorage).toBe(5);

    const placedAfterDead = applyCare(restored, 'fruit', { wallNow: 1_000 });
    expect(placedAfterDead.applied).toBe(true);
    expect(placedAfterDead.state.fruitsOnTree).toBe(1);
    expect(placedAfterDead.state.fruitsInStorage).toBe(4);
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

    const healed = simulateDemoTreeCondition(dead, 'healthy');
    expect(getTreeCondition(healed)).toBe('healthy');
    expect(healed.growthAir).toBe(mature.growthAir);
    expect(healed.growthFertilizerUnits).toBe(mature.growthFertilizerUnits);
    expect(healed.air).toBe(mature.air);
    expect(healed.history[0].title).toBe('Demo: pohon dipulihkan sehat');
  });

  it('moves stored fruits to the eligible tree one at a time using the Fruit action', () => {
    const nearlyMature = createInitialState(1_000);
    nearlyMature.level = 2;
    nearlyMature.growthAir = 8;
    nearlyMature.growthFertilizerUnits = 12;
    const stocked = addDemoResource(nearlyMature, 'fruit', 5, { wallNow: 1_000 });
    const mature = applyCare(stocked, 'air', { wallNow: 1_000 }).state;

    expect(mature.level).toBe(3);
    expect(mature.fruitsOnTree).toBe(0);
    expect(mature.fruitsInStorage).toBe(5);

    const progressBefore = [mature.growthAir, mature.growthFertilizerUnits];
    const careBefore = [mature.careAir, mature.careFertilizerUnits];
    const decayClockBefore = mature.lastDecayAt;
    const activityClockBefore = mature.lastValidActivityAt;
    let state = mature;
    for (let index = 0; index < 5; index += 1) {
      const result = applyCare(state, 'fruit', { wallNow: 1_000 });
      expect(result.applied).toBe(true);
      state = result.state;
      expect(state.fruitsOnTree).toBe(index + 1);
      expect(state.fruitsInStorage).toBe(4 - index);
    }
    expect([state.growthAir, state.growthFertilizerUnits]).toEqual(progressBefore);
    expect([state.careAir, state.careFertilizerUnits]).toEqual(careBefore);
    expect(state.lastDecayAt).toBe(decayClockBefore);
    expect(state.lastValidActivityAt).toBe(activityClockBefore);
  });

  it('keeps fruit in Storage if there is no fruit, the tree is young, or the tree is unhealthy', () => {
    const young = createInitialState(1_000);
    young.fruitsInStorage = 2;
    const tooYoung = applyCare(young, 'fruit', { wallNow: 1_000 });
    expect(tooYoung.applied).toBe(false);
    expect(tooYoung.reason).toBe('tree-not-ready');
    expect(tooYoung.state.fruitsInStorage).toBe(2);

    const unhealthy = createInitialState(1_000);
    unhealthy.level = 3;
    unhealthy.growthAir = 9;
    unhealthy.growthFertilizerUnits = 12;
    unhealthy.careAir = 0;
    unhealthy.fruitsInStorage = 2;
    const notHealthy = applyCare(unhealthy, 'fruit', { wallNow: 1_000 });
    expect(notHealthy.applied).toBe(false);
    expect(notHealthy.reason).toBe('tree-not-ready');
    expect(notHealthy.state.fruitsInStorage).toBe(2);

    const noFruit = createInitialState(1_000);
    noFruit.level = 3;
    noFruit.growthAir = 9;
    noFruit.growthFertilizerUnits = 12;
    const emptyStorage = applyCare(noFruit, 'fruit', { wallNow: 1_000 });
    expect(emptyStorage.applied).toBe(false);
    expect(emptyStorage.reason).toBe('insufficient');
    expect(emptyStorage.state.fruitsOnTree).toBe(0);
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

  it('supports the demo level decrease to step exactly one level down', () => {
    const start = createInitialState(1_000);
    const grown = applyDemoLevelBoost(applyDemoLevelBoost(start, 2_000), 3_000);
    expect(grown.level).toBe(2);

    const down = applyDemoLevelDecrease(grown, 4_000);
    expect(down.level).toBe(1);
    expect(down.growthAir).toBe(1);
    expect(down.growthFertilizerUnits).toBe(2);
    expect(down.careAir).toBeGreaterThan(0);
    expect(down.careFertilizerUnits).toBeGreaterThan(0);

    const atZero = applyDemoLevelDecrease(createInitialState(1_000), 2_000);
    expect(atZero.level).toBe(0);
    expect(atZero.history[0].title).toContain('paling awal');

    const atLevel3 = applyDemoLevelBoost(grown, 5_000);
    expect(atLevel3.level).toBe(3);
    const fruited = { ...structuredClone(atLevel3), fruitsOnTree: 2, fruitsInStorage: 0 };
    const dropped = applyDemoLevelDecrease(applyDemoLevelDecrease(fruited, 6_000), 7_000);
    expect(dropped.level).toBe(1);
    expect(dropped.fruitsOnTree).toBe(0);
    expect(dropped.fruitsInStorage).toBe(2);
  });

  it('supports the demo level boost to climb exactly one level while staying healthy', () => {
    const start = createInitialState(1_000);
    const toLevel1 = applyDemoLevelBoost(start, 2_000);

    expect(toLevel1.level).toBe(1);
    expect(toLevel1.growthAir).toBe(1);
    expect(toLevel1.growthFertilizerUnits).toBe(2);
    expect(toLevel1.careAir).toBeGreaterThan(0);
    expect(toLevel1.careFertilizerUnits).toBeGreaterThan(0);

    const toLevel2 = applyDemoLevelBoost(toLevel1, 3_000);
    expect(toLevel2.level).toBe(2);
    expect(toLevel2.growthAir).toBe(3);
    expect(toLevel2.growthFertilizerUnits).toBe(4);

    const maxed = { ...structuredClone(toLevel2), level: 7, growthAir: 101, growthFertilizerUnits: 108 };
    const stillMaxed = applyDemoLevelBoost(maxed, 4_000);
    expect(stillMaxed.level).toBe(7);
    expect(stillMaxed.history[0].title).toContain('sudah maksimal');
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
    expect(withFruit.fruitsInStorage).toBe(matureTree.fruitsInStorage + 3);
    expect(withFruit.fruitsOnTree).toBe(matureTree.fruitsOnTree);
    expect(withFruit.level).toBe(matureTree.level);
    expect(withFruit.lastDecayAt).toBe(start.lastDecayAt);
    expect(withFruit.lastValidActivityAt).toBe(start.lastValidActivityAt);
    expect(withFruit.history[0].detail).toContain('masuk ke Storage');
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

describe('buah terikat konten dan laporan pengguna', () => {
  const MATERI = { title: 'Panduan berbagi', type: 'article', url: 'https://example.com/berbagi', summary: 'Cara berbagi pengetahuan.' };

  function matureHealthy() {
    const state = createInitialState(1_000);
    state.level = 3;
    return state;
  }

  it('menautkan satu buah ke satu konten: slot dicatat sejak ACC dan tetap saat dipindah ke pohon', () => {
    const start = matureHealthy();
    const pending = submitSharingMaterial(start, MATERI, { wallNow: 2_000 });
    const validated = setSharingCondition(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });

    // Buah reward ACC adalah buah konten itu sendiri, terikat sejak lahir.
    expect(validated.state.fruitLedger).toHaveLength(1);
    expect(validated.state.fruitLedger[0].submissionId).toBe(pending.submission.id);
    expect(validated.state.fruitLedger[0].placement).toBe('storage');
    expect(validated.state.fruitLedger[0].slot).toBe(1);

    const moved = applyCare(validated.state, 'fruit', { wallNow: 4_000 });
    expect(moved.state.fruitsOnTree).toBe(1);
    expect(moved.state.fruitsInStorage).toBe(0);
    expect(moved.state.fruitLedger[0].placement).toBe('tree');
    expect(moved.state.fruitLedger[0].slot).toBe(1);
    expect(moved.state.history[0].detail).toContain('Panduan berbagi');

    const view = getFruitView(moved.state);
    expect(view.fruitsOnTree).toBe(1);
    expect(view.tree).toHaveLength(1);
    expect(view.tree[0].slot).toBe(1);
    expect(view.tree[0].title).toBe('Panduan berbagi');
    expect(view.ground).toHaveLength(0);
  });

  it('buah yang diangkat tidak menggeser buah lain: slot kosong tetap di tempatnya', () => {
    const start = matureHealthy();
    const a = submitSharingMaterial(start, MATERI, { wallNow: 2_000 });
    const aAcc = setSharingCondition(a.state, a.submission.id, 'validated', { wallNow: 3_000 });
    const b = submitSharingMaterial(aAcc.state, {
      ...MATERI,
      title: 'Panduan lain',
      url: 'https://example.com/lain',
    }, { wallNow: 4_000 });
    const bAcc = setSharingCondition(b.state, b.submission.id, 'validated', { wallNow: 5_000 });
    expect(bAcc.state.fruitLedger.map((entry) => entry.slot)).toEqual([1, 2]);

    const placed1 = applyCare(bAcc.state, 'fruit', { wallNow: 6_000 });
    const placed2 = applyCare(placed1.state, 'fruit', { wallNow: 6_500 });
    expect(placed2.state.fruitsOnTree).toBe(2);

    // Konten pertama diangkat (tidak relevan): buahnya hilang, konten kedua
    // tetap menggantung di slot 2 — tidak ada yang bergeser mengisi celah.
    const removed = setSharingCondition(placed2.state, a.submission.id, 'rejected', { wallNow: 7_000 });
    const removedEntry = removed.state.fruitLedger.find((entry) => entry.submissionId === a.submission.id);
    expect(removedEntry.placement).toBe('gone');
    expect(removed.state.fruitsOnTree).toBe(1);
    expect(removed.state.air).toBe(placed2.state.air);
    expect(removed.state.fertilizerUnits).toBe(placed2.state.fertilizerUnits);

    const view = getFruitView(removed.state);
    expect(view.maxSlot).toBe(2);
    expect(view.tree.map((item) => item.slot)).toEqual([2]);
    expect(view.tree[0].title).toBe('Panduan lain');
  });

  it('buah basi jatuh rebah di tanah, Admin re-ACC menumbuhkannya kembali di slot sama', () => {
    const start = matureHealthy();
    const pending = submitSharingMaterial(start, MATERI, { wallNow: 2_000 });
    const acc = setSharingCondition(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });
    const placed = applyCare(acc.state, 'fruit', { wallNow: 4_000 });

    // Basi: buah jatuh dan rebah busuk di bawah pohon; slotnya tetap dicatat.
    const stale = setSharingCondition(placed.state, pending.submission.id, 'stale', { wallNow: 7_000 });
    const staleEntry = stale.state.fruitLedger[0];
    expect(staleEntry.placement).toBe('ground');
    expect(staleEntry.fellAt).toBe(stale.state.clockMs);
    expect(staleEntry.slot).toBe(1);
    expect(stale.state.fruitsOnTree).toBe(0);
    expect(getFruitView(stale.state).ground.map((item) => item.slot)).toEqual([1]);

    // ACC ulang: buah tumbuh lagi di slot yang sama tanpa reward kedua.
    const revived = setSharingCondition(stale.state, pending.submission.id, 'validated', { wallNow: 8_000 });
    expect(revived.applied).toBe(true);
    expect(revived.rewarded).toBe(false);
    expect(revived.state.air).toBe(stale.state.air);
    expect(revived.state.fertilizerUnits).toBe(stale.state.fertilizerUnits);
    expect(revived.state.fruitLedger[0].placement).toBe('tree');
    expect(revived.state.fruitLedger[0].slot).toBe(1);
    expect(getFruitView(revived.state).tree[0].slot).toBe(1);

    // Pohon belum Level 3: buah basi lalu di-ACC ulang menunggu di Storage,
    // tetap memegang slot lamanya.
    const youngStart = createInitialState(1_000);
    const youngPending = submitSharingMaterial(youngStart, MATERI, { wallNow: 2_000 });
    const youngAcc = setSharingCondition(youngPending.state, youngPending.submission.id, 'validated', { wallNow: 3_000 });
    const youngStale = setSharingCondition(youngAcc.state, youngPending.submission.id, 'stale', { wallNow: 4_000 });
    expect(youngStale.state.fruitLedger[0].placement).toBe('ground');

    const youngRevive = setSharingCondition(youngStale.state, youngPending.submission.id, 'validated', { wallNow: 5_000 });
    expect(youngRevive.state.fruitLedger[0].placement).toBe('storage');
    expect(youngRevive.state.fruitLedger[0].slot).toBe(1);
    expect(youngRevive.state.fruitsOnTree).toBe(0);
  });

  it('konten duplikat yang kini relevan melahirkan buah tanpa reward Air/Pupuk', () => {
    const start = matureHealthy();
    const pending = submitSharingMaterial(start, MATERI, { wallNow: 2_000 });
    const rejected = setSharingCondition(pending.state, pending.submission.id, 'rejected', { wallNow: 3_000 });
    const duplicate = submitSharingMaterial(rejected.state, {
      ...MATERI,
      title: 'Salinan panduan',
      url: 'https://EXAMPLE.com/berbagi/#ringkasan',
    }, { wallNow: 4_000 });
    expect(duplicate.submission.status).toBe('duplicate');

    const validated = setSharingCondition(duplicate.state, duplicate.submission.id, 'validated', { wallNow: 5_000 });
    expect(validated.applied).toBe(true);
    expect(validated.rewarded).toBe(false);
    expect(validated.state.air).toBe(start.air);
    expect(validated.state.fertilizerUnits).toBe(start.fertilizerUnits);
    expect(validated.state.fruitsInStorage).toBe(1);
    expect(validated.state.fruitLedger).toHaveLength(1);
    expect(validated.state.fruitLedger[0].submissionId).toBe(duplicate.submission.id);

    // Diputus duplikat lagi: buahnya diangkat, tidak menyisakan buah.
    const unfruit = setSharingCondition(validated.state, duplicate.submission.id, 'duplicate', { wallNow: 6_000 });
    expect(unfruit.state.fruitLedger[0].placement).toBe('gone');
    expect(unfruit.state.fruitsInStorage).toBe(0);
    expect(unfruit.state.fruitsOnTree).toBe(0);
  });

  it('laporan pengguna: satu akun satu laporan per konten, riwayat dicatat untuk admin', () => {
    const start = createInitialState(1_000);
    const pending = submitSharingMaterial(start, MATERI, { wallNow: 2_000 });
    const accd = setSharingCondition(pending.state, pending.submission.id, 'validated', { wallNow: 3_000 });
    expect(accd.state.sharingSubmissions[0].reports).toEqual([]);

    const first = addSharingReport(accd.state, pending.submission.id, '  Nadia@Example.COM ', { wallNow: 4_000 });
    expect(first.added).toBe(true);
    expect(first.reports).toBe(1);
    expect(first.state.sharingSubmissions[0].reports[0].by).toBe('nadia@example.com');
    expect(accd.state.sharingSubmissions[0].reports).toEqual([]);

    // Laporan ganda dari reporter sama tidak ditambahkan dua kali.
    const again = addSharingReport(first.state, pending.submission.id, 'nadia@example.com', { wallNow: 5_000 });
    expect(again.added).toBe(false);
    expect(again.reports).toBe(1);

    const secondReporter = addSharingReport(again.state, pending.submission.id, 'Budi@Example.com', { wallNow: 6_000 });
    expect(secondReporter.added).toBe(true);
    expect(secondReporter.reports).toBe(2);
    expect(secondReporter.state.history[0].title).toBe('Konten dilaporkan: Panduan berbagi');
    expect(secondReporter.state.history[0].detail).toContain('budi@example.com');

    expect(() => addSharingReport(accd.state, 'konten-tak-ada', 'nadia@example.com')).toThrow('tidak ditemukan');
  });
});
