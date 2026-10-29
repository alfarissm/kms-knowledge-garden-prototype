export const DAY_MS = 24 * 60 * 60 * 1000;
const LEVEL_SYSTEM_VERSION = 2;

export const LEVELS = [
  { level: 1, name: 'Bibit', air: 1, fertilizerUnits: 2 },
  { level: 2, name: 'Pertumbuhan daun', air: 3, fertilizerUnits: 4 },
  { level: 3, name: 'Buah mulai muncul', air: 9, fertilizerUnits: 12 },
  { level: 4, name: 'Pohon besar', air: 27, fertilizerUnits: 36 },
  { level: 5, name: 'Cabang kiri', air: 52, fertilizerUnits: 60 },
  { level: 6, name: 'Cabang kanan', air: 77, fertilizerUnits: 84 },
  { level: 7, name: 'Pohon penuh', air: 101, fertilizerUnits: 108 },
];

// Parameter gamifikasi yang boleh diubah admin (tersimpan di DB · tabel
// app_settings). Nilai bawaan identik dengan konstanta lama sehingga perilaku
// dan seluruh pengujian mesin tidak berubah sampai admin menyesuaikannya.
export const DEFAULT_GAMIFICATION_SETTINGS = Object.freeze({
  accReward: Object.freeze({ air: 3, fertilizerUnits: 4 }),
  activityRewards: Object.freeze({ access: 1, review: 1 }),
  learningRewardFertilizerUnits: 2,
  learningRatingAir: 1,
  decayIntervalDays: 7,
  decayPerPeriod: Object.freeze({
    growthAir: 1,
    growthFertilizerUnits: 1,
    careAir: 1,
    careFertilizerUnits: 1,
  }),
  levels: Object.freeze(LEVELS.map((entry) => Object.freeze({ ...entry }))),
});

const ACC_FRUIT = 1;

function clampInt(value, fallback, min, max) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.min(max, Math.max(min, Math.round(num))) : fallback;
}

// Tapal batas nilai tak dikenal (JSON dari DB) menjadi bentuk lengkap yang aman.
export function normalizeGamificationSettings(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const defaults = DEFAULT_GAMIFICATION_SETTINGS;
  const acc = source.accReward ?? {};
  const activities = source.activityRewards ?? {};
  const decay = source.decayPerPeriod ?? {};
  const rawLevels = Array.isArray(source.levels) ? source.levels : [];
  return {
    accReward: {
      air: clampInt(acc.air, defaults.accReward.air, 0, 50),
      fertilizerUnits: clampInt(acc.fertilizerUnits, defaults.accReward.fertilizerUnits, 0, 100),
    },
    activityRewards: {
      access: clampInt(activities.access, defaults.activityRewards.access, 0, 20),
      review: clampInt(activities.review, defaults.activityRewards.review, 0, 20),
    },
    learningRewardFertilizerUnits: clampInt(source.learningRewardFertilizerUnits, defaults.learningRewardFertilizerUnits, 0, 100),
    learningRatingAir: clampInt(source.learningRatingAir, defaults.learningRatingAir, 0, 20),
    decayIntervalDays: clampInt(source.decayIntervalDays, defaults.decayIntervalDays, 1, 90),
    decayPerPeriod: {
      growthAir: clampInt(decay.growthAir, defaults.decayPerPeriod.growthAir, 0, 20),
      growthFertilizerUnits: clampInt(decay.growthFertilizerUnits, defaults.decayPerPeriod.growthFertilizerUnits, 0, 20),
      careAir: clampInt(decay.careAir, defaults.decayPerPeriod.careAir, 0, 20),
      careFertilizerUnits: clampInt(decay.careFertilizerUnits, defaults.decayPerPeriod.careFertilizerUnits, 0, 20),
    },
    // Nama level tetap milik mesin; yang bisa diatur admin hanya ambang Air/Pupuk.
    levels: defaults.levels.map((entry) => {
      const candidate = rawLevels.find((item) => Number(item?.level) === entry.level);
      if (!candidate) return { ...entry };
      return {
        level: entry.level,
        name: entry.name,
        air: clampInt(candidate.air, entry.air, 0, 100000),
        fertilizerUnits: clampInt(candidate.fertilizerUnits, entry.fertilizerUnits, 0, 100000),
      };
    }),
  };
}

// Pengaturan aktif mesin; server & klien menyetelnya setelah memuat DB.
let activeSettings = normalizeGamificationSettings({});

export function setGamificationSettings(settings) {
  activeSettings = normalizeGamificationSettings(settings ?? {});
  return activeSettings;
}

export function getGamificationSettings() {
  return normalizeGamificationSettings(activeSettings);
}

export const STAGES = [
  'Tanah kosong',
  'Bibit',
  'Daun',
  'Mulai berbuah',
  'Pohon besar',
  'Cabang kiri tumbuh',
  'Cabang kanan tumbuh',
  'Pohon penuh',
];

const ACTIVITY_LABELS = {
  access: 'Akses / Login valid',
  review: 'Review valid',
};

function activityReward(type) {
  const amount = activeSettings.activityRewards[type] ?? 0;
  return { air: amount, fertilizerUnits: 0, fruit: 0, label: ACTIVITY_LABELS[type] };
}
const SHARING_TYPES = new Set(['video', 'article', 'document', 'podcast', 'link']);
const FRUIT_PLACEMENTS = new Set(['storage', 'tree', 'ground', 'gone']);

// Buah = konten: satu buah terikat unik ke satu konten Sharing (atau anonim
// dari tool demo), memegang slot tempat yang tidak pernah berpindah.
// placement: 'storage' | 'tree' | 'ground' (basi jatuh) | 'gone' (tidak relevan/duplikat).

function getLocalDayKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLastAccessRewardDay(history) {
  const lastReward = history.find((entry) => (
    entry?.type === 'activity'
    && entry?.title === ACTIVITY_LABELS.access
    && Number(entry?.airDelta) > 0
    && Number.isFinite(entry?.at)
  ));
  return lastReward ? getLocalDayKey(lastReward.at) : null;
}

