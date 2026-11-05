# Kebunku — Simulator Pohon

Halaman mandiri untuk menguji pohon SVG dan aturan gamifikasi melalui tombol.
Worker: **kebunku-tree-simulator** — berbeda dari aplikasi KMS utama.

Live: **https://kebunku-tree-simulator.testtry.workers.dev**

Source versi GitHub berada di subfolder `simulator-pohon/` dalam repo
`alfarissm/kms-knowledge-garden-prototype`. Jalankan perintah simulator dari
subfolder ini, bukan root KMS. Folder sibling lama di luar repo bukan lagi
sumber deployment versi GitHub.

## Isolasi

- Tidak ada login, API akun, secret, atau koneksi database.
- Seluruh state hanya berada dalam memori tab; reload memuat ulang contoh L3.
- Tombol Mulai ulang mengembalikan simulasi ke Level 0.
- Tidak memanggil API Kebunku produksi atau mengubah akun asli.
- Cloudflare hanya menyajikan berkas statis hasil build.

## Menjalankan

```sh
npm ci
npm test
npm run dev
npm run deploy
```

Node 22.12+ atau 20.19+. Dev pada port 5180.

`src/engine/` adalah snapshot mesin gamifikasi dan renderer SVG aplikasi utama,
disalin oleh `npm run sync-engine`. Sinkronisasi hanya membaca project asli;
tidak menulis ke sana dan tidak dijalankan otomatis saat deploy.

## Aksi

Tampilan awal hanya menampilkan pohon, angka progres/Storage, dan tiga tombol
perawatan. Aksi lain dikelompokkan dalam tab **Aktivitas**, **Konten**, dan
**Uji demo**. Tabel aturan dan riwayat ditutup secara default; buka bila perlu.

- Login harian, penuntasan materi baru, ulasan contoh, Sharing baru.
- Siram, pupuk, pasang satu buah.
- Pilih konten lalu ACC, basi, tidak relevan, atau duplikat.
- Waktu +7 hari; kondisi menguning/mati/sehat.
- Jalan pintas demo: resource tambahan, level naik/turun, contoh L3 dengan buah.
- Reset memakai konfirmasi inline, bukan popup.

Setiap penuntasan Learning mewakili materi baru. Tombol ulasan mewakili bintang
dan komentar contoh untuk materi terakhir; simulator ini bukan form kuis/ulasan.
Waktu dibekukan selain saat tombol +7 hari ditekan. Aturan level, reward, decay,
dan buah dijalankan oleh snapshot mesin KMS. Aturan kondisi simulator sudah
dikoreksi sesuai permintaan: Air perawatan habis → menguning (selama Pupuk masih
ada); Air DAN Pupuk perawatan habis → mati. Pupuk habis sendirian tidak mematikan
pohon jika Air masih ada. Saldo Storage berbeda dari nilai perawatan.

`sync-engine` mempertahankan koreksi kondisi ini saat mengambil ulang snapshot.
Aplikasi KMS utama tidak ikut diubah oleh sinkronisasi atau deploy simulator.

Contoh L3 dimulai dengan 9 Air / 6 Pupuk di pohon (bukan nilai tersembunyi 1/1).
Setiap +7 hari: Air pohon −1 dan Pupuk −0,5, minimum nol. Contoh tersebut tetap
hijau setelah dua klik (7 Air / 5 Pupuk), menguning saat Air mencapai nol, dan
mati hanya saat keduanya nol. Storage dan level tetap. Tombol uji Menguning/Mati
tetap tersedia sebagai override demo yang terpisah dari tombol waktu.

Pohon berasal dari kode SVG, bukan gambar raster. Slot 1–7 terlihat langsung;
kelebihan jumlah mengikuti penanda +n seperti aplikasi utama.
