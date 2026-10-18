/**
 * js/hardware-details.js
 * Data Spesifikasi Teknis Lengkap & Peran Perangkat Topologi Star
 * Serta Handler Interaktif Detail Overlay saat node SVG diagram diklik
 */

import { Hardware3DViewer } from './hardware-3d-viewer.js';

export const HARDWARE_SPECS = {
    switch: {
        id: "switch",
        name: "Switch Jaringan Sentral",
        subName: "Central Star Concentrator",
        category: "switch",
        categoryBadge: "KONSENTRATOR SENTRAL (CORE NODE)",
        badgeColor: "#00D9FF",
        icon: "🔀",
        isCore: true,
        role: "Switch adalah TITIK TUMPU SENTRAL (Pusat) pada Topologi Star. Seluruh kabel transmisi dari PC client, router, dan printer terhubung langsung ke port Switch. Switch bertindak sebagai pengatur lalu lintas data cerdas dan menjadi 'Single Point of Failure' (jika switch mati, seluruh komunikasi jaringan lumpuh).",
        specs: [
            { label: "Lapisan OSI", value: "Layer 2 (Data Link Layer)", tag: "OSI Layer" },
            { label: "Tipe Perangkat", value: "Managed / Smart Gigabit Switch", tag: "Hardware" },
            { label: "Antarmuka Fisik", value: "8 / 16 / 24 Port RJ-45 10/100/1000 Mbps", tag: "Ports" },
            { label: "Metode Switching", value: "Store-and-Forward (Validasi FCS CRC)", tag: "Architecture" },
            { label: "Tabel Alamat", value: "MAC Address Table (Filtering & Selective Forwarding)", tag: "Forwarding" },
            { label: "Domain Tabrakan", value: "Dedicated Collision Domain per Port (Bebas Tabrakan)", tag: "Efficiency" },
            { label: "Mode Duplex", value: "Full-Duplex (Kirim & terima simultan)", tag: "Duplex" },
            { label: "Toleransi Gangguan", value: "Single Point of Failure (Pusat Tunggal Jaringan)", tag: "Fault State" }
        ],
        functions: "Menerima frame data (Ethernet Frame) dari PC pengirim, membaca MAC Address tujuan di header frame, mencocokkannya ke tabel internal, lalu memforward paket data HANYA ke port fisik perangkat tujuan (bukan broadcast ke semua PC seperti Hub).",
        example: "Switch 24-Port Gigabit di laboratorium komputer yang menghubungkan seluruh PC siswa, printer, dan router internet dalam satu segmen LAN.",
        simulationPair: { src: "pc01", tgt: "pc03", note: "Simulasi alur data melewati Switch sentral" }
    },
    pc01: {
        id: "pc01",
        name: "PC Client 01",
        subName: "Workstation End-Device Node 1",
        category: "pc",
        categoryBadge: "WORKSTATION CLIENT (END-DEVICE)",
        badgeColor: "#0D6EFD",
        icon: "💻",
        isCore: true,
        role: "Sebagai simpul ujung (workstation client) yang terhubung langsung ke Switch melalui satu jalur kabel UTP point-to-point. Memiliki jalur transmisi independen sehingga jika kabelnya putus, komputer client lainnya tidak terganggu.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 7 (Application) hingga Layer 1 (Physical)", tag: "OSI Stack" },
            { label: "Antarmuka Jaringan", value: "Integrated Gigabit Ethernet NIC (RJ-45 Port)", tag: "Interface" },
            { label: "Alamat Fisik (MAC)", value: "00:1A:2B:3C:4D:01 (Unik 48-bit)", tag: "Hardware ID" },
            { label: "Alamat Logika (IP)", value: "192.168.1.11 /24 (IPv4 Subnet)", tag: "IP Address" },
            { label: "Bandwidth Link", value: "1000 Mbps (1 Gbps Full-Duplex)", tag: "Speed" },
            { label: "Media Penghubung", value: "Kabel UTP Cat 6 dengan konektor modular RJ-45", tag: "Cable" },
            { label: "Protokol Utama", value: "TCP/IP, UDP, ARP, DHCP Client, ICMP, DNS", tag: "Protocols" },
            { label: "Toleransi Kabel", value: "Fault-Isolated (Kabel putus hanya mematikan PC ini)", tag: "Fault State" }
        ],
        functions: "Menjalankan aplikasi perkantoran/pembelajaran pengguna, merangkai paket data ke dalam format Ethernet frame, serta mengirimkan frame melalui NIC menuju Switch pusat.",
        example: "Komputer siswa di baris pertama lab yang sedang mengirimkan hasil praktikum ke PC guru atau shared printer.",
        simulationPair: { src: "pc01", tgt: "pc03", note: "PC01 mengirim data ke PC03 melalui Switch" }
    },
    pc02: {
        id: "pc02",
        name: "PC Client 02",
        subName: "Workstation End-Device Node 2",
        category: "pc",
        categoryBadge: "WORKSTATION CLIENT (END-DEVICE)",
        badgeColor: "#0D6EFD",
        icon: "💻",
        isCore: true,
        role: "Workstation client mandiri dalam Topologi Star. Terhubung dengan kabel UTP tersendiri ke port 2 pada Switch sentral.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 7 (Application) hingga Layer 1 (Physical)", tag: "OSI Stack" },
            { label: "Antarmuka Jaringan", value: "Gigabit Ethernet NIC (RJ-45)", tag: "Interface" },
            { label: "Alamat Fisik (MAC)", value: "00:1A:2B:3C:4D:02 (Unik 48-bit)", tag: "Hardware ID" },
            { label: "Alamat Logika (IP)", value: "192.168.1.12 /24", tag: "IP Address" },
            { label: "Bandwidth Link", value: "1000 Mbps (1 Gbps Full-Duplex)", tag: "Speed" },
            { label: "Media Penghubung", value: "Kabel UTP Cat 6 (T568B RJ-45)", tag: "Cable" },
            { label: "Protokol Utama", value: "TCP/IP, DHCP, ARP, DNS", tag: "Protocols" },
            { label: "Toleransi Kabel", value: "Fault-Isolated (Gangguan bersifat lokal)", tag: "Fault State" }
        ],
        functions: "Sebagai titik akhir (endpoint) untuk pertukaran berkas dan komunikasi data client-ke-client melalui switch konsentrator.",
        example: "Komputer kasir atau meja admin yang bertukar informasi transaksi harian ke komputer server.",
        simulationPair: { src: "pc02", tgt: "pc05", note: "PC02 mengirim data ke PC05 via Switch" }
    },
    pc03: {
        id: "pc03",
        name: "PC Client 03",
        subName: "Workstation End-Device Node 3",
        category: "pc",
        categoryBadge: "WORKSTATION CLIENT (END-DEVICE)",
        badgeColor: "#0D6EFD",
        icon: "💻",
        isCore: true,
        role: "Simpul client penerima dan pengirim data. Menggunakan kartu jaringan NIC untuk mengubah data digital sistem menjadi sinyal listrik pada kabel UTP.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 7 hingga Layer 1 (Physical)", tag: "OSI Stack" },
            { label: "Antarmuka Jaringan", value: "Gigabit Ethernet NIC (RJ-45)", tag: "Interface" },
            { label: "Alamat Fisik (MAC)", value: "00:1A:2B:3C:4D:03", tag: "Hardware ID" },
            { label: "Alamat Logika (IP)", value: "192.168.1.13 /24", tag: "IP Address" },
            { label: "Bandwidth Link", value: "1000 Mbps Full-Duplex", tag: "Speed" },
            { label: "Media Penghubung", value: "Kabel UTP Cat 5e/6 Point-to-Point", tag: "Cable" },
            { label: "Protokol Utama", value: "TCP/IP, UDP, ICMP", tag: "Protocols" },
            { label: "Toleransi Kabel", value: "Fault-Isolated (Jalur independen)", tag: "Fault State" }
        ],
        functions: "Menerima kiriman paket data yang diforward oleh Switch pusat setelah Switch membaca kecocokan MAC address tujuannya.",
        example: "Komputer meja staf perpustakaan untuk mengecek katalog buku bersama.",
        simulationPair: { src: "pc03", tgt: "pc01", note: "PC03 mengirim data respon balik ke PC01 via Switch" }
    },
    pc04: {
        id: "pc04",
        name: "PC Client 04",
        subName: "Workstation End-Device Node 4",
        category: "pc",
        categoryBadge: "WORKSTATION CLIENT (END-DEVICE)",
        badgeColor: "#0D6EFD",
        icon: "💻",
        isCore: true,
        role: "Node client aktif pada topologi Star. Dapat mengirimkan perintah cetak ke shared network printer melalui konsentrator Switch.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 7 hingga Layer 1", tag: "OSI Stack" },
            { label: "Antarmuka Jaringan", value: "Gigabit Ethernet NIC (RJ-45)", tag: "Interface" },
            { label: "Alamat Fisik (MAC)", value: "00:1A:2B:3C:4D:04", tag: "Hardware ID" },
            { label: "Alamat Logika (IP)", value: "192.168.1.14 /24", tag: "IP Address" },
            { label: "Bandwidth Link", value: "1000 Mbps Full-Duplex", tag: "Speed" },
            { label: "Media Penghubung", value: "Kabel UTP Cat 6 Point-to-Point", tag: "Cable" },
            { label: "Protokol Utama", value: "TCP/IP, RAW 9100 Print Spool", tag: "Protocols" },
            { label: "Toleransi Kabel", value: "Fault-Isolated (Isolasi kerusakan mandiri)", tag: "Fault State" }
        ],
        functions: "Membuat frame data dokumen dan mengirimkannya ke port Switch untuk diteruskan ke Network Printer.",
        example: "Komputer guru yang mengirimkan dokumen soal ujian langsung ke printer bersama di ruang kerja.",
        simulationPair: { src: "pc04", tgt: "printer", note: "PC04 mengirim dokumen cetak ke Printer via Switch" }
    },
    pc05: {
        id: "pc05",
        name: "PC Client 05",
        subName: "Workstation End-Device Node 5",
        category: "pc",
        categoryBadge: "WORKSTATION CLIENT (END-DEVICE)",
        badgeColor: "#0D6EFD",
        icon: "💻",
        isCore: true,
        role: "Workstation client dalam jaringan lokal Star. Berkomunikasi dengan router gateway melalui Switch untuk menjangkau internet luar.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 7 hingga Layer 1", tag: "OSI Stack" },
            { label: "Antarmuka Jaringan", value: "Gigabit Ethernet NIC (RJ-45)", tag: "Interface" },
            { label: "Alamat Fisik (MAC)", value: "00:1A:2B:3C:4D:05", tag: "Hardware ID" },
            { label: "Alamat Logika (IP)", value: "192.168.1.15 /24", tag: "IP Address" },
            { label: "Bandwidth Link", value: "1000 Mbps Full-Duplex", tag: "Speed" },
            { label: "Media Penghubung", value: "Kabel UTP Cat 6 Point-to-Point", tag: "Cable" },
            { label: "Protokol Utama", value: "TCP/IP, HTTP/HTTPS, DNS", tag: "Protocols" },
            { label: "Toleransi Kabel", value: "Fault-Isolated (Kabel terpisah)", tag: "Fault State" }
        ],
        functions: "Mengirimkan request penjelajahan web ke gateway router melalui jalur Switch sentral.",
        example: "Komputer lab yang sedang mengakses modul ujian online di server internet.",
        simulationPair: { src: "pc05", tgt: "router", note: "PC05 mengakses Internet via Router melalui Switch" }
    },
    pc06: {
        id: "pc06",
        name: "PC Client 06",
        subName: "Workstation End-Device Node 6",
        category: "pc",
        categoryBadge: "WORKSTATION CLIENT (END-DEVICE)",
        badgeColor: "#0D6EFD",
        icon: "💻",
        isCore: true,
        role: "Simpul client independen keenam dalam Topologi Star. Terhubung ke port Switch 6 dengan kabel transmisi tersendiri.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 7 hingga Layer 1", tag: "OSI Stack" },
            { label: "Antarmuka Jaringan", value: "Gigabit Ethernet NIC (RJ-45)", tag: "Interface" },
            { label: "Alamat Fisik (MAC)", value: "00:1A:2B:3C:4D:06", tag: "Hardware ID" },
            { label: "Alamat Logika (IP)", value: "192.168.1.16 /24", tag: "IP Address" },
            { label: "Bandwidth Link", value: "1000 Mbps Full-Duplex", tag: "Speed" },
            { label: "Media Penghubung", value: "Kabel UTP Cat 6 Point-to-Point", tag: "Cable" },
            { label: "Protokol Utama", value: "TCP/IP, FTP, SMB File Share", tag: "Protocols" },
            { label: "Toleransi Kabel", value: "Fault-Isolated (Tidak mengganggu client lain)", tag: "Fault State" }
        ],
        functions: "Sebagai endpoint pengirim file besar antar-workstation yang diteruskan secara efisien oleh Switch.",
        example: "Komputer studio multimedia yang mentransfer video presentasi ke workstation lain.",
        simulationPair: { src: "pc06", tgt: "pc04", note: "PC06 mengirim data ke PC04 melalui Switch" }
    },
    router: {
        id: "router",
        name: "Router Gateway",
        subName: "External Network Gateway",
        category: "router",
        categoryBadge: "PERANGKAT GATEWAY (PERANGKAT TAMBAHAN)",
        badgeColor: "#FFC15E",
        icon: "🌐",
        isCore: false,
        role: "Router adalah PERANGKAT TAMBAHAN (bukan pusat topologi Star). Berfungsi sebagai pintu gerbang (gateway) yang menjembatani segmen LAN lokal Topologi Star ke jaringan luar (WAN / Internet). Topologi Star lokal tetap berfungsi penuh untuk saling bertukar data antar-PC tanpa router.",
        specs: [
            { label: "Lapisan OSI", value: "Layer 3 (Network Layer)", tag: "OSI Layer" },
            { label: "Tipe Perangkat", value: "Edge Router / Broadband Gateway", tag: "Hardware" },
            { label: "Antarmuka Port", value: "1x Gigabit WAN (Internet) + 4x Gigabit LAN (RJ-45)", tag: "Ports" },
            { label: "Fungsi Utama", value: "IP Routing, NAT (Network Address Translation), DHCP", tag: "Services" },
            { label: "Tabel Alamat", value: "IP Routing Table & ARP Cache", tag: "Routing" },
            { label: "Keamanan", value: "SPI Firewall, DoS Protection, Port Forwarding", tag: "Security" },
            { label: "Alamat Gateway", value: "Default Gateway IP: 192.168.1.1 /24", tag: "Gateway IP" },
            { label: "Peran Topologi", value: "Opsional (Hanya untuk koneksi keluar LAN)", tag: "Topology Role" }
        ],
        functions: "Membaca IP Address tujuan pada paket layer 3, melakukan routing antar-jaringan berbeda, serta menerjemahkan IP private lokal menjadi IP public melalui NAT agar seluruh PC client dapat mengakses Internet.",
        example: "Router modem fiber optik sekolah yang menghubungkan Switch LAN laboratorium ke penyedia layanan internet (ISP).",
        simulationPair: { src: "pc05", tgt: "router", note: "Transmisi paket data menuju Router Gateway internet" }
    },
    printer: {
        id: "printer",
        name: "Network Printer",
        subName: "Shared Resource Peripheral",
        category: "printer",
        categoryBadge: "SUMBER DAYA BERSAMA (SHARED RESOURCE)",
        badgeColor: "#00FF88",
        icon: "🖨️",
        isCore: false,
        role: "Printer jaringan berperan sebagai 'Shared Resource' (perangkat bersama). Terhubung langsung ke salah satu port Switch pusat via kabel UTP sehingga dapat diakses bersamaan oleh semua PC client (PC01 - PC06) tanpa perlu menyalakan PC induk khusus.",
        specs: [
            { label: "Tipe Hardware", value: "Network Multi-Function Laser/Inkjet Printer", tag: "Hardware" },
            { label: "Antarmuka Jaringan", value: "Internal Print Server Fast Ethernet 10/100 RJ-45", tag: "Interface" },
            { label: "Lapisan Operasi", value: "Application Layer Print Services (Layer 7)", tag: "OSI Layer" },
            { label: "Protokol Cetak", value: "RAW (Port 9100), LPD/LPR, IPP, SNMP", tag: "Protocols" },
            { label: "Alamat Jaringan", value: "Static IP / DHCP Reservation (misal: 192.168.1.50)", tag: "Network ID" },
            { label: "Buffer Memori", value: "512 MB High-Speed Spooling Cache", tag: "Memory" },
            { label: "Aksesibilitas", value: "Direct Network Accessible via Central Switch", tag: "Access" },
            { label: "Peran Topologi", value: "Peripheral Tambahan yang di-share antar-client", tag: "Topology Role" }
        ],
        functions: "Menerima dokumen antrian cetak dari PC client mana saja melalui kabel switch, memproses format raster dokumen, dan mencetak dokumen fisik secara otomatis.",
        example: "Printer jaringan kantor di ruang guru yang dapat menerima cetakan soal ujian dari PC mana saja melalui koneksi Switch sentral.",
        simulationPair: { src: "pc04", tgt: "printer", note: "PC04 mengirim dokumen cetak ke Printer melalui Switch" }
    }
};