function cloneState(state) {
  const clonedState = structuredClone(state);
  const now = Date.now();
  clonedState.air = Number.isFinite(clonedState.air) ? Math.max(0, clonedState.air) : 0;
  clonedState.fertilizerUnits = Number.isFinite(clonedState.fertilizerUnits) ? Math.max(0, clonedState.fertilizerUnits) : 0;
  clonedState.careAir = Number.isFinite(clonedState.careAir)
    ? Math.max(0, clonedState.careAir)
    : (clonedState.air > 0 ? 1 : 0);
  clonedState.careFertilizerUnits = Number.isFinite(clonedState.careFertilizerUnits)
    ? Math.max(0, clonedState.careFertilizerUnits)
    : (clonedState.fertilizerUnits > 0 ? 2 : 0);
  clonedState.growthAir = Number.isFinite(clonedState.growthAir) ? Math.max(0, clonedState.growthAir) : 0;
  clonedState.growthFertilizerUnits = Number.isFinite(clonedState.growthFertilizerUnits)
    ? Math.max(0, clonedState.growthFertilizerUnits)
    : 0;
  const usesLegacyLevels = clonedState.levelSystemVersion !== LEVEL_SYSTEM_VERSION;
  clonedState.level = Number.isFinite(clonedState.level) ? Math.min(7, Math.max(0, Math.floor(clonedState.level))) : 0;
  if (usesLegacyLevels && clonedState.level >= 5) clonedState.level = 7;
  clonedState.level = Math.max(clonedState.level, getLevelForProgress(clonedState.growthAir, clonedState.growthFertilizerUnits));
  clonedState.levelSystemVersion = LEVEL_SYSTEM_VERSION;
  // Counter buah tetap dibaca dari bentuk lama sebagai angka mentah; ledger
  // yang akan menegaskan nilai final (lihat normalizeFruitLedger).
  clonedState.fruitsInStorage = Number.isFinite(clonedState.fruitsInStorage) ? Math.max(0, clonedState.fruitsInStorage) : 0;
  clonedState.fruitsOnTree = Number.isFinite(clonedState.fruitsOnTree) ? Math.max(0, clonedState.fruitsOnTree) : 0;
  clonedState.clockMs = Number.isFinite(clonedState.clockMs) ? clonedState.clockMs : now;
  clonedState.wallClockSyncedAt = Number.isFinite(clonedState.wallClockSyncedAt)
    ? clonedState.wallClockSyncedAt
    : clonedState.clockMs;
  clonedState.lastValidActivityAt = Number.isFinite(clonedState.lastValidActivityAt)
    ? clonedState.lastValidActivityAt
    : clonedState.clockMs;
  clonedState.lastCareAt = clonedState.lastCareAt !== undefined && clonedState.lastCareAt !== null && Number.isFinite(clonedState.lastCareAt)
    ? clonedState.lastCareAt
    : null;
  clonedState.lastDecayResetAt = Number.isFinite(clonedState.lastDecayResetAt)
    ? clonedState.lastDecayResetAt
    : Math.max(clonedState.lastValidActivityAt, clonedState.lastCareAt ?? clonedState.lastValidActivityAt);
  clonedState.lastDecayAt = Number.isFinite(clonedState.lastDecayAt) ? clonedState.lastDecayAt : clonedState.clockMs;
  clonedState.completedLearningIds = Array.isArray(clonedState.completedLearningIds)
    ? clonedState.completedLearningIds
    : [];
  clonedState.learningRatings = clonedState.learningRatings && typeof clonedState.learningRatings === 'object'
    ? clonedState.learningRatings
    : {};
  // Notifikasi server (hasil review admin, hapus konten, reset pohon) tersimpan
  // di payload; bila tidak ada, isi kosong agar semua pembaca aman.
  clonedState.notifications = Array.isArray(clonedState.notifications)
    ? clonedState.notifications.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.title === 'string')
    : [];
  clonedState.sharingSubmissions = Array.isArray(clonedState.sharingSubmissions)
    ? clonedState.sharingSubmissions
    : [];
  for (const submission of clonedState.sharingSubmissions) {
    submission.reports = Array.isArray(submission.reports)
      ? submission.reports.filter((report) => report && typeof report.by === 'string')
      : [];
  }
  normalizeFruitLedger(clonedState);
  clonedState.history = Array.isArray(clonedState.history) ? clonedState.history : [];
  clonedState.lastAccessRewardDay = /^\d{4}-\d{2}-\d{2}$/.test(clonedState.lastAccessRewardDay ?? '')
    ? clonedState.lastAccessRewardDay
    : getLastAccessRewardDay(clonedState.history);
  return clonedState;
}

function makeHistoryEntry(state, values) {
  return {
    id: `${state.history.length}-${values.at}`,
    at: values.at,
    type: values.type,
    title: values.title,
    detail: values.detail,
    status: values.status ?? 'recorded',
    metadata: values.metadata ?? null,
    airDelta: values.airDelta ?? 0,
    fertilizerDeltaUnits: values.fertilizerDeltaUnits ?? 0,
    fruitDelta: values.fruitDelta ?? 0,
    growthAirDelta: values.growthAirDelta ?? 0,
    growthFertilizerDeltaUnits: values.growthFertilizerDeltaUnits ?? 0,
    careAirDelta: values.careAirDelta ?? 0,
    careFertilizerDeltaUnits: values.careFertilizerDeltaUnits ?? 0,
  };
}

function formatPupukAmount(units) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(units / 2);
}

export function createInitialState(now = Date.now()) {
  return {
    levelSystemVersion: LEVEL_SYSTEM_VERSION,
    stateRev: 0,
    level: 0,
    air: 1,
    fertilizerUnits: 2,
    careAir: 1,
    careFertilizerUnits: 2,
    fruitsInStorage: 0,
    fruitsOnTree: 0,
    fruitLedger: [],
    growthAir: 0,
    growthFertilizerUnits: 0,
    clockMs: now,
    wallClockSyncedAt: now,
    lastAccessRewardDay: null,
    lastValidActivityAt: now,
    lastCareAt: null,
    lastDecayResetAt: now,
    lastDecayAt: now,
    completedLearningIds: [],
    learningRatings: {},
    notifications: [],
    sharingSubmissions: [],
    history: [],
  };
}

export function getLevelForProgress(growthAir, growthFertilizerUnits) {
  let level = 0;

  for (const requirement of activeSettings.levels) {
    if (growthAir >= requirement.air && growthFertilizerUnits >= requirement.fertilizerUnits) {
      level = requirement.level;
    }
  }

  return level;
}

export function getNextLevelRequirement(level) {
  return activeSettings.levels.find((requirement) => requirement.level > level) ?? activeSettings.levels.at(-1);
}

