import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { makeApp } from '../server/index.js';
import { createInitialState } from '../src/gamification.js';

let db;
let app;
const readLibrary = (user = 3) => app.request('/api/library', {
  headers: user ? { cookie: `kg_session=privacy-${user}` } : {},
});

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  for (const [id, name, role] of [[1, 'Owner', 'user'], [2, 'Reporter', 'user'], [3, 'Reader', 'user'], [4, 'Admin', 'admin']]) {
    await db.query('INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [id, name, `${name.toLowerCase()}@private.example.test`, 'NOT-A-PUBLIC-HASH', role]);
    await db.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [`privacy-${id}`, id]);
  }
  const state = {
    ...createInitialState(),
    air: 123,
    sharingSubmissions: [{
      id: 'public-content', status: 'validated', title: 'Shared lesson', summary: 'Public summary',
      type: 'video', url: 'https://example.com/lesson', submittedAt: 1, reviewedAt: 2,
      attachment: { name: 'lesson.mp4', type: 'video/mp4', size: 1024 },
      reports: [
        { by: 'reporter@private.example.test', reason: 'other', note: 'CONFIDENTIAL-REPORT', at: 3 },
        { by: 'admin@private.example.test', reason: 'stale', note: 'PRIVATE-ADMIN-NOTE', at: 4 },
      ],
      privateField: 'INTERNAL-SUBMISSION-DATA',
    }, { id: 'pending-content', status: 'pending', title: 'Not public', reports: [] }],
  };
  await db.query('INSERT INTO tree_states (user_id, payload) VALUES ($1, $2::jsonb)', [1, JSON.stringify(state)]);
  app = makeApp(() => async (strings, ...values) => {
    const query = strings.reduce((text, part, index) => text + (index ? `$${index}` : '') + part, '');
    return (await db.query(query, values)).rows;
  });
}, 30000);

afterAll(async () => { await db?.close(); });

it('requires a logged-in reader', async () => {
  expect((await readLibrary(null)).status).toBe(401);
});

it('keeps public material details but excludes pending submissions', async () => {
  const response = await readLibrary();
  expect(response.status).toBe(200);
  const { items } = await response.json();
  expect(items).toHaveLength(1);
  expect(items[0]).toEqual({
    ownerName: 'Owner', isOwn: false, hasReported: false, reportCount: 2,
    submission: {
      id: 'public-content', title: 'Shared lesson', summary: 'Public summary', type: 'video',
      url: 'https://example.com/lesson', submittedAt: 1, reviewedAt: 2,
      attachment: { name: 'lesson.mp4', type: 'video/mp4', size: 1024 },
    },
  });
});

it('derives ownership from the session, without publishing owner identifiers', async () => {
  const { items } = await (await readLibrary(1)).json();
  expect(items[0].isOwn).toBe(true);
  expect(items[0].hasReported).toBe(false);
  expect(items[0]).not.toHaveProperty('ownerEmail');
  expect(items[0]).not.toHaveProperty('ownerId');
});

it('preserves the already-reported state without exposing other reporters', async () => {
  const { items } = await (await readLibrary(2)).json();
  expect(items[0].hasReported).toBe(true);
  expect(items[0].isOwn).toBe(false);
  expect(items[0].reportCount).toBe(2);
  expect(items[0].submission).not.toHaveProperty('reports');
});

it('never discloses email, report text, internal state or hashes through the library route', async () => {
  for (const user of [1, 2, 3, 4]) {
    const text = await (await readLibrary(user)).text();
    for (const privateValue of ['@private.example.test', 'CONFIDENTIAL-REPORT', 'PRIVATE-ADMIN-NOTE', 'INTERNAL-SUBMISSION-DATA', 'NOT-A-PUBLIC-HASH', 'careAir', 'owner_id']) {
      expect(text).not.toContain(privateValue);
    }
    expect(JSON.parse(text).items[0].submission).not.toHaveProperty('reports');
  }
});

it('retains full reports for the authorized admin workflow', async () => {
  const response = await app.request('/api/admin/accounts', { headers: { cookie: 'kg_session=privacy-4' } });
  expect(response.status).toBe(200);
  const owner = (await response.json()).accounts.find((account) => account.id === 1);
  expect(owner.treeState.sharingSubmissions[0].reports[0]).toMatchObject({
    by: 'reporter@private.example.test', note: 'CONFIDENTIAL-REPORT', reason: 'other',
  });
});

it('does not mutate stored reports when returning the public projection', async () => {
  const before = (await db.query('SELECT payload FROM tree_states WHERE user_id = 1')).rows[0].payload;
  await readLibrary(3);
  const after = (await db.query('SELECT payload FROM tree_states WHERE user_id = 1')).rows[0].payload;
  expect(after).toEqual(before);
});
