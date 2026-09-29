export const LEARNING_MODULES = [
  {
    id: 'kms-fundamentals',
    title: 'Dasar Knowledge Management',
    category: 'Video + bacaan',
    duration: '7 menit',
    description: 'Kenali cara pengetahuan tim dikumpulkan, ditemukan, dan digunakan kembali.',
    resourceLabel: 'Cari video pengantar KMS',
    resourceUrl: 'https://www.youtube.com/results?search_query=knowledge+management+system+introduction',
    sections: [
      {
        heading: 'Pengetahuan perlu dikelola bersama',
        paragraphs: [
          'Knowledge Management System (KMS) membantu organisasi menangkap pengalaman, panduan, dan keputusan agar tidak berhenti di satu orang atau satu percakapan.',
          'KMS bukan sekadar tempat menyimpan berkas. Pengetahuan perlu diberi konteks, dijaga kualitasnya, dan dibuat mudah ditemukan oleh orang yang membutuhkannya.',
        ],
      },
      {
        heading: 'Alur sederhana KMS',
        paragraphs: [
          'Mulai dari mengidentifikasi pengetahuan yang berguna, menyusunnya menjadi materi yang bisa dipahami, lalu membagikannya melalui ruang yang tepat.',
          'Gunakan kembali materi tersebut dalam pekerjaan. Catat umpan balik dan perbarui isinya ketika proses atau kebijakan berubah.',
        ],
      },
    ],
    quiz: {
      prompt: 'Apa tujuan utama KMS di dalam tim?',
      answers: [
        'Menyimpan sebanyak mungkin berkas tanpa konteks',
        'Membuat pengetahuan mudah ditemukan dan digunakan kembali',
        'Menggantikan seluruh komunikasi antaranggota tim',
      ],
      correctAnswer: 1,
    },
  },
  {
    id: 'document-metadata',
    title: 'Dokumen yang Mudah Ditemukan',
    category: 'Artikel',
    duration: '5 menit',
    description: 'Gunakan judul, kategori, dan metadata yang konsisten untuk mempercepat pencarian.',
    resourceLabel: 'Cari video tentang metadata dokumen',
    resourceUrl: 'https://www.youtube.com/results?search_query=document+management+metadata+best+practices',
    sections: [
      {
        heading: 'Beri nama yang menjelaskan isi',
        paragraphs: [
          'Nama berkas seperti “Panduan onboarding — versi 2026” lebih mudah dipahami daripada “final_v7_fix”. Letakkan topik utama di awal nama.',
          'Sertakan tanggal atau nomor versi jika materi sering diperbarui, dan hindari memasukkan informasi sensitif yang tidak perlu ke nama berkas.',
        ],
      },
      {
        heading: 'Tambahkan konteks pencarian',
        paragraphs: [
          'Kategori, pemilik materi, unit kerja, dan tanggal peninjauan membantu pengguna memfilter hasil pencarian.',
          'Pilih istilah yang konsisten. Jika tim memakai istilah “pengadaan”, hindari mencampurnya dengan beberapa variasi yang membingungkan.',
        ],
      },
    ],
    quiz: {
      prompt: 'Metadata mana yang paling membantu memastikan panduan masih berlaku?',
      answers: [
        'Warna ikon pembuat dokumen',
        'Tanggal peninjauan dan pemilik materi',
        'Jumlah halaman dokumen',
      ],
      correctAnswer: 1,
    },
  },
  {
    id: 'responsible-sharing',
    title: 'Berbagi Praktik Kerja',
    category: 'Panduan',
    duration: '6 menit',
    description: 'Bagikan materi yang bisa dipakai ulang dengan konteks, sumber, dan akses yang tepat.',
    resourceLabel: 'Cari video tentang knowledge sharing',
    resourceUrl: 'https://www.youtube.com/results?search_query=knowledge+sharing+best+practices+workplace',
    sections: [
      {
        heading: 'Jelaskan manfaatnya',
        paragraphs: [
          'Saat membagikan materi, jelaskan masalah yang dibantu, siapa yang dapat memakainya, dan kapan materi tersebut terakhir diperiksa.',
          'Ringkasan singkat memberi calon pembaca alasan yang jelas untuk membuka tautan dan membantu materi ditemukan melalui pencarian.',
        ],
      },
      {
        heading: 'Jaga sumber dan akses',
        paragraphs: [
          'Cantumkan sumber asli dan pastikan tautan dapat dibuka oleh audiens yang dituju. Ikuti klasifikasi informasi dan aturan akses organisasi.',
          'Periksa apakah materi yang sama sudah ada sebelum mengirim kontribusi baru. Jika ada pembaruan, jelaskan perbedaannya dari materi terdahulu.',
        ],
      },
    ],
    quiz: {
      prompt: 'Apa yang sebaiknya disertakan saat mengirim materi Sharing?',
      answers: [
        'Tautan saja tanpa penjelasan atau sumber',
        'Konteks manfaat, ringkasan, dan sumber yang bisa diakses',
        'Salinan materi berulang agar terlihat lebih lengkap',
      ],
      correctAnswer: 1,
    },
  },
];
