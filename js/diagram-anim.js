/**
 * js/diagram-anim.js
 * Sistem Animasi Visual Alur Transmisi Data Topologi Star pada Halaman Utama
 * Memvisualisasikan paket data bergerak dari PC Pengirim -> SWITCH (Konsentrator Sentral) -> PC Penerima
 */

import { HardwareDetailOverlay } from './hardware-details.js';
import { soundManager } from './sound.js';

export class DiagramSimulation {
    constructor() {
        this.svg = document.getElementById('diagram-star-svg');
        this.statusBadge = document.getElementById('diagram-status-badge');
        this.descText = document.getElementById('diagram-desc-text');
        this.btnToggle = document.getElementById('diagram-btn-toggle');
        this.presetContainer = document.getElementById('diagram-presets');

        if (!this.svg) return;

        // Inisialisasi komponen detail overlay interaktif untuk menampilkan spesifikasi teknis dan peran perangkat
        this.detailOverlay = new HardwareDetailOverlay((src, tgt, note) => {
            this.startSpecificRoute(src, tgt, note);
        });

        // Koordinat titik pusat setiap perangkat pada SVG viewBox 0 0 400 380
        this.nodes = {
            switch:  { x: 200, y: 190, label: 'SWITCH PUSAT', lineId: null, boxId: 'diag-box-switch' },
            pc01:    { x: 146, y: 97,  label: 'PC 01', lineId: 'diag-line-pc01', boxId: 'diag-box-pc01' },
            pc02:    { x: 254, y: 97,  label: 'PC 02', lineId: 'diag-line-pc02', boxId: 'diag-box-pc02' },
            pc03:    { x: 308, y: 190, label: 'PC 03', lineId: 'diag-line-pc03', boxId: 'diag-box-pc03' },
            pc04:    { x: 254, y: 283, label: 'PC 04', lineId: 'diag-line-pc04', boxId: 'diag-box-pc04' },
            pc05:    { x: 146, y: 283, label: 'PC 05', lineId: 'diag-line-pc05', boxId: 'diag-box-pc05' },
            pc06:    { x: 92,  y: 190, label: 'PC 06', lineId: 'diag-line-pc06', boxId: 'diag-box-pc06' },
            router:  { x: 200, y: 31,  label: 'ROUTER', lineId: 'diag-line-router', boxId: 'diag-box-router' },
            printer: { x: 200, y: 349, label: 'PRINTER', lineId: 'diag-line-printer', boxId: 'diag-box-printer' }
        };

        // Rute demonstrasi alur data otomatis
        this.demoRoutes = [
            { src: 'pc01', tgt: 'pc03', note: 'Komunikasi client-to-client: Data PC01 diforward terarah ke PC03' },
            { src: 'pc02', tgt: 'pc05', note: 'Komunikasi silang: Switch mengatur frame data antar-workstation' },
            { src: 'pc04', tgt: 'printer', note: 'Cetak Dokumen: PC04 mengirim permintaan cetak ke Network Printer melalui Switch' },
            { src: 'pc06', tgt: 'pc04', note: 'Transmisi terarah: Switch membaca MAC address tujuan tanpa broadcast' },
            { src: 'pc05', tgt: 'router', note: 'Akses Internet: PC05 mengirim data ke Router Gateway melalui Switch' },
            { src: 'pc03', tgt: 'pc01', note: 'Respon balik: Paket balasan dari PC03 kembali menuju PC01 via Switch' }
        ];

        this.routeIndex = 0;
        this.isPlaying = false; // TIDAK otomatis berjalan saat halaman dimuat agar suara tidak bocor
        this.animationTimer = null;
        this.rafId = null;
        this.activeRunId = 0; // Token run aktif untuk membatalkan suara pending jika layar berganti

        // Elemen visual paket di SVG
        this.packetGroup = document.getElementById('diag-packet-group');
        this.packetHalo = document.getElementById('diag-packet-halo');
        this.packetCore = document.getElementById('diag-packet-core');
        this.rippleCircle = document.getElementById('diag-ripple');

        // State interaksi kustom jika pengguna mengklik perangkat
        this.customSource = null;

        this.init();
    }

