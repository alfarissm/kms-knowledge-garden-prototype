import { describe, expect, it } from 'vitest';
import { makeApp } from '../server/index.js';
import { addSharingReport, createInitialState, submitSharingMaterial } from '../src/gamification.js';

function setup(ownerId = 1) {
  const pending = submitSharingMaterial(createInitialState(1000), {
    title: 'Konten Test', type: 'article', url: 'https://example.com', summary: 'Materi uji laporan.',
  }, { wallNow: 2000 });
  let saved;
  const sql = async (strings, ...values) => {
    const query = strings.join('?').replace(/\s+/g, ' ').trim();
    if (query.startsWith('SELECT u.*, s.token')) return [{ id: 2, email: 'reporter@example.com', role: 'user' }];
    if (query.startsWith('SELECT ts.user_id, ts.payload')) return [{ user_id: ownerId, payload: pending.state }];
    if (query.startsWith('INSERT INTO tree_states')) { saved = JSON.parse(values[1]); return []; }
    throw new Error(`Unexpected SQL: ${query}`);
  };
  const app = makeApp(() => sql);
  const report = (extra = {}) => app.request('/api/report', {
    method: 'POST', headers: { cookie: 'kg_session=test', 'content-type': 'application/json' },
    body: JSON.stringify({ submissionId: pending.submission.id, ...extra }),
  });
  return { report, pending, saved: () => saved };
}

describe('report reasons', () => {
  it('stores each supported reason and note without changing content status', async () => {
    for (const reason of ['rejected', 'duplicate', 'stale', 'other']) {
      const fixture = setup();
      const response = await fixture.report({ reason, note: '  Catatan pelapor  ' });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toEqual({ added: true, reports: 1 });
      expect(result).not.toHaveProperty('ownerState');
      const submission = fixture.saved().sharingSubmissions[0];
      expect(submission.status).toBe('pending');
      expect(submission.reports[0]).toMatchObject({ reason, note: 'Catatan pelapor', by: 'reporter@example.com' });
    }
  });

  it('rejects unsupported reasons, oversized notes and unexplained other reports', async () => {
    const fixture = setup();
    expect((await fixture.report({ reason: 'invalid' })).status).toBe(400);
    expect((await fixture.report({ reason: 'other', note: ' ' })).status).toBe(400);
    expect((await fixture.report({ reason: 'stale', note: 'x'.repeat(501) })).status).toBe(400);
    expect(fixture.saved()).toBeUndefined();
  });

  it('blocks reporting your own content on the server', async () => {
    const fixture = setup(2);
    expect((await fixture.report({ reason: 'duplicate' })).status).toBe(403);
    expect(fixture.saved()).toBeUndefined();
  });

  it('still permits only one report per account regardless of reason', () => {
    const { pending } = setup();
    const first = addSharingReport(pending.state, pending.submission.id, 'reporter@example.com', { reason: 'stale' });
    const second = addSharingReport(first.state, pending.submission.id, 'reporter@example.com', { reason: 'duplicate' });
    expect(second.added).toBe(false);
    expect(second.reports).toBe(1);
    expect(second.state.sharingSubmissions[0].reports[0].reason).toBe('stale');
  });
});
