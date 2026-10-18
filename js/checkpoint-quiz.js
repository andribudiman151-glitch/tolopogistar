/**
 * js/checkpoint-quiz.js
 * Komponen Kuis Interaktif Pemahaman Peran Switch & Alur Data Topologi Star
 * Ditampilkan setelah pengguna menyelesaikan eksplorasi 3D.
 */

import { soundManager } from './sound.js';

export const CHECKPOINT_QUESTIONS = [
    {
        id: 1,
        category: "KONSENTRATOR PUSAT",
        badgeIcon: "🔀",
        question: "Mengapa Switch disebut sebagai titik simpul konsentrator sentral utama pada struktur Topologi Star?",
        options: [
            "Karena seluruh kabel perangkat client terhubung ke port Switch dan Switch mengatur lalu lintas transmisi data",
            "Karena Switch berfungsi mencetak dokumen kertas seperti printer",
            "Karena Switch menyuplai daya tegangan listrik ke motherboard seluruh komputer",
            "Karena Switch menggantikan fungsi monitor dan keyboard pada komputer client"
        ],
        answer: 0,
        explanation: "Switch adalah konsentrator pusat (central node). Seluruh workstation, printer, dan router terhubung langsung ke port-port fisik Switch via kabel UTP point-to-point, menjadikan Switch pengatur utama seluruh arus data."
    },
    {
        id: 2,
        category: "ALUR TRANSMISI DATA",
        badgeIcon: "⚡",
        question: "Bagaimanakah alur pengiriman paket data yang benar dari PC 01 menuju PC 03 pada Topologi Star?",
        options: [
            "PC 01 mengirim data langsung secara mandiri ke PC 03 tanpa melewati perangkat apa pun",
            "PC 01 ➔ PC 02 ➔ PC 03 secara berantai berurutan",
            "PC 01 ➔ SWITCH SENTRAL ➔ PC 03",
            "PC 01 ➔ Router Internet ➔ Printer ➔ PC 03"
        ],
        answer: 2,
        explanation: "Prinsip fundamental Topologi Star: Workstation tidak saling terhubung langsung. Seluruh komunikasi data antar-client WAJIB melalui Switch konsentrator sentral terlebih dahulu sebelum diteruskan ke tujuan."
    },
    {
        id: 3,
        category: "MEKANISME KERJA SWITCH",
        badgeIcon: "🔍",
        question: "Bagaimana cara Switch memastikan paket dari PC 01 hanya diteruskan ke PC 03 dan tidak bocor ke PC lain?",
        options: [
            "Switch membroadcast paket data ke seluruh port secara membabi-buta seperti Hub konvensional",
            "Switch memeriksa MAC Address tujuan pada frame data dan meneruskannya secara terarah hanya ke port PC 03",
            "Switch meminta kabel PC lainnya dilepas terlebih dahulu",
            "Switch mematikan sistem operasi pada PC lainnya"
        ],
        answer: 1,
        explanation: "Switch bekerja di Data Link Layer (Layer 2 OSI). Switch memanfaatkan MAC Address Table untuk membaca alamat fisik perangkat tujuan dan memforward frame secara unicast khusus ke port PC tujuan."
    },
    {
        id: 4,
        category: "TOLERANSI GANGGUAN KABEL",
        badgeIcon: "🔌",
        question: "Jika salah satu kabel UTP dari PC 02 ke Switch putus mendadak, apakah komunikasi antara PC 01 dan PC 03 akan terganggu?",
        options: [
            "Ya, seluruh jaringan langsung mati total",
            "Tidak terganggu, karena setiap PC memiliki jalur kabel independen ke Switch pusat",
            "Ya, kecepatan seluruh komputer otomatis turun menjadi nol",
            "Tidak, tetapi komputer PC 01 akan otomatis berubah nama menjadi PC 02"
        ],
        answer: 1,
        explanation: "Keunggulan utama Topologi Star adalah isolasi gangguan (fault isolation). Karena setiap node memiliki jalur kabel UTP point-to-point tersendiri ke Switch, kerusakan pada satu kabel client tidak mempengaruhi client lainnya."
    }
];

export class CheckpointQuiz {
    constructor() {
        this.modal = document.getElementById('modal-post-quiz');
        this.containerContent = document.getElementById('post-quiz-content');
        this.containerResult = document.getElementById('post-quiz-result');
        this.btnClose = document.getElementById('btn-close-post-quiz');

        // State kuis
        this.questions = CHECKPOINT_QUESTIONS;
        this.currentIndex = 0;
        this.userAnswers = new Array(this.questions.length).fill(null);
        this.hasAnsweredCurrent = false;

        this.init();
    }

