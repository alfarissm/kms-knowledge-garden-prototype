// Backend demo kebunku: Cloudflare Worker (Hono) + Neon Postgres over HTTP.
// Server menyimpan akun, sesi, dan state mesin per user. Aturan gamifikasi
// tetap dijalankan lewat mesin (src/gamification.js) agar prototipe dan
// backend tidak punya dua set aturan.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { neon } from '@neondatabase/serverless';
import {
  DEFAULT_GAMIFICATION_SETTINGS,
  addSharingReport,
  createInitialState,
  normalizeGamificationSettings,
  setGamificationSettings,
  setSharingCondition,
} from '../src/gamification.js';
import { LEARNING_MODULES } from '../src/learning-catalog.js';

const SESSION_COOKIE = 'kg_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// PBKDF2-SHA256 (WebCrypto). Workers membatasi iterasi PBKDF2 maksimal 100.000.
const PBKDF2_ITERATIONS = 100_000;

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
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role ?? resolveRoleForEmail(row.email),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function resolveRoleForEmail(email) {
  return String(email ?? '').toLowerCase().startsWith('admin@') ? 'admin' : 'user';
}

function clampInt(value, fallback, min, max) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.min(max, Math.max(min, Math.round(num))) : fallback;
}

// --- Notifikasi otomatis ke pemilik konten (hasil review & aksi admin) ---

function buildNotification(type, title, detail) {
  return {
    id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    detail,
    at: Date.now(),
    read: false,
  };
}

function appendNotification(payload, notification) {
  payload.notifications = [notification, ...(Array.isArray(payload.notifications) ? payload.notifications : [])]
    .slice(0, 30);
}

// --- Katalog Learning terkelola (#8) ---

// Bila katalog DB masih kosong, katalog statis di kirimkan pengganti agar
// halaman Learning pengguna tidak pernah kosong.
const FALLBACK_LEARNING_MODULES = LEARNING_MODULES.map((module, index) => ({
  id: module.id,
  title: module.title,
  category: module.category ?? '',
  duration: module.duration ?? '',
  description: module.description ?? '',
  resource_label: module.resourceLabel ?? '',
  resource_url: module.resourceUrl ?? '',
  sections: module.sections ?? [],
  quiz: module.quiz ?? [],
  active: true,
  order_index: index,
}));

function toLearningModule(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? '',
    duration: row.duration ?? '',
    description: row.description ?? '',
    resourceLabel: row.resource_label ?? '',
    resourceUrl: row.resource_url ?? '',
    sections: Array.isArray(row.sections) ? row.sections : [],
    quiz: Array.isArray(row.quiz) ? row.quiz : [],
    active: row.active === undefined ? true : Boolean(row.active),
    orderIndex: row.order_index ?? 0,
  };
}

function normalizeLearningSections(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((section) => ({
      heading: String(section?.heading ?? '').trim().slice(0, 120),
      paragraphs: Array.isArray(section?.paragraphs)
        ? section.paragraphs.map((paragraph) => String(paragraph ?? '').trim()).filter(Boolean).slice(0, 6)
        : [],
    }))
    .filter((section) => section.heading || section.paragraphs.length > 0)
    .slice(0, 8);
}

