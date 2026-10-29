# Kebunku — Prototipe KMS Knowledge Garden 🌱

Prototipe sistem manajemen pengetahuan (KMS) bergamifikasi: setiap pengguna merawat sebuah **pohon apel**. Konten yang di-ACC menjadi **buah** yang dipetik ke **Storage**, konten basi jatuh ke tanah, dan konten tidak relevan diangkat hilang.

Demo tayang: **https://kms-knowledge-garden-prototype.testtry.workers.dev**

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | HTML/CSS/JS, dibangun dengan Vite |
| Backend/API | [Hono](https://hono.dev) di **Cloudflare Worker** |
| Database | [Neon](https://neon.tech) — PostgreSQL serverless (`@neondatabase/serverless`) |
| Pengujian | Vitest |

Satu Worker melayani semuanya: `/api/*` dieksekusi `server/index.js`, sisanya file statis dari `dist/` — tanpa setting routing tambahan.

## Prasyarat

- **Node.js ≥ 20**
- Akun [Neon](https://neon.tech) gratis (database sendiri)
- Akun [Cloudflare](https://dash.cloudflare.com) — hanya jika ingin deploy sendiri

## Menjalankan di komputer sendiri

1. **Clone & install**
   ```powershell
   git clone https://github.com/alfarissm/kms-knowledge-garden-prototype.git
   cd kms-knowledge-garden-prototype
   npm install
   ```

2. **Buat database di Neon**, lalu salin connection string-nya (dimulai `postgres://…`).

3. **Simpan kredensial ke `.dev.vars`** di root repo (file ini di-gitignore, tidak ikut commit):
   ```
   DATABASE_URL=postgres://user:password@host/dbname
   ```

4. **Buat tabel** — sekali jalan:
   ```powershell
   node server/apply-schema.mjs "<DATABASE_URL>"
   ```
   Membuat `users`, `sessions`, `tree_states`, `app_settings`, `learning_modules`.

5. **Jalankan dua server** (dua terminal):
   ```powershell
   npm run dev:api   # API Wrangler di http://127.0.0.1:8787
   npm run dev       # Web Vite di http://127.0.0.1:5173
   ```
   `vite.config.js` otomatis meneruskan `/api/*` ke port 8787. Buka **http://127.0.0.1:5173**.
   Mendapat 401 di `http://127.0.0.1:8787` tanpa login itu **normal** — semua API butuh sesi.

## Akun & role admin

Registrasi lewat UI selalu menghasilkan role **user**; login admin **hanya dari database**.
Buat akun biasa dulu di aplikasi, lalu angkat role-nya:

```sql
UPDATE users SET role = 'admin' WHERE email = 'email@yang.anda.daftarkan';
```

Acces token sesi disimpan sebagai cookie `httpOnly`, jadi cukup login ulang di browser.

## Uji & build

```powershell
npm test     # seluruh suite Vitest
npm run build  # hasil ke dist/
```

## Deploy ke Cloudflare (opsional)

Perhatikan: worker name akan jadi milik subdomain Cloudflare Anda sendiri, dan **database harus milik sendiri** — deployment ini tidak memakai data demo.

```powershell
npx wrangler login                      # autentikasi akun Cloudflare
npx wrangler secret put DATABASE_URL    # tempel connection string Neon milik Anda
npm run deploy                          # build + wrangler deploy
```

Domain `*.workers.dev` otomatis aktif; tidak perlu set DNS atau CORS karena frontend dan API satu origin.

> ⚠️ Pastikan password admin kuat bila prototipe dibuka ke publik.

## Struktur proyek

```
server/index.js        API Hono (auth, state, library, laporan, admin)
server/schema.sql      Definisi tabel Neon
server/apply-schema.mjs Penerapan skema sekali jalan
src/                   Frontend (main.js, gamification.js, styles.css, ...)
index.html             Kerangka UI & dialog
tests/                 Suite Vitest
wrangler.jsonc         Konfigurasi Worker Cloudflare
```

## Catatan

- Kredensial (`DATABASE_URL`) **tidak pernah** disimpan di repo — hanya `secret` Cloudflare atau `.dev.vars` lokal.
- Semua data (akun, pohon, konten) berada di database masing-masing; kloning kode ≠ kloning data.
- Gunakan Node versi 20+ atau baru untuk kompatibilitas Wrangler dan `apply-schema`.
