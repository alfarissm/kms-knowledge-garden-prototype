import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const initializeSource = source.slice(source.indexOf('async function initialize()'), source.indexOf("\ndocument.querySelector('#sessionRetry').addEventListener"));

function setup(apiMe) {
  const loading = { hidden: false, setAttribute: vi.fn() };
  const message = { textContent: '' };
  const retry = { hidden: true };
  const elements = { authScreen: { hidden: true }, appShell: { hidden: true } };
  const nodes = { '#sessionLoading': loading, '#sessionLoadingMessage': message, '#sessionRetry': retry };
  const timers = { setTimeout: vi.fn(() => 1), clearTimeout: vi.fn() };
  const enterApp = vi.fn(() => { elements.appShell.hidden = false; });
  const initialize = new Function('apiMe', 'enterApp', 'elements', 'document', 'window', 'AbortController', `${initializeSource}; return initialize;`)(
    apiMe, enterApp, elements, { querySelector: (selector) => nodes[selector] }, timers, AbortController,
  );
  return { initialize, loading, message, retry, elements, enterApp, timers };
}

describe('initial session restoration', () => {
  it('starts with login hidden in the HTML, before JavaScript loads', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toMatch(/<section[^>]+id="authScreen"[^>]+hidden>/);
    expect(html).toContain('<style>[hidden] { display: none !important; }</style>');
  });

  it('shows only loading while pending, then opens the app without flashing login', async () => {
    let resolve;
    const apiMe = vi.fn(() => new Promise((done) => { resolve = done; }));
    const ui = setup(apiMe);
    const pending = ui.initialize();
    expect(ui.loading.hidden).toBe(false);
    expect(ui.elements.authScreen.hidden).toBe(true);
    expect(ui.elements.appShell.hidden).toBe(true);
    resolve({ account: { name: 'Test' }, treeState: {}, settings: {} });
    await pending;
    expect(ui.enterApp).toHaveBeenCalledOnce();
    expect(ui.loading.hidden).toBe(true);
    expect(ui.elements.authScreen.hidden).toBe(true);
    expect(ui.elements.appShell.hidden).toBe(false);
  });

  it('shows login only after a confirmed 401 response', async () => {
    const ui = setup(vi.fn().mockRejectedValue({ status: 401 }));
    await ui.initialize();
    expect(ui.loading.hidden).toBe(true);
    expect(ui.elements.authScreen.hidden).toBe(false);
    expect(ui.enterApp).not.toHaveBeenCalled();
  });

  it('keeps login hidden on a server failure and supports retry', async () => {
    const apiMe = vi.fn().mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce({ account: {} });
    const ui = setup(apiMe);
    await ui.initialize();
    expect(ui.elements.authScreen.hidden).toBe(true);
    expect(ui.retry.hidden).toBe(false);
    expect(ui.message.textContent).toContain('sesi masukmu tidak dihapus');
    await ui.initialize();
    expect(ui.loading.hidden).toBe(true);
    expect(ui.enterApp).toHaveBeenCalledOnce();
  });

  it('aborts a stalled request and offers retry instead of an endless loader', async () => {
    const ui = setup(({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    }));
    const pending = ui.initialize();
    const [abort, duration] = ui.timers.setTimeout.mock.calls[0];
    expect(duration).toBe(15000);
    abort();
    await pending;
    expect(ui.retry.hidden).toBe(false);
    expect(ui.elements.authScreen.hidden).toBe(true);
    expect(ui.timers.clearTimeout).toHaveBeenCalledWith(1);
  });
});