function normalizeLearningQuiz(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item.prompt === 'string' && item.prompt.trim())
    .slice(0, 6)
    .map((item) => {
      const answers = Array.isArray(item.answers)
        ? item.answers.map((answer) => String(answer ?? '').trim()).filter(Boolean)
        : [];
      const correct = clampInt(item.correctAnswer, 0, 0, Math.max(answers.length - 1, 0));
      return { prompt: item.prompt.trim(), answers, correctAnswer: correct };
    })
    .filter((item) => item.prompt && item.answers.length > 0);
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

  // Parameter gamifikasi terkelola: satu baris app_settings, di-normalisasi mesin.
  // Mesin ikut di-set agar aturan yang dijalankan server memakai nilai terbaru.
  const loadSettings = async () =>
    setGamificationSettings(
      (
        await createSql()`SELECT payload FROM app_settings WHERE id = 1 LIMIT 1`
      )[0]?.payload ?? DEFAULT_GAMIFICATION_SETTINGS,
    );

  const saveSettings = async (settings) => {
    await createSql()`
      INSERT INTO app_settings (id, payload)
      VALUES (1, ${JSON.stringify(settings)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
    `;
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
    const settings = await loadSettings();
    return c.json({
      account: { ...publicUser(userRow), isNew: existing[0] ? false : true },
      treeState,
      settings,
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
    const settings = await loadSettings();
    return c.json({ account: publicUser(user), treeState, settings });
  });

  app.get('/api/settings', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    return c.json({ settings: await loadSettings() });
  });

  app.put('/api/admin/settings', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: 'Parameter gamifikasi tidak valid.' }, 400);
    }
    const settings = normalizeGamificationSettings(body);
    await saveSettings(settings);
    return c.json({ ok: true, settings });
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
    const requestedStart = Number(c.req.query('activityStart'));
    const activityStart = Number.isSafeInteger(requestedStart) && Math.abs(requestedStart - Date.now()) < 14 * 86_400_000
      ? requestedStart
      : Date.now() - 6 * 86_400_000;
    const rows = await createSql()`
      SELECT u.*, ts.payload - 'history' AS tree_state
      FROM users u LEFT JOIN tree_states ts ON ts.user_id = u.id
      ORDER BY u.created_at ASC
    `;
    const activityRows = await createSql()`
      SELECT ((j.value->>'at')::bigint - ${activityStart}::bigint) / 86400000 AS day_index, count(*)::int AS count
      FROM tree_states ts
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(ts.payload->'history') = 'array' THEN ts.payload->'history' ELSE '[]'::jsonb END
      ) AS j(value)
      WHERE j.value->>'at' ~ '^[0-9]{1,15}$'
        AND (j.value->>'at')::bigint >= ${activityStart}::bigint
        AND (j.value->>'at')::bigint < ${activityStart + 7 * 86_400_000}::bigint
        AND j.value->>'type' NOT IN ('decay', 'demo')
      GROUP BY day_index
    `;
    return c.json({
      accounts: rows.map((row) => ({
        ...publicUser(row),
        treeState: row.tree_state ?? null,
      })),
      activityWeek: activityRows.map((row) => ({ dayIndex: Number(row.day_index), count: Number(row.count) })),
    });
  });

  // Log admin dipaginasi di server, bukan memotong gabungan riwayat di browser.
  // Riwayat tiap pohon tetap mengikuti batas penyimpanan mesin (30 entri/akun).
  app.get('/api/admin/activity', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const requestedPage = Number(c.req.query('page'));
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1_000_000) : 1;
    const pageSize = 12;
    const search = String(c.req.query('search') ?? '').trim().slice(0, 100).toLowerCase();
    const type = String(c.req.query('type') ?? 'all');
    const allowedTypes = ['all', 'activity', 'sharing', 'care', 'fruit', 'decay', 'report', 'demo'];
    if (!allowedTypes.includes(type)) return c.json({ error: 'Jenis aktivitas tidak dikenal.' }, 400);
    const period = String(c.req.query('period') ?? 'all');
    if (!['all', '7', '30'].includes(period)) return c.json({ error: 'Periode tidak dikenal.' }, 400);
    const cutoffMs = period === 'all' ? 0 : Date.now() - Number(period) * 86_400_000;

    const counts = await createSql()`
      SELECT count(*)::int AS total
      FROM users u JOIN tree_states ts ON ts.user_id = u.id
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(ts.payload->'history') = 'array' THEN ts.payload->'history' ELSE '[]'::jsonb END
      ) AS j(value)
      WHERE (${search} = '' OR position(${search} in lower(u.name)) > 0 OR position(${search} in lower(u.email)) > 0)
        AND (${type} = 'all' OR j.value->>'type' = ${type})
        AND (${cutoffMs}::bigint = 0 OR CASE WHEN j.value->>'at' ~ '^[0-9]{1,15}$' THEN (j.value->>'at')::bigint ELSE 0 END >= ${cutoffMs}::bigint)
    `;
    const total = Number(counts[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    const rows = await createSql()`
      SELECT u.id AS user_id, u.name, u.email, j.value AS entry
      FROM users u JOIN tree_states ts ON ts.user_id = u.id
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(ts.payload->'history') = 'array' THEN ts.payload->'history' ELSE '[]'::jsonb END
      ) AS j(value)
      WHERE (${search} = '' OR position(${search} in lower(u.name)) > 0 OR position(${search} in lower(u.email)) > 0)
        AND (${type} = 'all' OR j.value->>'type' = ${type})
        AND (${cutoffMs}::bigint = 0 OR CASE WHEN j.value->>'at' ~ '^[0-9]{1,15}$' THEN (j.value->>'at')::bigint ELSE 0 END >= ${cutoffMs}::bigint)
      ORDER BY CASE WHEN j.value->>'at' ~ '^[0-9]{1,15}$' THEN (j.value->>'at')::bigint ELSE 0 END DESC, u.id DESC, j.value->>'id' DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    return c.json({
      items: rows.map((row) => ({
        account: { id: row.user_id, name: row.name, email: row.email },
        entry: row.entry,
      })),
      page: currentPage,
      pageSize,
      total,
      totalPages,
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

    const submissionEntry = (Array.isArray(match.payload?.sharingSubmissions) ? match.payload.sharingSubmissions : [])
      .find((item) => item?.id === submissionId);
    const contentTitle = submissionEntry?.title ?? 'Konten Sharing';

    const settings = await loadSettings();

    const result = setSharingCondition(match.payload ?? {}, submissionId, condition);
    if (result.state) {
      // Notifikasi otomatis untuk pemilik konten, hanya saat keputusan benar-benar
      // diterapkan (bukan saat admin menekan tombol kondisi yang sudah sama).
      if (result.applied) {
        const pupuk = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })
          .format(settings.accReward.fertilizerUnits / 2);
        const texts = {
          validated: result.rewarded
            ? `Selamat! Konten "${contentTitle}" di-ACC admin: +${settings.accReward.air} Air, +${pupuk} Pupuk, dan buah kontenmu sudah lahir di Storage.`
            : `Konten "${contentTitle}" kembali di-ACC admin; buahnya tumbuh kembali di slot lamanya.`,
          stale: `Konten "${contentTitle}" ditandai Basi oleh admin — buahnya rebah busuk di tanah kebunmu.`,
          rejected: `Konten "${contentTitle}" dinilai Tidak Relevan oleh admin — buahnya diangkat dan slotnya dikosongkan.`,
          duplicate: `Konten "${contentTitle}" ditandai Duplikat oleh admin — buah duplikatnya diangkat dari kebunmu.`,
        };
        appendNotification(result.state, buildNotification('review', `Review konten: ${condition === 'validated' ? 'ACC' : condition === 'stale' ? 'Basi' : condition === 'rejected' ? 'Tidak Relevan' : 'Duplikat'}`, texts[condition]));
      }
      await saveState(match.user_id, result.state);
    }
    return c.json({
      applied: result.applied,
      rewarded: result.rewarded,
      owner: { name: match.owner_name, email: match.owner_email },
      ownerState: result.state ?? null,
    });
  });

  // --- Katalog Learning terkelola (#8) ---

  // Pengguna membaca modul aktif; admin melihat semua (aktif/draft).
  app.get('/api/learning', async (c) => {
    const user = await requireUser(c);
    if (!user) return c.json({ error: 'Belum masuk.' }, 401);
    const rows = await createSql()`SELECT * FROM learning_modules ORDER BY order_index, title`;
    const source = rows.length > 0 ? rows : FALLBACK_LEARNING_MODULES;
    const includeInactive = (user.role ?? resolveRoleForEmail(user.email)) === 'admin';
    return c.json({
      modules: source.filter((module) => includeInactive || module.active).map(toLearningModule),
    });
  });

  app.post('/api/admin/learning', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const title = String(body?.title ?? '').trim().slice(0, 120);
    if (title.length < 3) return c.json({ error: 'Judul modul minimal 3 karakter.' }, 400);

    const slug = String(body?.id ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
    const id = (slug || `mod-${Date.now().toString(36)}`).slice(0, 60);
    const existing = await createSql()`SELECT id FROM learning_modules WHERE id = ${id} LIMIT 1`;
    if (existing[0]) return c.json({ error: 'ID modul sudah dipakai.' }, 400);

    const inserted = await createSql()`
      INSERT INTO learning_modules (id, title, category, duration, description, resource_label, resource_url, sections, quiz, active, order_index)
      VALUES (
        ${id},
        ${title},
        ${String(body?.category ?? '').trim().slice(0, 60)},
        ${String(body?.duration ?? '').trim().slice(0, 40)},
        ${String(body?.description ?? '').trim().slice(0, 300)},
        ${String(body?.resourceLabel ?? '').trim().slice(0, 80)},
        ${String(body?.resourceUrl ?? '').trim().slice(0, 500)},
        ${JSON.stringify(normalizeLearningSections(body?.sections))}::jsonb,
        ${JSON.stringify(normalizeLearningQuiz(body?.quiz))}::jsonb,
        ${body?.active === undefined ? true : Boolean(body.active)},
        ${clampInt(body?.orderIndex, 0, 0, 999)}
      )
      RETURNING *
    `;
    return c.json({ ok: true, module: toLearningModule(inserted[0]) });
  });

  app.patch('/api/admin/learning', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const id = String(body?.id ?? '');
    if (!id) return c.json({ error: 'Modul tidak dikenal.' }, 400);
    const rows = await createSql()`SELECT * FROM learning_modules WHERE id = ${id} LIMIT 1`;
    const current = rows[0];
    if (!current) return c.json({ error: 'Modul tidak ditemukan.' }, 404);

    const title = body?.title !== undefined ? String(body.title).trim().slice(0, 120) : current.title;
    if (title.length < 3) return c.json({ error: 'Judul modul minimal 3 karakter.' }, 400);
    const updated = await createSql()`
      UPDATE learning_modules SET
        title = ${title},
        category = ${body?.category !== undefined ? String(body.category).trim().slice(0, 60) : current.category},
        duration = ${body?.duration !== undefined ? String(body.duration).trim().slice(0, 40) : current.duration},
        description = ${body?.description !== undefined ? String(body.description).trim().slice(0, 300) : current.description},
        resource_label = ${body?.resourceLabel !== undefined ? String(body.resourceLabel).trim().slice(0, 80) : current.resource_label},
        resource_url = ${body?.resourceUrl !== undefined ? String(body.resourceUrl).trim().slice(0, 500) : current.resource_url},
        sections = ${JSON.stringify(body?.sections !== undefined ? normalizeLearningSections(body.sections) : current.sections)}::jsonb,
        quiz = ${JSON.stringify(body?.quiz !== undefined ? normalizeLearningQuiz(body.quiz) : current.quiz)}::jsonb,
        active = ${body?.active !== undefined ? Boolean(body.active) : current.active},
        order_index = ${body?.orderIndex !== undefined ? clampInt(body.orderIndex, current.order_index ?? 0, 0, 999) : current.order_index ?? 0},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return c.json({ ok: true, module: toLearningModule(updated[0]) });
  });

  app.delete('/api/admin/learning', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const id = String(body?.id ?? '');
    if (!id) return c.json({ error: 'Modul tidak dikenal.' }, 400);
    const deleted = await createSql()`DELETE FROM learning_modules WHERE id = ${id} RETURNING id`;
    if (!deleted[0]) return c.json({ error: 'Modul tidak ditemukan.' }, 404);
    return c.json({ ok: true, id: deleted[0].id });
  });

  // --- CRUD akun (khusus admin) ---

  // Ganti peran akun (promote/demote) — perlu diperbarui segera di sisi klien
  // bila admin mengubah akunnya sendiri.
  app.patch('/api/admin/account', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const userId = Number(body?.userId);
    const role = String(body?.role ?? '');
    if (!Number.isInteger(userId) || userId <= 0) return c.json({ error: 'Akun tidak dikenal.' }, 400);
    if (!['user', 'admin'].includes(role)) return c.json({ error: 'Peran tidak dikenal.' }, 400);
    const rows = await createSql()
      `UPDATE users SET role = ${role} WHERE id = ${userId} RETURNING *`;
    if (!rows[0]) return c.json({ error: 'Akun tidak ditemukan.' }, 404);
    return c.json({ ok: true, account: publicUser(rows[0]) });
  });

  // Reset pohon akun: payload kembali ke kebun baru (Level 0), histori server terhapus.
  app.post('/api/admin/account/reset', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const userId = Number(body?.userId);
    if (!Number.isInteger(userId) || userId <= 0) return c.json({ error: 'Akun tidak dikenal.' }, 400);
    const target = await createSql()`SELECT id, email FROM users WHERE id = ${userId} LIMIT 1`;
    if (!target[0]) return c.json({ error: 'Akun tidak ditemukan.' }, 404);
    const freshState = createInitialState(Date.now());
    appendNotification(
      freshState,
      buildNotification('reset', 'Pohon direset admin', 'Pohon kebunmu direset admin ke Level 0 — mulai tanam ulang dari awal.'),
    );
    await saveState(userId, freshState);
    return c.json({ ok: true, owner: { id: target[0].id, email: target[0].email } });
  });

  // Hapus akun permanen: sesi & pohon ikut terhapus (FK ON DELETE CASCADE).
  app.delete('/api/admin/account', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const userId = Number(body?.userId);
    if (!Number.isInteger(userId) || userId <= 0) return c.json({ error: 'Akun tidak dikenal.' }, 400);
    if (admin.id === userId) return c.json({ error: 'Tidak bisa menghapus akun yang sedang dipakai.' }, 400);
    const target = await createSql()`SELECT id, email FROM users WHERE id = ${userId} LIMIT 1`;
    if (!target[0]) return c.json({ error: 'Akun tidak ditemukan.' }, 404);
    await createSql()`DELETE FROM users WHERE id = ${userId}`;
    return c.json({ ok: true, owner: { id: target[0].id, email: target[0].email } });
  });

  // Hapus konten Sharing permanen: item + buah pasangannya diangkat dari
  // payload pemilik (slotnya dibiarkan kosong — slot tidak pernah digeser).
  app.delete('/api/admin/content', async (c) => {
    const admin = await requireAdmin(c);
    if (!admin) return c.json({ error: 'Khusus admin.' }, 403);
    const body = await c.req.json().catch(() => null);
    const submissionId = String(body?.submissionId ?? '');
    if (!submissionId) return c.json({ error: 'Konten tidak dikenal.' }, 400);
    const match = await findSubmission(submissionId);
    if (!match) return c.json({ error: 'Konten Sharing tidak ditemukan.' }, 404);

    const payload = match.payload ?? {};
    const contentTitle = (Array.isArray(payload.sharingSubmissions) ? payload.sharingSubmissions : [])
      .find((item) => item?.id === submissionId)?.title ?? 'Konten Sharing';
    payload.sharingSubmissions = (Array.isArray(payload.sharingSubmissions) ? payload.sharingSubmissions : [])
      .filter((submission) => submission?.id !== submissionId);
    payload.fruitLedger = (Array.isArray(payload.fruitLedger) ? payload.fruitLedger : [])
      .filter((fruit) => fruit?.submissionId !== submissionId);
    payload.fruitsOnTree = payload.fruitLedger.filter((fruit) => fruit.placement === 'tree').length;
    payload.fruitsInStorage = payload.fruitLedger.filter((fruit) => fruit.placement === 'storage').length;
    appendNotification(
      payload,
      buildNotification('review', 'Konten dihapus admin', `Konten "${contentTitle}" dihapus permanen oleh admin; buah pasangannya ikut diangkat.`),
    );

    await saveState(match.user_id, payload);
    return c.json({ ok: true, owner: { name: match.owner_name, email: match.owner_email } });
  });

  return app;
}

export default {
  fetch(request, env, ctx) {
    const createSql = () => neon(env.DATABASE_URL);
    return makeApp(createSql).fetch(request, env, ctx);
  },
};