/**
 * Controller Komponen Detail Overlay Interaktif Perangkat
 */
export class HardwareDetailOverlay {
    constructor(onSimulateCallback) {
        this.modal = document.getElementById('modal-hardware-detail');
        this.titleEl = document.getElementById('hw-detail-title');
        this.subTitleEl = document.getElementById('hw-detail-sub');
        this.iconEl = document.getElementById('hw-detail-icon');
        this.badgeEl = document.getElementById('hw-detail-badge');
        this.roleEl = document.getElementById('hw-detail-role');
        this.specsGridEl = document.getElementById('hw-detail-specs-grid');
        this.funcEl = document.getElementById('hw-detail-func');
        this.exampleEl = document.getElementById('hw-detail-example');
        this.btnSimulate = document.getElementById('hw-detail-btn-simulate');
        this.btnClose = document.getElementById('hw-detail-btn-close');
        this.btnCloseHeader = document.getElementById('hw-detail-btn-close-header');

        this.onSimulate = onSimulateCallback;
        this.currentHardware = null;

        // Inisialisasi Visualisator Model 3D Interaktif Rotasi Perangkat
        this.viewer3D = null;
        try {
            this.viewer3D = new Hardware3DViewer();
        } catch (e) {
            console.warn('Gagal menginisialisasi 3D viewer:', e);
        }

        this.init();
    }