export function getTreeCondition(state) {
  const careAir = state.careAir ?? state.air;
  const careFertilizerUnits = state.careFertilizerUnits ?? state.fertilizerUnits;

  if (careFertilizerUnits <= 0) {
    return 'dead';
  }

  if (careAir <= 0) {
    return 'thirsty';
  }

  return 'healthy';
}

function deriveFruitCounters(state) {
  let onTree = 0;
  let inStorage = 0;
  for (const entry of state.fruitLedger) {
    if (entry.placement === 'tree') onTree += 1;
    else if (entry.placement === 'storage') inStorage += 1;
  }
  state.fruitsOnTree = onTree;
  state.fruitsInStorage = inStorage;
}

function nextFruitSlot(state) {
  let slot = 0;
  for (const entry of state.fruitLedger) {
    if (Number.isFinite(entry?.slot) && entry.slot > slot) slot = entry.slot;
  }
  return slot + 1;
}

function makeFruitEntry(state, submissionId, at) {
  const entry = {
    submissionId: submissionId ?? null,
    slot: nextFruitSlot(state),
    placement: 'storage',
    placedAt: at,
    fellAt: null,
  };
  state.fruitLedger.push(entry);
  return entry;
}

function boundFruitTitle(state, submissionId) {
  return state.sharingSubmissions.find((submission) => submission.id === submissionId)?.title ?? null;
}

function findLedgerEntry(state, submissionId) {
  return state.fruitLedger.find((entry) => entry.submissionId === submissionId) ?? null;
}

// Proyeksikan buah bentuk lama (counter anonim) ke ledger terikat konten —
// jalankan hanya saat state belum punya ledger sama sekali.
function importLegacyFruits(state) {
  const decided = [...state.sharingSubmissions]
    .filter((submission) => typeof submission?.status === 'string' && submission.status !== 'pending')
    .reverse(); // terbaru dulu: slot 1 = pairing tampilan lama.
  const legacyTree = Number.isFinite(state.fruitsOnTree) ? Math.max(0, state.fruitsOnTree) : 0;
  const legacyStorage = Number.isFinite(state.fruitsInStorage) ? Math.max(0, state.fruitsInStorage) : 0;
  const boundCount = Math.min(legacyTree + legacyStorage, decided.length);

  state.fruitLedger = decided.slice(0, boundCount).map((submission, index) => ({
    submissionId: submission.id,
    slot: index + 1,
    placement: index < legacyTree ? 'tree' : 'storage',
    placedAt: state.clockMs,
    fellAt: null,
  }));
  const boundTree = Math.min(legacyTree, boundCount);
  for (let index = 0; index < boundTree; index += 1) {
    state.fruitLedger[index].placedAt = state.clockMs;
  }
  deriveFruitCounters(state);
  let guard = 0;
  while (state.fruitsOnTree < legacyTree && guard < 500) {
    makeFruitEntry(state, null, state.clockMs).placement = 'tree';
    deriveFruitCounters(state);
    guard += 1;
  }
  guard = 0;
  while (state.fruitsInStorage < legacyStorage && guard < 500) {
    makeFruitEntry(state, null, state.clockMs);
    deriveFruitCounters(state);
    guard += 1;
  }
}

function normalizeFruitLedger(state) {
  if (!Array.isArray(state.fruitLedger)) {
    importLegacyFruits(state);
  } else {
    const usedSlots = new Set();
    for (const entry of state.fruitLedger) {
      if (!FRUIT_PLACEMENTS.has(entry?.placement)) {
        entry.placement = 'storage';
      }
      if (!Number.isFinite(entry.slot) || entry.slot < 1 || usedSlots.has(entry.slot)) {
        entry.slot = nextFruitSlot(state);
      }
      usedSlots.add(entry.slot);
      if (!Number.isFinite(entry.placedAt)) entry.placedAt = state.clockMs;
      if (!Number.isFinite(entry.fellAt)) entry.fellAt = null;
    }
  }

  // State uji/bentuk lama memasang counter lebih besar dari isi ledger:
  // isi selisihnya dengan buah anonim agar angka tampilan tetap benar.
  const wantTree = Number.isFinite(state.fruitsOnTree) ? state.fruitsOnTree : 0;
  const wantStorage = Number.isFinite(state.fruitsInStorage) ? state.fruitsInStorage : 0;
  deriveFruitCounters(state);
  let guard = 0;
  while (state.fruitsOnTree < wantTree && guard < 500) {
    makeFruitEntry(state, null, state.clockMs).placement = 'tree';
    deriveFruitCounters(state);
    guard += 1;
  }
  guard = 0;
  while (state.fruitsInStorage < wantStorage && guard < 500) {
    makeFruitEntry(state, null, state.clockMs);
    deriveFruitCounters(state);
    guard += 1;
  }
}

// Buah di pohon otomatis kembali ke Storage saat pohon tidak sehat atau
// belum Level 3; konten "menggantung slotnya" kosong sampai buah dipindah lagi.
function syncFruitPlacement(state, at) {
  const condition = getTreeCondition(state);
  const canShowFruit = state.level >= 3 && condition === 'healthy';

  if (!canShowFruit) {
    let movedFruit = 0;
    for (const entry of state.fruitLedger) {
      if (entry.placement !== 'tree') continue;
      entry.placement = 'storage';
      entry.fellAt = null;
      movedFruit += 1;
    }

    if (movedFruit > 0) {
      const reason = condition === 'thirsty'
        ? 'pohon sedang menguning'
        : condition === 'dead'
          ? 'pohon sedang mati'
          : 'pohon belum mencapai Level 3';
      state.history.unshift(makeHistoryEntry(state, {
        at,
        type: 'fruit',
        title: 'Buah kembali ke Storage',
        detail: `${movedFruit} Buah disimpan sementara karena ${reason}.`,
        status: 'fruit',
      }));
    }
  }

  deriveFruitCounters(state);
  state.history = state.history.slice(0, 30);
}

function syncWallClock(state, wallNow) {
  const elapsed = Math.max(0, wallNow - state.wallClockSyncedAt);
  state.clockMs += elapsed;
  state.wallClockSyncedAt = wallNow;
}

