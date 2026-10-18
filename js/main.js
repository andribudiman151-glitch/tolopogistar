/**
 * js/main.js
 * Navigasi Layar Index dengan Transisi Halus (Fade-Out / Fade-In)
 * Beranda (Menu Utama) -> Loading Progress -> Simulasi Diagram Topologi Star
 * Serta inisialisasi simulasi animasi paket data pada diagram Topologi Star
 */

import { DiagramSimulation } from './diagram-anim.js';
import { soundManager } from './sound.js';
import { getStudentSession, initStudentNavBar } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi status login mahasiswa pada top bar
    initStudentNavBar();

    // Inisialisasi audio feedback global untuk semua tombol & elemen interaktif
    soundManager.attachGlobalButtonSounds();

    // Bind event tombol toggle audio
    const soundToggleBtns = document.querySelectorAll('.sound-toggle-btn, [data-sound-toggle]');
    soundToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            soundManager.toggleSound();
        });
    });

    const btnStart = document.getElementById('btn-start');
    const btnBackToStart = document.getElementById('btn-back-to-start');
    const btnToMateri = document.getElementById('btn-to-materi');

    const screenStart = document.getElementById('screen-start');
    const screenLoading = document.getElementById('screen-loading');
    const screenObjectives = document.getElementById('screen-objectives');
    const pageTransitionOverlay = document.getElementById('page-transition-overlay');

    const loadingFill = document.getElementById('loading-fill');
    const loadingPercent = document.getElementById('loading-percent');
    const loadingStatus = document.getElementById('loading-status');

    let isTransitioning = false;

    // Inisialisasi simulasi visual animasi paket data pada diagram topologi star
    const diagramSim = new DiagramSimulation();
    // Pastikan animasi benar-benar diam saat pertama kali berada di Halaman Utama (screen-start)
    diagramSim.stopAnimation();

    /**
     * Mengganti layar secara halus dengan efek fade-out pada layar saat ini
     * dan fade-in dengan luncuran halus pada layar target.
     * @param {HTMLElement} fromEl Layar yang akan ditutup
     * @param {HTMLElement} toEl Layar yang akan ditampilkan
     * @param {Function} [onComplete] Callback opsional setelah transisi selesai
     */
    function transitionScreen(fromEl, toEl, onComplete) {
        if (!fromEl || !toEl || fromEl === toEl || isTransitioning) return;
        isTransitioning = true;

        // Jika keluar dari layar Tujuan Pembelajaran, hentikan audio dan siklus animasi segera
        if (fromEl === screenObjectives || toEl !== screenObjectives) {
            diagramSim.stopAnimation();
        }

        // 1. Fade-out layar saat ini
        fromEl.classList.remove('screen-fade-in');
        fromEl.classList.add('screen-fade-out');

        // 2. Mainkan audio feedback
        soundManager.playClick();

        // 3. Setelah fase fade-out (300ms), tukar status aktif & picu fade-in
        setTimeout(() => {
            fromEl.classList.remove('active', 'screen-fade-out');
            fromEl.style.display = 'none';

            toEl.style.display = 'flex';
            // Force browser reflow agar animasi CSS fade-in terpicu sempurna
            void toEl.offsetHeight;

            toEl.classList.add('active', 'screen-fade-in');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Bersihkan kelas animasi setelah selesai
            setTimeout(() => {
                toEl.classList.remove('screen-fade-in');
                isTransitioning = false;
                if (typeof onComplete === 'function') onComplete();
            }, 460);
        }, 300);
    }

    // 1. MENU UTAMA -> LOADING -> SIMULASI DIAGRAM
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            if (isTransitioning) return;

            // Periksa sesi login mahasiswa
            const session = getStudentSession();
            if (!session) {
                // Belum login -> arahkan ke halaman login
                soundManager.playClick();
                window.location.href = 'login.html';
                return;
            }

            // Reset indikator loading
            if (loadingFill) loadingFill.style.width = '0%';
            if (loadingPercent) loadingPercent.textContent = '0%';
            if (loadingStatus) loadingStatus.textContent = 'Menyiapkan modul pembelajaran...';

            transitionScreen(screenStart, screenLoading, () => {
                // Jalankan simulasi proses pemuatan modul pembelajaran
                let progress = 0;
                const statuses = [
                    "Menyiapkan modul pembelajaran...",
                    "Memuat skema diagram & simulasi rute...",
                    "Mengonfigurasi simpul Switch sentral...",
                    "Menyiapkan model visual 3D perangkat...",
                    "Media siap digunakan!"
                ];

                const interval = setInterval(() => {
                    progress += Math.floor(Math.random() * 14) + 12;
                    if (progress > 100) progress = 100;

                    if (loadingFill) loadingFill.style.width = `${progress}%`;
                    if (loadingPercent) loadingPercent.textContent = `${progress}%`;

                    const statusIdx = Math.min(Math.floor((progress / 100) * statuses.length), statuses.length - 1);
                    if (loadingStatus) loadingStatus.textContent = statuses[statusIdx];

                    if (progress >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            // Transisi halus dari Layar Loading ke Layar Simulasi Diagram
                            transitionScreen(screenLoading, screenObjectives, () => {
                                // Putar simulasi alur data HANYA saat layar tujuan pembelajaran selesai transisi dan terlihat
                                diagramSim.startAnimation();
                            });
                        }, 350);
                    }
                }, 85);
            });
        });
    }

    // 2. KEMBALI KE MENU UTAMA (dari Layar Simulasi Diagram)
    if (btnBackToStart) {
        btnBackToStart.addEventListener('click', () => {
            if (isTransitioning) return;
            // Hentikan seketika animasi diagram agar suara tidak bocor ke Halaman Utama
            diagramSim.stopAnimation();
            transitionScreen(screenObjectives, screenStart);
        });
    }

    // 3. MENU / DIAGRAM -> EKSPLORASI 3D (materi.html)
    if (btnToMateri) {
        btnToMateri.addEventListener('click', (e) => {
            e.preventDefault();
            // Matikan suara dan animasi diagram sebelum berpindah ke halaman materi
            diagramSim.stopAnimation();
            soundManager.playClick();

            // Aktifkan overlay transisi sinematik antar halaman
            if (pageTransitionOverlay) {
                pageTransitionOverlay.classList.add('active');
            }

            setTimeout(() => {
                window.location.href = 'materi.html';
            }, 320);
        });
    }

    // Tangani event lifecycle browser: hentikan audio dan simulasi jika tab disembunyikan/unloaded
    window.addEventListener('beforeunload', () => {
        diagramSim.stopAnimation();
    });
    window.addEventListener('pagehide', () => {
        diagramSim.stopAnimation();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            diagramSim.stopAnimation();
        }
    });


    // 5. OTOMATIS MEMULAI JIKA DIARAHKAN DARI LOGIN (autostart=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1' && getStudentSession() && btnStart) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
            btnStart.click();
        }, 180);
    }
});
