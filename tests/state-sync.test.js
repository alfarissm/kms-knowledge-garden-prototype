import { expect, it, vi } from 'vitest';
import { createActionQueue } from '../src/state-sync.js';

it('serializes commands and applies the server response in order', async () => {
  const events = [];
  const send = vi.fn(async (action) => { events.push(`send:${action.type}`); await Promise.resolve(); return { type: action.type }; });
  const q = createActionQueue({ send, apply: (result) => events.push(`apply:${result.type}`) });
  await Promise.all([q.enqueue({ type: 'care' }), q.enqueue({ type: 'sharing' })]);
  expect(events).toEqual(['send:care', 'apply:care', 'send:sharing', 'apply:sharing']);
});

it('retries a network error using the same id, not a second action', async () => {
  const send = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({ treeState: { air: 3 } });
  const apply = vi.fn();
  await createActionQueue({ send, apply }).enqueue({ type: 'access' });
  expect(send.mock.calls[0][1]).toBe(send.mock.calls[1][1]);
  expect(apply).toHaveBeenCalledTimes(1);
});

it('does not retry validation errors or stop later actions', async () => {
  const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Invalid'), { status: 400 })).mockResolvedValue({ ok: true });
  const onError = vi.fn();
  const q = createActionQueue({ send, apply: vi.fn(), onError });
  expect(await q.enqueue({ type: 'bad' })).toBeNull();
  expect(await q.enqueue({ type: 'sync' })).toEqual({ ok: true });
  expect(send).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenCalledTimes(1);
});

it('drops queued commands and ignores in-flight responses after logout', async () => {
  let finish;
  const send = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
  const apply = vi.fn();
  const q = createActionQueue({ send, apply });
  const first = q.enqueue({ type: 'care' });
  const next = q.enqueue({ type: 'care' });
  await Promise.resolve();
  q.cancel();
  finish({ treeState: {} });
  await Promise.all([first, next]);
  expect(send).toHaveBeenCalledTimes(1);
  expect(apply).not.toHaveBeenCalled();
});