function applyElapsedDecay(state) {
  const decayIntervalMs = Math.max(DAY_MS, activeSettings.decayIntervalDays * DAY_MS);
  const elapsedPeriods = Math.floor((state.clockMs - state.lastDecayAt) / decayIntervalMs);

  for (let period = 0; period < elapsedPeriods; period += 1) {
    const oldGrowthAir = state.growthAir;
    const oldGrowthFertilizerUnits = state.growthFertilizerUnits;
    const oldCareAir = state.careAir;
    const oldCareFertilizerUnits = state.careFertilizerUnits;
    state.growthAir = Math.max(0, state.growthAir - activeSettings.decayPerPeriod.growthAir);
    state.growthFertilizerUnits = Math.max(0, state.growthFertilizerUnits - activeSettings.decayPerPeriod.growthFertilizerUnits);
    state.careAir = Math.max(0, state.careAir - activeSettings.decayPerPeriod.careAir);
    state.careFertilizerUnits = Math.max(0, state.careFertilizerUnits - activeSettings.decayPerPeriod.careFertilizerUnits);
    state.lastDecayAt += decayIntervalMs;

    const lostGrowthAir = oldGrowthAir - state.growthAir;
    const lostGrowthFertilizerUnits = oldGrowthFertilizerUnits - state.growthFertilizerUnits;
    const lostCareAir = oldCareAir - state.careAir;
    const lostCareFertilizerUnits = oldCareFertilizerUnits - state.careFertilizerUnits;
    const decayDetails = [];
    if (lostGrowthAir > 0) decayDetails.push(`progres Air −${lostGrowthAir}`);
    if (lostGrowthFertilizerUnits > 0) decayDetails.push(`progres Pupuk −${formatPupukAmount(lostGrowthFertilizerUnits)}`);
    if (lostCareAir > 0) decayDetails.push(`perawatan Air −${lostCareAir}`);
    if (lostCareFertilizerUnits > 0) decayDetails.push(`perawatan Pupuk −${formatPupukAmount(lostCareFertilizerUnits)}`);

    state.history.unshift(makeHistoryEntry(state, {
      at: state.lastDecayAt,
      type: 'decay',
      title: 'Decay mingguan',
      detail: `${decayDetails.length ? decayDetails.join(' · ') : 'Progres dan perawatan sudah minimum'}; level tetap`,
      status: 'decay',
      growthAirDelta: state.growthAir - oldGrowthAir,
      growthFertilizerDeltaUnits: state.growthFertilizerUnits - oldGrowthFertilizerUnits,
      careAirDelta: state.careAir - oldCareAir,
      careFertilizerDeltaUnits: state.careFertilizerUnits - oldCareFertilizerUnits,
    }));
  }

  syncFruitPlacement(state, state.clockMs);
  state.history = state.history.slice(0, 30);
  return elapsedPeriods;
}

function updateTreeLevel(state, at) {
  const previousLevel = state.level;
  state.level = Math.max(state.level, getLevelForProgress(state.growthAir, state.growthFertilizerUnits));
  syncFruitPlacement(state, at);

  return state.level > previousLevel;
}

function addReward(state, reward, at, label, options = {}) {
  state.air += reward.air;
  state.fertilizerUnits += reward.fertilizerUnits;

  if (reward.fruit > 0) {
    // Reward Buah berbentuk buah nyata di ledger; saat Sharing di-ACC, buah
    // pembawa reward itu terikat langsung ke kontennya.
    for (let index = 0; index < reward.fruit; index += 1) {
      makeFruitEntry(state, options.boundSubmissionId ?? null, at);
    }
  }

  syncFruitPlacement(state, at);

  const rewardParts = [];
  if (reward.air > 0) rewardParts.push(`+${reward.air} Air masuk Storage`);
  if (reward.fertilizerUnits > 0) rewardParts.push(`+${reward.fertilizerUnits / 2} Pupuk masuk Storage`);
  if (reward.fruit > 0) rewardParts.push(`+${reward.fruit} Buah masuk Storage`);
  const rewardDetail = rewardParts.length > 0
    ? rewardParts.join(' · ')
    : 'Aktivitas valid · tanpa reward';

  const historyEntry = makeHistoryEntry(state, {
    at,
    type: 'activity',
    title: label,
    detail: rewardDetail,
    status: rewardParts.length > 0 ? 'reward' : 'activity',
    airDelta: reward.air,
    fertilizerDeltaUnits: reward.fertilizerUnits,
    fruitDelta: reward.fruit,
  });
  state.history.unshift(historyEntry);
  state.history = state.history.slice(0, 30);
  return historyEntry;
}

function recordActivity(state, values) {
  state.history.unshift(makeHistoryEntry(state, values));
  state.history = state.history.slice(0, 30);
}

function syncActivityClock(state, wallNow) {
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);
}

function recordValidActivity(state) {
  state.lastValidActivityAt = state.clockMs;
  state.lastDecayResetAt = state.clockMs;
  state.lastDecayAt = state.clockMs;
}

function recordCareActivity(state) {
  state.lastCareAt = state.clockMs;
  state.lastDecayResetAt = state.clockMs;
  state.lastDecayAt = state.clockMs;
}

export function completeLearningModule(currentState, moduleId, options = {}) {
  if (!moduleId) {
    throw new Error('Materi Learning tidak ditemukan.');
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  const title = options.title ?? moduleId;
  syncActivityClock(state, wallNow);

  if (state.completedLearningIds.includes(moduleId)) {
    return { state, awarded: false, reason: 'already-completed' };
  }

  state.completedLearningIds.push(moduleId);
  addReward(state, { air: 0, fertilizerUnits: activeSettings.learningRewardFertilizerUnits, fruit: 0 }, state.clockMs, `Learning selesai: ${title}`);
  recordValidActivity(state);

  return { state, awarded: true };
}

export function rateLearningModule(currentState, moduleId, rating, options = {}) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating harus dipilih dari 1 sampai 5.');
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  const title = options.title ?? moduleId;
  syncActivityClock(state, wallNow);

  if (!state.completedLearningIds.includes(moduleId)) {
    return { state, awarded: false, reason: 'not-completed' };
  }

  if (Object.hasOwn(state.learningRatings, moduleId)) {
    return { state, awarded: false, reason: 'already-rated' };
  }

  state.learningRatings[moduleId] = rating;
  const ratingAir = activeSettings.learningRatingAir;
  const ratingEntry = addReward(state, { air: ratingAir, fertilizerUnits: 0, fruit: 0 }, state.clockMs, `Rating Learning: ${title}`);
  ratingEntry.detail = ratingAir > 0
    ? `Rating ${rating}/5 · +${ratingAir} Air masuk Storage`
    : `Rating ${rating}/5 · tanpa reward Air`;
  ratingEntry.rating = rating;
  recordValidActivity(state);

  return { state, awarded: true };
}

