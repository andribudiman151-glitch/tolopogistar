/**
 * js/questions.js
 * Bank Soal Kuis Utama Media Pembelajaran Interaktif 3D Topologi Jaringan Star
 * Fokus: Peran Sentral Switch, Alur Transmisi Data, Hardware, dan Karakteristik Jaringan Star
 */

export const questions = [
    {
        id: 1,
        category: "PERAN SENTRAL SWITCH",
        categoryIcon: "🔀",
        question: "Perangkat keras apa yang berperan sebagai simpul pusat konsentrator utama pada struktur Topologi Star?",
        options: [
            "Router Gateway",
            "Switch Jaringan",
            "Network Interface Card (NIC)",
            "Server DHCP"
        ],
        answer: 1,
        explanation: "Switch adalah perangkat sentral (konsentrator utama) pada Topologi Star. Seluruh komputer client dan perangkat periferal terhubung langsung ke port-port fisik pada Switch."
    },
    {
        id: 2,
        category: "ALUR TRANSMISI DATA",
        categoryIcon: "⚡",
        question: "Bagaimanakah alur pengiriman paket data yang benar dari PC 01 menuju PC 03 pada Topologi Star?",
        options: [
            "PC 01 mengirimkan data langsung ke PC 03 tanpa perantara",
            "PC 01 → Router Gateway → PC 03",
            "PC 01 → Switch Sentral → PC 03",
            "PC 01 → PC 02 → PC 03 secara serial berantai"
        ],
        answer: 2,
        explanation: "Prinsip utama Topologi Star adalah seluruh pertukaran data antar-workstation wajib melewati konsentrator pusat (Switch). PC 01 tidak dapat mengirim langsung ke PC 03 tanpa melalui Switch."
    },
    {
        id: 3,
        category: "MEKANISME KERJA SWITCH",
        categoryIcon: "🔍",
        question: "Bagaimana cara Switch memastikan paket data dari PC 01 hanya diteruskan spesifik ke PC 03 dan tidak bocor ke PC lain?",
        options: [
            "Switch membroadcast data ke semua port secara acak",
            "Switch membaca MAC Address tujuan pada frame data dan meneruskannya spesifik ke port PC 03",
            "Switch mengubah kabel UTP menjadi gelombang radio nirkabel",
            "Switch menunggu seluruh komputer client lainnya dimatikan terlebih dahulu"
        ],
        answer: 1,
        explanation: "Switch bekerja pada Data Link Layer (Layer 2 OSI) dan memanfaatkan MAC Address Table. Switch membaca alamat fisik (MAC Address) tujuan pada frame data lalu memforward paket secara unicast hanya ke port PC tujuan."
    },
    {
        id: 4,
        category: "KEGAGALAN SISTEM (SINGLE POINT OF FAILURE)",
        categoryIcon: "⚠️",
        question: "Apa yang akan terjadi pada seluruh jaringan Topologi Star jika Switch pusat mengalami kerusakan total atau mati listrik?",
        options: [
            "Jaringan tetap berfungsi normal karena PC saling terhubung langsung",
            "Komputer client otomatis beralih menjadi topologi Bus secara mandiri",
            "Seluruh komunikasi jaringan lumpuh total karena Switch adalah simpul pusat tunggal",
            "Hanya PC 01 yang mati, sedangkan PC lainnya tetap terhubung"
        ],
        answer: 2,
        explanation: "Switch adalah 'Single Point of Failure' pada Topologi Star. Karena semua aliran data berpusat padanya, jika Switch mati atau rusak, seluruh komunikasi antarperangkat di dalam jaringan terhenti total."
    },
    {
        id: 5,
        category: "ISOLASI KERUSAKAN KABEL",
        categoryIcon: "🔌",
        question: "Jika kabel UTP yang menghubungkan PC 02 ke Switch putus, bagaimana dampaknya terhadap komunikasi antara PC 01 dan PC 03?",
        options: [
            "Seluruh jaringan langsung mati total",
            "PC 01 dan PC 03 tetap dapat berkomunikasi normal melalui Switch karena jalur kabelnya independen",
            "PC 01 hanya bisa mengirim data ke Printer",
            "Kecepatan transfer PC 01 dan PC 03 menurun menjadi 0 Mbps"
        ],
        answer: 1,
        explanation: "Keunggulan utama Topologi Star adalah isolasi gangguan (fault tolerance). Setiap PC memiliki jalur kabel point-to-point tersendiri ke Switch, sehingga kerusakan pada kabel satu PC tidak mempengaruhi PC lainnya."
    },
    {
        id: 6,
        category: "MEDIA TRANSMISI KABEL & KONEKTOR",
        categoryIcon: "🖧",
        question: "Media transmisi fisik apa yang menghubungkan Network Interface Card (NIC) setiap client ke port Switch pada Topologi Star?",
        options: [
            "Kabel Coaxial dengan konektor BNC",
            "Kabel UTP (Unshielded Twisted Pair) dengan konektor RJ-45",
            "Kabel Telepon RJ-11 dua kawat",
            "Kabel Antena Televisi 75 Ohm"
        ],
        answer: 1,
        explanation: "Standar media transmisi fisik kabel pada Topologi Star LAN modern adalah kabel UTP (Cat 5e/6) yang dipasangi konektor modular 8-pin RJ-45 berstandar T568A/B."
    },
    {
        id: 7,
        category: "SHARED RESOURCE (NETWORK PRINTER)",
        categoryIcon: "🖨️",
        question: "Bagaimanakah alur transmisi data saat PC 04 ingin mencetak dokumen ke Network Printer di Topologi Star?",
        options: [
            "PC 04 harus memindahkan kabel fisiknya langsung ke printer",
            "PC 04 → Switch Sentral → Network Printer",
            "PC 04 → Router → PC 01 → Network Printer",
            "Printer hanya bisa menerima data cetak dari Router luar"
        ],
        answer: 1,
        explanation: "Network Printer berperan sebagai shared resource (perangkat bersama) yang terhubung langsung ke salah satu port Switch. Permintaan cetak dari PC 04 dikirim ke Switch, lalu diteruskan oleh Switch ke Printer."
    },
    {
        id: 8,
        category: "PERAN PERANGKAT ROUTER",
        categoryIcon: "🌐",
        question: "Apakah Topologi Star tetap dapat berfungsi untuk komunikasi antarkomputer lokal (LAN) jika tidak ada perangkat Router?",
        options: [
            "Tidak bisa, karena Router adalah pusat wajib topologi star",
            "Bisa, karena Router hanyalah gateway tambahan untuk akses ke jaringan luar / Internet",
            "Tidak bisa, karena komputer tidak bisa menyala tanpa router",
            "Hanya bisa jika jumlah PC tidak lebih dari 2 unit"
        ],
        answer: 1,
        explanation: "Router adalah perangkat tambahan (gateway) untuk menghubungkan LAN lokal ke WAN/Internet. Topologi Star lokal tetap dapat berfungsi penuh untuk saling berkirim data antar-PC dan Printer hanya menggunakan Switch."
    },
    {
        id: 9,
        category: "EFISIENSI SWITCH VS HUB",
        categoryIcon: "⚡",
        question: "Mengapa penggunaan Switch pada Topologi Star jauh lebih unggul dibandingkan Hub konvensional?",
        options: [
            "Hub berukuran fisik jauh lebih besar daripada Switch",
            "Switch mengisolasi collision domain per port dan mengirim data terarah, sedangkan Hub membroadcast data ke seluruh port sehingga rawan tabrakan data",
            "Hub memerlukan antena satelit sedangkan Switch tidak",
            "Switch tidak membutuhkan kabel jaringan fisik"
        ],
        answer: 1,
        explanation: "Hub bekerja secara broadcast murni (Layer 1) yang menyebabkan tabrakan data (collision domain tunggal). Switch mengisolasi collision domain pada tiap port dan meneruskan paket secara cerdas berdasarkan tabel MAC address (Layer 2)."
    },
    {
        id: 10,
        category: "SKALABILITAS JARINGAN STAR",
        categoryIcon: "➕",
        question: "Jika administrator ingin menambahkan unit PC baru (PC 07) ke jaringan Topologi Star yang sedang beroperasi, apa yang harus dilakukan?",
        options: [
            "Mematikan seluruh jaringan dan mengatur ulang konfigurasi kabel dari awal",
            "Cukup menarik kabel UTP baru dari PC 07 dan mencolokkannya ke port Switch yang masih tersedia tanpa mengganggu jaringan lain",
            "Membagi satu kabel PC lama menjadi dua menggunakan sambungan manual",
            "Mengganti seluruh Switch lama dengan Hub"
        ],
        answer: 1,
        explanation: "Skalabilitas Topologi Star sangat fleksibel: penambahan client baru dapat dilakukan dengan menyambungkan kabel baru ke port Switch yang tersedia tanpa perlu mematikan (downtime) jaringan yang sedang berjalan."
    }
];
