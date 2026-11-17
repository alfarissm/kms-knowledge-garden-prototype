"""Generate offline SVG flowcharts and a print-ready six-page HTML guide."""
from pathlib import Path
from html import escape

DOCS = Path(__file__).resolve().parents[1] / 'docs'
DOCS.mkdir(exist_ok=True)
INK, GREEN, BLUE, AMBER = '#234338', '#2d7650', '#327ea2', '#9a6d2d'

def text(x, y, lines, size=22, fill=INK, weight=600):
    if isinstance(lines, str): lines = [lines]
    first = y - (len(lines)-1) * size * .65
    return ''.join(f'<text x="{x}" y="{first+i*size*1.3}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}">{escape(line)}</text>' for i,line in enumerate(lines))

def box(x,y,w,h,title,sub=None,fill='#eef5e9',stroke='#c6d9bd',title_color=INK):
    markup=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    if sub:
        markup+=text(x+w/2,y+31,title,22,title_color)
        markup+=text(x+w/2,y+h*.68,sub,18,'#5f7565',400)
    else: markup+=text(x+w/2,y+h/2,title,22,title_color)
    return markup

def diamond(cx,cy,rx,ry,lines):
    return f'<path d="M{cx} {cy-ry}L{cx+rx} {cy}L{cx} {cy+ry}L{cx-rx} {cy}Z" fill="#fff5df" stroke="#d6bb83" stroke-width="2"/>'+text(cx,cy,lines,22,INK)

def arrow(points,label=None,lx=0,ly=0):
    d='M'+'L'.join(f'{x} {y}' for x,y in points)
    out=f'<path d="{d}" fill="none" stroke="#7c9180" stroke-width="3" stroke-linejoin="round" marker-end="url(#arrow)"/>'
    if label: out+=f'<rect x="{lx-35}" y="{ly-13}" width="70" height="26" rx="6" fill="white"/>'+text(lx,ly,label,18,'#536a5b')
    return out

