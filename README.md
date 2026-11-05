# Kebunku — Prototipe KMS Knowledge Garden 🌱

Prototipe sistem manajemen pengetahuan (KMS) bergamifikasi: setiap pengguna merawat sebuah **pohon apel**. Setiap konten yang di-ACC menghasilkan satu **buah** unik di **Storage**, yang dapat dipindahkan ke pohon sehat mulai Level 3. Konten basi membuat buah rebah di tanah; konten tidak relevan mengosongkan slotnya.

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

- **Node.js 22.12+** (rekomendasi LTS; minimum alternatif: Node 20.19+)
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

Setelah Learning selesai, pengguna dapat mengirim ulasan **1–5 bintang dan
komentar wajib (1–500 karakter)**. Ulasan lengkap memberi **total +1 Air** ke
Storage sekali per modul (nilai reward mengikuti parameter admin). Mengirim
ulang tidak memberi reward tambahan; rating lama tetap dipertahankan.
Bagian **Ulasan pengguna** tampil langsung di bawah daftar materi, dengan pilihan
materi, ringkasan rating, nama akun, bintang, komentar, dan pagination—tanpa popup.
Tombol **Lihat ulasan pengguna** pada kartu mengarah ke bagian tersebut.
Email dan data pohon tidak ikut dibagikan.
Admin dapat membuka daftar yang sama lewat kolom Rating di **Kelola Learning**.

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
- Gunakan Node 22.12+ (atau 20.19+) untuk kompatibilitas Vite dan Wrangler.

## Penyimpanan aman dan mode demo

- Kondisi pohon memakai nilai perawatan, bukan saldo Storage: Air habis dengan
  Pupuk tersisa → menguning; Air dan Pupuk sama-sama habis → mati.
  Pupuk habis sendirian tidak mematikan pohon jika Air masih ada.
- Boost Level demo mengisi progres dan cadangan perawatan sesuai ambang level.
  +7 hari hanya menerapkan pengurangan per periode, tidak memaksa kondisi
  berdasarkan jumlah klik. Data perawatan akun yang sudah ada tidak direset.

- Browser mengirim tindakan ke `POST /api/actions`; server menghitung saldo,
  level, reward dan hasil kuis. `PUT /api/state` lama ditolak agar snapshot
  browser tidak dapat mengubah keputusan admin.
- API Perpustakaan mengirim nama kontributor, materi publik, jumlah laporan,
  serta flag kepemilikan/sudah dilaporkan untuk viewer. Email dan rincian
  laporan tidak dikirim ke pembaca lain; admin tetap dapat meninjau laporan.
- Penulisan pohon memakai revisi atomik; setiap tindakan memiliki ID untuk
  mencegah reward/submit ganda saat request diulang karena gangguan jaringan.
- Kontrol boost/reset/simulasi **aktif di prototype ini** (`ALLOW_DEMO_TOOLS`
  di `wrangler.jsonc`), jadi tombol Boost Demo, Boost Level, dan kontrol
  simulasinya tampil utk semua akun. Deployment sendiri dengan data sungguhan
  sebaiknya menghapus var itu agar kontrolnya disembunyikan dan ditolak server.
- Sharing menyediakan tautan HTTP/HTTPS untuk dipelajari lintas akun. Video
  unggahan masih berupa salinan lokal browser, bukan upload server; sertakan
  tautan video agar pengguna lain dapat menontonnya.
- Admin terakhir tidak dapat dihapus atau diturunkan menjadi user.

## Simulator pohon terpisah

Source simulator kini ada di [`simulator-pohon/`](simulator-pohon/README.md) dalam
repo yang sama, dengan Worker dan deployment terpisah. Simulator tidak memakai
akun, API KMS, atau database Neon.

- KMS: https://kms-knowledge-garden-prototype.testtry.workers.dev
- Simulator: https://kebunku-tree-simulator.testtry.workers.dev
- Dari folder `simulator-pohon/`, jalankan `npm ci`, `npm test`, lalu
  `npm run deploy` untuk merilis simulator saja.
- `npm run deploy` dari root repo tetap hanya merilis KMS.
