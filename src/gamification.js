export const DAY_MS = 24 * 60 * 60 * 1000;

export const LEVELS = [
  { level: 1, name: 'Bibit', air: 1, fertilizerUnits: 2 },
  { level: 2, name: 'Pertumbuhan daun', air: 3, fertilizerUnits: 4 },
  { level: 3, name: 'Buah mulai muncul', air: 9, fertilizerUnits: 12 },
  { level: 4, name: 'Pohon besar', air: 27, fertilizerUnits: 36 },
  { level: 5, name: 'Siap berbuah', air: 101, fertilizerUnits: 108 },
];

export const STAGES = [
  'Tanah kosong',
  'Bibit',
  'Daun',
  'Mulai berbuah',
  'Pohon besar',
  'Siap berbuah',
];

const ACTIVITY_REWARDS = {
  access: { air: 1, fertilizerUnits: 0, fruit: 0, label: 'Akses / Login valid' },
  review: { air: 1, fertilizerUnits: 0, fruit: 0, label: 'Review valid' },
};
const SHARING_TYPES = new Set(['video', 'article', 'document', 'podcast', 'link']);

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
    && entry?.title === ACTIVITY_REWARDS.access.label
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
  clonedState.level = Number.isFinite(clonedState.level) ? Math.min(5, Math.max(0, Math.floor(clonedState.level))) : 0;
  clonedState.fruitsInStorage = Number.isFinite(clonedState.fruitsInStorage) ? Math.max(0, clonedState.fruitsInStorage) : 0;
  clonedState.fruitsOnTree = Number.isFinite(clonedState.fruitsOnTree) ? Math.max(0, clonedState.fruitsOnTree) : 0;
  clonedState.clockMs = Number.isFinite(clonedState.clockMs) ? clonedState.clockMs : now;
  clonedState.wallClockSyncedAt = Number.isFinite(clonedState.wallClockSyncedAt)
    ? clonedState.wallClockSyncedAt
    : clonedState.clockMs;
  clonedState.lastValidActivityAt = Number.isFinite(clonedState.lastValidActivityAt)
    ? clonedState.lastValidActivityAt
    : clonedState.clockMs;
  clonedState.lastCareAt = Number.isFinite(clonedState.lastCareAt) ? clonedState.lastCareAt : null;
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
  clonedState.sharingSubmissions = Array.isArray(clonedState.sharingSubmissions)
    ? clonedState.sharingSubmissions
    : [];
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
    level: 0,
    air: 1,
    fertilizerUnits: 2,
    careAir: 1,
    careFertilizerUnits: 2,
    fruitsInStorage: 0,
    fruitsOnTree: 0,
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
    sharingSubmissions: [],
    history: [],
  };
}

export function getLevelForProgress(growthAir, growthFertilizerUnits) {
  let level = 0;

  for (const requirement of LEVELS) {
    if (growthAir >= requirement.air && growthFertilizerUnits >= requirement.fertilizerUnits) {
      level = requirement.level;
    }
  }

  return level;
}