    init() {
        this.bindPresets();
        this.bindSvgInteractions();
        this.bindToggle();
        // Animasi TIDAK diputar otomatis di sini agar suara tidak bocor ke Halaman Utama.
        // Animasi hanya dimulai saat Layar Tujuan Pembelajaran aktif (dipanggil via startAnimation).
    }

    /**
     * Memeriksa apakah layar Tujuan Pembelajaran sedang aktif dan benar-benar terlihat
     * @returns {boolean}
     */
    isScreenVisible() {
        const screen = document.getElementById('screen-objectives');
        if (!screen) return false;
        if (!screen.classList.contains('active')) return false;
        try {
            const style = window.getComputedStyle(screen);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rect = screen.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        } catch (e) {
            return screen.classList.contains('active');
        }
    }

    /**
     * Memulai pemutaran animasi alur data hanya jika layar Tujuan Pembelajaran aktif terlihat
     */
    startAnimation() {
        if (!this.isScreenVisible()) {
            this.stopAnimation();
            return;
        }
        this.stopAnimation();
        this.isPlaying = true;
        if (this.btnToggle) {
            this.btnToggle.innerHTML = '⏸️ Jeda Animasi';
            this.btnToggle.classList.remove('paused');
        }
        this.runCurrentRoute();
    }

    bindToggle() {
        if (!this.btnToggle) return;
        this.btnToggle.addEventListener('click', () => {
            if (!this.isScreenVisible()) {
                this.stopAnimation();
                return;
            }
            this.isPlaying = !this.isPlaying;
            if (this.isPlaying) {
                this.btnToggle.innerHTML = '⏸️ Jeda Animasi';
                this.btnToggle.classList.remove('paused');
                this.runCurrentRoute();
            } else {
                this.btnToggle.innerHTML = '▶️ Lanjutkan Animasi';
                this.btnToggle.classList.add('paused');
                this.stopAnimation();
                if (this.descText) {
                    this.descText.textContent = 'Animasi dijeda. Klik tombol "Lanjutkan" atau klik perangkat pada diagram untuk mencoba.';
                }
            }
        });
    }

