import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { makeApp } from '../server/index.js';

// A real, isolated PostgreSQL engine (WASM), not the project's Neon database.
// This catches SQL syntax/RETURNING/CAS/row-lock regressions that a mock cannot.
let db;
let app;
const request = (path, method = 'GET', body, user = 1) => app.request(path, {
  method, headers: { cookie: `kg_session=qa-${user}`, 'content-type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const action = (type, data = {}, user = 1, id = crypto.randomUUID()) => request('/api/actions', 'POST', { id, action: { type, data } }, user);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO users (id, name, email, password_hash, role) VALUES
      (1, 'User', 'user@qa.test', 'not-used', 'user'),
      (2, 'Other', 'other@qa.test', 'not-used', 'user'),
      (3, 'Admin', 'admin@qa.test', 'not-used', 'admin');
    INSERT INTO sessions (token, user_id, expires_at) VALUES
      ('qa-1', 1, now() + interval '1 day'),
      ('qa-2', 2, now() + interval '1 day'),
      ('qa-3', 3, now() + interval '1 day');
  `);
  const sql = async (strings, ...values) => {
    const text = strings.reduce((query, part, index) => query + (index ? `$${index}` : '') + part, '');
    return (await db.query(text, values)).rows;
  };
  app = makeApp(() => sql);
}, 30000);

afterAll(async () => { await db?.close(); });

it('loads actual fallback quiz then completes and rates it only once', async () => {
  const modules = (await (await request('/api/learning')).json()).modules;
  expect(modules.every((module) => module.quiz.length > 0)).toBe(true);
  const module = modules[0];
  const data = { moduleId: module.id, read: true, answers: module.quiz.map((q) => q.correctAnswer) };
  const first = await (await action('learning.complete', data)).json();
  const repeated = await (await action('learning.complete', data)).json();
  expect(repeated.treeState.fertilizerUnits).toBe(first.treeState.fertilizerUnits);
  expect(repeated.awarded).toBe(false);
  const rated = await (await action('learning.rate', { moduleId: module.id, rating: 5, comment: 'Materi sangat bermanfaat.' })).json();
  expect(rated.treeState.learningComments[module.id]).toBe('Materi sangat bermanfaat.');
  const again = await (await action('learning.rate', { moduleId: module.id, rating: 4, comment: 'Ulang lagi.' })).json();
  expect(again.treeState.air).toBe(rated.treeState.air);
  expect(again.treeState.learningComments[module.id]).toBe('Materi sangat bermanfaat.');
});

it('creates multi-question modules through admin SQL and validates all answers', async () => {
  const quiz = [
    { prompt: 'Q1', answers: ['A', 'B'], correctAnswer: 1 },
    { prompt: 'Q2', answers: ['C', 'D'], correctAnswer: 0 },
  ];
  const created = await request('/api/admin/learning', 'POST', { id: 'managed', title: 'Managed lesson', quiz, active: true }, 3);
  expect(created.status).toBe(200);
  expect((await created.json()).module.quiz).toEqual(quiz);
  expect((await action('learning.complete', { moduleId: 'managed', read: true, answers: [1, 1] })).status).toBe(400);
  expect((await action('learning.complete', { moduleId: 'managed', read: true, answers: [1, 0] })).status).toBe(200);
});

it('keeps both simultaneous state changes and deduplicates their replay', async () => {
  const material = { title: 'First', type: 'article', summary: 'Shared lesson' };
  const id = crypto.randomUUID();
  const responses = await Promise.all([
    action('sharing', material, 2, id),
    action('sharing', { ...material, title: 'Second' }, 2),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const replay = await (await action('sharing', material, 2, id)).json();
  expect(replay.replayed).toBe(true);
  expect(replay.treeState.sharingSubmissions).toHaveLength(2);
});

it('preserves decisions/report data when care runs after review', async () => {
  const shared = await (await action('sharing', { title: 'Reviewed', type: 'video', summary: 'Summary', url: 'https://example.com/lesson', attachment: { name: 'lesson.mp4', type: 'video/mp4', size: 100 } }, 2)).json();
  const submissionId = shared.submission.id;
  const reviewed = await request('/api/admin/condition', 'POST', { submissionId, condition: 'validated' }, 3);
  expect(reviewed.status).toBe(200);
  expect((await request('/api/report', 'POST', { submissionId, reason: 'other', note: 'Report QA' })).status).toBe(200);
  expect((await action('care', { resource: 'air' }, 2)).status).toBe(200);
  const state = (await (await request('/api/state', 'GET', undefined, 2)).json()).treeState;
  const submission = state.sharingSubmissions.find((item) => item.id === submissionId);
  expect(submission.status).toBe('validated');
  expect(submission.reports).toHaveLength(1);
  const library = await (await request('/api/library')).json();
  expect(library.items[0].submission.attachment.name).toBe('lesson.mp4');
});

it('rejects forged snapshots and disabled demo controls in actual SQL flow', async () => {
  expect((await request('/api/state', 'PUT', { treeState: { clockMs: Date.now(), air: 999999 } })).status).toBe(400);
  expect((await action('demo.boost')).status).toBe(400);
});

it('protects the last admin with SQL row locks, including concurrent demotions', async () => {
  expect((await request('/api/admin/account', 'PATCH', { userId: 3, role: 'user' }, 3)).status).toBe(409);
  expect((await request('/api/admin/account', 'PATCH', { userId: 2, role: 'admin' }, 3)).status).toBe(200);
  const responses = await Promise.all([
    request('/api/admin/account', 'PATCH', { userId: 2, role: 'user' }, 2),
    request('/api/admin/account', 'PATCH', { userId: 3, role: 'user' }, 3),
  ]);
  expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
  const admins = await db.query("SELECT id FROM users WHERE role = 'admin'");
  expect(admins.rows).toHaveLength(1);
});

it('resets and deletes an account using the guarded SQL, without changing others', async () => {
  const admin = (await db.query("SELECT id FROM users WHERE role = 'admin'")).rows[0].id;
  const before = (await (await request('/api/state')).json()).treeState.stateRev;
  expect((await request('/api/admin/account/reset', 'POST', { userId: 1 }, admin)).status).toBe(200);
  const fresh = (await (await request('/api/state')).json()).treeState;
  expect(fresh.stateRev).toBe(before + 1);
  expect(fresh.level).toBe(0);
  expect((await request('/api/admin/account', 'DELETE', { userId: 1 }, admin)).status).toBe(200);
  expect((await db.query('SELECT id FROM users WHERE id = 1')).rows).toHaveLength(0);
  expect((await db.query("SELECT id FROM users WHERE role = 'admin'")).rows).toHaveLength(1);
});
