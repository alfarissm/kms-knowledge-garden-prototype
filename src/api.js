// Penghubung frontend ke backend Worker (/api/*). Sesi via cookie HttpOnly,
// jadi semua fetch memakai credentials same-origin (default).
async function request(path, options = {}) {
  const response = await fetch(path, {
    // credentials 'same-origin' adalah default, eksplisit untuk kejelasan.
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error ?? `Permintaan gagal (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

// Prototype tanpa layar sandi terpisah: satu form melakukan masuk atau
// pendaftaran (server menentukan lewat email yang sudah dikenal).
export async function apiEntry({ name, email, password }) {
  return request('/api/auth/entry', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiLogout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function apiMe() {
  return request('/api/auth/me');
}

export async function apiLoadState() {
  return request('/api/state');
}

export async function apiSaveState(treeState) {
  return request('/api/state', {
    method: 'PUT',
    body: JSON.stringify({ treeState }),
  });
}

// Perpustakaan lintas-akun: bentukan menyerupai {account, submission} agar
// komponen render lama tetap dipakai tanpa perubahan besar.
export async function apiLibrary() {
  const data = await request('/api/library');
  return data.items.map((item) => ({
    account: { name: item.ownerName, email: item.ownerEmail },
    submission: item.submission,
  }));
}

// Sisi admin setara readAllAccounts() versi server (butuh peran admin).
export async function apiAdminAccounts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() - 6);
  const params = new URLSearchParams({ activityStart: String(today.getTime()) });
  return request(`/api/admin/accounts?${params}`);
}

export async function apiAdminActivity({ page, search, type, period }) {
  const params = new URLSearchParams({ page: String(page), search, type, period });
  return request(`/api/admin/activity?${params}`);
}

export async function apiAdminCondition(submissionId, condition) {
  return request('/api/admin/condition', {
    method: 'POST',
    body: JSON.stringify({ submissionId, condition }),
  });
}

// --- CRUD akun & konten (khusus admin) ---

export async function apiAdminUpdateAccount(userId, role) {
  return request('/api/admin/account', {
    method: 'PATCH',
    body: JSON.stringify({ userId, role }),
  });
}

export async function apiAdminResetAccount(userId) {
  return request('/api/admin/account/reset', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function apiAdminDeleteAccount(userId) {
  return request('/api/admin/account', {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}

export async function apiAdminDeleteContent(submissionId) {
  return request('/api/admin/content', {
    method: 'DELETE',
    body: JSON.stringify({ submissionId }),
  });
}

export async function apiReport(submissionId) {
  return request('/api/report', {
    method: 'POST',
    body: JSON.stringify({ submissionId }),
  });
}

// --- Parameter gamifikasi (#9) ---

export async function apiSettings() {
  const data = await request('/api/settings');
  return data.settings;
}

export async function apiAdminSaveSettings(settings) {
  const data = await request('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return data.settings;
}

// --- Katalog Learning terkelola (#8) ---

export async function apiLearning() {
  const data = await request('/api/learning');
  return data.modules;
}

export async function apiAdminCreateLearning(module) {
  const data = await request('/api/admin/learning', {
    method: 'POST',
    body: JSON.stringify(module),
  });
  return data.module;
}

export async function apiAdminUpdateLearning(module) {
  const data = await request('/api/admin/learning', {
    method: 'PATCH',
    body: JSON.stringify(module),
  });
  return data.module;
}

export async function apiAdminDeleteLearning(moduleId) {
  return request('/api/admin/learning', {
    method: 'DELETE',
    body: JSON.stringify({ id: moduleId }),
  });
}
