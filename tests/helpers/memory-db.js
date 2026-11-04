import { makeApp } from '../../server/index.js';
import { createInitialState } from '../../src/gamification.js';

const copy = (value) => structuredClone(value);
// SQL adapter implements CAS semantics, separate cloned snapshots, and guards.
// Actual SQL syntax is additionally checked against PostgreSQL during QA.
export function memoryApp({ modules = [], state, users: seedUsers } = {}) {
  const users = seedUsers ?? [
    { id: 1, name: 'User', email: 'user@example.test', role: 'user' },
    { id: 2, name: 'Admin', email: 'admin@example.test', role: 'admin' },
  ];
  const states = new Map([[1, copy(state ?? { ...createInitialState(), stateRev: 1 })]]);
  const queries = [];
  const sql = async (strings, ...values) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim();
    queries.push({ q, values });
    if (q.startsWith('SELECT u.*, s.token')) return users.filter((user) => String(user.id) === values[0]).map(copy);
    if (q.startsWith('SELECT payload FROM tree_states')) return states.has(values[0]) ? [{ payload: copy(states.get(values[0])) }] : [];
    if (q.startsWith('SELECT payload FROM app_settings')) return [];
    if (q.startsWith('INSERT INTO tree_states')) {
      const [id, text, expected] = values;
      if (states.has(id) && Number(states.get(id).stateRev ?? 0) !== expected) return [];
      const payload = JSON.parse(text);
      states.set(id, copy(payload));
      return [{ payload }];
    }
    if (q.startsWith('SELECT * FROM learning_modules')) return copy(values.length ? modules.filter((module) => module.id === values[0]) : modules);
    if (q.startsWith('SELECT id, role FROM users') || q.startsWith('SELECT id, email FROM users')) return users.filter((user) => user.id === values[0]).map(copy);
    if (q.startsWith('WITH locked_admins') && q.includes('UPDATE users SET role')) {
      const [role, id] = values;
      const user = users.find((user) => user.id === id);
      if (!user || (role !== 'admin' && user.role === 'admin' && users.filter((user) => user.role === 'admin').length <= 1)) return [];
      user.role = role;
      return [copy(user)];
    }
    if (q.startsWith('WITH locked_admins') && q.includes('DELETE FROM users')) {
      const user = users.find((user) => user.id === values[0]);
      if (!user || (user.role === 'admin' && users.filter((user) => user.role === 'admin').length <= 1)) return [];
      users.splice(users.indexOf(user), 1);
      states.delete(user.id);
      return [{ id: user.id }];
    }
    if (q.startsWith('SELECT u.id AS owner_id, u.name AS owner_name')) {
      return users.flatMap((user) => (states.get(user.id)?.sharingSubmissions ?? []).filter((item) => item.status === 'validated')
        .map((submission) => ({ owner_id: user.id, owner_name: user.name, submission: copy(submission) })));
    }
    if (q.startsWith('SELECT ts.user_id, ts.payload')) {
      const id = JSON.parse(values[0])[0].id;
      return [...states].filter(([, state]) => state.sharingSubmissions?.some((item) => item.id === id))
        .map(([user_id, payload]) => ({ user_id, payload: copy(payload), owner_name: users.find((user) => user.id === user_id)?.name }));
    }
    throw new Error(`Unexpected SQL: ${q}`);
  };
  const app = makeApp(() => sql);
  const request = (path, { method = 'GET', body, user = 1, demo = false } = {}) => app.request(path, {
    method, headers: { 'content-type': 'application/json', ...(user ? { cookie: `kg_session=${user}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, { ALLOW_DEMO_TOOLS: demo ? 'true' : 'false' });
  const action = (type, data = {}, options = {}) => request('/api/actions', {
    ...options, method: 'POST', body: { id: options.id ?? crypto.randomUUID(), action: { type, data } },
  });
  return { app, request, action, states, users, queries };
}