    init() {
        if (!this.modal) return;

        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.hide());
        }
        if (this.btnCloseHeader) {
            this.btnCloseHeader.addEventListener('click', () => this.hide());
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('open')) {
                this.hide();
            }
        });

        if (this.btnSimulate) {
            this.btnSimulate.addEventListener('click', () => {
                if (this.currentHardware && this.currentHardware.simulationPair) {
                    const pair = this.currentHardware.simulationPair;
                    this.hide();
                    if (typeof this.onSimulate === 'function') {
                        this.onSimulate(pair.src, pair.tgt, pair.note);
                    }
                }
            });
        }
    }

    show(nodeId) {
        if (!this.modal) return;

        const hw = HARDWARE_SPECS[nodeId];
        if (!hw) return;

        this.currentHardware = hw;

        if (this.titleEl) this.titleEl.textContent = hw.name;
        if (this.subTitleEl) this.subTitleEl.textContent = hw.subName;
        if (this.iconEl) this.iconEl.textContent = hw.icon;
        if (this.badgeEl) {
            this.badgeEl.textContent = hw.categoryBadge;
            this.badgeEl.style.borderColor = hw.badgeColor;
            this.badgeEl.style.color = hw.badgeColor;
        }

        if (this.roleEl) {
            this.roleEl.innerHTML = `<strong>Peran Kunci:</strong> ${hw.role}`;
        }

        if (this.funcEl) this.funcEl.textContent = hw.functions;
        if (this.exampleEl) this.exampleEl.textContent = hw.example;

        // Render spesifikasi teknis dalam grid key-value yang informatif
        if (this.specsGridEl) {
            this.specsGridEl.innerHTML = '';
            hw.specs.forEach(s => {
                const item = document.createElement('div');
                item.className = 'hw-spec-card';
                item.innerHTML = `
                    <div class="hw-spec-header">
                        <span class="hw-spec-label">${s.label}</span>
                        ${s.tag ? `<span class="hw-spec-tag">${s.tag}</span>` : ''}
                    </div>
                    <div class="hw-spec-val">${s.value}</div>
                `;
                this.specsGridEl.appendChild(item);
            });
        }

        if (this.btnSimulate) {
            if (hw.simulationPair) {
                this.btnSimulate.style.display = 'inline-flex';
                this.btnSimulate.innerHTML = `⚡ Simulasikan Alur: ${HARDWARE_SPECS[hw.simulationPair.src].name.split(' ')[0]} ➔ ${HARDWARE_SPECS[hw.simulationPair.tgt].name.split(' ')[0]}`;
            } else {
                this.btnSimulate.style.display = 'none';
            }
        }

        this.modal.classList.add('open');

        // Muat model 3D interaktif perangkat keras dan mulai loop rotasi
        if (this.viewer3D) {
            try {
                this.viewer3D.loadHardware(nodeId);
            } catch (err) {
                console.warn('Gagal memuat model 3D hardware:', err);
            }
        }
    }

    hide() {
        if (!this.modal) return;
        this.modal.classList.remove('open');
        this.currentHardware = null;

        // Jeda animasi 3D saat modal ditutup untuk menghemat CPU/GPU
        if (this.viewer3D) {
            try {
                this.viewer3D.pause();
            } catch (err) {
                console.warn('Gagal menjeda 3D viewer:', err);
            }
        }
    }
}
