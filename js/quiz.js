/**
 * js/quiz.js
 * Manajemen Kuis Interaktif: Peran Switch & Alur Data Topologi Star
 * Fitur: Navigator Grid Soal 1-10, Pilihan A-D & 1-4, Keyboard Hotkeys,
 * Review Jawaban Bebas, Peringatan Soal Belum Terjawab, dan Evaluasi KKM.
 */

import { questions } from './questions.js';
import { KKM } from './config.js';
import { soundManager } from './sound.js';
import { requireStudentAuth, initStudentNavBar } from './auth.js';

class QuizApp {
    constructor() {
        // Validasi sesi mahasiswa (redirect otomatis jika belum login)
        const session = requireStudentAuth('login.html');
        if (!session) return;

        // Elemen UI
        this.questionStageEl = document.getElementById('quiz-question-stage');
        this.counterEl = document.getElementById('quiz-counter');
        this.catBadgeEl = document.getElementById('quiz-cat-badge');
        this.progressFillEl = document.getElementById('quiz-progress-fill');
        this.questionEl = document.getElementById('quiz-question');
        this.optionListEl = document.getElementById('option-list');
        this.numGridEl = document.getElementById('quiz-num-grid');
        this.answeredCountEl = document.getElementById('quiz-answered-count');

        // State Transisi Slide
        this.transitionTimeout = null;

        // Tombol Aksi
        this.btnPrev = document.getElementById('btn-prev-q');
        this.btnNext = document.getElementById('btn-next-q');
        this.btnFinish = document.getElementById('btn-finish-q');

        // Modal Konfirmasi
        this.modalConfirm = document.getElementById('modal-confirm-finish');
        this.modalConfirmDesc = document.getElementById('modal-confirm-desc');
        this.btnCancelFinish = document.getElementById('btn-cancel-finish');
        this.btnProceedFinish = document.getElementById('btn-proceed-finish');

        // State Kuis
        this.quizData = [...questions];
        this.currentIndex = 0;
        this.userAnswers = new Array(this.quizData.length).fill(null);

        // Web Audio Synthesizer untuk interaksi responsif
        this.audioCtx = null;

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

        this.renderNumGrid();
        this.renderQuestion();
        this.bindEvents();
        this.bindKeyboard();
        this.updateAnsweredCounter();
    }

    playFeedbackSound(type = 'select') {
        if (type === 'select') {
            soundManager.playClick();
        } else if (type === 'navigate') {
            soundManager.playClick();
        }
    }

    renderNumGrid() {
        if (!this.numGridEl) return;
        this.numGridEl.innerHTML = '';

        this.quizData.forEach((_, idx) => {
            const btn = document.createElement('button');
            btn.className = 'q-num-btn';
            btn.setAttribute('type', 'button');
            btn.setAttribute('aria-label', `Pindah ke Soal ${idx + 1}`);
            btn.textContent = idx + 1;

            if (idx === this.currentIndex) {
                btn.classList.add('active');
            }
            if (this.userAnswers[idx] !== null) {
                btn.classList.add('answered');
            }

            btn.addEventListener('click', () => {
                this.playFeedbackSound('navigate');
                this.goToQuestion(idx);
            });

            this.numGridEl.appendChild(btn);
        });
    }

