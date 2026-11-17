# QA simulator pohon

## Revisi bintang saja — 17 November 2026

- Sesuai permintaan, perubahan hanya pada simulator, flowchart final, dan
  dokumentasinya. Source/backend/deployment KMS utama tidak diubah oleh revisi ini.
- Tombol **Beri bintang** memberi contoh 5 bintang setelah materi terakhir
  tuntas. Tidak mewajibkan atau membuat komentar contoh tersembunyi. Reward
  tetap +1 Air sekali per materi, tanpa reward kedua kali.
- `src/learning-rating.js` adalah kebijakan khusus simulator; snapshot mesin
  tetap identik dengan KMS. Validasi komentar pada mesin KMS tidak dilonggarkan.
- Flowchart KMS memakai **Pusat Pengetahuan** dan penilaian bintang saja.
  Karena KMS utama belum menerapkan kedua perubahan ini, judul PDF diberi
  catatan revisi tersebut. Review Admin (ACC/Basi/Tidak relevan/Duplikat) tetap.
- **75 tes simulator, 165 tes regresi KMS, 147 pemeriksaan browser lokal, dan
  147 pemeriksaan browser live lulus.** Tidak ada exception JS atau request
  `/api/`/domain KMS dari pengujian simulator.
- Seluruh enam viewport 320/390/680/900/1024/1440 px diperiksa, termasuk label
  rating dan kontrol yang tetap dapat diakses dengan keyboard.
- **57 pemeriksaan flowchart KMS dan 32 pemeriksaan flowchart simulator lulus.**
  Kedua PDF tetap satu halaman; geometri, font/style kotak, konektor, dan angka
  reward/level tetap. Hanya label yang diminta serta catatan cakupan berubah.
- Source kanonis, salinan paket pembimbing 13 November, dan isi ZIP terverifikasi
  identik. Arsip paket 9 November dan bukti KP 16 November tidak diubah.
- Worker simulator: `8a64a090-41a2-47e9-9da2-97e59536139a`; JS
  `index-BgHE7G3k.js`; CSS tetap `index-eZu8lpWs.css`. HTML/JS/CSS live HTTP 200
  dan identik dengan build lokal. KMS live tetap `index-BKq-NQA2.js`.
