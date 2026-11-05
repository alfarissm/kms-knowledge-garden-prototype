import {
  createInitialState, applyActivity, applyCare, completeLearningModule,
  rateLearningModule, submitSharingMaterial, setSharingCondition,
  advanceDemoDays, applyDemoBoost, applyDemoLevelBoost, applyDemoLevelDecrease,
  simulateDemoTreeCondition,
} from './engine/gamification.js';

export function createSimulation(now = Date.now()) {
  return { state: createInitialState(now), wallNow: now, startClock: now,
    selectedId: null, lastModuleId: null, events: [] };
}

export function canLogin(state) {
  const d = new Date(state.clockMs);
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return state.lastAccessRewardDay !== key;
}

export function performAction(current, action) {
  let sim = structuredClone(current);
  const options = { wallNow: sim.wallNow };
  let message = '', tone = 'success';
  const take = (result, success) => {
    sim.state = result.state;
    if (result.applied === false || result.awarded === false) {
      tone = 'notice';
      message = ({ 'insufficient': 'Storage tidak cukup. Kumpulkan resource terlebih dahulu.',
        'progress-full': 'Target resource sudah penuh. Lengkapi resource pasangannya.',
        'tree-not-ready': 'Buah hanya bisa dipasang di pohon sehat Level 3+.',
        'already-rated': 'Materi ini sudah diulas. Tidak ada reward kedua kali.',
        'not-completed': 'Tuntaskan materi sebelum memberi ulasan.',
        'condition-unchanged': 'Status konten sudah sama. Tidak ada reward tambahan.' })[result.reason] || 'Aksi belum dapat diterapkan.';
    } else message = success || sim.state.history[0]?.detail || 'Aksi diterapkan.';
  };
  switch (action) {
    case 'login': {
      const eligible = canLogin(sim.state);
      sim.state = applyActivity(sim.state, 'access', options);
      message = eligible ? 'Login valid: +1 Air masuk Storage.' : 'Reward login hari ini sudah diterima. Tidak ada Air tambahan.';
      if (!eligible) tone = 'notice';
      break;
    }
    case 'learn': {
      const n = sim.state.completedLearningIds.length + 1;
      sim.lastModuleId = `lesson-${n}`;
      take(completeLearningModule(sim.state, sim.lastModuleId, { ...options, title: `Materi #${n}` }), `Materi #${n} tuntas: +1 Pupuk masuk Storage.`);
      break;
    }
    case 'rate': {
      if (!sim.lastModuleId) throw new Error('Tuntaskan satu materi terlebih dahulu.');
      take(rateLearningModule(sim.state, sim.lastModuleId, 5, { ...options, comment: 'Ulasan contoh dari tombol simulasi.' }), 'Bintang + komentar contoh tersimpan: +1 Air masuk Storage.');
      break;
    }
    case 'share': {
      const n = sim.state.sharingSubmissions.length + 1;
      const result = submitSharingMaterial(sim.state, { title: `Konten #${n}`, type: 'article', summary: `Konten simulasi ${n}.`, url: `https://example.com/simulator/${n}` }, { ...options, submissionId: `content-${n}` });
      sim.state = result.state;
      sim.selectedId = result.submission.id;
      message = `Konten #${n} menunggu review. Belum ada buah atau reward ACC.`;
      break;
    }
    case 'acc': case 'stale': case 'rejected': case 'duplicate': {
      if (!sim.selectedId) throw new Error('Pilih konten atau buat Sharing baru terlebih dahulu.');
      const result = setSharingCondition(sim.state, sim.selectedId, action === 'acc' ? 'validated' : action, options);
      take(result);
      if (result.applied !== false) {
        message = action === 'acc' ? (result.rewarded ? 'ACC pertama: +3 Air, +2 Pupuk, +1 Buah masuk Storage.' : 'ACC ulang: buah aktif di slot semula, tanpa tambahan Air/Pupuk.')
          : action === 'stale' ? 'Konten basi: buah cokelat rebah di tanah; terlihat mulai Level 3.'
          : 'Buah konten diangkat. Slotnya kosong; buah lain tidak bergeser.';
      }
      break;
    }
    case 'care-air': case 'care-fertilizer': case 'care-fruit':
      take(applyCare(sim.state, action.slice(5), options)); break;
    case 'advance':
      sim.state = advanceDemoDays(sim.state, 7, sim.wallNow);
      message = '+7 hari: progres dan perawatan −1 Air / −0,5 Pupuk. Storage dan level tetap.'; break;
    case 'healthy': case 'thirsty': case 'dead':
      sim.state = simulateDemoTreeCondition(sim.state, action);
      message = action === 'healthy' ? 'Pohon dipulihkan sehat. Progres yang hilang tidak dikembalikan; pasang ulang buah dari Storage.'
        : `${action === 'thirsty' ? 'Menguning' : 'Mati'}: buah menggantung kembali ke Storage. Buah basi tetap di tanah.`;
      break;
    case 'boost':
      sim.state = applyDemoBoost(sim.state, sim.wallNow);
      message = 'Khusus demo: +10 Air, +6 Pupuk, +1 Buah ke Storage. Progres tidak berubah.'; break;
    case 'level-up': {
      const before = sim.state.level;
      sim.state = applyDemoLevelBoost(sim.state, sim.wallNow);
      message = before < 7 ? `Khusus demo: Level ${before} → ${sim.state.level}. Progres dan perawatan disesuaikan.` : 'Sudah Level 7. Perawatan dipulihkan.'; break;
    }
    case 'level-down':
      sim.state = applyDemoLevelDecrease(sim.state, sim.wallNow);
      message = `Khusus demo: turun ke Level ${sim.state.level}. Progres disesuaikan dengan ambang level.`; break;
    case 'example': {
      sim = createSimulation(sim.wallNow);
      for (let i=0; i<3; i++) sim = performAction(sim, 'level-up').sim;
      for (let i=0; i<3; i++) {
        sim = performAction(sim, 'share').sim;
        sim = performAction(sim, 'acc').sim;
        sim = performAction(sim, 'care-fruit').sim;
      }
      sim.events = [];
      message = 'Contoh dimuat dari awal: pohon sehat Level 3, tiga konten ACC, tiga buah menggantung.';
      break;
    }
    case 'reset': sim = createSimulation(sim.wallNow); message = 'Simulasi diulang: Level 0, Storage 1 Air dan 1 Pupuk.'; break;
    default: throw new Error('Aksi simulasi tidak dikenal.');
  }
  sim.events.unshift({ action, message, tone, day: Math.floor((sim.state.clockMs-sim.startClock)/86400000) });
  sim.events = sim.events.slice(0, 8);
  return { sim, message, tone };
}
