import { describe, expect, it } from 'vitest';
import { makeApp } from '../server/index.js';

// In-memory SQL adapter: exercise the actual routes and password hashing
// without creating accounts, sessions or tree states in the real database.
function setup() {
  const users = new Map();
  const sessions = [];
  const sql = async (strings, ...values) => {
    const query = strings.join('?').replace(/\s+/g, ' ').trim();
    if (query.startsWith('SELECT * FROM users')) return users.has(values[0]) ? [users.get(values[0])] : [];
    if (query.startsWith('INSERT INTO users')) {
      const [name, email, password_hash, role] = values;
      if (users.has(email)) return [];
      const user = { id: users.size + 1, name, email, password_hash, role };
      users.set(email, user);
      return [user];
    }
    if (query.startsWith('INSERT INTO sessions')) { sessions.push(values); return []; }
    if (query.startsWith('SELECT payload FROM tree_states') || query.startsWith('SELECT payload FROM app_settings')) return [];
    throw new Error(`Unexpected test SQL: ${query}`);
  };
  const app = makeApp(() => sql);
  const post = (route, body) => app.request(`/api/auth/${route}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { users, sessions, post };
}
const details = { name: 'Kebun Test', email: 'test@example.com', password: 'secret123', confirmPassword: 'secret123' };

describe('separate registration and login', () => {
  it('registers a normal user, hashes the password and starts an HttpOnly session', async () => {
    const { post, users, sessions } = setup();
    const response = await post('register', details);
    expect(response.status).toBe(200);
    expect((await response.json()).account).toMatchObject({ name: details.name, role: 'user', isNew: true });
    expect(users.get(details.email).password_hash).toMatch(/^pbkdf2\$/);
    expect(sessions).toHaveLength(1);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('does not register unknown emails from login or the legacy entry route', async () => {
    const { post, users, sessions } = setup();
    for (const route of ['login', 'entry']) expect((await post(route, details)).status).toBe(401);
    expect(users.size).toBe(0);
    expect(sessions).toHaveLength(0);
  });

  it('logs into an existing account without a name and preserves its role', async () => {
    const { post, users } = setup();
    await post('register', details);
    users.get(details.email).role = 'admin';
    const response = await post('login', { email: details.email, password: details.password });
    expect(response.status).toBe(200);
    expect((await response.json()).account).toMatchObject({ role: 'admin', isNew: false });
  });

  it('rejects duplicate registration instead of logging into the account', async () => {
    const { post, sessions } = setup();
    await post('register', details);
    expect((await post('register', details)).status).toBe(409);
    expect(sessions).toHaveLength(1);
  });

  it('validates confirmation server-side and keeps mismatched accounts uncreated', async () => {
    const { post, users } = setup();
    expect((await post('register', { ...details, confirmPassword: 'different' })).status).toBe(400);
    expect((await post('register', { ...details, confirmPassword: undefined })).status).toBe(400);
    expect(users.size).toBe(0);
  });

  it('never grants admin permissions from a registration email or request role', async () => {
    const { post } = setup();
    const response = await post('register', { ...details, email: 'admin@example.com', role: 'admin' });
    expect((await response.json()).account.role).toBe('user');
  });

  it('rejects an incorrect password without creating another session', async () => {
    const { post, sessions } = setup();
    await post('register', details);
    expect((await post('login', { email: details.email, password: 'wrong123' })).status).toBe(401);
    expect(sessions).toHaveLength(1);
  });

  it('normalizes email and handles racing registrations without duplicate accounts', async () => {
    const { post, users, sessions } = setup();
    const responses = await Promise.all([
      post('register', details),
      post('register', { ...details, email: ' TEST@EXAMPLE.COM ' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(users.size).toBe(1);
    expect(sessions).toHaveLength(1);
  });
});
