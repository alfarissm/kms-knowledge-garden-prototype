import { describe, expect, it } from 'vitest';
import { normalizeLearningQuiz, safeResourceUrl } from '../src/learning-model.js';
import { memoryApp } from './helpers/memory-db.js';

const quiz = [
  { prompt: 'Pertanyaan satu', answers: ['Salah', 'Benar'], correctAnswer: 1 },
  { prompt: 'Pertanyaan dua', answers: ['Benar', 'Salah'], correctAnswer: 0 },
];
const module = { id: 'lesson', title: 'Materi bersama', active: true, sections: [], quiz };

describe('Learning API to reward flow', () => {
  it('preserves static quiz questions as an array', async () => {
    const f = memoryApp();
    const modules = (await (await f.request('/api/learning')).json()).modules;
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.every((m) => Array.isArray(m.quiz) && m.quiz.length > 0 && m.quiz.every((q) => q.answers.length >= 2))).toBe(true);
  });

  it('requires correct answers for every question and a read confirmation', async () => {
    const f = memoryApp({ modules: [module] });
    for (const data of [
      { read: true, answers: [1] }, { read: true, answers: [1, 1] },
      { read: false, answers: [1, 0] }, { read: true, answers: ['1', 0] },
    ]) expect((await f.action('learning.complete', { moduleId: module.id, ...data })).status).toBe(400);
    expect(f.states.get(1).completedLearningIds).toEqual([]);
    const before = f.states.get(1).fertilizerUnits;
    const response = await f.action('learning.complete', { moduleId: module.id, read: true, answers: [1, 0] });
    expect(response.status).toBe(200);
    expect(f.states.get(1).fertilizerUnits).toBe(before + 2);
    await f.action('learning.complete', { moduleId: module.id, read: true, answers: [1, 0] });
    expect(f.states.get(1).fertilizerUnits).toBe(before + 2);
  });

  it('allows read-only lessons with no quiz, but still requires confirmation', async () => {
    const f = memoryApp({ modules: [{ ...module, quiz: [] }] });
    expect((await f.action('learning.complete', { moduleId: module.id, read: true, answers: [] })).status).toBe(200);
  });

  it('rejects unknown/draft lessons and rating before completion', async () => {
    const f = memoryApp({ modules: [module, { ...module, id: 'draft', active: false }] });
    expect((await f.action('learning.complete', { moduleId: 'draft', read: true, answers: [1, 0] })).status).toBe(400);
    expect((await f.action('learning.complete', { moduleId: 'missing', read: true, answers: [] })).status).toBe(400);
    const rate = await (await f.action('learning.rate', { moduleId: module.id, rating: 5 })).json();
    expect(rate.awarded).toBe(false);
  });

  it('awards rating only once and validates rating range', async () => {
    const f = memoryApp({ modules: [module] });
    await f.action('learning.complete', { moduleId: module.id, read: true, answers: [1, 0] });
    expect((await f.action('learning.rate', { moduleId: module.id, rating: 6 })).status).toBe(400);
    const before = f.states.get(1).air;
    await f.action('learning.rate', { moduleId: module.id, rating: 5 });
    await f.action('learning.rate', { moduleId: module.id, rating: 4 });
    expect(f.states.get(1).air).toBe(before + 1);
    expect(f.states.get(1).learningRatings[module.id]).toBe(5);
  });

  it('accepts legacy object quizzes without shifting the correct answer', () => {
    expect(normalizeLearningQuiz({ prompt: 'Q', answers: ['', 'Salah', 'Benar'], correctAnswer: 2 }))
      .toEqual([{ prompt: 'Q', answers: ['Salah', 'Benar'], correctAnswer: 1 }]);
    expect(normalizeLearningQuiz({ prompt: 'Q', answers: ['A', 'B'], correctAnswer: 9 })).toEqual([]);
    expect(safeResourceUrl('javascript:alert(1)')).toBe('');
    expect(safeResourceUrl('https://example.com')).toBe('https://example.com/');
  });
});
