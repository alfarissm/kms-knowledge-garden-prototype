// Backend demo kebunku: Cloudflare Worker (Hono) + Neon Postgres over HTTP.
// Server menyimpan akun, sesi, dan state mesin per user. Aturan gamifikasi
// tetap dijalankan lewat mesin (src/gamification.js) agar prototipe dan
// backend tidak punya dua set aturan.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { neon } from '@neondatabase/serverless';
import { addSharingReport, setSharingCondition } from '../src/gamification.js';

const SESSION_COOKIE = 'kg_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// PBKDF2-SHA256 (WebCrypto, tersedia di Workers maupun Node).
const PBKDF2_ITERATIONS = 120_000;

function encoder() {
  return new TextEncoder();
}

function toB64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromB64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hashPassword(password, saltBytes = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', encoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(saltBytes)}$${toB64(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  const [, iterations, saltB64, hashB64] = String(stored ?? '').split('$');
  if (!iterations || !saltB64 || !hashB64) return false;
  const key = await crypto.subtle.importKey('raw', encoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations: Number(iterations) },
    key,
    fromB64(hashB64).length * 8,
  );
  return toB64(new Uint8Array(bits)) === hashB64;
}

function publicUser(row) {
  return {
    name: row.name,
    email: row.email,
    role: row.role ?? resolveRoleForEmail(row.email),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function resolveRoleForEmail(email) {
  return String(email ?? '').toLowerCase().startsWith('admin@') ? 'admin' : 'user';
}

export function makeApp(createSql) {
  const app = new Hono();

  const getUserForToken = async (token) => {
    if (!token) return null;
    const rows = await createSql()`
      SELECT u.*, s.token AS session_token
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token} AND s.expires_at > now()
      LIMIT 1
    `;
    return rows[0] ?? null;
  };

  const requireUser = async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = await getUserForToken(token);
    if (!user) {
      c.status(401);
      return null;
    }
    return user;
  };

  const requireAdmin = async (c) => {
    const user = await requireUser(c);
    if (!user) return null;
    if ((user.role ?? resolveRoleForEmail(user.email)) !== 'admin') {
      c.status(403);
      return null;
    }
    return user;
  };

  const startSession = async (c, userRow) => {
    const token = toB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (char) => ({ '+': '-', '/': '_', '=': '' }[char] ?? char));
    await createSql()`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (${token}, ${userRow.id}, ${new Date(Date.now() + SESSION_TTL_MS).toISOString()})
    `;
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return token;
  };

  const loadState = async (userId) => {
    const rows = await createSql()`
      SELECT payload FROM tree_states WHERE user_id = ${userId} LIMIT 1
    `;
    return rows[0]?.payload ?? null;
  };

  const saveState = async (userId, payload) => {
    await createSql()`
      INSERT INTO tree_states (user_id, payload, updated_at)
      VALUES (${userId}, ${JSON.stringify(payload)}::jsonb, now())
      ON CONFLICT (user_id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
    `;
  };

  // Mencari satu konten Sharing lintas-akun di dalam payload JSON.
  const findSubmission = async (submissionId) => {
    const rows = await createSql()`
      SELECT ts.user_id, ts.payload, u.name AS owner_name, u.email AS owner_email
      FROM tree_states ts JOIN users u ON u.id = ts.user_id
      WHERE ts.payload->'sharingSubmissions' @> ${JSON.stringify([{ id: submissionId }])}::jsonb
      LIMIT 1
    `;
    return rows[0] ?? null;
  };

  app.post('/api/auth/entry', async (c) => {
    const sql = createSql();
    const body = await c.req.json().catch(() => null);
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Masukkan alamat email yang valid.' }, 400);
    }
    if (password.length < 6) {
      return c.json({ error: 'Kata sandi minimal 6 karakter.' }, 400);
    }

    const existing = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    let userRow;
    if (existing[0]) {
      if (!(await verifyPassword(password, existing[0].password_hash))) {
        return c.json({ error: 'Kata sandi tidak cocok untuk akun ini.' }, 401);
      }
      userRow = existing[0];
    } else {
      if (name.length < 2) {
        return c.json({ error: 'Nama harus terdiri dari minimal 2 karakter.' }, 400);
      }
      const role = resolveRoleForEmail(email);
      const inserted = await sql`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (${name}, ${email}, ${await hashPassword(password)}, ${role})
        RETURNING *
      `;
      userRow = inserted[0];
    }

    await startSession(c, userRow);
    const treeState = await loadState(userRow.id);
    return c.json({
      account: { ...publicUser(userRow), isNew: existing[0] ? false : true },
      treeState,
    });
  });

  app.post('/api/auth/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
      await createSql()`DELETE FROM sessions WHERE token = ${token}`;
    }
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.json({ ok: true });
  });

  app.get('/api/auth/me', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    const treeState = await loadState(user.id);
    return c.json({ account: publicUser(user), treeState });
  });

  app.get('/api/state', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    return c.json({ treeState: await loadState(user.id) });
  });

  app.put('/api/state', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    const body = await c.req.json().catch(() => null);
    const payload = body?.treeState;
    if (!payload || typeof payload !== 'object' || !Number.isFinite(payload.clockMs)) {
      return c.json({ error: 'Pohon tidak valid.' }, 400);
    }
    await saveState(user.id, payload);
    return c.json({ ok: true });
  });

  // Perpustakaan: konten relevan (ACC) lintas-akun + jumlah laporan.
  app.get('/api/library', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    const rows = await createSql()`
      SELECT u.name AS owner_name, u.email AS owner_email, j.value AS submission
      FROM tree_states ts
      JOIN users u ON u.id = ts.user_id
      CROSS JOIN LATERAL jsonb_array_elements(ts.payload->'sharingSubmissions') AS j(value)
      WHERE j.value->>'status' = 'validated'
      ORDER BY j.value->>'submittedAt' DESC NULLS LAST
    `;
    return c.json({
      items: rows.map((row) => ({
        ownerName: row.owner_name,
        ownerEmail: row.owner_email,
        submission: {
          id: row.submission.id,
          title: row.submission.title,
          type: row.submission.type,
          url: row.submission.url ?? '',
          summary: row.submission.summary ?? '',
          submittedAt: row.submission.submittedAt ?? null,
          reviewedAt: row.submission.reviewedAt ?? null,
          reports: Array.isArray(row.submission.reports) ? row.submission.reports : [],
        },
      })),
    });
  });

  // Pengguna melaporkan konten; server yang mengubah state pemilik.
  app.post('/api/report', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    const body = await c.req.json().catch(() => null);
    const submissionId = String(body?.submissionId ?? '');
    if (!submissionId) return c.json({ error: 'Konten tidak dikenal.' }, 400);

    const match = await findSubmission(submissionId);
    if (!match) return c.json({ error: 'Konten Sharing tidak ditemukan.' }, 404);

    const result = addSharingReport(match.payload ?? {}, submissionId, user.email);
    await saveState(match.user_id, result.state);
    return c.json({ added: result.added, reports: result.reports, ownerState: result.state });
  });

  // Admin: melihat semua akun (payload penuh, seperti readAllAccounts dulu).
  app.get('/api/admin/accounts', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const rows = await createSql()`
      SELECT u.*, ts.payload AS tree_state
      FROM users u LEFT JOIN tree_states ts ON ts.user_id = u.id
      ORDER BY u.created_at ASC
    `;
    return c.json({
      accounts: rows.map((row) => ({
        ...publicUser(row),
        treeState: row.tree_state ?? null,
      })),
    });
  });

  // Admin: memutus kondisi konten; mesin yang dijalankan server-side.
  app.post('/api/admin/condition', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const submissionId = String(body?.submissionId ?? '');
    const condition = String(body?.condition ?? '');
    if (!['validated', 'stale', 'rejected', 'duplicate'].includes(condition)) {
      return c.json({ error: 'Kondisi konten Sharing tidak dikenal.' }, 400);
    }

    const match = await findSubmission(submissionId);
    if (!match) return c.json({ error: 'Konten Sharing tidak ditemukan.' }, 404);

    const result = setSharingCondition(match.payload ?? {}, submissionId, condition);
    if (result.state) {
      await saveState(match.user_id, result.state);
    }
    return c.json({
      applied: result.applied,
      rewarded: result.rewarded,
      owner: { name: match.owner_name, email: match.owner_email },
      ownerState: result.state ?? null,
    });
  });

  return app;
}

export default {
  fetch(request, env, ctx) {
    const createSql = () => neon(env.DATABASE_URL);
    return makeApp(createSql).fetch(request, env, ctx);
  },
};