function normalizeSharingUrl(url) {
  const parsedUrl = new URL(url);
  parsedUrl.hash = '';
  if (parsedUrl.pathname.length > 1) {
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '');
  }
  return parsedUrl.toString();
}

export function submitSharingMaterial(currentState, material, options = {}) {
  const title = String(material.title ?? '').trim();
  const type = String(material.type ?? '').trim();
  const url = String(material.url ?? '').trim();
  const summary = String(material.summary ?? '').trim();
  const attachmentSource = material.attachment;
  const attachment = attachmentSource && typeof attachmentSource === 'object'
    ? {
      name: String(attachmentSource.name ?? '').trim(),
      type: String(attachmentSource.type ?? '').trim(),
      size: Number(attachmentSource.size ?? 0),
    }
    : null;

  if (!title || !type || !summary) {
    throw new Error('Lengkapi judul, jenis, dan ringkasan materi.');
  }
  if (title.length > 100 || summary.length > 320) {
    throw new Error('Judul atau ringkasan materi melebihi batas karakter.');
  }
  if (!SHARING_TYPES.has(type)) {
    throw new Error('Jenis materi Sharing tidak dikenal.');
  }

  let parsedUrl = null;
  if (url) {
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Masukkan tautan materi yang valid.');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Tautan materi harus menggunakan HTTP atau HTTPS.');
    }
  }

  if (attachmentSource && !attachment) {
    throw new Error('Lampiran video tidak valid.');
  }
  if (attachment) {
    const hasVideoMimeType = attachment.type.toLocaleLowerCase('id-ID').startsWith('video/');
    const hasVideoExtension = /\.(mp4|m4v|mov|webm|ogv|avi|mkv)$/i.test(attachment.name);
    if (!attachment.name || (!hasVideoMimeType && !hasVideoExtension) || !Number.isFinite(attachment.size) || attachment.size < 0) {
      throw new Error('Lampiran harus berupa file video yang valid.');
    }
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  syncActivityClock(state, wallNow);

  const normalizedUrl = parsedUrl ? normalizeSharingUrl(parsedUrl.toString()) : '';
  const isDuplicate = state.sharingSubmissions.some((submission) => {
    if (normalizedUrl && submission.url) {
      try {
        if (normalizeSharingUrl(submission.url) === normalizedUrl) return true;
      } catch { }
    }

    if (!attachment || !submission.attachment?.name) return false;
    return submission.attachment.name.toLocaleLowerCase('id-ID') === attachment.name.toLocaleLowerCase('id-ID')
      && Number(submission.attachment.size) === attachment.size;
  });
  const submission = {
    id: `${state.clockMs}-${state.sharingSubmissions.length}`,
    title,
    type,
    url: parsedUrl?.toString() ?? '',
    attachment,
    summary,
    status: isDuplicate ? 'duplicate' : 'pending',
    submittedAt: state.clockMs,
    reviewedAt: null,
    reports: [],
  };

  state.sharingSubmissions.unshift(submission);
  recordActivity(state, {
    at: state.clockMs,
    type: 'sharing',
    title: isDuplicate ? 'Sharing duplikat' : 'Sharing menunggu validasi',
    detail: `${submission.title} · ${isDuplicate ? 'tidak mendapat reward' : 'materi masuk antrean review'}`,
    status: submission.status,
    metadata: { submissionId: submission.id },
  });

  return { state, submission };
}

