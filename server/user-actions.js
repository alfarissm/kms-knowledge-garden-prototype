import {
  addDemoResource, advanceDemoDays, applyActivity, applyCare, applyDemoBoost,
  applyDemoLevelBoost, applyDemoLevelDecrease, completeLearningModule,
  createInitialState, rateLearningModule, simulateDemoTreeCondition,
  submitSharingMaterial, tickState,
} from '../src/gamification.js';
import { normalizeLearningQuiz } from '../src/learning-model.js';

export function applyUserAction(current, action, { modules = [], demoEnabled = false, now = Date.now() } = {}) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') throw new Error('Tindakan tidak valid.');
  const state = tickState(current ?? createInitialState(now), now);
  const data = action.data ?? {};
  if (action.type.startsWith('demo.') && !demoEnabled) throw new Error('Kontrol demo tidak diaktifkan.');
  const options = { wallNow: now };
  switch (action.type) {
    case 'sync': return { state };
    case 'access': {
      const next = applyActivity(state, 'access', options);
      return { state: next, rewarded: next.air > state.air };
    }
    case 'care':
      if (!['air', 'fertilizer', 'fruit'].includes(data.resource)) throw new Error('Resource tidak dikenal.');
      return applyCare(state, data.resource, options);
    case 'sharing': {
      const result = submitSharingMaterial(state, {
        title: data.title, type: data.type, summary: data.summary, url: data.url, attachment: data.attachment,
      }, { ...options, submissionId: crypto.randomUUID() });
      return result;
    }
    case 'learning.complete':
    case 'learning.rate': {
      const module = modules.find((item) => item.id === data.moduleId && item.active !== false);
      if (!module) throw new Error('Modul aktif tidak ditemukan. Muat ulang katalog Learning.');
      if (action.type === 'learning.rate') return rateLearningModule(state, module.id, data.rating, { ...options, title: module.title, comment: data.comment });
      const quiz = normalizeLearningQuiz(module.quiz);
      if (data.read !== true || !Array.isArray(data.answers) || quiz.length !== data.answers.length
        || quiz.some((item, index) => item.correctAnswer !== data.answers[index])) {
        throw new Error('Pelajari materi dan jawab seluruh kuis dengan benar.');
      }
      return completeLearningModule(state, module.id, { ...options, title: module.title });
    }
    case 'notifications.read': {
      const ids = new Set(Array.isArray(data.ids) ? data.ids.filter((id) => typeof id === 'string').slice(0, 30) : []);
      state.notifications = (state.notifications ?? []).map((item) => ids.has(item.id) ? { ...item, read: true } : item);
      return { state };
    }
    case 'demo.advance': return { state: advanceDemoDays(state, 7, now) };
    case 'demo.boost': return { state: applyDemoBoost(state, now) };
    case 'demo.level-up': return { state: applyDemoLevelBoost(state, now) };
    case 'demo.level-down': return { state: applyDemoLevelDecrease(state, now) };
    case 'demo.condition':
      if (!['healthy', 'thirsty', 'dead'].includes(data.condition)) throw new Error('Kondisi tidak dikenal.');
      return { state: simulateDemoTreeCondition(state, data.condition) };
    case 'demo.resource':
      if (!Number.isFinite(data.amount) || data.amount <= 0 || data.amount > 1000) throw new Error('Jumlah demo tidak valid.');
      return { state: addDemoResource(state, data.resource, data.amount, options) };
    case 'demo.reset': return { state: { ...createInitialState(now), stateRev: state.stateRev } };
    default: throw new Error('Tindakan tidak dikenal.');
  }
}
