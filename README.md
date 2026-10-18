# 3D Interactive - Media Pembelajaran Topologi Jaringan Star

Aplikasi media pembelajaran interaktif berbasis web 3D untuk mempelajari hardware, fungsi perangkat, peran sentral konsentrator (Switch), dan alur transmisi data pada **Topologi Jaringan Star**. Dibangun menggunakan teknologi web client-side: **HTML5, CSS3, JavaScript ES Module, dan Three.js**.

---

## 🎯 Alur Pembelajaran (Learning Flow)

```
[HALAMAN 1] Beranda (START)
       ↓
[HALAMAN 2] Loading Bar & Inisialisasi Modul
       ↓
[HALAMAN 3] Tujuan Pembelajaran & Skema Topologi Star
       ↓
[HALAMAN 4] Eksplorasi 3D Interaktif
       ├─ Rotate, Zoom In/Out, Reset View
       ├─ Klik Perangkat (Highlight Cyan + Smooth Camera Focus)
       ├─ Pelajari Fungsi, Peran Sentral Switch, & Contoh Penerapan
       └─ Selesaikan Semua Kategori Perangkat (Switch, PC Client, Kabel, Router, Printer)
       ↓
[HALAMAN 5] Simulasi Alur Data (5 Tahap Pengiriman Melalui Switch)
       ↓
[HALAMAN 6] Kuis Utama (10 Soal Acak)
       ↓
[HALAMAN 7] Hasil Kuis & Evaluasi KKM (75)
       ├─ Jika Nilai ≥ 75 (BERHASIL) → Ringkasan Kompetensi → Selesai
       └─ Jika Nilai < 75 (BELUM BERHASIL) → Pembahasan Khusus Soal Salah → Pelajari Kembali / Ulangi Kuis
```

---

## 📁 Struktur Berkas

```
topologi-star-3d/
├── index.html                  # Beranda, Loading, dan Tujuan Pembelajaran
├── materi.html                 # Eksplorasi 3D dan Simulasi Alur Data
├── kuis.html                   # Kuis Utama (10 soal acak)
├── hasil.html                  # Halaman Evaluasi Nilai, KKM, & Pembahasan Soal Salah
├── README.md                   # Petunjuk penggunaan dan dokumentasi teknis
├── topologi_star_6pc_blender_v2.py # Script pembuat model 3D (Blender 3.x / 4.x)
├── css/
│   └── style.css               # Desain glassmorphism, responsive UI, & animasi SVG
├── js/
│   ├── config.js               # Konfigurasi KKM, pemetaan nama node, dan info perangkat
│   ├── questions.js            # Bank soal kuis lengkap beserta kunci & pembahasan
│   ├── main.js                 # Kontrol navigasi dan simulasi loading di index.html
│   ├── loading.js              # Animasi canvas node jaringan di latar belakang
│   ├── topology3d.js           # Engine Three.js, Raycaster bertingkat, & inspeksi node
│   ├── interaction.js          # Manajemen panel info, progres toleran, & kontrol zoom
│   ├── simulation.js           # Animasi pengiriman paket data 5 tahap (SVG)
│   ├── quiz.js                 # Logika pengacakan soal, perekaman jawaban, & kalkulasi skor
│   └── result.js               # Evaluasi KKM, filter pembahasan soal salah, & evaluasi
└── models/
    ├── topologi-star.glb       # File model 3D utama (jika tersedia)
    └── BACA-SAYA.txt           # Petunjuk penempatan model
```

---

## 🚀 Cara Menjalankan Project

1. Buka folder project di editor kode (seperti VS Code).
2. Jalankan lokal web server, misalnya:
   - Menggunakan ekstensi **Live Server** di VS Code (klik kanan `index.html` → *Open with Live Server*).
   - Atau menggunakan dev server npm (`npm run dev`).
3. Buka halaman di browser: `http://localhost:3000/index.html` atau alamat Live Server.

---

## ⚙️ Konfigurasi KKM & Pengaturan

### 1. Mengubah Nilai KKM
Buka berkas `js/config.js`, ubah nilai konstanta `KKM`:
```javascript
export const KKM = 75; // Ubah nilai KKM sesuai kebutuhan kurikulum
```

### 2. Inspeksi Model 3D di Console (F12)
Engine 3D secara otomatis mencetak hasil pemindaian node objek di Console Browser:
- `[FOUND] Switch -> Node: "Switch"`
- `[FOUND] PC Client 01 -> Node: "PC01"`
- `[NOT FOUND] ...` jika node dengan nama tersebut tidak ditemukan.

Sistem dilengkapi algoritma pencarian hierarki (parent traversal) sehingga mengklik bagian mesh mana pun (seperti monitor, CPU, atau antena) akan secara otomatis mengenali perangkat utuh.

---

## 💡 Fitur Unggulan

1. **Hierarchical Raycaster:** Mendukung mesh majemuk di mana klik pada child node secara otomatis menelusuri ke root node perangkat.
2. **Smooth Camera Focus:** Kamera melakukan zoom dan interpolasi halus ke bounding box perangkat tanpa menembus mesh.
3. **Simulasi Alur Data 5-Tahap:** Menekankan aturan dasar Topologi Star bahwa seluruh komunikasi antar-PC **wajib** melalui Switch konsentrator.
4. **Evaluasi Berbasis Kesalahan (Adaptive Review):** Jika nilai di bawah KKM, sistem hanya menampilkan butir soal yang dijawab salah lengkap dengan penjelasan detailnya.