// Admin lintas-akun: kondisi konten dapat ditandai ulang kapan pun
// (ACC / Basi / Tidak relevan / Duplikat). Reward hanya diberikan sekali,
// yaitu saat konten berstatus pending di-ACC untuk pertama kalinya.
//
// Aturan buah (1 buah = 1 konten unik):
// - ACC            → buah konten muncul (Storage dulu, slotnya sudah dicatat).
// - Basi           → buah jatuh dan rebah busuk di bawah pohon (arsip).
// - Tidak relevan  → buah diangkat: hilang, slot kosong permanen.
// - Duplikat       → buah duplikatnya diangkat; buah konten asli tetap.
// - ACC ulang      → buah tumbuh/balik pada slot yang sama; Air/Pupuk tidak
//                    diberikan lagi dan tidak pernah ditarik.
export function setSharingCondition(currentState, submissionId, condition, options = {}) {
  if (!['validated', 'stale', 'rejected', 'duplicate'].includes(condition)) {
    throw new Error('Kondisi konten Sharing tidak dikenal.');
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  syncActivityClock(state, wallNow);

  const submission = state.sharingSubmissions.find((entry) => entry.id === submissionId);
  if (!submission) {
    throw new Error('Konten Sharing tidak ditemukan.');
  }

  const previousStatus = submission.status;
  if (previousStatus === condition) {
    return { state, applied: false, reason: 'condition-unchanged', rewarded: false };
  }

  submission.status = condition;
  submission.reviewedAt = state.clockMs;

  const entry = findLedgerEntry(state, submission.id);
  const treeReady = state.level >= 3 && getTreeCondition(state) === 'healthy';

  if (condition === 'validated') {
    if (entry) {
      // Buah kembali di slot yang sama; slot tidak pernah bergeser.
      entry.placement = treeReady ? 'tree' : 'storage';
      entry.fellAt = null;
      entry.placedAt = state.clockMs;
    }
  } else if (condition === 'stale') {
    if (entry) {
      entry.placement = 'ground';
      entry.fellAt = state.clockMs;
    }
  } else if (entry) {
    // Tidak relevan / duplikat: buahnya diangkat, slotnya kosong permanen.
    entry.placement = 'gone';
    entry.fellAt = null;
  }

  if (condition === 'validated' && previousStatus === 'pending') {
    // Reward ACC pertama: Air/Pupuk dari parameter admin, plus buah konten itu sendiri.
    addReward(state, {
      air: activeSettings.accReward.air,
      fertilizerUnits: activeSettings.accReward.fertilizerUnits,
      fruit: ACC_FRUIT,
    }, state.clockMs, `Sharing di-ACC: ${submission.title}`, { boundSubmissionId: submission.id });
    recordValidActivity(state);
    return { state, applied: true, rewarded: true };
  }

  if (condition === 'validated' && !entry) {
    // Duplikat lama yang diputus relevan: buah pasangannya muncul, tanpa
    // reward Air/Pupuk (reward hanya untuk ACC pertama kali).
    makeFruitEntry(state, submission.id, state.clockMs);
  }

  const conditionSummaries = {
    validated: treeReady
      ? 'Konten kembali relevan; buah kembali menggantung di slot lamanya.'
      : 'Konten kembali relevan; buah kembali ke Storage di slot lamanya.',
    stale: 'Laporan dinyatakan; buah jatuh rebah busuk di bawah pohon.',
    rejected: 'Konten tidak relevan; buahnya diangkat dan hilang dari pohon.',
    duplicate: 'Konten duplikat; buahnya diangkat, buah konten asli tetap.',
  };
  const conditionTitles = {
    validated: 'Konten kembali di-ACC',
    stale: 'Konten basi',
    rejected: 'Konten tidak relevan',
    duplicate: 'Konten duplikat',
  };
  recordActivity(state, {
    at: state.clockMs,
    type: 'sharing',
    title: `${conditionTitles[condition]}: ${submission.title}`,
    detail: conditionSummaries[condition],
    status: condition,
    metadata: { submissionId: submission.id },
  });

  syncFruitPlacement(state, state.clockMs);
  return { state, applied: true, rewarded: false };
}

export const SHARING_REPORT_REASONS = {
  rejected: 'Tidak relevan',
  duplicate: 'Duplikat',
  stale: 'Basi / tidak mutakhir',
  other: 'Lainnya',
};

// Pengguna lain melaporkan masalah konten. Satu akun hanya
// melapor satu kali per konten; keputusan tetap di tangan admin (manual).
export function addSharingReport(currentState, submissionId, reporterEmail, options = {}) {
  const reason = options.reason ?? 'rejected';
  const note = String(options.note ?? '').trim();
  if (!Object.hasOwn(SHARING_REPORT_REASONS, reason)) throw new Error('Alasan laporan tidak valid.');
  if (note.length > 500) throw new Error('Catatan laporan maksimal 500 karakter.');
  if (reason === 'other' && !note) throw new Error('Jelaskan alasan laporan pada catatan.');
  const reporter = String(reporterEmail ?? '').trim().toLocaleLowerCase('en-US');
  if (!reporter) {
    throw new Error('Pelapor tidak dikenal.');
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  syncActivityClock(state, wallNow);

  const submission = state.sharingSubmissions.find((entry) => entry.id === submissionId);
  if (!submission) {
    throw new Error('Konten Sharing tidak ditemukan.');
  }

  submission.reports = Array.isArray(submission.reports) ? submission.reports : [];
  if (submission.reports.some((report) => report?.by === reporter)) {
    return { state, added: false, reason: 'already-reported', reports: submission.reports.length };
  }

  submission.reports.push({ by: reporter, at: state.clockMs, reason, note });
  recordActivity(state, {
    at: state.clockMs,
    type: 'report',
    title: `Konten dilaporkan: ${submission.title}`,
    detail: `${SHARING_REPORT_REASONS[reason]}${note ? ` — ${note}` : ''}. Dilaporkan oleh ${reporter} (total ${submission.reports.length}). Admin yang menentukan kondisinya.`,
    status: 'reported',
    metadata: { submissionId: submission.id },
  });

  return { state, added: true, reports: submission.reports.length };
}

// Peta buah untuk rendering: baris slot di pohon, buah busuk yang rebah di
// tanah, dan jumlah slot (agar buah yang hilang meninggalkan celah kosong).
export function getFruitView(currentState) {
  const submissionsById = new Map();
  for (const submission of currentState.sharingSubmissions ?? []) {
    submissionsById.set(submission.id, submission);
  }

  const tree = [];
  const ground = [];
  const gone = [];
  let maxSlot = 0;

  for (const entry of currentState.fruitLedger ?? []) {
    if (!Number.isFinite(entry?.slot)) continue;
    maxSlot = Math.max(maxSlot, entry.slot);
    const submission = entry.submissionId ? submissionsById.get(entry.submissionId) : null;
    const viewItem = {
      slot: entry.slot,
      submissionId: entry.submissionId ?? null,
      title: submission?.title ?? null,
      statusKey: 'validated',
    };

    if (entry.placement === 'tree') {
      tree.push({ ...viewItem, title: submission?.title ?? null });
    } else if (entry.placement === 'ground') {
      ground.push({ ...viewItem, fellAt: Number.isFinite(entry.fellAt) ? entry.fellAt : null });
    } else if (entry.placement === 'gone') {
      gone.push({ slot: entry.slot, submissionId: entry.submissionId ?? null, title: submission?.title ?? null });
    }
  }

  return {
    tree,
    ground,
    gone,
    maxSlot,
    fruitsOnTree: tree.length,
  };
}

export function applyActivity(currentState, type, options = {}) {
  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();

  syncWallClock(state, wallNow);
  applyElapsedDecay(state);

  if (type === 'sharing' || type === 'learning') {
    throw new Error(`${type} harus dicatat melalui alur aktivitasnya.`);
  }

  if (!ACTIVITY_LABELS[type]) {
    throw new Error(`Jenis aktivitas tidak dikenal: ${type}`);
  }

  if (type === 'access') {
    const today = getLocalDayKey(state.clockMs);
    if (state.lastAccessRewardDay === today) {
      recordActivity(state, {
        at: state.clockMs,
        type: 'activity',
        title: ACTIVITY_LABELS.access,
        detail: 'Reward Air harian sudah diterima hari ini; tidak ada Air tambahan.',
        status: 'activity',
      });
    } else {
      const accessReward = activityReward('access');
      addReward(state, accessReward, state.clockMs, accessReward.label);
      state.lastAccessRewardDay = today;
    }
    recordValidActivity(state);
    return state;
  }

  const reward = activityReward(type);
  addReward(state, reward, state.clockMs, reward.label);
  if (type !== 'review') {
    recordValidActivity(state);
  }

  return state;
}

export function applyCare(currentState, resourceType, options = {}) {
  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();

  syncWallClock(state, wallNow);
  applyElapsedDecay(state);

  if (!['air', 'fertilizer', 'fruit'].includes(resourceType)) {
    throw new Error(`Jenis resource perawatan tidak dikenal: ${resourceType}`);
  }

  if (resourceType === 'fruit') {
    const storageFruits = state.fruitLedger
      .filter((entry) => entry.placement === 'storage')
      .sort((a, b) => a.slot - b.slot);

    if (storageFruits.length < 1) {
      state.history.unshift(makeHistoryEntry(state, {
        at: state.clockMs,
        type: 'fruit',
        title: 'Buah tidak tersedia di Storage',
        detail: 'Butuh 1 Buah di Storage untuk memindahkannya ke pohon.',
        status: 'insufficient',
      }));
      state.history = state.history.slice(0, 30);
      return { state, applied: false, resourceType, reason: 'insufficient' };
    }

    if (state.level < 3 || getTreeCondition(state) !== 'healthy') {
      const reason = state.level < 3
        ? 'Buah dapat dipindahkan setelah pohon mencapai Level 3.'
        : 'Buah dapat dipindahkan saat pohon dalam kondisi sehat.';
      state.history.unshift(makeHistoryEntry(state, {
        at: state.clockMs,
        type: 'fruit',
        title: 'Pohon belum siap menerima Buah',
        detail: reason,
        status: 'unavailable',
      }));
      state.history = state.history.slice(0, 30);
      return { state, applied: false, resourceType, reason: 'tree-not-ready' };
    }

    const placedFruit = storageFruits[0];
    placedFruit.placement = 'tree';
    placedFruit.fellAt = null;
    placedFruit.placedAt = state.clockMs;
    const placedTitle = placedFruit.submissionId ? boundFruitTitle(state, placedFruit.submissionId) : null;
    deriveFruitCounters(state);

    state.history.unshift(makeHistoryEntry(state, {
      at: state.clockMs,
      type: 'fruit',
      title: 'Buah dipindahkan ke pohon',
      detail: `−1 Buah dari Storage · +1 Buah menggantung di pohon; progres dan perawatan tidak berubah.${placedTitle ? ` Buah milik konten "${placedTitle}" (slot ${placedFruit.slot}).` : ''}`,
      status: 'fruit',
    }));
    state.history = state.history.slice(0, 30);
    return { state, applied: true, progressApplied: false, resourceType };
  }

  const resourceLabel = resourceType === 'air' ? 'Air' : 'Pupuk';
  const requirement = getNextLevelRequirement(state.level);
  const progressIsFull = resourceType === 'air'
    ? state.growthAir >= requirement.air
    : state.growthFertilizerUnits >= requirement.fertilizerUnits;
  const careNeedsRecovery = resourceType === 'air'
    ? state.careAir <= 0
    : state.careFertilizerUnits <= 0;

  if (progressIsFull && !careNeedsRecovery) {
    state.history.unshift(makeHistoryEntry(state, {
      at: state.clockMs,
      type: 'care',
      title: `Progres ${resourceLabel} sudah penuh`,
      detail: `Resource ${resourceLabel} tetap di Storage sampai progres Air dan Pupuk menuju level berikutnya terpenuhi.`,
      status: 'full',
    }));
    state.history = state.history.slice(0, 30);
    return { state, applied: false, resourceType, reason: 'progress-full' };
  }

  const hasBalance = resourceType === 'air' ? state.air >= 1 : state.fertilizerUnits >= 2;

  if (!hasBalance) {
    state.history.unshift(makeHistoryEntry(state, {
      at: state.clockMs,
      type: 'care',
      title: 'Saldo perawatan tidak cukup',
      detail: `Butuh 1 ${resourceLabel} di Storage.`,
      status: 'insufficient',
    }));
    state.history = state.history.slice(0, 30);
    return { state, applied: false, resourceType, reason: 'insufficient' };
  }

  const resourceDelta = resourceType === 'air'
    ? { air: -1, fertilizerUnits: 0 }
    : { air: 0, fertilizerUnits: -2 };
  if (resourceType === 'air') {
    state.air -= 1;
    state.careAir += 1;
    if (!progressIsFull) state.growthAir += 1;
  } else {
    state.fertilizerUnits -= 2;
    state.careFertilizerUnits += 2;
    if (!progressIsFull) state.growthFertilizerUnits += 2;
  }

  updateTreeLevel(state, state.clockMs);
  recordCareActivity(state);
  state.history.unshift(makeHistoryEntry(state, {
    at: state.clockMs,
    type: 'care',
    title: resourceType === 'air' ? 'Pohon disiram' : 'Pohon dipupuk',
    detail: `−1 ${resourceLabel} dari Storage · perawatan pohon +1 ${resourceLabel}${progressIsFull ? ' · progres level tetap penuh' : ` · progres level +1 ${resourceLabel}`}`,
    status: 'care',
    airDelta: resourceDelta.air,
    fertilizerDeltaUnits: resourceDelta.fertilizerUnits,
    growthAirDelta: resourceType === 'air' && !progressIsFull ? 1 : 0,
    growthFertilizerDeltaUnits: resourceType === 'fertilizer' && !progressIsFull ? 2 : 0,
    careAirDelta: resourceType === 'air' ? 1 : 0,
    careFertilizerDeltaUnits: resourceType === 'fertilizer' ? 2 : 0,
  }));
  state.history = state.history.slice(0, 30);

  return { state, applied: true, progressApplied: !progressIsFull, resourceType };
}

export function advanceDemoDays(currentState, days = 7, wallNow = Date.now()) {
  const state = cloneState(currentState);
  syncWallClock(state, wallNow);
  state.clockMs += days * DAY_MS;
  state.wallClockSyncedAt = wallNow;
  const periods = applyElapsedDecay(state);

  if (periods === 0) {
    state.history.unshift(makeHistoryEntry(state, {
      at: state.clockMs,
      type: 'demo',
      title: `Waktu demo maju ${days} hari`,
      detail: 'Belum melewati satu periode decay penuh.',
      status: 'demo',
    }));
  }

  state.history = state.history.slice(0, 30);
  return state;
}

export function addDemoResource(currentState, resourceType, amount, options = {}) {
  if (!['air', 'fertilizer', 'fruit'].includes(resourceType)) {
    throw new Error('Jenis variabel demo tidak dikenal.');
  }

  const quantity = Number(amount);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Jumlah harus lebih besar dari nol.');
  }

  if (resourceType === 'fertilizer' ? !Number.isInteger(quantity * 2) : !Number.isInteger(quantity)) {
    throw new Error(resourceType === 'fertilizer'
      ? 'Jumlah Pupuk harus menggunakan kelipatan 0,5.'
      : 'Jumlah Air dan Buah harus berupa bilangan bulat.');
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);

  const storageDelta = { air: 0, fertilizerUnits: 0, fruit: 0 };
  if (resourceType === 'air') {
    state.air += quantity;
    storageDelta.air = quantity;
  } else if (resourceType === 'fertilizer') {
    const fertilizerUnits = Math.round(quantity * 2);
    state.fertilizerUnits += fertilizerUnits;
    storageDelta.fertilizerUnits = fertilizerUnits;
  } else {
    for (let index = 0; index < quantity; index += 1) {
      makeFruitEntry(state, null, state.clockMs);
    }
    storageDelta.fruit = quantity;
  }

  syncFruitPlacement(state, state.clockMs);

  const labels = { air: 'Air', fertilizer: 'Pupuk', fruit: 'Buah' };
  const formattedAmount = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(quantity);
  state.history.unshift(makeHistoryEntry(state, {
    at: state.clockMs,
    type: 'demo',
    title: `Demo: tambah ${formattedAmount} ${labels[resourceType]}`,
    detail: `+${formattedAmount} ${labels[resourceType]} masuk ke Storage; progres tidak berubah.`,
    status: 'demo',
    airDelta: storageDelta.air,
    fertilizerDeltaUnits: storageDelta.fertilizerUnits,
    fruitDelta: storageDelta.fruit,
  }));
  state.history = state.history.slice(0, 30);

  return state;
}

export function simulateDemoTreeCondition(currentState, condition) {
  if (!['healthy', 'thirsty', 'dead'].includes(condition)) {
    throw new Error('Kondisi uji demo harus sehat, menguning, atau mati.');
  }

  const state = cloneState(currentState);
  if (condition === 'healthy') {
    state.careAir = Math.max(1, state.careAir);
    state.careFertilizerUnits = Math.max(2, state.careFertilizerUnits);
  } else {
    state.careAir = 0;
    if (condition === 'thirsty') {
      state.careFertilizerUnits = Math.max(1, state.careFertilizerUnits);
    } else {
      state.careFertilizerUnits = 0;
    }
  }

  syncFruitPlacement(state, state.clockMs);
  recordActivity(state, {
    at: state.clockMs,
    type: 'demo',
    title: condition === 'healthy' ? 'Demo: pohon dipulihkan sehat' : condition === 'thirsty' ? 'Demo: uji pohon menguning' : 'Demo: uji pohon mati',
    detail: condition === 'healthy'
      ? 'Perawatan pohon dipulihkan untuk uji demo; Storage dan progres pertumbuhan tidak berubah.'
      : 'Kondisi pohon diubah untuk uji demo; Storage dan progres pertumbuhan tidak berubah.',
    status: 'demo',
  });
  return state;
}

export function applyDemoBoost(currentState, wallNow = Date.now()) {
  const state = cloneState(currentState);
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);
  state.air += 10;
  state.fertilizerUnits += 12;
  makeFruitEntry(state, null, state.clockMs);
  syncFruitPlacement(state, state.clockMs);
  recordActivity(state, {
    at: state.clockMs,
    type: 'demo',
    title: 'Boost Demo: tambah resource',
    detail: '+10 Air, +6 Pupuk, dan +1 Buah masuk Storage · progres tidak berubah.',
    status: 'demo',
    airDelta: 10,
    fertilizerDeltaUnits: 12,
    fruitDelta: 1,
  });
  return state;
}

