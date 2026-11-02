import { describe, expect, it } from 'vitest';
import { memoryApp } from './helpers/memory-db.js';
import { createInitialState, setSharingCondition, submitSharingMaterial } from '../src/gamification.js';

describe('server-owned state', () => {
  it('rejects legacy snapshot writes, even with matching revision', async () => {
    const f = memoryApp();
    const original = structuredClone(f.states.get(1));
    const response = await f.request('/api/state', { method: 'PUT', body: { treeState: { ...original, air: 999999, sharingSubmissions: [{ id: 'forged', status: 'validated' }] } } });
    expect(response.status).toBe(400);
    expect(f.states.get(1)).toEqual(original);
  });

  it('requires a session and a well-formed action ID', async () => {
    const f = memoryApp();
    expect((await f.action('sync', {}, { user: null })).status).toBe(401);
    expect((await f.action('sync', {}, { id: '<invalid>' })).status).toBe(400);
    expect((await f.action('admin.condition')).status).toBe(400);
    expect((await f.action(123)).status).toBe(400);
  });

  it('adopts legacy state without a revision without resetting existing progress', async () => {
    const f = memoryApp();
    const original = f.states.get(1);
    delete original.stateRev;
    original.air = 17;
    const response = await f.action('sync');
    expect(response.status).toBe(200);
    expect(f.states.get(1).stateRev).toBe(1);
    expect(f.states.get(1).air).toBe(17);
  });

  it('ignores fabricated rewards, timestamps and ACC fields in Sharing', async () => {
    const f = memoryApp();
    const before = f.states.get(1).air;
    const r = await f.action('sharing', { title: 'Materi valid', type: 'article', summary: 'Isi pembelajaran', url: 'https://example.com', air: 999, status: 'validated', submittedAt: 0 });
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data.submission.status).toBe('pending');
    expect(data.submission.submittedAt).toBeGreaterThan(0);
    expect(data.treeState.air).toBe(before);
    expect(data.submission.id).toMatch(/^[a-f0-9-]{36}$/);
  });

  it('retains a Sharing link and returns attachment metadata from Library', async () => {
    const f = memoryApp();
    await f.action('sharing', { title: 'Video pembelajaran', type: 'video', summary: 'Ringkasan', url: 'https://example.com/watch', attachment: { name: 'lesson.mp4', type: 'video/mp4', size: 100 } });
    const state = f.states.get(1);
    const id = state.sharingSubmissions[0].id;
    f.states.set(1, setSharingCondition(state, id, 'validated').state);
    const response = await f.request('/api/library');
    const item = (await response.json()).items[0];
    expect(item.submission.url).toBe('https://example.com/watch');
    expect(item.submission.attachment.name).toBe('lesson.mp4');
  });

  it('does not allow script URLs or invalid resource types', async () => {
    const f = memoryApp();
    expect((await f.action('sharing', { title: 'Materi', type: 'article', summary: 'Isi', url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await f.action('care', { resource: 'infinite' })).status).toBe(400);
  });

  it('marks only acknowledged notification IDs, leaving newer notifications unread', async () => {
    const f = memoryApp();
    f.states.get(1).notifications = [{ id: 'seen', title: 'Sudah terlihat', read: false }, { id: 'newer', title: 'Baru masuk', read: false }];
    await f.action('notifications.read', { ids: ['seen'] });
    expect(f.states.get(1).notifications.map(({ id, read }) => ({ id, read }))).toEqual([{ id: 'seen', read: true }, { id: 'newer', read: false }]);
  });

  it('applies a retried action only once', async () => {
    const f = memoryApp();
    const id = crypto.randomUUID();
    const data = { title: 'Materi', type: 'article', summary: 'Isi' };
    await f.action('sharing', data, { id });
    const revision = f.states.get(1).stateRev;
    const second = await (await f.action('sharing', data, { id })).json();
    expect(second.replayed).toBe(true);
    expect(second.submission.id).toBe(f.states.get(1).sharingSubmissions[0].id);
    expect(f.states.get(1).stateRev).toBe(revision);
    expect(f.states.get(1).sharingSubmissions).toHaveLength(1);
  });

  it('retries concurrent writes atomically without dropping either action', async () => {
    const f = memoryApp();
    const responses = await Promise.all([
      f.action('sharing', { title: 'Materi satu', type: 'article', summary: 'Isi satu' }),
      f.action('sharing', { title: 'Materi dua', type: 'article', summary: 'Isi dua' }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(f.states.get(1).sharingSubmissions).toHaveLength(2);
    expect(f.states.get(1).stateRev).toBe(3);
    const writes = f.queries.filter(({ q }) => q.startsWith('INSERT INTO tree_states'));
    expect(writes.every(({ q }) => q.includes("WHERE COALESCE((tree_states.payload->>'stateRev')::bigint, 0) = ?") && q.includes('RETURNING payload'))).toBe(true);
  });

  it('does not double-award simultaneous replays of the same request', async () => {
    const f = memoryApp();
    const id = crypto.randomUUID();
    await Promise.all([f.action('access', {}, { id }), f.action('access', {}, { id })]);
    expect(f.states.get(1).air).toBe(createInitialState().air + 1);
    expect(f.states.get(1).recentActions.filter((entry) => entry.id === id)).toHaveLength(1);
  });

  it('keeps admin status and reports after a care command', async () => {
    const shared = submitSharingMaterial(createInitialState(), { title: 'Materi', type: 'article', summary: 'Isi' });
    const accepted = setSharingCondition(shared.state, shared.submission.id, 'validated').state;
    accepted.stateRev = 5;
    const f = memoryApp({ state: accepted });
    await f.action('care', { resource: 'air', status: 'rejected', treeState: {} });
    expect(f.states.get(1).sharingSubmissions[0].status).toBe('validated');
    expect(f.states.get(1).fruitLedger).toHaveLength(1);
  });

  it('disables every demo command by default but permits explicitly enabled testing', async () => {
    const f = memoryApp();
    for (const type of ['demo.boost', 'demo.resource', 'demo.level-up', 'demo.level-down', 'demo.advance', 'demo.reset', 'demo.condition']) {
      expect((await f.action(type, { resource: 'air', amount: 50, condition: 'healthy' })).status).toBe(400);
    }
    expect((await f.action('demo.resource', { resource: 'air', amount: 5 }, { demo: true })).status).toBe(200);
    expect(f.states.get(1).air).toBe(createInitialState().air + 5);
  });
});
