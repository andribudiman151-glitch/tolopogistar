/**
 * js/result.js
 * Manajemen Halaman Hasil Kuis: Evaluasi KKM, Filter Soal Salah, dan Ringkasan Materi
 */

import { KKM } from './config.js';
import { soundManager } from './sound.js';
import { requireStudentAuth, initStudentNavBar, promptLogout, logoutStudentNow } from './auth.js';
import { addAttempt } from './storage.js';
import Chart from 'chart.js/auto';
import confetti from 'canvas-confetti';

class ResultApp {
    constructor() {
        // Validasi sesi mahasiswa (redirect otomatis jika belum login)
        const session = requireStudentAuth('login.html');
        if (!session) return;
        this.studentSession = session;

        this.viewNilai = document.getElementById('view-nilai');
        this.viewPembahasan = document.getElementById('view-pembahasan');
        this.viewSelesai = document.getElementById('view-selesai');

        this.scoreValEl = document.getElementById('score-value');
        this.scoreSubEl = document.getElementById('score-sub');
        this.statusBadgeEl = document.getElementById('status-badge');
        this.kkmScoreEl = document.getElementById('kkm-score');
        this.kkmValEl = document.getElementById('kkm-value');
        this.kkmStatusEl = document.getElementById('kkm-status');
        this.nilaiEmoji = document.getElementById('nilai-emoji');

        this.successBlock = document.getElementById('success-block');
        this.failBlock = document.getElementById('fail-block');
        this.reviewContainer = document.getElementById('review-container');

        // Elemen & State Chart.js serta Apresiasi Visual
        this.chartCanvas = document.getElementById('quiz-result-chart');
        this.btnChartModeScore = document.getElementById('btn-chart-mode-score');
        this.btnChartModeCategory = document.getElementById('btn-chart-mode-category');
        this.btnConfettiReplay = document.getElementById('btn-confetti-replay');
        this.chartTitle = document.getElementById('chart-title');

        this.chartInstance = null;
        this.chartMode = 'score'; // 'score' | 'category'

        this.data = null;
        this.init();
    }