export function applyDemoLevelBoost(currentState, wallNow = Date.now()) {
  const state = cloneState(currentState);
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);
  const requirement = getNextLevelRequirement(state.level);
  const alreadyMaxed = state.level >= 7
    && state.growthAir >= requirement.air
    && state.growthFertilizerUnits >= requirement.fertilizerUnits;
  state.growthAir = Math.max(state.growthAir, requirement.air);
  state.growthFertilizerUnits = Math.max(state.growthFertilizerUnits, requirement.fertilizerUnits);
  state.careAir = Math.max(state.careAir, 1);
  state.careFertilizerUnits = Math.max(state.careFertilizerUnits, 2);
  const leveledUp = updateTreeLevel(state, state.clockMs);
  recordCareActivity(state);
  recordActivity(state, {
    at: state.clockMs,
    type: 'demo',
    title: alreadyMaxed && !leveledUp
      ? 'Boost Level: pohon sudah maksimal'
      : `Boost Level: naik ke Level ${state.level}`,
    detail: alreadyMaxed && !leveledUp
      ? 'Pohon sudah Level 7 · perawatan dipulihkan agar tetap sehat.'
      : `Progres demo diisi ke ${requirement.air} Air / ${formatPupukAmount(requirement.fertilizerUnits)} Pupuk · perawatan dipulihkan.`,
    status: 'demo',
    growthAirDelta: requirement.air,
    growthFertilizerDeltaUnits: requirement.fertilizerUnits,
  });
  return state;
}

