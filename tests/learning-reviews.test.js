import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { makeApp } from '../server/index.js';

let db;
let app;
const get = (path = '/api/learning/shared/reviews', user = 1) => app.request(path, {
  headers: user ? { cookie: `kg_session=reviews-${user}` } : {},
});

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  await db.exec(`INSERT INTO learning_modules (id, title, active) VALUES ('shared', 'Materi bersama', true), ('draft', 'Materi draft', false)`);
  for (let id = 1; id <= 18; id += 1) {
    const name = id === 1 ? 'Raka' : id === 2 ? 'Nadia' : `Pengguna ${id}`;
    await db.query('INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [id, name, `private-${id}@example.test`, 'unused', id === 3 ? 'admin' : 'user']);
    await db.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [`reviews-${id}`, id]);
    const moduleId = id === 7 ? 'draft' : 'shared';
    const state = {
      air: 10, privateData: 'PRIVATE-STATE-NOT-FOR-REVIEWS', stateRev: 5,
      completedLearningIds: id === 6 ? [] : [moduleId],
      learningRatings: id === 3 ? {} : { [moduleId]: id === 1 ? 5 : id === 2 ? 4 : id === 5 ? 7 : 3 },
      learningComments: id === 2 ? {} : { [moduleId]: id === 1 ? 'Materi membantu pekerjaan.' : 'Komentar pembelajaran.' },
    };
    await db.query('INSERT INTO tree_states (user_id, payload) VALUES ($1, $2::jsonb)', [id, JSON.stringify(state)]);
  }
  app = makeApp(() => async (strings, ...values) => {
    const text = strings.reduce((query, part, index) => query + (index ? `$${index}` : '') + part, '');
    return (await db.query(text, values)).rows;
  });
}, 30000);

afterAll(async () => { await db?.close(); });

it('requires login and never exposes draft reviews to a normal user', async () => {
  expect((await get(undefined, null)).status).toBe(401);
  expect((await get('/api/learning/draft/reviews')).status).toBe(404);
  expect((await get('/api/learning/missing/reviews')).status).toBe(404);
  const draft = await get('/api/learning/draft/reviews', 3);
  expect(draft.status).toBe(200);
  expect((await draft.json()).total).toBe(1);
});

it('returns names, stars and comments with stable server pagination', async () => {
  const first = await (await get()).json();
  const last = await (await get('/api/learning/shared/reviews?page=999')).json();
  expect(first.total).toBe(14);
  expect(first.average).toBeCloseTo(45 / 14);
  expect(first.items).toHaveLength(12);
  expect(last.page).toBe(2);
  expect(last.items).toHaveLength(2);
  const items = [...first.items, ...last.items];
  expect(new Set(items.map((item) => item.name)).size).toBe(14);
  expect(items.find((item) => item.name === 'Raka')).toEqual({ name: 'Raka', rating: 5, comment: 'Materi membantu pekerjaan.', isOwn: true });
});

it('keeps legacy ratings visible without fabricating a comment', async () => {
  const data = await (await get()).json();
  expect(data.items.find((item) => item.name === 'Nadia')).toEqual({ name: 'Nadia', rating: 4, comment: '', isOwn: false });
});

it('does not leak emails, account IDs, tokens or full states', async () => {
  const data = await (await get()).json();
  expect(data.items.every((item) => Object.keys(item).sort().join() === 'comment,isOwn,name,rating')).toBe(true);
  const text = JSON.stringify(data);
  expect(text).not.toContain('@example.test');
  expect(text).not.toContain('PRIVATE-STATE');
  expect(text).not.toContain('reviews-');
});

it('normalizes invalid pages and does not modify state or award Air for reading', async () => {
  const before = (await db.query('SELECT payload FROM tree_states WHERE user_id = 1')).rows[0].payload;
  for (const page of ['-1', 'invalid', '1.5', '999999999999999999999']) {
    expect((await (await get(`/api/learning/shared/reviews?page=${page}`)).json()).page).toBe(1);
  }
  const after = (await db.query('SELECT payload FROM tree_states WHERE user_id = 1')).rows[0].payload;
  expect(after).toEqual(before);
});