    init() {
        initStudentNavBar();
        soundManager.attachGlobalButtonSounds();

        // Bind sound toggle button
        const soundBtns = document.querySelectorAll('.sound-toggle-btn, [data-sound-toggle]');
        soundBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                soundManager.toggleSound();
            });
        });

        const raw = localStorage.getItem('topologiStarQuizResult');
        if (!raw) {
            window.location.href = 'kuis.html';
            return;
        }

        try {
            this.data = JSON.parse(raw);
        } catch (e) {
            window.location.href = 'kuis.html';
            return;
        }

        this.renderResult();
        this.bindEvents();
    }

    renderResult() {
        const { score, correctCount, totalQuestions, passed, userAnswers } = this.data;
        const targetKKM = this.data.kkm || KKM;

        // Mainkan audio reward jika lulus / feedback jika belum
        if (passed) {
            soundManager.playQuizCorrect();
        } else {
            soundManager.playQuizWrong();
        }

        if (this.scoreValEl) this.scoreValEl.textContent = score;
        if (this.scoreSubEl) this.scoreSubEl.textContent = `${correctCount} dari ${totalQuestions} jawaban benar`;
        if (this.kkmScoreEl) this.kkmScoreEl.textContent = score;
        if (this.kkmValEl) this.kkmValEl.textContent = targetKKM;

        if (passed) {
            // BERHASIL (>= KKM)
            if (this.statusBadgeEl) {
                this.statusBadgeEl.className = 'status-badge success';
                this.statusBadgeEl.textContent = 'BERHASIL';
            }
            if (this.kkmStatusEl) {
                this.kkmStatusEl.textContent = 'TUNTAS';
                this.kkmStatusEl.style.color = 'var(--cyan)';
            }
            if (this.nilaiEmoji) {
                this.nilaiEmoji.textContent = score === 100 ? '🏆' : '🎉';
            }
            if (this.successBlock) this.successBlock.style.display = 'block';
            if (this.failBlock) this.failBlock.style.display = 'none';

        } else {
            // BELUM BERHASIL (< KKM)
            if (this.statusBadgeEl) {
                this.statusBadgeEl.className = 'status-badge fail';
                this.statusBadgeEl.textContent = 'BELUM BERHASIL';
            }
            if (this.kkmStatusEl) {
                this.kkmStatusEl.textContent = 'BELUM TUNTAS';
                this.kkmStatusEl.style.color = '#FFC15E';
            }
            if (this.nilaiEmoji) {
                this.nilaiEmoji.textContent = '📚';
            }
            if (this.successBlock) this.successBlock.style.display = 'none';
            if (this.failBlock) this.failBlock.style.display = 'block';

            // Siapkan daftar pembahasan HANYA untuk soal yang salah
            this.renderWrongQuestions(userAnswers);
        }

        // Render visualisasi grafik batang dinamis Chart.js
        this.initChart();

        // Picu efek apresiasi visual confetti
        this.fireCelebratoryConfetti();

        // Simpan catatan percobaan kuis ke profil mahasiswa (hanya sekali, cegah duplikasi saat refresh)
        this.recordAttemptOnce();
    }

    /**
     * Menyimpan hasil kuis ke data mahasiswa di storage.js.
     * Menggunakan flag sessionStorage dengan timestamp kuis untuk mencegah pencatatan berulang jika halaman di-refresh.
     */
    recordAttemptOnce() {
        if (!this.studentSession || !this.data) return;

        const timestamp = this.data.timestamp || new Date().toISOString();
        const recordKey = `recorded_${this.studentSession.nim}_${timestamp}`;

        if (sessionStorage.getItem(recordKey) === 'true') {
            // Sudah tercatat, jangan simpan duplikat
            return;
        }

        try {
            const success = addAttempt(this.studentSession.nim, {
                score: this.data.score,
                correct: this.data.correctCount,
                total: this.data.totalQuestions,
                status: this.data.passed ? 'BERHASIL' : 'BELUM BERHASIL',
                finishedAt: timestamp
            });

            if (success) {
                sessionStorage.setItem(recordKey, 'true');
            }
        } catch (e) {
            console.error('Gagal mencatat attempt kuis:', e);
        }
    }

    renderWrongQuestions(userAnswers) {
        if (!this.reviewContainer || !userAnswers) return;
        this.reviewContainer.innerHTML = '';

        const wrongItems = userAnswers.filter(a => !a.isCorrect);

        if (wrongItems.length === 0) {
            this.reviewContainer.innerHTML = `<p style="color:var(--gray);">Tidak ada soal yang salah.</p>`;
            return;
        }

        const letters = ['A', 'B', 'C', 'D'];

        wrongItems.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'glass-panel review-card';

            const userOpt = (item.userAnswerIndex !== null && item.userAnswerIndex !== undefined)
                ? `${letters[item.userAnswerIndex]}. ${item.options[item.userAnswerIndex]}`
                : "Tidak dijawab";

            const correctOpt = `${letters[item.correctAnswerIndex]}. ${item.options[item.correctAnswerIndex]}`;

            const catTag = item.category ? `<span class="quiz-cat-badge" style="font-size:0.72rem; padding:3px 10px; margin-left:8px;">${item.category}</span>` : '';

            card.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <span class="review-q-label">SOAL PEMBAHASAN #${idx + 1}</span>
                    ${catTag}
                </div>
                <div class="review-question">${item.question}</div>
                <div class="review-answer-row wrong">
                    ❌ <strong>Jawaban Anda:</strong> ${userOpt}
                </div>
                <div class="review-answer-row correct">
                    ✓ <strong>Jawaban Benar:</strong> ${correctOpt}
                </div>
                <div class="review-explanation">
                    <strong>💡 Pembahasan Konsep:</strong> ${item.explanation}
                </div>
            `;
            this.reviewContainer.appendChild(card);
        });
    }

    /**
     * Menginisialisasi dan memperbarui visualisasi grafik batang dinamis menggunakan Chart.js
     */
    initChart() {
        if (!this.chartCanvas || !this.data) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const score = this.data.score || 0;
        const targetKKM = this.data.kkm || KKM;
        const passed = score >= targetKKM;

        let labels = [];
        let dataValues = [];
        let bgColors = [];
        let borderColors = [];

        if (this.chartMode === 'score') {
            if (this.chartTitle) this.chartTitle.textContent = 'Grafik Komparasi Nilai & KKM';
            labels = ['Nilai Anda', 'Standar KKM', 'Skor Maksimal'];
            dataValues = [score, targetKKM, 100];
            bgColors = [
                passed ? 'rgba(0, 217, 255, 0.75)' : 'rgba(255, 193, 94, 0.75)',
                'rgba(13, 110, 253, 0.75)',
                'rgba(255, 255, 255, 0.15)'
            ];
            borderColors = [
                passed ? '#00D9FF' : '#FFC15E',
                '#0D6EFD',
                'rgba(255, 255, 255, 0.4)'
            ];
        } else {
            if (this.chartTitle) this.chartTitle.textContent = 'Capaian Jawaban Benar per Topik Bahasan';
            
            // Rekapitulasi capaian jawaban benar per kategori soal
            const catMap = new Map();
            if (Array.isArray(this.data.userAnswers)) {
                this.data.userAnswers.forEach(ans => {
                    const cat = ans.category || 'UMUM';
                    if (!catMap.has(cat)) {
                        catMap.set(cat, { correct: 0, total: 0 });
                    }
                    const c = catMap.get(cat);
                    c.total++;
                    if (ans.isCorrect) c.correct++;
                });
            }

            if (catMap.size === 0) {
                labels = ['Switch Sentral', 'Alur Data', 'Hardware'];
                dataValues = [100, 100, 100];
                bgColors = ['rgba(0, 217, 255, 0.75)', 'rgba(0, 217, 255, 0.75)', 'rgba(0, 217, 255, 0.75)'];
                borderColors = ['#00D9FF', '#00D9FF', '#00D9FF'];
            } else {
                catMap.forEach((val, key) => {
                    const shortLabel = key.replace(/TOPOLOGI\s*/gi, '').trim();
                    labels.push(shortLabel);
                    const pct = Math.round((val.correct / val.total) * 100);
                    dataValues.push(pct);
                    bgColors.push(pct >= 75 ? 'rgba(0, 217, 255, 0.75)' : 'rgba(255, 193, 94, 0.75)');
                    borderColors.push(pct >= 75 ? '#00D9FF' : '#FFC15E');
                });
            }
        }

        const ctx = this.chartCanvas.getContext('2d');
        if (!ctx) return;

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Skor (%)',
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    maxBarThickness: 56
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 850,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(7, 17, 31, 0.95)',
                        titleColor: '#00D9FF',
                        bodyColor: '#FFFFFF',
                        borderColor: 'rgba(0, 217, 255, 0.4)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: (ctx) => ` Capaian: ${ctx.parsed.y} / 100 poin`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#A0AEC0',
                            font: {
                                size: 11,
                                family: 'Inter, sans-serif',
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.08)'
                        },
                        ticks: {
                            stepSize: 20,
                            color: '#A0AEC0',
                            font: {
                                size: 10,
                                family: 'Inter, sans-serif'
                            },
                            callback: (val) => `${val}%`
                        }
                    }
                }
            }
        });
    }

    /**
     * Memunculkan efek visual confetti apresiasi visual atas penyelesaian kuis
     * @param {boolean} forced Jika true, paksa burst perayaan terlepas dari status KKM
     */
    fireCelebratoryConfetti(forced = false) {
        if (!this.data) return;
        const score = this.data.score || 0;
        const passed = score >= (this.data.kkm || KKM);
        const isPerfect = score === 100;

        try {
            if (passed || forced) {
                // Semburan confetti utama dari pusat layar
                confetti({
                    particleCount: isPerfect ? 110 : 75,
                    spread: 70,
                    origin: { y: 0.65 },
                    colors: ['#00D9FF', '#0D6EFD', '#00FF88', '#FFC15E', '#FFFFFF'],
                    disableForReducedMotion: true
                });

                // Efek tembakan meriam sudut kiri dan kanan untuk nilai sempurna atau replay
                if (isPerfect || forced) {
                    setTimeout(() => {
                        confetti({
                            particleCount: 45,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0.05, y: 0.7 },
                            colors: ['#00D9FF', '#FFC15E', '#00FF88'],
                            disableForReducedMotion: true
                        });
                        confetti({
                            particleCount: 45,
                            angle: 120,
                            spread: 55,
                            origin: { x: 0.95, y: 0.7 },
                            colors: ['#00D9FF', '#FFC15E', '#00FF88'],
                            disableForReducedMotion: true
                        });
                    }, 280);
                }
            } else {
                // Efek motivasi ringan saat belum mencapai KKM
                confetti({
                    particleCount: 30,
                    spread: 45,
                    origin: { y: 0.7 },
                    colors: ['#00D9FF', '#FFC15E', '#0D6EFD'],
                    disableForReducedMotion: true
                });
            }
        } catch (e) {
            console.warn('Efek confetti tidak dapat dimuat:', e);
        }
    }

    bindEvents() {
        // Toggle Mode Grafik
        if (this.btnChartModeScore) {
            this.btnChartModeScore.addEventListener('click', () => {
                if (this.chartMode === 'score') return;
                this.chartMode = 'score';
                this.btnChartModeScore.classList.add('active');
                if (this.btnChartModeCategory) this.btnChartModeCategory.classList.remove('active');
                soundManager.playClick();
                this.initChart();
            });
        }

        if (this.btnChartModeCategory) {
            this.btnChartModeCategory.addEventListener('click', () => {
                if (this.chartMode === 'category') return;
                this.chartMode = 'category';
                this.btnChartModeCategory.classList.add('active');
                if (this.btnChartModeScore) this.btnChartModeScore.classList.remove('active');
                soundManager.playClick();
                this.initChart();
            });
        }

        // Tombol Replay Confetti
        if (this.btnConfettiReplay) {
            this.btnConfettiReplay.addEventListener('click', () => {
                soundManager.playQuizCorrect();
                this.fireCelebratoryConfetti(true);
            });
        }

        const btnLihat = document.getElementById('btn-lihat-pembahasan');
        if (btnLihat) {
            btnLihat.addEventListener('click', () => {
                this.switchScreen('view-pembahasan');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        ['btn-ulangi-1', 'btn-ulangi-2'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    window.location.href = 'kuis.html';
                });
            }
        });

        const btnPelajari = document.getElementById('btn-pelajari-kembali');
        if (btnPelajari) {
            btnPelajari.addEventListener('click', () => {
                window.location.href = 'materi.html';
            });
        }

        const btnSelesai = document.getElementById('btn-selesai');
        if (btnSelesai) {
            btnSelesai.addEventListener('click', () => {
                this.switchScreen('view-selesai');
                this.fireCelebratoryConfetti(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        const btnBeranda = document.getElementById('btn-beranda');
        if (btnBeranda) {
            btnBeranda.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Pengikatan langsung tombol logout mahasiswa (Log Out)
        const handleLogout = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            soundManager.playClick();
            promptLogout(() => {
                logoutStudentNow();
            });
        };

        const logoutBtnIds = ['btn-logout-selesai', 'btn-logout-nilai-success', 'btn-logout-nilai-fail'];
        logoutBtnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handleLogout);
            }
        });

        const logoutActionBtns = document.querySelectorAll('.student-logout-btn-action');
        logoutActionBtns.forEach(btn => {
            btn.addEventListener('click', handleLogout);
        });
    }

    switchScreen(targetId) {
        [this.viewNilai, this.viewPembahasan, this.viewSelesai].forEach(sec => {
            if (sec) sec.classList.remove('active');
        });
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResultApp();
});