- Log/screenshot pemeriksaan disimpan terpisah di
  `C:\Users\ASUS\AppData\Local\Temp\opencode\simulator-stars-20261117\`;
  tidak menimpa bukti pengujian terdahulu.

Bagian-bagian di bawah merupakan catatan versi terdahulu.

## Revisi Probis — 13 November 2026 (acuan terbaru)

- Sumber: notulensi rapat Probis internal 13 November 2026. ACC pertama diubah
  menjadi +6 Air/+4 Pupuk; target kumulatif L3 diubah menjadi 7 Air/5 Pupuk.
- Satu Buah per konten ACC, validasi admin, login sekali per hari, perawatan
  manual, decay, serta angka L1/L2/L4–L7 dipertahankan.
- 160 tes KMS lokal dan 65 tes simulator lulus. Skenario normal L1–L7 dijalankan
  di kedua mesin tanpa boost; snapshot mesin identik.
- 137 cek browser lokal dan 137 cek browser live lulus, termasuk satu Sharing
  ACC + bonus awal → Siram/Pupuk → L3 7/5 → pasang buah.
- +1 Air/+1 Pupuk tetap khusus demo; dapat diulang, hanya menambah Storage,
  tidak mengklaim reward login/Learning, dan dapat dipakai lewat keyboard.
- Viewport 320/390/680/900/1024/1440 px tetap tanpa overflow horizontal root;
  susunan, Poppins, dan CSS tidak diubah oleh revisi aturan ini.
- Tidak ada exception JavaScript atau request ke API/domain akun KMS.
- Contoh L3 sekarang memiliki Storage 19/13, progres 7/5, perawatan 7/5, dan
  tiga buah terpasang. Dua kali +7 hari menyisakan 5 Air/4 Pupuk, tetap sehat.
- 21 pemeriksaan diagram KMS dan 30 pemeriksaan diagram simulator lulus;
  seluruh 22 aksi simulator dipetakan. PDF final masing-masing satu halaman,
  tanpa tabrakan kotak/panah/label atau teks terpotong.
- Worker simulator: `ee15df60-a96a-42b2-9451-d74e2969a730`, bundle
  `index-Ck5JTsc3.js` / `index-eZu8lpWs.css`.
- KMS utama hanya diubah/dibangun/diuji secara lokal, **tidak di-deploy ulang**.
  Tidak ada penulisan konfigurasi admin, migrasi/reset akun, atau reward lama.

Bagian di bawah merupakan catatan versi terdahulu, bukan angka aturan terbaru.

Tanggal: 4 November 2026.

## Hasil lokal sebelum deploy

- 29 tes Node.js lulus: aturan resource, syarat Air DAN Pupuk, seluruh ambang
  level, batas level, SVG semua level, login harian, penuntasan materi baru,
  ulasan sekali per materi, Sharing/ACC, slot tetap, basi/ditolak/duplikat,
  pemulihan, decay, reset, dan batas riwayat.
- 57 cek browser Edge headless lulus dengan klik koordinat tombol, termasuk
  reset inline, keyboard tabs, antarmuka kondisi buah, dan pemberian reward.
- Empat tabel aturan diuji pada 1440/1024/900/680/390/320 px; tidak ada
  overflow horizontal pada root halaman. Tabel boleh di-scroll di dalam area.
- Tidak ada exception JavaScript saat alur uji dijalankan.
- Tidak ada request ke `/api/` atau domain KMS produksi sepanjang pengujian.
- Build produksi berhasil; instalasi dependency: 0 vulnerability.

## Isolasi

- Worker terpisah bernama `kebunku-tree-simulator`.
- Hanya static assets, tidak memiliki koneksi Neon atau secret akun.
- Snapshot mesin/renderer disimpan lokal di project ini; aplikasi utama tidak
  diimpor saat runtime, tidak diubah, dan tidak di-deploy ulang.
- State hanya di memori tab. Tidak menyimpan data akun atau sesi login.
- Font eksternal Google Fonts memiliki fallback font sistem.

## Batasan

- Learning/ulasan direpresentasikan oleh tombol, bukan kuis atau form sungguhan.
- Awal halaman memuat contoh L3 dengan 3 buah. Reset inline mengembalikan L0.
- Waktu simulasi hanya maju lewat tombol +7 hari.
- Jalan pintas resource/level/kondisi diberi label demo, bukan reward aktivitas.
- Uji browser dilakukan di Edge/Chromium, bukan perangkat sentuh fisik atau
  audit screen reader/WCAG menyeluruh.

## Bukti lokal

`C:\Users\ASUS\AppData\Local\Temp\opencode\qa-standalone-tree.mjs`

File hasil: `qa-standalone-tree-results.json`.
Screenshot: `standalone-tree-desktop.png` dan `standalone-tree-mobile.png`.

## Verifikasi setelah deploy

- URL: https://kebunku-tree-simulator.testtry.workers.dev
- Worker version: `15249a77-6e76-4efc-bd6e-886b35ca8abe`.
- HTML, CSS `index-ByzSyDc5.css`, dan JS `index-BshnNHNQ.js`: HTTP 200.
- 57 cek browser yang sama diulang pada URL live: seluruhnya lulus,
  tanpa exception JavaScript atau request API/akses aplikasi KMS produksi.
- Aplikasi KMS utama tetap memakai bundle `index-US0u50FK.js` sebelumnya;
  working tree repository aplikasi utama tetap bersih.

## Revisi susunan pertama — digantikan versi ringkas di bawah

- Judul dipadatkan; panel pohon dan panel aksi sejajar atas/bawah pada desktop.
- Urutan tombol normal: kumpulkan resource, rawat pohon, lalu uji waktu/kondisi.
- Ukuran tombol dan grid per kelompok diseragamkan; shortcut demo dipisahkan
  menjadi toolbar sendiri, tidak bercampur dengan aksi normal.
- Pemilihan konten dan keputusan status menjadi dua area bernomor dengan grid
  tombol keputusan 2×2; jumlah konten ditampilkan pada judul bagian.
- 29 tes aturan dan 57 cek browser lokal diulang: seluruhnya lulus.
- Tampilan desktop/HP diperiksa dari screenshot; tabel tetap bisa digeser pada
  layar kecil tanpa membuat root halaman melebar. Tidak ada request API.

## Penyederhanaan tampilan

- Menghapus judul promosi dan penjelasan statis berulang dari tampilan utama.
- Hanya tiga tombol perawatan terlihat pertama kali, bukan semua aksi sekaligus.
- Empat tab aksi: Rawat / Aktivitas / Konten / Uji demo, dengan roving tabindex,
  kontrol keyboard, dan satu panel aktif pada satu waktu.
- Aturan dan riwayat menggunakan disclosure yang tertutup secara default.
- Seluruh 19 aksi tetap tersedia; Sharing otomatis membuka tab Konten, dan
  pemilihan buah SVG juga membuka tab Konten untuk aksi berikutnya.
- Pesan hasil aksi diringkas; riwayat detail tetap tersedia bila dibuka.
- 32 tes otomatis dan 86 cek browser lokal lulus, termasuk matriks semua tab
  pada 320/390/680/900/1024/1440 px. Tidak ada exception atau request API KMS.
- Versi ringkas sudah di-deploy, Worker version
  `2f4a6f2b-d943-45dd-9278-24d071812656`.
- 86 cek diulang pada URL live: seluruhnya lulus, 0 exception, 0 request API KMS.
- Bundle live: `index-5gyAGSs0.js` / `index-BLiBF7eY.css`, HTTP 200.
- Repository aplikasi KMS utama tetap bersih, tidak diubah atau di-deploy ulang.

## Koreksi kondisi — 5 November 2026

- Mati hanya jika Air DAN Pupuk perawatan habis.
- Air habis dengan Pupuk tersisa → menguning.
- Air tersisa dengan Pupuk habis → tetap hijau; tidak mati.
- Tombol uji, tabel aturan, dan proses sync snapshot mengikuti aturan tersebut.
- 41 tes otomatis lulus, termasuk empat kombinasi kondisi, transisi decay,
  pemulihan dengan Air saja/Pupuk saja, dan buah tidak diangkat jika hanya
  Pupuk habis sementara Air masih ada.
- Koneksi akun dan kode aplikasi KMS utama tidak diubah.
- Sudah deploy ke simulator: Worker version `8d580190-fc8f-4c36-85a0-3ac16d07f621`.
- 90 cek browser live lulus, termasuk hijau setelah diberi Air saat Pupuk nol,
  menguning setelah diberi Pupuk saat Air nol, lalu mati setelah kedua nilai
  habis melalui decay. Tidak ada exception JavaScript atau request API KMS.

## Koreksi contoh awal dan +7 hari — 5 November 2026

- Ditemukan contoh L3 memiliki progres 9/6 tetapi perawatan tersembunyi 1/1.
  Pengurangan sudah benar, namun cadangan awal demo tidak representatif.
- Boost Level sekarang mengisi perawatan sesuai ambang level, sehingga contoh
  L3 memiliki 9 Air dan 6 Pupuk di pohon.
- +7 hari tetap hanya mengurangi 1 Air dan 0,5 Pupuk per periode, minimum nol.
  Tidak menambahkan aturan kuning/mati berdasarkan jumlah klik.
- Label Sisa di pohon diperjelas; feedback menunjukkan nilai sebelum → sesudah.
- 42 tes simulator dan 155 tes KMS lulus; 100 cek browser simulator lokal lulus.
- Uji berulang 12 klik dari contoh L3: klik 1–8 hijau; saat Air nol dan Pupuk
  tersisa kuning; saat keduanya nol mati. Storage dan Level 3 tidak berubah.
- Tidak ada reset/migrasi state akun produksi. Akun lama mengikuti nilai
  perawatannya sendiri, bukan dipaksa memakai nilai contoh L3.

## Dua sudut pandang — 5 November 2026

- Pengguna dan Admin dipisahkan dengan tombol sudut pandang yang menjaga state.
- Pengguna memiliki Rawat/Aktivitas/Konten saya tanpa keputusan admin.
- Admin memiliki pilihan konten dan keputusan, tanpa tombol aktivitas user.
- Alat demo dipindahkan ke disclosure terpisah; aturan/riwayat tetap tertutup.
- Guard UI menolak pemanggilan tombol role lain; ini simulasi, bukan autentikasi.
- Handoff Sharing → Admin → ACC → Storage pengguna diuji dengan klik browser.
- Flow step, badge antrean, keputusan ulang, slot buah, dan +7 hari tetap bekerja.
- Di HP admin melihat review dahulu; pengguna melihat pohon dahulu.
- 47 tes simulator lulus. 114 cek browser lokal lulus termasuk kedua role,
  semua tab aturan, kontrol demo, dan viewport 320/390/680/900/1024/1440 px.
- 155 tes aplikasi utama tetap lulus; tidak ada perubahan source KMS utama.
- Bukti: `qa-tree-roles.mjs` dan `qa-tree-roles-results.json` di folder temporary
  OpenCode. Screenshot admin: `tree-roles-admin-desktop.png` dan
  `tree-roles-admin-mobile.png`.