def svg(name,title,height,content):
    body=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 {height}" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0L8 4L0 8" fill="#7c9180"/></marker></defs><rect width="1000" height="{height}" fill="white"/>{content}</svg>'''
    (DOCS/name).write_text(body,encoding='utf-8')
    return body

parts=[]
for i,(role,title,sub,fill,stroke,tone) in enumerate([
    ('PENGGUNA','Kirim Sharing',['Status menunggu'], '#eef5e9','#c6d9bd',GREEN),
    ('ADMIN','Review → ACC',['Pertama dari menunggu'],'#fff5e6','#e2c99b',AMBER),
    ('SISTEM','Reward → Storage',['+6 Air · +4 Pupuk','+1 Buah'],'#eaf4fb','#bfd9e8',BLUE),
    ('PENGGUNA','Rawat pohon',['Storage → pohon'],'#eef5e9','#c6d9bd',GREEN),
]):
    x=10+i*250
    parts.append(text(x+115,35,role,19,tone))
    parts.append(box(x,70,230,150,title,sub,fill,stroke))
    if i<3: parts.append(arrow([(x+232,145),(x+248,145)]))
parts.append(text(500,267,'Reward tidak langsung menaikkan level. Air dan Pupuk perlu digunakan.',21,'#607464',400))
svg('flowchart-01-alur-peran.svg','Alur Pengguna, Admin, reward dan perawatan pohon',300,''.join(parts))

parts=[diamond(500,75,140,58,['Keputusan','admin'])]
for x,title,sub,fill,stroke,tone in [
    (10,'ACC / relevan',['Merah matang','Storage → pohon L3+'], '#fff0ea','#e7c0b4','#ae4132'),
    (260,'Basi',['Cokelat busuk','Rebah di tanah'], '#f5ece2','#dbc7ad','#80552f'),
    (510,'Tidak relevan',['Buah diangkat','Slot kosong'], '#f3f5f2','#d8dfd4','#5b6d54'),
    (760,'Duplikat',['Buah diangkat','Slot kosong'], '#f3f5f2','#d8dfd4','#5b6d54'),
]:
    parts.append(arrow([(500,135),(500,177),(x+115,177),(x+115,215)]))
    parts.append(box(x,215,230,130,title,sub,fill,stroke,tone))
svg('flowchart-02-status-buah.svg','Keputusan konten dan warna atau posisi buah',365,''.join(parts))

parts=[box(345,10,310,65,'Tekan +7 hari'),arrow([(500,75),(500,105)]),
       box(265,105,470,90,'Kurangi progres & perawatan',['Air −1 · Pupuk −0,5 · minimum 0'],'#eaf4fb','#bfd9e8'),
       arrow([(500,195),(500,245)]),diamond(500,305,120,60,['Air pohon','habis?']),
       arrow([(620,305),(765,305)],'Tidak',693,285),box(765,265,215,80,'HIJAU',['Air masih ada']),
       arrow([(500,365),(500,405)],'Ya',555,386),diamond(500,465,120,60,['Pupuk pohon','habis?']),
       arrow([(380,465),(235,465)],'Tidak',302,446),box(20,425,215,85,'MENGUNING',['Pupuk masih ada'],'#fff5df','#d6bb83'),
       arrow([(500,525),(500,560)],'Ya',555,543),box(385,560,230,80,'MATI',['Keduanya habis'],'#f5ece2','#dbc7ad')]
svg('flowchart-03-decay-kondisi.svg','Pengurangan tujuh hari dan pemeriksaan kondisi dari nilai tersisa',650,''.join(parts))

def table(headers,rows,widths=None):
    cols='' if not widths else '<colgroup>'+''.join(f'<col style="width:{w}%">' for w in widths)+'</colgroup>'
    return '<table>'+cols+'<thead><tr>'+''.join(f'<th scope="col">{h}</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<{"th scope=\"row\"" if i==0 else "td"}>{v}</{"th" if i==0 else "td"}>' for i,v in enumerate(row))+'</tr>' for row in rows)+'</tbody></table>'

def callout(title,body): return f'<div class="callout"><strong>{title}</strong><span>{body}</span></div>'
def grid(*cards): return '<div class="grid">'+''.join(f'<article class="card"><h3>{title}</h3>{body}</article>' for title,body in cards)+'</div>'
def chart(file,cls=''): return f'<img class="chart {cls}" src="{file}" alt="{escape(file)}">'

pages=[]
def page(kicker,title,subtitle,body):
    n=len(pages)+1
    pages.append(f'<section class="sheet"><header><span>KEBUNKU / DOKUMENTASI SIMULATOR</span><span>17 NOV 2026</span></header><div class="page-title"><p>{kicker}</p><h1>{title}</h1><div class="subtitle">{subtitle}</div></div>{body}<footer><span>Panduan Pengguna &amp; Admin · revisi bintang 17 November 2026</span><b>{n:02} / 06</b></footer></section>')

page('01 · GAMBARAN UTAMA','Satu pohon. Dua peran.','Siapa melakukan apa, dan bagaimana aktivitas menjadi pertumbuhan.',
     grid(('PENGGUNA','<ul><li>Kirim konten dan selesaikan Learning.</li><li>Terima reward di Storage.</li><li>Siram, pupuk, dan pasang buah.</li></ul>'),
          ('ADMIN','<ul><li>Pilih konten pengguna.</li><li>Putuskan status konten.</li><li>Lihat hasil pada kebun pengguna.</li></ul>'))+
     '<h2>Flowchart utama</h2>'+chart('flowchart-01-alur-peran.svg')+
     callout('Urutan klik','Aktivitas → Sharing baru → Lanjut ke admin → ACC → Lihat Storage pengguna → Rawat')+
     '<h2>Batas simulator</h2>'+table(['Yang ada','Yang tidak ada'],[
         ['Dua sudut pandang pada halaman yang sama','Login, akun sungguhan, dan database Neon'],
         ['State pohon bersama di memori tab','Penyimpanan lintas perangkat'],
         ['Tombol contoh aktivitas dan keputusan','Form kuis atau komentar manual'],
         ['Alat demo terpisah, aturan dan riwayat dapat dibuka','Perubahan terhadap akun KMS asli'],
     ])+'<p class="link">Live: https://kebunku-tree-simulator.testtry.workers.dev</p>')

levels=[['L0','Tanah kosong','0','0'],['L1','Bibit','1','1'],['L2','Daun','3','2'],['L3','Mulai berbuah','7','5'],['L4','Pohon besar','27','18'],['L5','Cabang kiri','52','30'],['L6','Cabang kanan','77','42'],['L7','Pohon penuh','101','54']]
page('02 · ANGKA & PERTUMBUHAN','Bedakan tiga kelompok angka.','Storage bukan progres, dan progres bukan cadangan perawatan.',
     table(['Angka','Fungsi','Berubah karena'],[
       ['Storage','Persediaan belum dipakai','Reward menambah; perawatan memakai'],
       ['Progres','Menentukan syarat naik level','Pemakaian Air/Pupuk; dikurangi decay'],
       ['Sisa di pohon','Menentukan hijau / kuning / mati','Perawatan menambah; decay mengurangi'],
     ])+
     '<h2>Biaya dan efek perawatan</h2>'+table(['Tombol','Storage','Perawatan / progres'],[
       ['Siram','−1 Air','Perawatan +1 Air; progres +1 jika belum penuh'],
       ['Pupuk','−1 Pupuk','Perawatan +1 Pupuk; progres +1 jika belum penuh'],
       ['Pasang buah','−1 buah tersimpan','Tidak menambah progres/perawatan; sehat dan L3+'],
     ])+
     '<h2>Target kumulatif level</h2>'+table(['Level','Tahap','Air total','Pupuk total'],levels,[13,43,22,22])+
      callout('Syarat: Air ≥ target DAN Pupuk ≥ target','L2 → L3 tanpa decay: tambahan 4 Air dan 3 Pupuk. Target L3 direvisi rapat Probis; angka L4–L7 masih menunggu kalibrasi baru.')+
     '<p class="note">Jika progres sudah penuh dan tidak perlu pemulihan, resource tetap di Storage. Jika dipakai untuk pemulihan, progres penuh tidak ditambah melewati target.</p>')

page('03 · REWARD & KONTEN','Reward mengikuti aktivitas valid.','ACC = disetujui / relevan. Reward tetap masuk Storage terlebih dahulu.',
     table(['Aktivitas','Air','Pupuk','Buah','Batas'],[
       ['Login','+1','—','—','Sekali per hari simulasi'],
       ['Tuntas Learning','—','+1','—','Sekali per materi baru'],
       ['Beri bintang','+1','—','—','5 bintang contoh; setelah tuntas; sekali per materi'],
       ['Sharing baru','—','—','—','Menunggu review'],
        ['ACC pertama','+6','+4','+1','Dari menunggu; masuk Storage'],
       ['ACC ulang','—','—','Aktif kembali','Slot semula; tanpa Air/Pupuk baru'],
     ],[25,9,11,18,37])+
     '<h2>Flowchart keputusan admin</h2>'+chart('flowchart-02-status-buah.svg')+
     grid(('Syarat buah di pohon','<ul><li>Level minimal 3 dan kondisi sehat.</li><li>Pengguna memindahkan buah dari Storage.</li><li>Basi berlaku pada buah yang sudah ada.</li></ul>'),
          ('Slot tidak bergeser','<ul><li>Buah diangkat → slot kosong.</li><li>ACC ulang → slot yang sama.</li><li>Pohon tidak sehat → buah aktif kembali ke Storage; arsip basi tetap di tanah.</li></ul>')))

timeline=[['0','0','7','5','Hijau'],['1','7','6','4,5','Hijau'],['2','14','5','4','Hijau'],['6','42','1','2','Hijau'],['7','49','0','1,5','Menguning'],['9','63','0','0,5','Menguning'],['10','70','0','0','Mati']]
page('04 · WAKTU & KONDISI','+7 hari hanya mengurangi.','Bukan otomatis kuning setelah satu klik atau mati setelah dua klik.',
     chart('flowchart-03-decay-kondisi.svg','decay-chart')+
     '<div class="mini-facts"><span><b>Storage</b> tetap</span><span><b>Level tercapai</b> tetap</span><span><b>Pupuk habis sendiri</b> tidak mati</span></div>'+
     '<h2>Contoh L3: tanpa tambahan aktivitas/perawatan</h2>'+table(['Klik +7','Hari','Air pohon','Pupuk pohon','Kondisi'],timeline)+
      '<p class="note">Contoh L3 dimulai 7/5. Reset L0 dimulai dengan perawatan 1/1, sehingga Air dapat habis pada satu periode. Kondisi mengikuti nilai tersisa, bukan jumlah klik.</p>')

page('05 · PANDUAN OPERASIONAL','Ikuti tombol sesuai peran.','Berganti tampilan tidak mereset atau menggandakan reward.',
     grid(('SISI PENGGUNA','<ol><li><b>Aktivitas:</b> buat Sharing atau tuntaskan materi.</li><li><b>Konten saya:</b> lihat status, tanpa keputusan admin.</li><li><b>Lanjut ke admin:</b> kirim alur review ke sisi admin.</li><li><b>Rawat:</b> gunakan Air/Pupuk atau pasang buah.</li></ol>'),
          ('SISI ADMIN','<ol><li>Pilih konten pengguna.</li><li>Putuskan ACC, Basi, Tidak relevan, atau Duplikat.</li><li>Periksa dampak pada pohon dan antrean.</li><li>Tekan <b>Lihat Storage pengguna</b>.</li></ol>'))+
     '<h2>Alat demo — terpisah dari aksi normal</h2>'+table(['Tombol','Efek'],[
       ['+7 hari','Kurangi progres dan perawatan: 1 Air / 0,5 Pupuk per periode'],
       ['Menguning / Mati','Override kondisi: Air 0 dengan Pupuk tersisa / keduanya 0'],
        ['Sehatkan','Pulihkan perawatan; progres yang hilang tidak dikembalikan'],
        ['+1 Air / +1 Pupuk','Dua tombol terpisah: tambah satu resource ke Storage; progres tetap'],
       ['Boost','+10 Air, +6 Pupuk, +1 Buah bonus ke Storage; bukan progres'],
       ['Level +1 / −1','Jalan pintas level/progres; naik level demo mengisi cadangan sesuai ambang'],
       ['Contoh berbuah','Mulai ulang L3, tiga konten ACC, tiga buah terpasang'],
       ['Reset','Konfirmasi inline; kembali L0 dengan persediaan awal'],
     ],[28,72])+
     '<h2>Cek cepat sebelum demonstrasi</h2>'+table(['Skenario','Hasil benar'],[
       ['Sharing → ACC → Rawat','Reward masuk Storage dulu; baru pemakaian mengubah progres'],
       ['ACC ulang / slot diangkat','Tidak ada Air/Pupuk ganda; slot buah lain tetap'],
        ['Contoh L3 → +7 hari dua kali','5 Air / 4 Pupuk di pohon, tetap hijau'],
       ['Mati → Air saja / Pupuk saja','Air saja → hijau; Pupuk saja tanpa Air → menguning'],
       ['Reload','Contoh awal L3; kembali ke sisi Pengguna'],
     ])+
      callout('Di HP','Kedua peran melihat pohon dahulu, lalu panel aksi di bawahnya. Alat demo, aturan, dan riwayat dibuka hanya saat diperlukan.'))

page('06 · REFERENSI IMPLEMENTASI','Sederhana di layar, terpisah di kode.','Tidak ada koneksi ke akun asli dari simulator.',
     '<div class="architecture"><b>Browser: HTML + CSS + JavaScript</b><span>roles.js → kepemilikan aksi simulasi</span><span>simulation.js → tindakan dan state di memori</span><span>gamification.js → reward, level, perawatan, decay</span><span>tree-svg.js → gambar pohon dan buah</span><b>Vite build → dist/ → Cloudflare static assets</b></div>'+
     '<h2>Peta berkas</h2>'+table(['Berkas','Fungsi'],[
       ['index.html','Struktur dua peran dan tabel aturan'],
       ['src/main.js','Rendering, pergantian peran, event dan feedback'],
       ['src/roles.js','Aksi pengguna/admin/demo dan guard UI'],
       ['src/simulation.js','Menjalankan tombol tanpa API'],
       ['src/engine/gamification.js','Perhitungan, ledger buah, dan kondisi'],
       ['src/engine/tree-svg.js','Renderer SVG batang, cabang, daun dan buah'],
       ['src/compact-layout.css','Layout ringkas dan responsivitas'],
       ['wrangler.jsonc','Worker simulator terpisah'],
     ],[43,57])+
     '<h2>Catatan penting</h2><ul class="limits"><li>Role simulator bukan autentikasi atau batas keamanan backend.</li><li>State hanya di memori tab. Reload menghapus perubahan simulasi.</li><li>Waktu maju hanya melalui tombol +7 hari.</li><li>Parameter simulator memakai nilai bawaan; tidak otomatis mengikuti pengaturan admin KMS live.</li><li>2 unit Pupuk internal = 1 Pupuk tampilan.</li></ul>'+
      '<div class="verification"><b>Acuan aturan: Probis 13 November 2026</b><span>Hasil uji versi terbaru dicatat pada QA.md. Simulator tidak menulis ke akun atau database KMS.</span></div>'+
     '<p class="link">Source: github.com/alfarissm/kms-knowledge-garden-prototype/tree/main/simulator-pohon</p>')

css='''
*{box-sizing:border-box}body{margin:0;background:#e9eee8;color:#274638;font:14px/1.55 "Segoe UI",Arial,sans-serif}.sheet{position:relative;width:210mm;min-height:297mm;margin:20px auto;padding:14mm 14mm 24mm;background:white;box-shadow:0 6px 30px #1a3c1c10}header{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1px;color:#7a8d79;border-bottom:1px solid #dfe7db;padding-bottom:10px}.page-title{margin:22px 0}.page-title>p{margin:0 0 7px;font-size:11px;letter-spacing:1.8px;font-weight:700;color:#56815b}h1{font-size:30px;line-height:1.2;letter-spacing:-.6px;margin:0 0 10px;color:#193f30}.subtitle{font-size:14px;color:#6d806b}h2{font-size:17px;line-height:1.3;color:#2e6342;margin:22px 0 12px}h3{font-size:13px;color:#386c48;letter-spacing:.5px;margin:0 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.card{border:1px solid #dfe8d7;border-radius:10px;padding:15px;background:#f8faf5}.card ul,.card ol{margin:0;padding-left:18px}.card li{margin:6px 0;font-size:13px}.chart{display:block;width:100%;height:auto;border:1px solid #e2e9dc;border-radius:10px;padding:10px;margin:10px 0}.decay-chart{width:85%;margin:0 auto;padding:0;border:0}table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.5;margin:10px 0 16px}th,td{padding:9px 10px;border-bottom:1px solid #e1e9da;vertical-align:top;text-align:left;overflow-wrap:anywhere}thead th{background:#edf3e7;color:#3e6540;font-size:11px;font-weight:700}tbody th{font-weight:600;color:#36563c}tbody tr:nth-child(even){background:#f9fbf6}.callout{padding:12px 15px;border-left:4px solid #69a260;background:#eef5e7;border-radius:0 8px 8px 0;margin:14px 0;font-size:12px;line-height:1.65}.callout strong{display:block;color:#3d693a;margin-bottom:4px}.callout span{color:#5f7759}.note{font-size:11px;color:#75836b;line-height:1.6;margin:12px 0}.link{font-size:10px;color:#537a61;overflow-wrap:anywhere;margin-top:18px}.mini-facts{display:flex;justify-content:space-between;gap:10px;background:#f3f6ed;padding:10px;border-radius:8px;font-size:10px;margin:10px 0}.mini-facts b{display:block;font-size:11px}.architecture{display:grid;gap:8px;padding:18px;border:1px solid #d8e4ce;border-radius:10px;background:#f6f9f2;font-size:12px}.architecture b{color:#326842}.architecture span{padding-left:16px;color:#5e7858}.limits{font-size:12px;padding-left:18px;color:#61775a}.limits li{margin-bottom:7px}.verification{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px;border-radius:9px;background:#eaf3e4;color:#3c713b;font-size:13px;margin:18px 0}.verification span{grid-column:1/-1;color:#6c8063;font-size:11px}footer{position:absolute;left:14mm;right:14mm;bottom:10mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #dfe7db;padding-top:8px;font-size:9px;color:#809078}footer b{font-size:10px;color:#5c8157}@page{size:A4;margin:14mm}@media print{body{background:white}.sheet{width:auto;height:269mm;min-height:0;margin:0;padding:0 0 12mm;box-shadow:none;break-after:page}.sheet:last-child{break-after:auto}footer{left:0;right:0;bottom:0}.page-title{margin:18px 0}h2{margin-top:18px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr,.card,.chart,.callout{break-inside:avoid}}@media screen and (max-width:800px){.sheet{width:100%;margin:0 0 14px;padding:20px 18px 70px;min-height:0}.grid{grid-template-columns:1fr}.page-title h1{font-size:26px}footer{left:18px;right:18px;bottom:20px}.mini-facts{flex-wrap:wrap}}
'''
css += '\n@media print { th,td { padding:6px 10px; } h2 { margin-top:16px; } }\n'
html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Panduan Simulator Pohon Kebunku</title><style>'+css+'</style></head><body>'+''.join(pages)+'</body></html>'
(DOCS/'Panduan-Simulator-Pohon.html').write_text(html,encoding='utf-8')
print(f'{len(pages)} pages and 3 SVG flowcharts generated in {DOCS}')
