import { describe, expect, it } from 'vitest';
import { memoryApp } from './helpers/memory-db.js';

describe('last admin guard', () => {
  it('continues rejecting user access to every admin mutation and read route', async () => {
    const f = memoryApp();
    for (const [method, route] of [
      ['GET', 'accounts'], ['GET', 'activity'], ['POST', 'condition'], ['PUT', 'settings'],
      ['POST', 'learning'], ['PATCH', 'learning'], ['DELETE', 'learning'],
      ['PATCH', 'account'], ['DELETE', 'account'], ['POST', 'account/reset'], ['DELETE', 'content'],
    ]) {
      const r = await f.request(`/api/admin/${route}`, { method, ...(method === 'GET' ? {} : { body: {} }) });
      expect(r.status).toBe(403);
    }
  });
  it('rejects self-demotion when only one admin remains', async () => {
    const f = memoryApp();
    const r = await f.request('/api/admin/account', { user: 2, method: 'PATCH', body: { userId: 2, role: 'user' } });
    expect(r.status).toBe(409);
    expect(f.users.find((user) => user.id === 2).role).toBe('admin');
    const sql = f.queries.find(({ q }) => q.startsWith('WITH locked_admins'));
    expect(sql.q).toContain('ORDER BY id FOR UPDATE');
    expect(sql.q).toContain('guard.total > 1');
  });

  it('allows demotion if a different admin remains and then blocks the last one', async () => {
    const f = memoryApp();
    await f.request('/api/admin/account', { user: 2, method: 'PATCH', body: { userId: 1, role: 'admin' } });
    expect((await f.request('/api/admin/account', { user: 2, method: 'PATCH', body: { userId: 2, role: 'user' } })).status).toBe(200);
    expect((await f.request('/api/admin/account', { user: 1, method: 'PATCH', body: { userId: 1, role: 'user' } })).status).toBe(409);
  });

  it('keeps self-delete blocked and still permits deleting normal users', async () => {
    const f = memoryApp();
    expect((await f.request('/api/admin/account', { user: 2, method: 'DELETE', body: { userId: 2 } })).status).toBe(400);
    expect((await f.request('/api/admin/account', { user: 2, method: 'DELETE', body: { userId: 1 } })).status).toBe(200);
    expect(f.users.map((user) => user.id)).toEqual([2]);
  });

  it('reset preserves CAS revision and leaves other users untouched', async () => {
    const f = memoryApp();
    f.states.get(1).stateRev = 23;
    const r = await f.request('/api/admin/account/reset', { user: 2, method: 'POST', body: { userId: 1 } });
    expect(r.status).toBe(200);
    expect(f.states.get(1).stateRev).toBe(24);
    expect(f.states.get(1).notifications[0].type).toBe('reset');
  });
});