export function getNextLevelRequirement(level) {
  return LEVELS.find((requirement) => requirement.level > level) ?? LEVELS.at(-1);
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

function syncFruitPlacement(state, at) {
  const condition = getTreeCondition(state);
  const canShowFruit = state.level >= 3 && condition === 'healthy';
  let movedToTree = 0;
  let movedToStorage = 0;

  if (!canShowFruit && state.fruitsOnTree > 0) {
    const movedFruit = state.fruitsOnTree;
    movedToStorage = movedFruit;
    state.fruitsInStorage += movedFruit;
    state.fruitsOnTree = 0;

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
  } else if (canShowFruit && state.fruitsInStorage > 0) {
    const movedFruit = state.fruitsInStorage;
    movedToTree = movedFruit;
    state.fruitsOnTree += movedFruit;
    state.fruitsInStorage = 0;
    state.history.unshift(makeHistoryEntry(state, {
      at,
      type: 'fruit',
      title: 'Buah kembali terlihat di pohon',
      detail: `${movedFruit} Buah dari Storage kembali tampil karena pohon sehat dan sudah mencapai Level 3.`,
      status: 'fruit',
    }));
  }

  state.history = state.history.slice(0, 30);
  return { movedToTree, movedToStorage };
}

function syncWallClock(state, wallNow) {
  const elapsed = Math.max(0, wallNow - state.wallClockSyncedAt);
  state.clockMs += elapsed;
  state.wallClockSyncedAt = wallNow;
}

function applyElapsedDecay(state) {
  const elapsedPeriods = Math.floor((state.clockMs - state.lastDecayAt) / (7 * DAY_MS));

  for (let period = 0; period < elapsedPeriods; period += 1) {
    const oldGrowthAir = state.growthAir;
    const oldGrowthFertilizerUnits = state.growthFertilizerUnits;
    const oldCareAir = state.careAir;
    const oldCareFertilizerUnits = state.careFertilizerUnits;
    state.growthAir = Math.max(0, state.growthAir - 1);
    state.growthFertilizerUnits = Math.max(0, state.growthFertilizerUnits - 1);
    state.careAir = Math.max(0, state.careAir - 1);
    state.careFertilizerUnits = Math.max(0, state.careFertilizerUnits - 1);
    state.lastDecayAt += 7 * DAY_MS;

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

function addReward(state, reward, at, label) {
  state.air += reward.air;
  state.fertilizerUnits += reward.fertilizerUnits;

  if (reward.fruit > 0) {
    state.fruitsInStorage += reward.fruit;
  }

  const fruitMovement = syncFruitPlacement(state, at);

  const rewardParts = [];
  if (reward.air > 0) rewardParts.push(`+${reward.air} Air masuk Storage`);
  if (reward.fertilizerUnits > 0) rewardParts.push(`+${reward.fertilizerUnits / 2} Pupuk masuk Storage`);
  if (reward.fruit > 0) {
    rewardParts.push(fruitMovement.movedToTree > 0
      ? `+${reward.fruit} Buah; buah yang memenuhi syarat tampil di pohon`
      : `+${reward.fruit} Buah masuk Storage`);
  }
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
  addReward(state, { air: 0, fertilizerUnits: 2, fruit: 0 }, state.clockMs, `Learning selesai: ${title}`);
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
  const ratingEntry = addReward(state, { air: 1, fertilizerUnits: 0, fruit: 0 }, state.clockMs, `Rating Learning: ${title}`);
  ratingEntry.detail = `Rating ${rating}/5 · +1 Air masuk Storage`;
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

export function reviewSharingMaterial(currentState, submissionId, validation, options = {}) {
  if (!['validated', 'rejected', 'duplicate'].includes(validation)) {
    throw new Error('Status validasi Sharing tidak dikenal.');
  }

  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();
  syncActivityClock(state, wallNow);

  const submission = state.sharingSubmissions.find((entry) => entry.id === submissionId);
  if (!submission) {
    throw new Error('Materi Sharing tidak ditemukan.');
  }

  if (submission.status !== 'pending') {
    return { state, applied: false, reason: 'already-reviewed' };
  }

  submission.status = validation;
  submission.reviewedAt = state.clockMs;

  if (validation === 'validated') {
    addReward(state, { air: 3, fertilizerUnits: 4, fruit: 1 }, state.clockMs, `Sharing tervalidasi: ${submission.title}`);
    recordValidActivity(state);
    return { state, applied: true };
  }

  const statusTitle = validation === 'rejected' ? 'Sharing ditolak' : 'Sharing duplikat';
  recordActivity(state, {
    at: state.clockMs,
    type: 'sharing',
    title: statusTitle,
    detail: `${submission.title} · tidak mendapat reward`,
    status: validation,
    metadata: { submissionId: submission.id },
  });

  return { state, applied: true };
}

export function applyActivity(currentState, type, options = {}) {
  const state = cloneState(currentState);
  const wallNow = options.wallNow ?? Date.now();

  syncWallClock(state, wallNow);
  applyElapsedDecay(state);

  if (type === 'sharing' || type === 'learning') {
    throw new Error(`${type} harus dicatat melalui alur aktivitasnya.`);
  }

  if (!ACTIVITY_REWARDS[type]) {
    throw new Error(`Jenis aktivitas tidak dikenal: ${type}`);
  }

  if (type === 'access') {
    const today = getLocalDayKey(state.clockMs);
    if (state.lastAccessRewardDay === today) {
      recordActivity(state, {
        at: state.clockMs,
        type: 'activity',
        title: ACTIVITY_REWARDS.access.label,
        detail: 'Reward +1 Air harian sudah diterima hari ini; tidak ada Air tambahan.',
        status: 'activity',
      });
    } else {
      addReward(state, ACTIVITY_REWARDS.access, state.clockMs, ACTIVITY_REWARDS.access.label);
      state.lastAccessRewardDay = today;
    }
    recordValidActivity(state);
    return state;
  }

  addReward(state, ACTIVITY_REWARDS[type], state.clockMs, ACTIVITY_REWARDS[type].label);
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

  if (!['air', 'fertilizer'].includes(resourceType)) {
    throw new Error(`Jenis resource perawatan tidak dikenal: ${resourceType}`);
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
    state.fruitsInStorage += quantity;
    storageDelta.fruit = quantity;
  }

  const fruitMovement = syncFruitPlacement(state, state.clockMs);

  const labels = { air: 'Air', fertilizer: 'Pupuk', fruit: 'Buah' };
  const formattedAmount = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(quantity);
  state.history.unshift(makeHistoryEntry(state, {
    at: state.clockMs,
    type: 'demo',
    title: `Demo: tambah ${formattedAmount} ${labels[resourceType]}`,
    detail: resourceType === 'fruit' && fruitMovement.movedToTree > 0
      ? `+${formattedAmount} Buah ditambahkan dan langsung ditampilkan pada pohon yang sehat.`
      : `+${formattedAmount} ${labels[resourceType]} masuk ke Storage; progres tidak berubah.`,
    status: 'demo',
    airDelta: storageDelta.air,
    fertilizerDeltaUnits: storageDelta.fertilizerUnits,
    fruitDelta: storageDelta.fruit,
  }));
  state.history = state.history.slice(0, 30);

  return state;
}

export function simulateDemoTreeCondition(currentState, condition) {
  if (!['thirsty', 'dead'].includes(condition)) {
    throw new Error('Kondisi uji demo harus menguning atau mati.');
  }

  const state = cloneState(currentState);
  state.careAir = 0;
  if (condition === 'thirsty') {
    state.careFertilizerUnits = Math.max(1, state.careFertilizerUnits);
  } else {
    state.careFertilizerUnits = 0;
  }

  syncFruitPlacement(state, state.clockMs);
  recordActivity(state, {
    at: state.clockMs,
    type: 'demo',
    title: condition === 'thirsty' ? 'Demo: uji pohon menguning' : 'Demo: uji pohon mati',
    detail: 'Kondisi pohon diubah untuk uji demo; Storage dan progres pertumbuhan tidak berubah.',
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
  state.fruitsInStorage += 1;
  const fruitMovement = syncFruitPlacement(state, state.clockMs);
  recordActivity(state, {
    at: state.clockMs,
    type: 'demo',
    title: 'Boost Demo: tambah resource',
    detail: `+10 Air dan +6 Pupuk masuk Storage · +1 Buah${fruitMovement.movedToTree > 0 ? ' ditampilkan di pohon sehat' : ' masuk Storage'} · progres tidak berubah.`,
    status: 'demo',
    airDelta: 10,
    fertilizerDeltaUnits: 12,
    fruitDelta: 1,
  });
  return state;
}

export function tickState(currentState, wallNow = Date.now()) {
  const state = cloneState(currentState);
  syncWallClock(state, wallNow);
  applyElapsedDecay(state);
  return state;
}
