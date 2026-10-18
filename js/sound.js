/**
 * js/sound.js
 * Sistem Audio Feedback Web Audio API untuk Media Pembelajaran Topologi Jaringan Star.
 * Menghasilkan efek suara sintetis (prosedural) tanpa ketergantungan file eksternal:
 * - Klik Tombol / Interaksi UI (UI Click)
 * - Paket Data Berangkat dari Perangkat Sumber (Packet Send)
 * - Paket Tiba & Diproses oleh Switch Sentral (Switch Processing Ping)
 * - Paket Tiba di Perangkat Tujuan (Packet Received Chime)
 * - Klik Inspeksi Detail Node Perangkat (Node Inspect Blip)
 * - Hasil Kuis (Benar / Salah)
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.storageKey = 'topologiStar_soundEnabled';
        
        // Cek preferensi user (default: true)
        const saved = localStorage.getItem(this.storageKey);
        this.enabled = saved !== null ? saved === 'true' : true;
        this.masterVolume = 0.22; // Volume nyaman dan tidak memekakkan telinga

        this.initContextOnFirstGesture();
    }

    /**
     * Inisialisasi AudioContext setelah interaksi pengguna pertama kali
     * untuk mematuhi kebijakan autoplay browser modern.
     */
    initContextOnFirstGesture() {
        const unlock = () => {
            this.getContext();
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
    }

    getContext() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    /**
     * Mengaktifkan atau menonaktifkan suara
     */
    toggleSound() {
        this.enabled = !this.enabled;
        localStorage.setItem(this.storageKey, String(this.enabled));
        this.updateToggleButtonsUI();
        if (this.enabled) {
            this.playClick();
        }
        return this.enabled;
    }

    setSoundEnabled(val) {
        this.enabled = !!val;
        localStorage.setItem(this.storageKey, String(this.enabled));
        this.updateToggleButtonsUI();
    }

    isSoundEnabled() {
        return this.enabled;
    }

    /**
     * Memperbarui tampilan tombol toggle audio di seluruh halaman
     */
    updateToggleButtonsUI() {
        const btns = document.querySelectorAll('.sound-toggle-btn, [data-sound-toggle]');
        btns.forEach(btn => {
            if (this.enabled) {
                btn.classList.remove('muted');
                btn.setAttribute('aria-label', 'Nonaktifkan Suara');
                btn.setAttribute('title', 'Suara Aktif (Klik untuk Mematikan)');
                const label = btn.querySelector('.sound-btn-text');
                if (label) label.textContent = 'Suara: ON';
                const icon = btn.querySelector('.sound-btn-icon');
                if (icon) icon.textContent = '🔊';
            } else {
                btn.classList.add('muted');
                btn.setAttribute('aria-label', 'Aktifkan Suara');
                btn.setAttribute('title', 'Suara Senyap (Klik untuk Menyalakan)');
                const label = btn.querySelector('.sound-btn-text');
                if (label) label.textContent = 'Suara: OFF';
                const icon = btn.querySelector('.sound-btn-icon');
                if (icon) icon.textContent = '🔇';
            }
        });
    }

    /* =========================================================================
       SINTESIS SUARA PROSEDURAL (WEB AUDIO API)
       ========================================================================= */

    /**
     * 1. Klik Tombol / UI Feedback (Short Crisp Click)
     */
    playClick() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            const now = ctx.currentTime;

            // Pitch envelope: 750Hz drop cepat ke 220Hz
            osc.frequency.setValueAtTime(750, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);

            // Volume envelope
            gain.gain.setValueAtTime(this.masterVolume * 0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {
            // Abaikan error audio background
        }
    }

    /**
     * 2. Paket Data Mulai Dikirim dari Node Sumber (Packet Send Pulse)
     * Nada menaik futuristik yang mengindikasikan pelepasan paket frame data
     */
    playPacketSend() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            // Nada naik cepat 440Hz -> 880Hz
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

            gain.gain.setValueAtTime(this.masterVolume * 0.75, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.11);
        } catch (e) {}
    }

    /**
     * 3. Switch Menerima & Memproses Frame (Central Switch Processing Ping)
     * Resonansi digital khas konsentrator sentral saat membaca MAC table
     */
    playSwitchProcess() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            
            // Dua nada harmonik (587Hz / D5 + 880Hz / A5)
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.14); // G5

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(880, now); // A5
            osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.14); // D6

            gain.gain.setValueAtTime(this.masterVolume * 0.85, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.2);
            osc2.stop(now + 0.2);
        } catch (e) {}
    }

    /**
     * 4. Paket Tiba di Node Tujuan (Packet Arrived Chime)
     * Chime melodi sukses (dua nada berurutan E5 -> B5) menegaskan paket diterima utuh
     */
    playPacketReceive() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;

            // Nada 1: 659.25Hz (E5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(this.masterVolume * 0.8, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.13);

            // Nada 2: 987.77Hz (B5) sedikit terlambat (0.07 detik)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(987.77, now + 0.07);
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(this.masterVolume * 0.85, now + 0.07);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.07);
            osc2.stop(now + 0.25);
        } catch (e) {}
    }

    /**
     * 5. Klik Inspeksi Spesifikasi Node (Node Inspect Beep)
     * Feedback saat user mengklik node Switch, PC, Router, atau Printer
     */
    playNodeInspect() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(740, now + 0.06);

            gain.gain.setValueAtTime(this.masterVolume * 0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    /**
     * 6. Jawaban Kuis Benar (Success Chord)
     */
    playQuizCorrect() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            // Arpeggio C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
            const freqs = [523.25, 659.25, 783.99];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.07;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(this.masterVolume * 0.75, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    }

    /**
     * 7. Jawaban Kuis Salah / Peringatan (Soft Alert)
     */
    playQuizWrong() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

            gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    /**
     * Otomatis memasang event click audio feedback pada semua tombol & elemen interaktif
     */
    attachGlobalButtonSounds() {
        if (typeof document === 'undefined') return;

        // Pasang handler delegation pada document untuk elemen interaktif
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, .preset-btn, .option-item, .q-num-btn, .interactive-chip, .icon-btn, .chip-tab');
            if (target) {
                // Kecualikan toggle suara itu sendiri agar tidak double click
                if (!target.classList.contains('sound-toggle-btn') && !target.hasAttribute('data-sound-toggle')) {
                    this.playClick();
                }
            }
        }, { capture: true });

        // Update status visual tombol toggle audio jika sudah ada di DOM
        this.updateToggleButtonsUI();
    }
}

// Singleton export
export const soundManager = new SoundManager();