    init() {
        if (!this.modal) return;

        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('open')) {
                this.close();
            }
        });
    }

    open() {
        if (!this.modal) return;
        this.currentIndex = 0;
        this.userAnswers = new Array(this.questions.length).fill(null);
        this.hasAnsweredCurrent = false;

        this.modal.classList.add('open');
        this.renderQuestion();
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.remove('open');
    }

    renderQuestion() {
        if (!this.containerContent || !this.containerResult) return;

        this.containerContent.style.display = 'block';
        this.containerResult.style.display = 'none';

        const q = this.questions[this.currentIndex];
        const progressPct = ((this.currentIndex + 1) / this.questions.length) * 100;

        const optionsHtml = q.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            return `
                <button type="button" class="post-quiz-opt" data-index="${idx}">
                    <span class="opt-key">${letter}</span>
                    <span class="opt-text">${opt}</span>
                    <span class="opt-check"></span>
                </button>
            `;
        }).join('');

        this.containerContent.innerHTML = `
            <div class="post-quiz-header">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="quiz-cat-badge">${q.badgeIcon} ${q.category}</span>
                    <span class="post-quiz-counter">Soal ${this.currentIndex + 1} dari ${this.questions.length}</span>
                </div>
                <div class="quiz-progress-track" style="margin-bottom:14px;">
                    <div class="quiz-progress-fill" style="width: ${progressPct}%;"></div>
                </div>
            </div>

            <h3 class="post-quiz-question-title">${q.question}</h3>

            <div class="post-quiz-options" id="post-quiz-options">
                ${optionsHtml}
            </div>

            <!-- Feedback instan setelah menjawab -->
            <div id="post-quiz-feedback" class="post-quiz-feedback" style="display:none;"></div>

            <div class="post-quiz-actions" style="margin-top:18px; display:flex; justify-content:space-between; align-items:center;">
                <button type="button" id="btn-post-quiz-close" class="btn btn-ghost btn-sm">Tutup Eksplorasi</button>
                <button type="button" id="btn-post-quiz-next" class="btn btn-primary" style="display:none;">
                    ${this.currentIndex < this.questions.length - 1 ? 'Soal Berikutnya →' : 'Lihat Hasil Kuis 🏆'}
                </button>
            </div>
        `;

        this.hasAnsweredCurrent = false;

        // Bind events
        const optButtons = this.containerContent.querySelectorAll('.post-quiz-opt');
        optButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedIdx = parseInt(btn.getAttribute('data-index'), 10);
                this.handleOptionSelect(selectedIdx);
            });
        });

        const btnNext = this.containerContent.querySelector('#btn-post-quiz-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (this.currentIndex < this.questions.length - 1) {
                    this.currentIndex++;
                    this.renderQuestion();
                } else {
                    this.renderResult();
                }
            });
        }

        const btnCloseInner = this.containerContent.querySelector('#btn-post-quiz-close');
        if (btnCloseInner) {
            btnCloseInner.addEventListener('click', () => this.close());
        }
    }

    handleOptionSelect(selectedIndex) {
        if (this.hasAnsweredCurrent) return;
        this.hasAnsweredCurrent = true;

        this.userAnswers[this.currentIndex] = selectedIndex;
        const q = this.questions[this.currentIndex];
        const isCorrect = selectedIndex === q.answer;

        // Audio feedback jawaban kuis
        if (isCorrect) {
            soundManager.playQuizCorrect();
        } else {
            soundManager.playQuizWrong();
        }

        const optButtons = this.containerContent.querySelectorAll('.post-quiz-opt');
        optButtons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === q.answer) {
                btn.classList.add('correct');
                const checkEl = btn.querySelector('.opt-check');
                if (checkEl) checkEl.textContent = '✓ Benar';
            } else if (idx === selectedIndex && !isCorrect) {
                btn.classList.add('wrong');
                const checkEl = btn.querySelector('.opt-check');
                if (checkEl) checkEl.textContent = '✗ Salah';
            }
        });

        const feedbackEl = this.containerContent.querySelector('#post-quiz-feedback');
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.className = `post-quiz-feedback ${isCorrect ? 'fb-correct' : 'fb-wrong'}`;
            feedbackEl.innerHTML = `
                <div class="fb-title">${isCorrect ? '🎉 Jawaban Anda Tepat!' : '💡 Jawaban Kurang Tepat'}</div>
                <div class="fb-desc"><strong>Pembahasan:</strong> ${q.explanation}</div>
            `;
        }

        const btnNext = this.containerContent.querySelector('#btn-post-quiz-next');
        if (btnNext) {
            btnNext.style.display = 'inline-flex';
            btnNext.classList.add('pulse-glow');
        }
    }

    renderResult() {
        if (!this.containerContent || !this.containerResult) return;

        this.containerContent.style.display = 'none';
        this.containerResult.style.display = 'block';

        let correctCount = 0;
        this.questions.forEach((q, idx) => {
            if (this.userAnswers[idx] === q.answer) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / this.questions.length) * 100);
        const isPass = score >= 75;

        this.containerResult.innerHTML = `
            <div class="emoji-lg" style="font-size:3rem; margin-bottom:10px;">${isPass ? '🏆' : '📚'}</div>
            <div class="section-label">HASIL EVALUASI PEMAHAMAN</div>
            <h3 style="font-size:1.4rem; margin-bottom:8px;">${isPass ? 'Luar Biasa! Pemahaman Teruji' : 'Perlu Penguatan Konsep'}</h3>
            
            <div class="result-score" style="margin:14px 0 6px;">
                <span style="font-size:2.8rem; font-weight:700; color:var(--cyan);">${score}</span>
                <span class="max" style="color:var(--gray); font-size:1.2rem;">/100</span>
            </div>
            <p style="color:var(--gray); margin-bottom:16px;">
                Anda menjawab benar <strong>${correctCount} dari ${this.questions.length}</strong> pertanyaan pemahaman.
            </p>

            <div class="kkm-pill" style="display:inline-block; margin-bottom:20px; padding:8px 18px;">
                <span style="font-size:0.75rem;">STATUS PEMAHAMAN</span>
                <strong style="color:${isPass ? '#00FF88' : '#FFC15E'}; font-size:1.15rem;">
                    ${isPass ? '✓ TUNTAS PEMAHAMAN SENTRAL SWITCH' : '⚠️ PERLU TINJAUAN ULANG'}
                </strong>
            </div>

            <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-sm); padding:14px; text-align:left; margin-bottom:20px; font-size:0.86rem; color:var(--gray); line-height:1.5;">
                <div style="color:var(--white); font-weight:700; margin-bottom:6px;">📌 Ringkasan Konsep Topologi Star:</div>
                <div>• <strong>Switch Sentral:</strong> Simpul konsentrator tunggal pengatur lalu lintas data.</div>
                <div>• <strong>Alur Data:</strong> Workstation ➔ Switch Sentral ➔ Workstation Tujuan (wajib lewat switch).</div>
                <div>• <strong>Selektif Unicast:</strong> Switch membaca MAC Address tabel tanpa broadcast berlebih.</div>
                <div>• <strong>Isolasi Kerusakan:</strong> Putusnya satu kabel client tidak mengganggu client lainnya.</div>
            </div>

            <div class="btn-row" style="flex-direction:column; gap:10px;">
                <a href="kuis.html" class="btn btn-primary" style="width:100%; text-decoration:none; text-align:center; padding:12px 20px;">
                    IKUTI KUIS EVALUASI LENGKAP (10 SOAL) 📝
                </a>
                <button type="button" id="btn-repeat-checkpoint" class="btn btn-outline" style="width:100%;">
                    Ulangi Kuis Pemahaman Ini ⟲
                </button>
                <div style="display:flex; gap:10px; width:100%;">
                    <button type="button" id="btn-checkpoint-to-sim" class="btn btn-outline" style="flex:1;">
                        Simulasi Alur 🔀
                    </button>
                    <button type="button" id="btn-checkpoint-close" class="btn btn-ghost" style="flex:1;">
                        Tutup (Kembali ke 3D)
                    </button>
                </div>
            </div>
        `;

        const btnRepeat = this.containerResult.querySelector('#btn-repeat-checkpoint');
        if (btnRepeat) {
            btnRepeat.addEventListener('click', () => {
                this.currentIndex = 0;
                this.userAnswers = new Array(this.questions.length).fill(null);
                this.renderQuestion();
            });
        }

        const btnToSim = this.containerResult.querySelector('#btn-checkpoint-to-sim');
        if (btnToSim) {
            btnToSim.addEventListener('click', () => {
                this.close();
                const screen3d = document.getElementById('screen-3d');
                const screenSim = document.getElementById('screen-simulation');
                if (screen3d && screenSim) {
                    screen3d.classList.remove('active');
                    screenSim.classList.add('active');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        const btnClose = this.containerResult.querySelector('#btn-checkpoint-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.close());
        }
    }
}
