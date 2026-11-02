# Laporan QA Kebunku

Tanggal: 2 November 2026. Baseline: commit `a584c7d`.

## Hasil perbaikan lokal

Temuan di bawah adalah catatan QA **sebelum perbaikan**. Perbaikan berikut sudah
diterapkan secara lokal, belum di-push atau di-deploy:

| Temuan | Penyelesaian |
|---|---|
| QA-01 | Format kuis konsisten berupa array; UI mendukung semua pertanyaan, validasi jawaban/read dilakukan server. Katalog fallback tidak kehilangan kuis. |
| QA-02 | Snapshot `PUT /api/state` ditolak. Browser mengirim perintah ke `/api/actions`; server menghitung saldo, reward, status, ID konten dan waktu. Demo default nonaktif dan dicek server. |
| QA-03 | Semua penulis state memakai UPSERT dengan kondisi revisi atomik dan `RETURNING`. Perintah user retry saat konflik, ID request mencegah pengulangan submit/reward. Queue browser diserialkan dan dibatalkan saat logout. |
| QA-04 | Update role/hapus akun mengunci set admin dengan urutan yang sama dan menolak pengurangan admin terakhir. |
| QA-05 | Input tautan HTTP/HTTPS ditambahkan dan disimpan dari form Sharing sampai Library. Metadata lampiran dikirim API. File video masih lokal; upload object storage belum ditambahkan. |
| QA-06 | Vite 8.3.5, Vitest 5.0.5 dan dependency transitif diperbarui; audit bersih. Deklarasi Neon diperbaiki ke versi tersedia 1.2.0 agar install baru berhasil. |
| QA-07 | Cookie sesi memakai `Secure` pada HTTPS, tetap dapat digunakan pada HTTP lokal. |
| QA-08 | README dan `engines` menyebut minimum Node sesuai requirement tooling. |

Tambahan: user tidak lagi memanggil endpoint admin saat setiap render; empty/error
state tabel Review valid; progress Learning menghitung modul yang masih ada dalam
katalog; dialog kuis panjang dapat di-scroll sampai tombol selesai; minimum lebar
body yang menyebabkan overflow pada viewport 320 px dengan scrollbar diperbaiki.

### Verifikasi setelah perbaikan

- **124 tes / 16 file lulus**, termasuk test regresi dan integrasi backend dengan
  PostgreSQL lokal terisolasi (PGlite), tanpa kredensial/data Neon asli.
- Pengujian SQL tambahan: **24 cek lulus** untuk auth, katalog, kuis, reward,
  idempotensi, CAS concurrency, review, laporan, proteksi admin dan log aktivitas.
- Browser dengan **API asli dan database PGlite**, bukan respons API mock:
  **56 cek lulus**, 0 exception JavaScript. Meliputi sembilan halaman pada
  320/390/900/1440 px, kuis dua pertanyaan sampai selesai/rating, Sharing dengan
  tautan, care, laporan, ACC, create/edit/delete modul, dan delete akun dummy.
  Tidak ada request snapshot dari frontend. Respons 401 sebelum login normal.
- Uji geometri tambahan: membandingkan `scrollWidth` terhadap `clientWidth`
  (bukan `innerWidth`) agar ruang scrollbar dihitung; sembilan halaman pada
  empat ukuran diperiksa. Dialog enam pertanyaan dapat di-scroll dan tombol
  akhirnya terjangkau pada layar sempit.
- `npm run build`, `wrangler deploy --dry-run`, dan instalasi bersih `npm ci`
  di direktori sementara berhasil. **Tidak ada deploy sungguhan**.
- `npm audit`: **0 vulnerability**, termasuk dependency development.
- File video bersama masih memerlukan object storage; saat ini sumber lintas
  akun disediakan lewat tautan. Uji beban/multikoneksi Neon produksi belum
  dilakukan; PGlite tidak menggantikan pengujian beban database produksi.

---

## Catatan historis: hasil QA awal

## Kesimpulan

**Belum lulus QA untuk penggunaan publik penuh.** Build dan tes lama lulus,
namun pengujian integrasi menemukan kegagalan Learning dan masalah integritas
state. Tidak ada perubahan source aplikasi, data akun asli, push, atau deploy
yang dilakukan dalam pemeriksaan ini.

## Metode dan batas cakupan

- `npm test`: **89 tes / 11 file lulus**.
- `npm run build`: lulus.
- Browser Edge headless menjalankan aplikasi asli melalui Vite; seluruh `/api/*`
  dicegat dengan data tiruan. **47/48 cek lulus**, satu error runtime Learning.
