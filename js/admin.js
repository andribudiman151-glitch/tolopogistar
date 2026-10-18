/**
 * js/admin.js
 * Logika Autentikasi & Dashboard Panel Administrator
 * 
 * =========================================================================================
 * CATATAN KEAMANAN (SECURITY DISCLAIMER):
 * Kredensial akun admin di bawah ini disimpan dan divalidasi langsung di sisi peramban (client-side).
 * Cara ini TIDAK BENAR-BENAR AMAN dari inspeksi kode sumber (DevTools) dan hanya cocok
 * untuk keperluan demonstrasi, media pembelajaran, atau prototipe.
 * Untuk implementasi produksi sesungguhnya, autentikasi admin wajib diproses di server-side yang aman
 * dengan hashing kata sandi (misal bcrypt) dan token sesi/cookie terenkripsi.
 * =========================================================================================
 */

import { getAllStudents, deleteStudent, clearAllStudents, exportCSV } from './storage.js';
import { DEPARTMENTS, escapeHtml } from './auth.js';
import { soundManager } from './sound.js';

// KREDENSIAL DEFAULT ADMIN (Dapat diubah sesuai kebutuhan pengelola)
export const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

const ADMIN_SESSION_KEY = 'topologiStar_adminSession';

export class AdminApp {
    constructor() {
        this.loginView = document.getElementById('admin-login-view');
        this.dashboardView = document.getElementById('admin-dashboard-view');

        // Form Login
        this.loginForm = document.getElementById('admin-login-form');
        this.inputUser = document.getElementById('admin-username');
        this.inputPass = document.getElementById('admin-password');
        this.loginError = document.getElementById('admin-login-error');

        // Dashboard Elements
        this.btnLogout = document.getElementById('btn-admin-logout');
        this.statTotalStudents = document.getElementById('stat-total-students');
        this.statTotalAttempts = document.getElementById('stat-total-attempts');
        this.statAverageScore = document.getElementById('stat-average-score');
        this.statPassed = document.getElementById('stat-passed');
        this.statFailed = document.getElementById('stat-failed');

        // Filters & Search
        this.searchInput = document.getElementById('admin-search-input');
        this.filterJurusan = document.getElementById('admin-filter-jurusan');
        this.filterStatus = document.getElementById('admin-filter-status');
        this.btnExportCsv = document.getElementById('btn-export-csv');
        this.btnClearAll = document.getElementById('btn-clear-all-data');

        // Table Elements
        this.tableBody = document.getElementById('admin-table-body');
        this.tableHeaders = document.querySelectorAll('.admin-table th.sortable');
        this.emptyState = document.getElementById('admin-empty-state');

        // Detail Modal
        this.detailModal = document.getElementById('modal-student-detail');
        this.detailTitle = document.getElementById('detail-modal-title');
        this.detailSubtitle = document.getElementById('detail-modal-subtitle');
        this.detailList = document.getElementById('detail-attempts-list');
        this.btnDetailClose = document.getElementById('btn-close-detail-modal');

        // Delete All Confirmation Modal
        this.modalDeleteAll = document.getElementById('modal-confirm-delete-all');
        this.btnCancelDeleteAll = document.getElementById('btn-cancel-delete-all');
        this.btnConfirmDeleteAll = document.getElementById('btn-confirm-delete-all');
        this.btnCloseDeleteAllX = document.getElementById('btn-close-delete-all-x');
        this.deleteAllCountPreview = document.getElementById('delete-all-count-preview');

        // Delete Single Student Modal
        this.modalDeleteSingle = document.getElementById('modal-confirm-delete-single');
        this.btnCancelDeleteSingle = document.getElementById('btn-cancel-delete-single');
        this.btnConfirmDeleteSingle = document.getElementById('btn-confirm-delete-single');
        this.btnCloseDeleteSingleX = document.getElementById('btn-close-delete-single-x');
        this.deleteSingleStudentName = document.getElementById('delete-single-student-name');
        this.deleteSingleStudentNim = document.getElementById('delete-single-student-nim');
        this.pendingDeleteNim = null;

        // Logout Confirmation Modal
        this.modalLogoutAdmin = document.getElementById('modal-confirm-admin-logout');
        this.btnCancelLogoutAdmin = document.getElementById('btn-cancel-admin-logout');
        this.btnConfirmLogoutAdmin = document.getElementById('btn-confirm-admin-logout');

        // Toast Container
        this.toastContainer = document.getElementById('admin-toast-container');

        // Sort State
        this.sortColumn = 'lastLogin';
        this.sortDirection = 'desc'; // 'asc' | 'desc'

        this.init();
    }

