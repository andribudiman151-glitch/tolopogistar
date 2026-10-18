/**
 * js/interaction.js
 * Logika panel info perangkat, progres eksplorasi toleran, kontrol zoom/reset, dan modal panduan
 */

import { LEARNING_CATEGORIES, DEVICE_INFO } from './config.js';
import { CheckpointQuiz } from './checkpoint-quiz.js';
import { soundManager } from './sound.js';
import { requireStudentAuth, initStudentNavBar } from './auth.js';

class InteractionManager {
    constructor() {
        // Validasi sesi mahasiswa (redirect otomatis ke login.html jika belum login)
        const session = requireStudentAuth('login.html');
        if (!session) return;

        this.infoPanel = document.getElementById('info-panel');
        this.infoIcon = document.getElementById('info-icon');
        this.infoTitle = document.getElementById('info-title');
        this.infoFunction = document.getElementById('info-function');
        this.infoRole = document.getElementById('info-role');
        this.infoUsage = document.getElementById('info-usage');
        this.btnCloseInfo = document.getElementById('btn-close-info');

        this.progressPanel = document.getElementById('progress-panel');
        this.progressHeader = document.getElementById('progress-panel-header');
        this.progressBadgeCounter = document.getElementById('progress-badge-counter');
        this.btnToggleProgress = document.getElementById('btn-toggle-progress');
        this.notificationContainer = document.getElementById('learning-notification-container');

        this.progressList = document.getElementById('progress-list');
        this.progressCount = document.getElementById('progress-count');
        this.progressComplete = document.getElementById('progress-complete');
        this.btnToSimulation = document.getElementById('btn-to-simulation');
        this.btnToCheckpointQuiz = document.getElementById('btn-to-checkpoint-quiz');
        this.btnOpenCheckpoint = document.getElementById('btn-open-checkpoint-quiz');
        this.btnTopCheckpoint = document.getElementById('btn-top-checkpoint');
        this.btnBackTo3D = document.getElementById('btn-back-to-3d');

        this.learnedCategories = new Set();
        this.availableCategories = [];
        this.hasPromptedQuiz = false;

        // Inisialisasi komponen kuis interaktif checkpoint
        this.checkpointQuiz = new CheckpointQuiz();

        this.init();
    }