export function applyDemoLevelDecrease(currentState, wallNow = Date.now()) {
  const state = cloneState(currentState);
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);
  if (state.level <= 0) {
    recordActivity(state, {
      at: state.clockMs,
      type: 'demo',
      title: 'Turun Level: pohon sudah paling awal',
      detail: 'Pohon masih Level 0 · tidak ada level yang lebih rendah.',
      status: 'demo',
    });
    return state;
  }
  const target = state.level - 1;
  const requirement = activeSettings.levels[target - 1];
  state.growthAir = requirement ? requirement.air : 0;
  state.growthFertilizerUnits = requirement ? requirement.fertilizerUnits : 0;
  state.level = target;
  state.careAir = Math.max(state.careAir, 1);
  state.careFertilizerUnits = Math.max(state.careFertilizerUnits, 2);
  syncFruitPlacement(state, state.clockMs);
  recordCareActivity(state);
  recordActivity(state, {
    at: state.clockMs,
    type: 'demo',
    title: `Turun Level: kembali ke Level ${target}`,
    detail: requirement
      ? `Progres demo dikurangi ke ${requirement.air} Air / ${formatPupukAmount(requirement.fertilizerUnits)} Pupuk · perawatan dipulihkan.`
      : 'Progres demo dikosongkan · perawatan dipulihkan.',
    status: 'demo',
    growthAirDelta: state.growthAir,
    growthFertilizerDeltaUnits: state.growthFertilizerUnits,
  });
  return state;
}

export function tickState(currentState, wallNow = Date.now()) {
  const state = cloneState(currentState);
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);
  return state;
}
