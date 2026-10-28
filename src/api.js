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
  const data = await request('/api/admin/accounts');
  return data.accounts;
}

export async function apiAdminCondition(submissionId, condition) {
  return request('/api/admin/condition', {
    method: 'POST',
    body: JSON.stringify({ submissionId, condition }),
  });
}

export async function apiReport(submissionId) {
  return request('/api/report', {
    method: 'POST',
    body: JSON.stringify({ submissionId }),
  });
}