    init() {
        initStudentNavBar();
        soundManager.attachGlobalButtonSounds();

        // Bind tombol toggle audio jika ada
        const soundBtns = document.querySelectorAll('.sound-toggle-btn, [data-sound-toggle]');
        soundBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                soundManager.toggleSound();
            });
        });

        this.setupGuideModal();
        this.setupDeveloperModal();
        this.setupProgressWidget();
        this.setupCameraControls();
        this.setupPageTransitions();
        this.bindEvents();
        this.renderInitialProgress();
    }

    setupPageTransitions() {
        // Navigasi halaman dengan transisi overlay fade-out halus
        const pageTransitionOverlay = document.getElementById('page-transition-overlay');
        const navLinks = document.querySelectorAll('a[href$=".html"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetUrl = link.getAttribute('href');
                if (targetUrl && !targetUrl.startsWith('#')) {
                    e.preventDefault();
                    soundManager.playClick();
                    if (pageTransitionOverlay) {
                        pageTransitionOverlay.classList.add('active');
                    }
                    setTimeout(() => {
                        window.location.href = targetUrl;
                    }, 300);
                }
            });
        });
    }

    renderInitialProgress() {
        if (!this.progressList) return;
        this.progressList.innerHTML = '';

        this.availableCategories = [...LEARNING_CATEGORIES];

        this.availableCategories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'progress-item';
            item.id = `prog-cat-${cat.key}`;
            item.innerHTML = `<span class="mark">○</span> <span>${cat.label}</span>`;
            this.progressList.appendChild(item);
        });

        this.updateProgressUI();
    }

    filterAvailableCategories(discoveredKeys) {
        if (!discoveredKeys || discoveredKeys.length === 0) return;

        const foundCategories = new Set();
        discoveredKeys.forEach(k => {
            if (DEVICE_INFO[k]) {
                foundCategories.add(DEVICE_INFO[k].category);
            }
        });

        this.availableCategories = LEARNING_CATEGORIES.filter(cat => {
            if (cat.required) return true;
            return foundCategories.has(cat.key);
        });

        this.renderInitialProgress();
    }

    bindEvents() {
        window.addEventListener('device-clicked', (e) => {
            const device = e.detail.device;
            this.showDeviceInfo(device);
            this.markDeviceLearned(device);
        });

        window.addEventListener('device-unselected', () => {
            this.hideDeviceInfo();
        });

        window.addEventListener('model-loaded', (e) => {
            const discovered = e.detail.discoveredDevices;
            this.filterAvailableCategories(discovered);
        });

        if (this.btnCloseInfo) {
            this.btnCloseInfo.addEventListener('click', () => {
                this.hideDeviceInfo();
                window.dispatchEvent(new CustomEvent('device-unselected'));
            });
        }

        // Navigasi: 3D -> Simulasi
        if (this.btnToSimulation) {
            this.btnToSimulation.addEventListener('click', () => {
                const screen3d = document.getElementById('screen-3d');
                const screenSim = document.getElementById('screen-simulation');
                if (screen3d && screenSim) {
                    screen3d.classList.remove('active');
                    screenSim.classList.add('active');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        // Buka Kuis Pemahaman Checkpoint
        if (this.btnToCheckpointQuiz) {
            this.btnToCheckpointQuiz.addEventListener('click', () => {
                if (this.checkpointQuiz) this.checkpointQuiz.open();
            });
        }
        if (this.btnOpenCheckpoint) {
            this.btnOpenCheckpoint.addEventListener('click', () => {
                if (this.checkpointQuiz) this.checkpointQuiz.open();
            });
        }
        if (this.btnTopCheckpoint) {
            this.btnTopCheckpoint.addEventListener('click', () => {
                if (this.checkpointQuiz) this.checkpointQuiz.open();
            });
        }

        // Navigasi: Simulasi -> 3D
        if (this.btnBackTo3D) {
            this.btnBackTo3D.addEventListener('click', () => {
                const screen3d = document.getElementById('screen-3d');
                const screenSim = document.getElementById('screen-simulation');
                if (screen3d && screenSim) {
                    screenSim.classList.remove('active');
                    screen3d.classList.add('active');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    }

    showDeviceInfo(device) {
        if (!this.infoPanel) return;

        soundManager.playNodeInspect();

        this.infoIcon.textContent = device.icon || '📦';
        this.infoTitle.textContent = device.name;
        this.infoFunction.textContent = device.fungsi;
        this.infoRole.textContent = device.peran;

        // Tampilkan status alur transmisi paket data (Packet Flow)
        const packetBox = document.getElementById('info-packet-box');
        const packetText = document.getElementById('info-packet-text');
        if (packetBox && packetText) {
            if (device.category === 'pc') {
                packetBox.style.display = 'block';
                packetText.innerHTML = `Mengirimkan paket data (Ethernet Frame) dari <strong>${device.name}</strong> melalui kabel UTP langsung ke Switch Pusat.`;
            } else if (device.id === 'cable') {
                packetBox.style.display = 'block';
                packetText.innerHTML = `Sinyal data listrik dan pulsa mengalir secara simultan di seluruh jalur kabel UTP point-to-point menuju Switch Pusat.`;
            } else if (device.id === 'switch') {
                packetBox.style.display = 'block';
                packetText.innerHTML = `Switch menerima seluruh frame data, membaca MAC Address tujuan, dan meneruskannya ke port yang sesuai.`;
            } else if (device.id === 'printer') {
                packetBox.style.display = 'block';
                packetText.innerHTML = `Menerima paket data dokumen cetak dari Switch Pusat melalui jalur kabel UTP khusus.`;
            } else if (device.id === 'router') {
                packetBox.style.display = 'block';
                packetText.innerHTML = `Meneruskan paket data antara Switch LAN internal dan jaringan eksternal (Internet).`;
            } else {
                packetBox.style.display = 'none';
            }
        }

        if (this.infoUsage) {
            this.infoUsage.textContent = device.contoh || 'Digunakan pada implementasi jaringan lokal standard.';
        }

        this.infoPanel.classList.add('open');
    }

    hideDeviceInfo() {
        if (this.infoPanel) {
            this.infoPanel.classList.remove('open');
        }
    }

    setupProgressWidget() {
        if (!this.progressPanel || !this.progressHeader) return;

        const toggle = () => {
            soundManager.playClick();
            this.progressPanel.classList.toggle('collapsed');
        };

        this.progressHeader.addEventListener('click', () => {
            toggle();
        });

        if (this.btnToggleProgress) {
            this.btnToggleProgress.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle();
            });
        }
    }

    markDeviceLearned(device) {
        const catKey = device.category;
        const isNew = !this.learnedCategories.has(catKey);

        if (isNew) {
            this.learnedCategories.add(catKey);

            const itemEl = document.getElementById(`prog-cat-${catKey}`);
            if (itemEl) {
                itemEl.classList.add('done');
                const mark = itemEl.querySelector('.mark');
                if (mark) mark.textContent = '✓';
            }

            const total = this.availableCategories.length || 5;
            const current = this.learnedCategories.size;

            this.updateProgressUI();
            this.showLearningNotification(device, current, total);
        }
    }

    showLearningNotification(device, current, total) {
        if (!this.notificationContainer) return;

        // Animasi pulse lonceng pada widget progres
        if (this.progressPanel) {
            this.progressPanel.classList.add('pulse-ring');
            setTimeout(() => this.progressPanel.classList.remove('pulse-ring'), 600);
        }

        soundManager.playCorrect();

        const toast = document.createElement('div');
        const isComplete = current >= total;
        toast.className = `learning-toast ${isComplete ? 'complete-banner' : ''}`;

        const remaining = total - current;
        const descText = isComplete 
            ? 'Semua kategori komponen telah dipelajari! Siap untuk simulasi alur data & kuis pemahaman.'
            : `Kategori komponen berhasil dipelajari! Pelajari ${remaining} kategori lagi untuk membuka kuis pemahaman.`;

        toast.innerHTML = `
            <div class="learning-toast-icon">
                ${device.icon || '✨'}
            </div>
            <div class="learning-toast-content">
                <div class="learning-toast-tag">
                    <span>${isComplete ? '🎉 PROGRES LENGKAP' : '🔔 PROGRES PEMBELAJARAN'}</span>
                    <span style="color:var(--white);">${current}/${total}</span>
                </div>
                <div class="learning-toast-title">
                    ${isComplete ? 'Seluruh Komponen Dikuasai!' : `✅ ${device.name} Dipelajari`}
                </div>
                <div class="learning-toast-desc">${descText}</div>
            </div>
        `;

        this.notificationContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 320);
        }, 4000);
    }

    updateProgressUI() {
        const total = this.availableCategories.length;
        const current = this.learnedCategories.size;

        if (this.progressCount) {
            this.progressCount.textContent = `${current} / ${total} kategori dipelajari`;
        }

        if (this.progressBadgeCounter) {
            this.progressBadgeCounter.textContent = `${current}/${total}`;
            if (total > 0 && current >= total) {
                this.progressBadgeCounter.classList.add('complete');
            } else {
                this.progressBadgeCounter.classList.remove('complete');
            }
        }

        const allCompleted = total > 0 && current >= total;

        if (allCompleted) {
            if (this.progressComplete) {
                this.progressComplete.classList.add('show');
            }
            if (this.btnToSimulation) {
                this.btnToSimulation.removeAttribute('disabled');
            }
            if (this.btnToCheckpointQuiz) {
                this.btnToCheckpointQuiz.removeAttribute('disabled');
                this.btnToCheckpointQuiz.classList.add('pulse-glow');
            }

            // Secara otomatis munculkan kuis pemahaman saat seluruh kategori telah selesai dipelajari
            if (!this.hasPromptedQuiz) {
                this.hasPromptedQuiz = true;
                setTimeout(() => {
                    if (this.checkpointQuiz) {
                        this.checkpointQuiz.open();
                    }
                }, 650);
            }
        }
    }

    setupCameraControls() {
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnResetView = document.getElementById('btn-reset-view');

        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                if (window.topologyApp) window.topologyApp.zoom(-2.5);
            });
        }

        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                if (window.topologyApp) window.topologyApp.zoom(2.5);
            });
        }

        if (btnResetView) {
            btnResetView.addEventListener('click', () => {
                if (window.topologyApp) window.topologyApp.resetView();
            });
        }
    }

    setupGuideModal() {
        const btnGuide = document.getElementById('btn-guide');
        const modalGuide = document.getElementById('modal-guide');
        const btnCloseGuide = document.getElementById('btn-guide-close');

        const btnCloseGuideX = document.getElementById('btn-guide-close-x');

        // Buka overlay modal panduan secara otomatis di awal layar eksplorasi 3D
        if (modalGuide) {
            setTimeout(() => {
                modalGuide.classList.add('open');
            }, 350);
        }

        if (btnGuide && modalGuide) {
            btnGuide.addEventListener('click', () => {
                soundManager.playClick();
                modalGuide.classList.add('open');
            });
        }

        [btnCloseGuide, btnCloseGuideX].forEach(btn => {
            if (btn && modalGuide) {
                btn.addEventListener('click', () => {
                    soundManager.playClick();
                    modalGuide.classList.remove('open');
                });
            }
        });

        if (modalGuide) {
            modalGuide.addEventListener('click', (e) => {
                if (e.target === modalGuide) {
                    modalGuide.classList.remove('open');
                }
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalGuide.classList.contains('open')) {
                    modalGuide.classList.remove('open');
                }
            });
        }
    }

    setupDeveloperModal() {
        const btnDevTop = document.getElementById('btn-dev-profile-top');
        const modalDev = document.getElementById('modal-dev-profile');
        const btnCloseDev = document.getElementById('btn-close-dev-modal');
        const btnCloseDevHeader = document.getElementById('btn-close-dev-modal-header');

        if (btnDevTop && modalDev) {
            btnDevTop.addEventListener('click', () => {
                soundManager.playClick();
                modalDev.classList.add('open');
            });
        }

        [btnCloseDev, btnCloseDevHeader].forEach(btn => {
            if (btn && modalDev) {
                btn.addEventListener('click', () => {
                    soundManager.playClick();
                    modalDev.classList.remove('open');
                });
            }
        });

        if (modalDev) {
            modalDev.addEventListener('click', (e) => {
                if (e.target === modalDev) modalDev.classList.remove('open');
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalDev.classList.contains('open')) {
                    modalDev.classList.remove('open');
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InteractionManager();
});
