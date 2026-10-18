/**
 * js/config.js
 * Konfigurasi terpusat media pembelajaran Topologi Star 3D
 */

// Nilai Kriteria Ketuntasan Minimal (KKM)
export const KKM = 75;

// Pemetaan ID logis ke nama node objek pada file GLB
export const MODEL_NODE_NAMES = {
    switch:  "Switch",
    router:  "Router",
    pc01:    "PC01",
    pc02:    "PC02",
    pc03:    "PC03",
    pc04:    "PC04",
    pc05:    "PC05",
    pc06:    "PC06",
    printer: "Printer",
    cable:   "Cable"
};

// Data detail informasi setiap perangkat
export const DEVICE_INFO = {
    switch: {
        id: "switch",
        name: "Switch Jaringan",
        category: "switch",
        categoryLabel: "Perangkat Pusat (Switch)",
        icon: "🔀",
        isCore: true,
        fungsi: "Menghubungkan beberapa perangkat dalam satu jaringan lokal (LAN), membaca MAC Address frame data, dan meneruskan data hanya ke port perangkat tujuan.",
        peran: "Switch merupakan PERANGKAT PUSAT (sentral) pada Topologi Star. Seluruh komunikasi antar-PC client wajib melewati Switch.",
        contoh: "Di laboratorium komputer, Switch 24-Port menghubungkan seluruh komputer murid ke server lokal."
    },
    router: {
        id: "router",
        name: "Router Gateway",
        category: "router",
        categoryLabel: "Router (Perangkat Tambahan)",
        icon: "🌐",
        isCore: false,
        fungsi: "Menghubungkan jaringan lokal (LAN) dengan jaringan luar seperti Internet atau WAN serta mengelola IP address melalui DHCP.",
        peran: "Router adalah PERANGKAT TAMBAHAN dan BUKAN perangkat pusat Topologi Star. Topologi Star tetap berfungsi tanpa router jika hanya berkomunikasi di jaringan lokal.",
        contoh: "Router WiFi / Modem yang menghubungkan jaringan lab komputer sekolah ke internet penyedia layanan (ISP)."
    },
    pc01: {
        id: "pc01",
        name: "PC Client 01",
        category: "pc",
        categoryLabel: "Komputer Client (PC)",
        icon: "💻",
        isCore: true,
        fungsi: "Sebagai workstation pengguna untuk mengolah data, mengirim permintaan (request), serta menerima data dari jaringan.",
        peran: "Sebagai simpul ujung (node/end-device) yang terhubung langsung secara point-to-point ke Switch melalui satu jalur kabel.",
        contoh: "Komputer staf administrasi yang mengirim file dokumen ke komputer pimpinan melalui jaringan lokal."
    },
    pc02: {
        id: "pc02",
        name: "PC Client 02",
        category: "pc",
        categoryLabel: "Komputer Client (PC)",
        icon: "💻",
        isCore: true,
        fungsi: "Sebagai perangkat client dalam jaringan lokal untuk menjalankan aplikasi dan berkomunikasi dengan komputer lain.",
        peran: "Node client yang berdiri sendiri. Jika kabel PC ini putus, komputer lain di topologi star tetap dapat bekerja normal.",
        contoh: "Komputer kasir yang mengirimkan data transaksi harian ke komputer manajer."
    },
    pc03: {
        id: "pc03",
        name: "PC Client 03",
        category: "pc",
        categoryLabel: "Komputer Client (PC)",
        icon: "💻",
        isCore: true,
        fungsi: "Perangkat pemroses data client yang memiliki Network Interface Card (NIC) untuk terhubung ke Switch.",
        peran: "Menerima kiriman paket data yang diforward oleh Switch berdasarkan kecocokan MAC address.",
        contoh: "Komputer lab siswa nomor 3 yang sedang mengakses materi pembelajaran bersama."
    },
    pc04: {
        id: "pc04",
        name: "PC Client 04",
        category: "pc",
        categoryLabel: "Komputer Client (PC)",
        icon: "💻",
        isCore: true,
        fungsi: "Sebagai client penerima dan pengirim data dalam jaringan topologi star.",
        peran: "Terhubung ke salah satu port fisik pada Switch pusat.",
        contoh: "Komputer operator perpustakaan untuk mengecek ketersediaan buku."
    },
    pc05: {
        id: "pc05",
        name: "PC Client 05",
        category: "pc",
        categoryLabel: "Komputer Client (PC)",
        icon: "💻",
        isCore: true,
        fungsi: "Workstation pengguna yang terhubung dalam satu segmen jaringan LAN.",
        peran: "Dapat berkomunikasi dengan PC lainnya selama Switch pusat aktif dan beroperasi.",
        contoh: "Komputer meja resepsionis di kantor."
    },
    pc06: {
        id: "pc06",
        name: "PC Client 06",
        category: "pc",
        categoryLabel: "Komputer Client (PC)",
        icon: "💻",
        isCore: true,
        fungsi: "Workstation pengguna untuk pengiriman dan penerimaan informasi.",
        peran: "Menjadi simpul jaringan bintang independen dengan koneksi kabel tersendiri ke Switch.",
        contoh: "Komputer bagian gudang untuk input inventaris stok."
    },
    printer: {
        id: "printer",
        name: "Network Printer",
        category: "printer",
        categoryLabel: "Printer Jaringan (Shared Resource)",
        icon: "🖨️",
        isCore: false,
        fungsi: "Mencetak dokumen fisik yang dikirimkan oleh berbagai komputer client dalam jaringan.",
        peran: "Sebagai shared resource (perangkat bersama). Terhubung langsung ke Switch sehingga dapat diakses bersama oleh semua PC client.",
        contoh: "Printer jaringan di ruang guru yang dapat digunakan mencetak soal dari PC mana saja."
    },
    cable: {
        id: "cable",
        name: "Kabel UTP & Konektor RJ-45",
        category: "cable",
        categoryLabel: "Kabel Jaringan (Media Transmisi)",
        icon: "🔌",
        isCore: true,
        fungsi: "Media fisik penghantar sinyal listrik data dari Network Interface Card (NIC) perangkat menuju port Switch.",
        peran: "Membentuk hubungan point-to-point khusus antara setiap perangkat dengan Switch pusat. Kerusakan pada satu kabel hanya mempengaruhi 1 perangkat terkait.",
        contoh: "Kabel UTP Category 5e/6 dengan konektor RJ-45 standar T568B berkecepatan 1 Gbps."
    }
};

// Kategori progres eksplorasi yang harus dipelajari siswa
export const LEARNING_CATEGORIES = [
    { key: "switch",  label: "Switch (Perangkat Pusat)", required: true },
    { key: "pc",      label: "PC Client (Node Komputer)", required: true },
    { key: "cable",   label: "Kabel UTP & Konektor RJ-45", required: true },
    { key: "router",  label: "Router (Gateway Luar)",    required: false },
    { key: "printer", label: "Printer Jaringan (Sharing)", required: false }
];