- Sembilan halaman sesuai role diperiksa pada 1440, 900, 390, dan 320 px:
  user: Pohon, Learning, Sharing, Perpustakaan, Riwayat;
  admin: Pusat Admin, Review Konten, Log Aktivitas, Kelola Learning.
- Cek komponen tambahan pada 320, 390, 750, 1100/900, dan 1440 px:
  tabel akun, pencarian, menu Kelola, tabel review, kartu mobile, statistik.
- Backend: `makeApp` asli dengan adapter SQL in-memory. Tidak memakai Neon asli.
  Respons Learning yang dipakai untuk reproduksi browser diambil dari route
  backend asli dengan katalog database kosong, bukan bentuk fixture buatan UI.
- Situs live hanya diperiksa dengan GET tanpa sesi: HTML 200 dan bundle terbaru;
  API pengguna 401, API admin 403, sesuai implementasi.
- CRUD destruktif, perubahan parameter global, pembayaran (tidak ada), beban
  produksi, upload lintas perangkat, dan transaksi PostgreSQL nyata tidak diuji
  end-to-end pada database produksi. Ini bukan pentest lengkap.

## Yang berhasil diperiksa

- Form Masuk/Daftar, pesan login salah, konfirmasi sandi tidak cocok, toggle
  sandi, dan pesan email duplikat. Respons error di browser disimulasikan;
  hashing dan route auth asli tercakup unit test.
- Seluruh 11 route admin menolak role user (403) di pengujian backend.
- State, Learning, Library, dan `/auth/me` menolak sesi kosong (401).
- User tidak dapat membuka halaman admin melalui navigasi frontend.
- Tidak ditemukan overflow halaman pada matriks sembilan halaman di atas.
- Tabel akun/review menjadi kartu mobile, statistik tidak saling menimpa,
  pencarian akun bekerja, menu muncul di top-layer dengan fokus keyboard.
- Menu titik-tiga Perpustakaan membuka opsi laporan; dialog terbuka;
  alasan Lainnya membuat catatan wajib. Laporan bukan aksi utama kartu.
- Kirim Sharing menghasilkan konten pending pada state tiruan;
  penyiraman mengurangi Air Storage.
- Drawer mobile terbuka dan ditutup dengan Escape.
- Menu keputusan review membuka dialog konfirmasi.
- Hapus akun sendiri ditolak backend; revisi state yang sudah basi ditolak 409.
- Mesin gamifikasi dan visual pohon tercakup suite tes yang sudah ada.
  Siklus animasi semua level tidak direkam ulang dalam sesi QA ini.

## Temuan

### QA-01 — Tinggi: Learning gagal dibuka karena format kuis berbeda

- Lokasi: `server/index.js:120–133,574–582`; `src/main.js:2924–2964`.
- API mengirim `quiz` sebagai array; fallback katalog statis yang memakai objek
  malah diubah menjadi `[]` oleh `toLearningModule`.
- Frontend menganggap `module.quiz` adalah objek berisi `prompt`, `answers`, dan
  `correctAnswer`, lalu menjalankan `module.quiz.answers.forEach(...)`.
- Reproduksi browser: klik **Pelajari materi**, dialog tidak terbuka, muncul
  `TypeError: Cannot read properties of undefined (reading 'forEach')`.
- Dampak: belajar, penyelesaian kuis, dan rating setelah belajar terblokir.
- Saran: satu kontrak kuis konsisten untuk katalog statis, API, editor admin,
  dan UI belajar; tambah tes integrasi API → pembukaan → penyelesaian kuis.

### QA-02 — Tinggi: user dapat memalsukan status ACC dan saldo lewat PUT state

- Lokasi: `server/index.js:356–381`.
- Backend memeriksa sesi, `clockMs`, dan revisi, tetapi menerima payload pohon
  dari browser secara utuh, termasuk saldo dan `sharingSubmissions.status`.
- Reproduksi terisolasi: sesi user biasa mengirim revisi sah dengan saldo
  `999999` dan status `validated`; backend merespons 200 dan menyimpannya.
- Dampak: aturan reward dan keputusan admin bisa dilewati; bukan akses ke role
  admin, tetapi bypass terhadap otoritas keputusan konten dan ekonomi kebun.
- Saran: server menerima perintah aktivitas, bukan snapshot state yang dipercaya.
  Minimal lindungi field keputusan/reward/ledger dengan validasi server-side.