    bindPresets() {
        if (!this.presetContainer) return;
        const buttons = this.presetContainer.querySelectorAll('.preset-btn');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const src = btn.getAttribute('data-src');
                const tgt = btn.getAttribute('data-tgt');
                if (src && tgt) {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.startSpecificRoute(src, tgt, `Simulasi Kustom: ${this.nodes[src].label} ➔ ${this.nodes[tgt].label}`);
                }
            });
        });
    }

    bindSvgInteractions() {
        // Berikan hover & klik pada setiap perangkat (Switch, PC, Router, Printer) di diagram
        Object.keys(this.nodes).forEach((key) => {
            const node = this.nodes[key];
            const group = document.getElementById(`diag-group-${key}`);
            const box = document.getElementById(node.boxId);

            const clickHandler = (e) => {
                e.stopPropagation();
                this.handleNodeClick(key);
            };

            if (group) {
                group.style.cursor = 'pointer';
                group.addEventListener('click', clickHandler);
            }
            if (box) {
                box.style.cursor = 'pointer';
                box.addEventListener('click', clickHandler);
            }
        });
    }

    handleNodeClick(nodeKey) {
        // Mainkan suara inspeksi perangkat
        soundManager.playNodeInspect();

        // Tampilkan overlay detail spesifikasi teknis dan peran perangkat
        if (this.detailOverlay) {
            this.highlightBox(this.nodes[nodeKey].boxId, 'source');
            this.detailOverlay.show(nodeKey);
        }

        if (this.descText) {
            this.descText.innerHTML = `🔍 <strong>${this.nodes[nodeKey].label}</strong>: Membuka detail spesifikasi teknis dan perannya dalam Topologi Star.`;
        }
    }

    startSpecificRoute(srcKey, tgtKey, note) {
        this.stopAnimation();
        this.isPlaying = true;
        if (this.btnToggle) {
            this.btnToggle.innerHTML = '⏸️ Jeda Animasi';
            this.btnToggle.classList.remove('paused');
        }
        this.executeRoute(srcKey, tgtKey, note, () => {
            // Setelah selesai, lanjutkan ke siklus otomatis
            this.animationTimer = setTimeout(() => {
                if (this.isPlaying) {
                    this.routeIndex = (this.routeIndex + 1) % this.demoRoutes.length;
                    this.runCurrentRoute();
                }
            }, 1800);
        });
    }

    runCurrentRoute() {
        if (!this.isPlaying) return;

        const current = this.demoRoutes[this.routeIndex];
        this.updatePresetButtonsUI(current.src, current.tgt);
        this.executeRoute(current.src, current.tgt, current.note, () => {
            if (!this.isPlaying) return;
            this.animationTimer = setTimeout(() => {
                this.routeIndex = (this.routeIndex + 1) % this.demoRoutes.length;
                this.runCurrentRoute();
            }, 1800);
        });
    }

    updatePresetButtonsUI(src, tgt) {
        if (!this.presetContainer) return;
        const buttons = this.presetContainer.querySelectorAll('.preset-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-src') === src && btn.getAttribute('data-tgt') === tgt) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    async executeRoute(srcKey, tgtKey, note, onComplete) {
        const runId = ++this.activeRunId;
        const canContinue = () => this.isPlaying && this.isScreenVisible() && this.activeRunId === runId;

        if (!canContinue()) {
            this.stopAnimation();
            return;
        }

        const srcNode = this.nodes[srcKey];
        const swNode = this.nodes.switch;
        const tgtNode = this.nodes[tgtKey];

        this.clearAllHighlights();

        // 1. TAHAP 1: Sumber Menyiapkan & Mengirimkan Paket ke Switch
        if (this.statusBadge) {
            this.statusBadge.innerHTML = `TRANSMISI: <span class="badge-src">${srcNode.label}</span> ➔ <span class="badge-sw">SWITCH</span> ➔ <span class="badge-tgt">${tgtNode.label}</span>`;
        }
        if (this.descText) {
            this.descText.innerHTML = `<strong>Tahap 1:</strong> <strong>${srcNode.label}</strong> mengirimkan frame data melalui kabel UTP langsung menuju <strong>SWITCH SENTRAL</strong>.`;
        }

        this.highlightBox(srcNode.boxId, 'source');
        this.highlightLine(srcNode.lineId, true);
        this.setPacketVisible(true);

        if (!canContinue()) {
            this.stopAnimation();
            return;
        }

        // Suara pengiriman paket data dari node sumber HANYA jika layar tujuan aktif
        soundManager.playPacketSend();

        // Animasikan paket: Sumber -> Switch
        await this.animateBetweenPoints(srcNode, swNode, 1100);

        if (!canContinue()) {
            this.stopAnimation();
            return;
        }

        // 2. TAHAP 2: Paket Tiba di Switch Pusat (Pemrosesan Konsentrator)
        this.highlightLine(srcNode.lineId, false);
        this.highlightBox(swNode.boxId, 'processing');
        this.triggerRipple(swNode.x, swNode.y, '#FFC15E');

        // Suara Switch sentral memproses MAC table dan frame HANYA jika layar aktif
        soundManager.playSwitchProcess();

        if (this.descText) {
            this.descText.innerHTML = `<strong>Tahap 2:</strong> <strong>SWITCH SENTRAL</strong> menerima paket, membaca MAC Address tujuan di MAC Table, dan menentukan jalur keluar khusus ke <strong>${tgtNode.label}</strong> (bukan broadcast).`;
        }

        await this.delay(900);
        if (!canContinue()) {
            this.stopAnimation();
            return;
        }

        // 3. TAHAP 3: Switch Meneruskan Paket ke Tujuan
        this.highlightBox(swNode.boxId, 'idle');
        this.highlightLine(tgtNode.lineId, true);

        if (this.descText) {
            this.descText.innerHTML = `<strong>Tahap 3:</strong> Paket diteruskan secara unicast dari port Switch langsung menuju <strong>${tgtNode.label}</strong>.`;
        }

        // Animasikan paket: Switch -> Tujuan
        await this.animateBetweenPoints(swNode, tgtNode, 1100);

        if (!canContinue()) {
            this.stopAnimation();
            return;
        }

        // 4. TAHAP 4: Paket Diterima oleh Perangkat Tujuan
        this.highlightLine(tgtNode.lineId, false);
        this.highlightBox(tgtNode.boxId, 'target');
        this.triggerRipple(tgtNode.x, tgtNode.y, '#00FF88');

        // Suara paket berhasil tiba di node tujuan HANYA jika layar aktif
        soundManager.playPacketReceive();

        if (this.descText) {
            this.descText.innerHTML = `<strong>Tahap 4 (Selesai):</strong> ✅ <strong>${tgtNode.label}</strong> menerima paket data secara utuh! <em>${note || ''}</em>`;
        }

        // Tahan sebentar visual tujuan
        await this.delay(1200);
        if (!canContinue()) {
            this.stopAnimation();
            return;
        }

        this.setPacketVisible(false);

        if (typeof onComplete === 'function' && canContinue()) {
            onComplete();
        }
    }

    animateBetweenPoints(p1, p2, durationMs) {
        return new Promise((resolve) => {
            if (!this.packetGroup) {
                resolve();
                return;
            }

            const currentRunId = this.activeRunId;
            const startTime = performance.now();

            const step = (currentTime) => {
                if (!this.isPlaying || !this.isScreenVisible() || this.activeRunId !== currentRunId) {
                    resolve();
                    return;
                }

                const elapsed = currentTime - startTime;
                const t = Math.min(elapsed / durationMs, 1.0);

                // Easing lembut
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

                const curX = p1.x + (p2.x - p1.x) * ease;
                const curY = p1.y + (p2.y - p1.y) * ease;

                this.packetGroup.setAttribute('transform', `translate(${curX}, ${curY})`);

                if (t < 1.0) {
                    this.rafId = requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };

            this.rafId = requestAnimationFrame(step);
        });
    }

    triggerRipple(x, y, color = '#00D9FF') {
        if (!this.rippleCircle) return;
        this.rippleCircle.setAttribute('cx', x);
        this.rippleCircle.setAttribute('cy', y);
        this.rippleCircle.setAttribute('stroke', color);
        this.rippleCircle.setAttribute('r', '6');
        this.rippleCircle.setAttribute('opacity', '1');

        let r = 6;
        let opacity = 1.0;

        const animateRipple = () => {
            r += 1.8;
            opacity -= 0.055;
            this.rippleCircle.setAttribute('r', r);
            this.rippleCircle.setAttribute('opacity', Math.max(0, opacity));

            if (opacity > 0) {
                requestAnimationFrame(animateRipple);
            } else {
                this.rippleCircle.setAttribute('opacity', '0');
            }
        };

        requestAnimationFrame(animateRipple);
    }

    setPacketVisible(visible) {
        if (this.packetGroup) {
            this.packetGroup.style.opacity = visible ? '1' : '0';
        }
    }

    highlightLine(lineId, active) {
        if (!lineId) return;
        const line = document.getElementById(lineId);
        if (!line) return;
        if (active) {
            line.classList.add('diagram-line-active');
        } else {
            line.classList.remove('diagram-line-active');
        }
    }

    highlightBox(boxId, state) {
        if (!boxId) return;
        const box = document.getElementById(boxId);
        if (!box) return;

        box.classList.remove('box-state-source', 'box-state-target', 'box-state-processing');

        if (state === 'source') {
            box.classList.add('box-state-source');
        } else if (state === 'target') {
            box.classList.add('box-state-target');
        } else if (state === 'processing') {
            box.classList.add('box-state-processing');
        }
    }

    clearAllHighlights() {
        // Hapus highlight pada semua kabel
        Object.values(this.nodes).forEach(n => {
            if (n.lineId) this.highlightLine(n.lineId, false);
            if (n.boxId) this.highlightBox(n.boxId, 'idle');
        });
    }

    stopAnimation() {
        this.isPlaying = false;
        this.activeRunId = (this.activeRunId || 0) + 1; // Batalkan segera iterasi asynchronous yang sedang berjalan
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.setPacketVisible(false);
        this.clearAllHighlights();
        if (this.btnToggle) {
            this.btnToggle.innerHTML = '▶️ Putar Animasi';
            this.btnToggle.classList.add('paused');
        }
    }

    delay(ms) {
        return new Promise(resolve => {
            this.animationTimer = setTimeout(resolve, ms);
        });
    }
}
