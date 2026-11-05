# QA simulator pohon

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