### QA-03 — Sedang: dua save serentak bisa saling menimpa

- Lokasi: `server/index.js:220–228,370–380`.
- Cek revisi dilakukan melalui SELECT lalu UPSERT terpisah, bukan compare-and-swap
  atomik di database. Penambahan revisi dihitung dari payload masuk.
- Reproduksi in-memory: dua request dengan revisi sama sama-sama mendapat 200;
  state terakhir menimpa state sebelumnya. Guard hanya berhasil untuk request
  yang sudah melihat revisi server lebih baru.
- Risiko juga relevan untuk save user bersamaan dengan review/laporan.
- Saran: simpan dengan kondisi revisi dalam satu operasi atomik/transaksi dan
  tangani konflik retry. Ulangi pengujian concurrency pada database staging.

### QA-04 — Sedang: admin terakhir bisa menurunkan perannya sendiri

- Lokasi: `server/index.js:663–674`.
- Reproduksi terisolasi: satu-satunya admin mengubah role sendiri menjadi user;
  respons 200, tersisa nol admin. Proteksi self-delete ada, self-demotion tidak.
- Dampak: konsol admin tidak dapat diakses lagi tanpa perbaikan lewat database.
- Saran: larang demosi/penghapusan admin terakhir, termasuk kondisi konkurensi.

### QA-05 — Sedang / keterbatasan fitur: sumber belajar Sharing tidak terdistribusi

- Lokasi: `index.html` form `sharingForm`; `src/main.js:3161–3175`;
  `server/index.js:396–409`.
- Form Sharing tidak memiliki input URL. Handler submit juga tidak mengirim URL.
- Video opsional disimpan di browser pengunggah, bukan object storage server.
  Respons Library bahkan belum mengirim metadata attachment.
- Dampak: konten dari alur normal belum menghasilkan tombol baca/tonton melalui
  URL; pembaca lain hanya mendapat ringkasan. Nama lampiran juga tidak tersedia
  melalui API Library saat ini. Ini keterbatasan prototipe yang sudah diberi
  catatan lokal di form, bukan bukti upload server tiba-tiba rusak.
- Saran: input tautan tervalidasi untuk materi; jika ingin file bersama, gunakan
  storage server dengan akses terkontrol dan metadata di API Library.

### QA-06 — Sedang: advisory pada dependency development

- `npm audit --omit=dev`: **0 vulnerability**.
- `npm audit`: **4 dependency terdampak** (2 high, 2 moderate): `vite`,
  `source-map-js`, `vitest`, dan `@vitest/mocker`.
- Ini dependency pengembangan/testing, bukan bukti situs Worker sudah dieksploitasi.
  Beberapa advisory relevan untuk dev server Windows dan tooling mock.
- Saran: update versi patched yang kompatibel, ulangi tes/build; jangan membuka
  dev/test server ke jaringan publik. Tidak menjalankan `npm audit fix` otomatis.

### QA-07 — Rendah / hardening: cookie sesi belum berflag Secure

- Lokasi: `server/index.js:204–209`.
- `HttpOnly`, `SameSite=Lax`, path, dan expiry ada; `Secure` belum ditetapkan.
- Saran: aktifkan `Secure` untuk origin HTTPS produksi, tetap dukung HTTP lokal.

### QA-08 — Rendah: prasyarat Node pada README terlalu umum

- README menyebut Node >=20; Vite terpasang meminta `^20.19.0 || >=22.12.0`.
- Dampak: clone di Node 20 versi awal tidak sesuai requirement tooling.
- Saran: dokumentasikan versi minimum persis atau rekomendasikan LTS yang sesuai.

## Prioritas tindak lanjut

1. Perbaiki kontrak kuis dan buktikan Learning selesai sampai reward/rating.
2. Lindungi state dan keputusan admin di server, lalu buat save revisi atomik.
3. Lengkapi alur sumber materi dan proteksi admin terakhir.
4. Update tooling, flag cookie produksi, dan dokumentasi Node.

Artefak reproduksi lokal berada di `%LOCALAPPDATA%/Temp/opencode/`:
`qa-garden-browser.mjs`, `qa-browser-results.json`, `qa-garden-api.mjs`,
`qa-api-results.json`, `qa-learning-response.json`, serta screenshot `qa-*.png`.
Artefak tersebut menggunakan identitas dummy dan tidak berisi token/kredensial asli.