    init() {
        soundManager.attachGlobalButtonSounds();

        // Bind Sound Toggle Buttons
        const soundBtns = document.querySelectorAll('.sound-toggle-btn, [data-sound-toggle]');
        soundBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                soundManager.toggleSound();
            });
        });

        // Cek sesi login admin
        if (this.isAdminLoggedIn()) {
            this.showDashboard();
        } else {
            this.showLogin();
        }

        this.bindEvents();
    }

    isAdminLoggedIn() {
        return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    }

    setAdminLoggedIn(val) {
        if (val) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        } else {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
        }
    }

    showLogin() {
        if (this.loginView) this.loginView.style.display = 'flex';
        if (this.dashboardView) this.dashboardView.style.display = 'none';
        if (this.inputUser) this.inputUser.focus();
    }

    showDashboard() {
        if (this.loginView) this.loginView.style.display = 'none';
        if (this.dashboardView) this.dashboardView.style.display = 'block';

        this.populateDepartmentFilter();
        this.renderDashboard();
    }

    populateDepartmentFilter() {
        if (!this.filterJurusan) return;
        this.filterJurusan.innerHTML = '<option value="">Semua Program Studi / Jurusan</option>';
        DEPARTMENTS.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            this.filterJurusan.appendChild(opt);
        });
    }

    bindEvents() {
        // Handle Login Form
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = this.inputUser.value.trim();
                const p = this.inputPass.value;

                if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
                    this.setAdminLoggedIn(true);
                    this.loginError.textContent = '';
                    soundManager.playClick();
                    this.showDashboard();
                } else {
                    this.loginError.textContent = 'Nama pengguna atau kata sandi tidak valid.';
                    soundManager.playQuizWrong();
                }
            });
        }

        // Handle Logout Admin
        if (this.btnLogout) {
            this.btnLogout.addEventListener('click', () => {
                soundManager.playClick();
                this.openLogoutModal();
            });
        }
        if (this.btnCancelLogoutAdmin) {
            this.btnCancelLogoutAdmin.addEventListener('click', () => {
                soundManager.playClick();
                this.closeLogoutModal();
            });
        }
        if (this.btnConfirmLogoutAdmin) {
            this.btnConfirmLogoutAdmin.addEventListener('click', () => {
                this.closeLogoutModal();
                this.setAdminLoggedIn(false);
                soundManager.playClick();
                this.showLogin();
                this.showToast('Berhasil keluar dari sesi Administrator.', 'info');
            });
        }

        // Search & Filter Events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.renderTableOnly());
        }
        if (this.filterJurusan) {
            this.filterJurusan.addEventListener('change', () => this.renderTableOnly());
        }
        if (this.filterStatus) {
            this.filterStatus.addEventListener('change', () => this.renderTableOnly());
        }

        // Table Header Sort
        this.tableHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (!col) return;

                if (this.sortColumn === col) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = col;
                    this.sortDirection = 'asc';
                }

                soundManager.playClick();
                this.updateSortHeaderUI();
                this.renderTableOnly();
            });
        });

        // Export CSV
        if (this.btnExportCsv) {
            this.btnExportCsv.addEventListener('click', () => {
                soundManager.playClick();
                const res = exportCSV();
                if (!res.success) {
                    this.showToast(res.message, 'warning');
                } else {
                    this.showToast('Data mahasiswa berhasil diekspor ke format CSV!', 'success');
                }
            });
        }

        // Clear All Data Modal Triggers
        if (this.btnClearAll) {
            this.btnClearAll.addEventListener('click', () => {
                soundManager.playClick();
                this.openDeleteAllModal();
            });
        }
        if (this.btnCancelDeleteAll) {
            this.btnCancelDeleteAll.addEventListener('click', () => {
                soundManager.playClick();
                this.closeDeleteAllModal();
            });
        }
        if (this.btnCloseDeleteAllX) {
            this.btnCloseDeleteAllX.addEventListener('click', () => {
                soundManager.playClick();
                this.closeDeleteAllModal();
            });
        }
        if (this.btnConfirmDeleteAll) {
            this.btnConfirmDeleteAll.addEventListener('click', () => {
                soundManager.playClick();
                clearAllStudents();
                this.closeDeleteAllModal();
                this.renderDashboard();
                this.showToast('Seluruh data mahasiswa dan riwayat kuis telah berhasil dibersihkan.', 'success');
            });
        }

        // Delete Single Student Modal Triggers
        if (this.btnCancelDeleteSingle) {
            this.btnCancelDeleteSingle.addEventListener('click', () => {
                soundManager.playClick();
                this.closeDeleteSingleModal();
            });
        }
        if (this.btnCloseDeleteSingleX) {
            this.btnCloseDeleteSingleX.addEventListener('click', () => {
                soundManager.playClick();
                this.closeDeleteSingleModal();
            });
        }
        if (this.btnConfirmDeleteSingle) {
            this.btnConfirmDeleteSingle.addEventListener('click', () => {
                if (this.pendingDeleteNim) {
                    soundManager.playClick();
                    deleteStudent(this.pendingDeleteNim);
                    this.closeDeleteSingleModal();
                    this.renderDashboard();
                    this.showToast('Data mahasiswa berhasil dihapus.', 'success');
                }
            });
        }

        // Detail Modal Close
        if (this.btnDetailClose) {
            this.btnDetailClose.addEventListener('click', () => this.hideDetailModal());
        }

        // Backdrop Clicks for all admin modals
        [this.detailModal, this.modalDeleteAll, this.modalDeleteSingle, this.modalLogoutAdmin].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('open');
                    }
                });
            }
        });

        // Global Escape Key to close open modals
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [this.detailModal, this.modalDeleteAll, this.modalDeleteSingle, this.modalLogoutAdmin].forEach(m => {
                    if (m && m.classList.contains('open')) m.classList.remove('open');
                });
            }
        });
    }

    showToast(message, type = 'info', duration = 3500) {
        if (!this.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'warning') icon = '⚠️';
        else if (type === 'error') icon = '❌';

        toast.innerHTML = `
            <span style="font-size:1.25rem; flex-shrink:0;">${icon}</span>
            <div style="flex:1;">${escapeHtml(message)}</div>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    openDeleteAllModal() {
        if (!this.modalDeleteAll) return;
        const students = getAllStudents();
        if (this.deleteAllCountPreview) {
            this.deleteAllCountPreview.textContent = students.length;
        }
        this.modalDeleteAll.classList.add('open');
    }

    closeDeleteAllModal() {
        if (this.modalDeleteAll) {
            this.modalDeleteAll.classList.remove('open');
        }
    }

    openDeleteSingleModal(nim, nama) {
        this.pendingDeleteNim = nim;
        if (this.deleteSingleStudentName) this.deleteSingleStudentName.textContent = nama || '-';
        if (this.deleteSingleStudentNim) this.deleteSingleStudentNim.textContent = nim || '-';
        if (this.modalDeleteSingle) {
            this.modalDeleteSingle.classList.add('open');
        }
    }

    closeDeleteSingleModal() {
        this.pendingDeleteNim = null;
        if (this.modalDeleteSingle) {
            this.modalDeleteSingle.classList.remove('open');
        }
    }

    openLogoutModal() {
        if (this.modalLogoutAdmin) {
            this.modalLogoutAdmin.classList.add('open');
        }
    }

    closeLogoutModal() {
        if (this.modalLogoutAdmin) {
            this.modalLogoutAdmin.classList.remove('open');
        }
    }

    updateSortHeaderUI() {
        this.tableHeaders.forEach(th => {
            const ind = th.querySelector('.sort-indicator');
            if (!ind) return;
            if (th.dataset.sort === this.sortColumn) {
                ind.textContent = this.sortDirection === 'asc' ? ' ▲' : ' ▼';
                ind.style.color = 'var(--cyan)';
            } else {
                ind.textContent = ' ⇅';
                ind.style.color = 'var(--gray)';
            }
        });
    }

    renderDashboard() {
        const students = getAllStudents();
        this.calculateAndRenderStats(students);
        this.renderTableOnly();
    }

    calculateAndRenderStats(students) {
        const totalStudents = students.length;
        let totalAttempts = 0;
        let totalScoreSum = 0;
        let attemptsWithScore = 0;
        let passedCount = 0;
        let failedCount = 0;

        students.forEach(std => {
            const attempts = Array.isArray(std.attempts) ? std.attempts : [];
            totalAttempts += attempts.length;

            if (attempts.length > 0) {
                // Cari nilai tertinggi siswa
                const highScore = Math.max(...attempts.map(a => a.score || 0));
                if (highScore >= 75) {
                    passedCount++;
                } else {
                    failedCount++;
                }

                attempts.forEach(a => {
                    if (typeof a.score === 'number') {
                        totalScoreSum += a.score;
                        attemptsWithScore++;
                    }
                });
            }
        });

        const avgScore = attemptsWithScore > 0 ? (totalScoreSum / attemptsWithScore).toFixed(1) : '-';

        if (this.statTotalStudents) this.statTotalStudents.textContent = totalStudents;
        if (this.statTotalAttempts) this.statTotalAttempts.textContent = totalAttempts;
        if (this.statAverageScore) this.statAverageScore.textContent = avgScore;
        if (this.statPassed) this.statPassed.textContent = passedCount;
        if (this.statFailed) this.statFailed.textContent = failedCount;
    }

    renderTableOnly() {
        const allStudents = getAllStudents();
        const searchKeyword = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();
        const selectedJurusan = this.filterJurusan ? this.filterJurusan.value : '';
        const selectedStatus = this.filterStatus ? this.filterStatus.value : '';

        // 1. Filter Data
        const filtered = allStudents.filter(std => {
            // Search Nama / NIM
            if (searchKeyword) {
                const matchNama = (std.nama || '').toLowerCase().includes(searchKeyword);
                const matchNim = String(std.nim || '').toLowerCase().includes(searchKeyword);
                if (!matchNama && !matchNim) return false;
            }

            // Filter Jurusan
            if (selectedJurusan && std.jurusan !== selectedJurusan) {
                return false;
            }

            // Filter Status Kuis
            const attempts = Array.isArray(std.attempts) ? std.attempts : [];
            const hasAttempts = attempts.length > 0;
            const highScore = hasAttempts ? Math.max(...attempts.map(a => a.score || 0)) : null;

            if (selectedStatus === 'PASSED') {
                if (!hasAttempts || highScore < 75) return false;
            } else if (selectedStatus === 'FAILED') {
                if (!hasAttempts || highScore >= 75) return false;
            } else if (selectedStatus === 'NONE') {
                if (hasAttempts) return false;
            }

            return true;
        });

        // 2. Sorting Data
        filtered.sort((a, b) => {
            let valA = a[this.sortColumn];
            let valB = b[this.sortColumn];

            // Penyesuaian nilai turunan
            if (this.sortColumn === 'lastScore') {
                const attA = a.attempts || [];
                const attB = b.attempts || [];
                valA = attA.length > 0 ? (attA[attA.length - 1].score || 0) : -1;
                valB = attB.length > 0 ? (attB[attB.length - 1].score || 0) : -1;
            } else if (this.sortColumn === 'highScore') {
                const attA = a.attempts || [];
                const attB = b.attempts || [];
                valA = attA.length > 0 ? Math.max(...attA.map(x => x.score || 0)) : -1;
                valB = attB.length > 0 ? Math.max(...attB.map(x => x.score || 0)) : -1;
            } else if (this.sortColumn === 'attemptCount') {
                valA = (a.attempts || []).length;
                valB = (b.attempts || []).length;
            } else {
                valA = valA !== undefined && valA !== null ? String(valA).toLowerCase() : '';
                valB = valB !== undefined && valB !== null ? String(valB).toLowerCase() : '';
            }

            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Render Baris Tabel
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        if (filtered.length === 0) {
            if (this.emptyState) this.emptyState.style.display = 'flex';
            return;
        } else {
            if (this.emptyState) this.emptyState.style.display = 'none';
        }

        const formatDate = (isoStr) => {
            if (!isoStr) return '-';
            try {
                const d = new Date(isoStr);
                return d.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }) + ' ' + d.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                }).replace(/\./g, ':');
            } catch (e) {
                return isoStr;
            }
        };

        filtered.forEach((std, idx) => {
            const tr = document.createElement('tr');
            const attempts = Array.isArray(std.attempts) ? std.attempts : [];
            const attemptCount = attempts.length;

            let lastScoreBadge = '<span style="color:var(--gray);">-</span>';
            let highScoreBadge = '<span style="color:var(--gray);">-</span>';
            let statusPill = '<span class="status-pill empty">Belum Kuis</span>';

            if (attemptCount > 0) {
                const lastAttempt = attempts[attempts.length - 1];
                const highScore = Math.max(...attempts.map(a => a.score || 0));

                lastScoreBadge = `<strong>${lastAttempt.score}</strong>`;
                highScoreBadge = `<strong style="color:var(--cyan);">${highScore}</strong>`;

                if (highScore >= 75) {
                    statusPill = '<span class="status-pill success">BERHASIL</span>';
                } else {
                    statusPill = '<span class="status-pill fail">BELUM BERHASIL</span>';
                }
            }

            tr.innerHTML = `
                <td style="color:var(--gray); font-size:0.8rem;">${idx + 1}</td>
                <td>
                    <div style="font-weight:600; color:var(--white);">${escapeHtml(std.nama)}</div>
                </td>
                <td>
                    <code style="color:var(--cyan); font-family:monospace;">${escapeHtml(std.nim)}</code>
                </td>
                <td style="font-size:0.84rem;">${escapeHtml(std.jurusan || '-')}</td>
                <td style="font-size:0.8rem; color:var(--gray); white-space:nowrap;">
                    ${formatDate(std.lastLogin)}
                </td>
                <td style="text-align:center;">${std.loginCount || 1}</td>
                <td style="text-align:center;">${lastScoreBadge}</td>
                <td style="text-align:center;">${highScoreBadge}</td>
                <td>${statusPill}</td>
                <td>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" class="btn-action-icon btn-detail" data-nim="${escapeHtml(std.nim)}" title="Lihat Riwayat Percobaan Kuis">
                            👁️ Detail
                        </button>
                        <button type="button" class="btn-action-icon btn-danger btn-delete" data-nim="${escapeHtml(std.nim)}" data-nama="${escapeHtml(std.nama)}" title="Hapus Data Mahasiswa Ini">
                            🗑️
                        </button>
                    </div>
                </td>
            `;

            this.tableBody.appendChild(tr);
        });

        // Bind Tombol Detail & Hapus
        this.tableBody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const nim = btn.dataset.nim;
                const std = allStudents.find(s => s.nim === nim);
                if (std) this.showDetailModal(std);
            });
        });

        this.tableBody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const nim = btn.dataset.nim;
                const nama = btn.dataset.nama;
                soundManager.playClick();
                this.openDeleteSingleModal(nim, nama);
            });
        });
    }

    showDetailModal(student) {
        if (!this.detailModal) return;

        soundManager.playClick();
        if (this.detailTitle) {
            this.detailTitle.textContent = student.nama;
        }
        if (this.detailSubtitle) {
            this.detailSubtitle.textContent = `NIM: ${student.nim} • Jurusan: ${student.jurusan} • Total Login: ${student.loginCount || 1}x`;
        }

        if (this.detailList) {
            this.detailList.innerHTML = '';
            const attempts = Array.isArray(student.attempts) ? student.attempts : [];

            if (attempts.length === 0) {
                this.detailList.innerHTML = `
                    <div style="padding:24px; text-align:center; color:var(--gray);">
                        Mahasiswa ini belum pernah menyelesaikan kuis evaluasi.
                    </div>
                `;
            } else {
                attempts.forEach((att, index) => {
                    const isPassed = (att.score || 0) >= 75;
                    const item = document.createElement('div');
                    item.className = `attempt-item ${isPassed ? 'passed' : 'failed'}`;

                    const dateFormatted = att.finishedAt
                        ? new Date(att.finishedAt).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        }).replace(/\./g, ':')
                        : '-';

                    item.innerHTML = `
                        <div>
                            <div style="font-weight:700; color:var(--white);">
                                Percobaan #${index + 1}
                            </div>
                            <div style="font-size:0.78rem; color:var(--gray); margin-top:2px;">
                                Selesai pada: ${dateFormatted}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.2rem; font-weight:700; color:${isPassed ? 'var(--cyan)' : '#ffc15e'};">
                                ${att.score} <span style="font-size:0.75rem; color:var(--gray);">/ 100</span>
                            </div>
                            <div style="font-size:0.78rem; font-weight:600; color:${isPassed ? '#00ff88' : '#ffc15e'};">
                                ${att.correct || 0} dari ${att.total || 10} Benar (${att.status || (isPassed ? 'BERHASIL' : 'BELUM BERHASIL')})
                            </div>
                        </div>
                    `;
                    this.detailList.appendChild(item);
                });
            }
        }

        this.detailModal.classList.add('open');
    }

    hideDetailModal() {
        if (!this.detailModal) return;
        this.detailModal.classList.remove('open');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminApp();
});