    renderQuestion() {
        if (!this.questionEl || !this.optionListEl) return;

        const currentQ = this.quizData[this.currentIndex];
        const total = this.quizData.length;
        const number = this.currentIndex + 1;

        // 1. Kategori & Nomor Soal
        if (this.counterEl) {
            this.counterEl.textContent = `Soal ${number} dari ${total}`;
        }
        if (this.catBadgeEl) {
            const icon = currentQ.categoryIcon || '📌';
            const cat = currentQ.category || 'TOPOLOGI STAR';
            this.catBadgeEl.textContent = `${icon} ${cat}`;
        }

        // 2. Progress Bar
        if (this.progressFillEl) {
            const pct = Math.round((number / total) * 100);
            this.progressFillEl.style.width = `${pct}%`;
        }

        // 3. Teks Pertanyaan
        this.questionEl.textContent = currentQ.question;
        this.optionListEl.innerHTML = '';

        // 4. Opsi Jawaban (A, B, C, D)
        const letters = ['A', 'B', 'C', 'D'];
        const existingAnswer = this.userAnswers[this.currentIndex];

        currentQ.options.forEach((optText, optIdx) => {
            const btn = document.createElement('button');
            btn.className = 'option-item';
            btn.setAttribute('type', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', existingAnswer === optIdx ? 'true' : 'false');
            btn.setAttribute('aria-label', `Pilihan ${letters[optIdx]}: ${optText}`);

            if (existingAnswer === optIdx) {
                btn.classList.add('selected');
            }

            btn.innerHTML = `
                <span class="option-letter">${letters[optIdx]}</span>
                <span class="option-text">${optText}</span>
            `;

            btn.addEventListener('click', () => {
                this.selectOption(optIdx);
            });

            this.optionListEl.appendChild(btn);
        });

        // 5. Update Status Tombol Navigasi Bawah
        if (this.btnPrev) {
            this.btnPrev.disabled = (this.currentIndex === 0);
        }
        if (this.btnNext) {
            this.btnNext.disabled = (this.currentIndex === total - 1);
        }

        // 6. Update Sorotan Navigator Grid
        this.updateNumGridState();
    }

    updateNumGridState() {
        if (!this.numGridEl) return;
        const buttons = this.numGridEl.querySelectorAll('.q-num-btn');
        buttons.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === this.currentIndex);
            btn.classList.toggle('answered', this.userAnswers[idx] !== null);
        });
    }

    updateAnsweredCounter() {
        const answeredCount = this.userAnswers.filter(a => a !== null).length;
        const total = this.quizData.length;

        if (this.answeredCountEl) {
            this.answeredCountEl.textContent = `${answeredCount} / ${total} Terjawab`;
        }
        if (this.btnFinish) {
            this.btnFinish.textContent = answeredCount === total 
                ? 'Selesaikan Kuis & Nilai ✓' 
                : `Selesaikan Kuis (${answeredCount}/${total}) ✓`;
        }
    }

    selectOption(optIdx) {
        this.playFeedbackSound('select');
        this.userAnswers[this.currentIndex] = optIdx;

        // Update tampilan pilihan terpilih
        const options = this.optionListEl.querySelectorAll('.option-item');
        options.forEach((opt, idx) => {
            const isSelected = (idx === optIdx);
            opt.classList.toggle('selected', isSelected);
            opt.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });

        // Update navigator
        this.updateNumGridState();
        this.updateAnsweredCounter();

        // Otomatis berpindah ke soal berikutnya setelah jeda singkat jika belum di soal terakhir
        if (this.currentIndex < this.quizData.length - 1) {
            setTimeout(() => {
                this.goToQuestion(this.currentIndex + 1);
            }, 320);
        }
    }

    goToQuestion(index, skipAnimation = false) {
        if (index < 0 || index >= this.quizData.length || index === this.currentIndex) return;

        // Jika kontainer panggung soal tidak ditemukan atau diminta tanpa animasi, langsung render
        if (!this.questionStageEl || skipAnimation) {
            this.currentIndex = index;
            this.renderQuestion();
            return;
        }

        // Tentukan arah pergeseran: maju (ke kiri) atau mundur (ke kanan)
        const isForward = index > this.currentIndex;
        const outClass = isForward ? 'slide-out-left' : 'slide-out-right';
        const inClass = isForward ? 'slide-in-right' : 'slide-in-left';

        // Bersihkan timeout animasi sebelumnya jika tombol ditekan berurutan dengan cepat
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }

        // Fase 1: Slide & Fade-Out soal saat ini
        this.questionStageEl.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
        this.questionStageEl.classList.add(outClass);

        this.transitionTimeout = setTimeout(() => {
            // Fase 2: Update indeks dan render konten butir soal baru
            this.currentIndex = index;
            this.renderQuestion();

            // Fase 3: Slide & Fade-In butir soal baru masuk
            this.questionStageEl.classList.remove(outClass);
            this.questionStageEl.classList.add(inClass);

            // Bersihkan kelas animasi setelah animasi selesai
            this.transitionTimeout = setTimeout(() => {
                if (this.questionStageEl) {
                    this.questionStageEl.classList.remove(inClass);
                }
                this.transitionTimeout = null;
            }, 240);
        }, 180);
    }

    bindEvents() {
        if (this.btnPrev) {
            this.btnPrev.addEventListener('click', () => {
                this.playFeedbackSound('navigate');
                this.goToQuestion(this.currentIndex - 1);
            });
        }

        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => {
                this.playFeedbackSound('navigate');
                this.goToQuestion(this.currentIndex + 1);
            });
        }

        if (this.btnFinish) {
            this.btnFinish.addEventListener('click', () => {
                this.handleFinishAttempt();
            });
        }

        if (this.btnCancelFinish && this.modalConfirm) {
            this.btnCancelFinish.addEventListener('click', () => {
                this.modalConfirm.classList.remove('open');
                // Arahkan ke soal pertama yang belum terjawab
                const firstUnanswered = this.userAnswers.findIndex(a => a === null);
                if (firstUnanswered !== -1) {
                    this.goToQuestion(firstUnanswered);
                }
            });
        }

        if (this.btnProceedFinish) {
            this.btnProceedFinish.addEventListener('click', () => {
                if (this.modalConfirm) this.modalConfirm.classList.remove('open');
                this.evaluateAndSubmit();
            });
        }

        if (this.modalConfirm) {
            this.modalConfirm.addEventListener('click', (e) => {
                if (e.target === this.modalConfirm) {
                    this.modalConfirm.classList.remove('open');
                }
            });
        }
    }

    bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            // Jangan tangani hotkey jika modal konfirmasi sedang terbuka
            if (this.modalConfirm && this.modalConfirm.classList.contains('open')) {
                if (e.key === 'Escape') this.modalConfirm.classList.remove('open');
                return;
            }

            const key = e.key.toUpperCase();

            // Pilihan A/1, B/2, C/3, D/4
            if (['A', '1'].includes(key)) this.selectOption(0);
            else if (['B', '2'].includes(key)) this.selectOption(1);
            else if (['C', '3'].includes(key)) this.selectOption(2);
            else if (['D', '4'].includes(key)) this.selectOption(3);

            // Navigasi panah
            else if (e.key === 'ArrowLeft') {
                if (this.currentIndex > 0) this.goToQuestion(this.currentIndex - 1);
            } else if (e.key === 'ArrowRight') {
                if (this.currentIndex < this.quizData.length - 1) this.goToQuestion(this.currentIndex + 1);
            }
        });
    }

    handleFinishAttempt() {
        const answeredCount = this.userAnswers.filter(a => a !== null).length;
        const total = this.quizData.length;

        if (answeredCount < total) {
            // Ada soal yang belum terjawab, tampilkan konfirmasi
            const unansweredList = [];
            this.userAnswers.forEach((ans, i) => {
                if (ans === null) unansweredList.push(i + 1);
            });

            if (this.modalConfirmDesc) {
                this.modalConfirmDesc.innerHTML = `
                    Anda baru menjawab <strong>${answeredCount}</strong> dari ${total} soal.<br/>
                    Soal nomor <strong>${unansweredList.join(', ')}</strong> belum dijawab. Soal yang dikosongkan akan dihitung sebagai salah.
                `;
            }
            if (this.modalConfirm) this.modalConfirm.classList.add('open');
        } else {
            // Seluruh soal telah terjawab
            this.evaluateAndSubmit();
        }
    }

    evaluateAndSubmit() {
        const total = this.quizData.length;
        let correctCount = 0;

        const evaluatedAnswers = this.quizData.map((q, idx) => {
            const userChoice = this.userAnswers[idx];
            const isCorrect = (userChoice === q.answer);
            if (isCorrect) correctCount++;

            return {
                question: q.question,
                options: q.options,
                userAnswerIndex: userChoice,
                correctAnswerIndex: q.answer,
                isCorrect: isCorrect,
                explanation: q.explanation,
                category: q.category || 'TOPOLOGI STAR'
            };
        });

        const score = Math.round((correctCount / total) * 100);
        const passed = score >= KKM;

        const resultPayload = {
            score,
            correctCount,
            totalQuestions: total,
            kkm: KKM,
            passed,
            userAnswers: evaluatedAnswers,
            timestamp: new Date().toISOString()
        };

        // Simpan hasil evaluasi ke localStorage agar dapat ditampilkan di hasil.html
        localStorage.setItem('topologiStarQuizResult', JSON.stringify(resultPayload));
        window.location.href = 'hasil.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
