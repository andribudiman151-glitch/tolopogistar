/**
 * js/auth.js
 * Modul Autentikasi Mahasiswa & Pengelolaan Sesi Login
 * Terintegrasi dengan storage.js dan sessionStorage browser.
 */

import { upsertStudent } from './storage.js';
import { soundManager } from './sound.js';

// Kunci sesi mahasiswa di sessionStorage (hanya aktif selama tab/jendela dibuka)
export const SESSION_KEY = 'topologiStar_studentSession';

/**
 * DAFTAR JURUSAN / PROGRAM STUDI MAHASISWA
 * Mudah diubah atau ditambahkan sesuai kebutuhan prodi/fakultas
 */
export const DEPARTMENTS = [
    'Teknik Komputer Jaringan dan Telekomunikasi',
    'Teknologi Pendidikan',
    'Teknologi Rekayasa Internet',
    'Pendidikan Komputer',
    'Ilmu Komputer',
    'Sistem Informasi',
    'Teknik Informatika',
    ];

/**
 * Mendapatkan data sesi mahasiswa yang sedang login
 * @returns {Object|null} { nama, nim, jurusan, loginTime } atau null jika belum login
 */
export function getStudentSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.nim && parsed.nama) {
            return parsed;
        }
        return null;
    } catch (e) {
        console.error('Gagal membaca sesi mahasiswa:', e);
        return null;
    }
}

/**
 * Menyimpan data sesi mahasiswa ke sessionStorage
 * @param {Object} data { nama, nim, jurusan }
 */
export function saveStudentSession(data) {
    try {
        const sessionPayload = {
            nama: String(data.nama).trim(),
            nim: String(data.nim).trim(),
            jurusan: String(data.jurusan || '').trim(),
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
        return sessionPayload;
    } catch (e) {
        console.error('Gagal menyimpan sesi mahasiswa:', e);
        return null;
    }
}

/**
 * Menghapus sesi mahasiswa (Logout)
 */
export function clearStudentSession() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
        console.error('Gagal menghapus sesi mahasiswa:', e);
    }
}

/**
 * Pelindung Halaman: Memeriksa apakah mahasiswa sudah login.
 * Jika belum login, otomatis mengarahkan ke halaman login.
 * @param {string} [redirectUrl='login.html']
 * @returns {Object|null} Data sesi mahasiswa jika valid
 */
export function requireStudentAuth(redirectUrl = 'login.html') {
    const session = getStudentSession();
    if (!session) {
        // Simpan tujuan redirect jika perlu
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const target = `${redirectUrl}?returnUrl=${encodeURIComponent(currentPath)}`;
        window.location.replace(target);
        return null;
    }
    return session;
}

/**
 * Mengisi opsi dropdown jurusan pada elemen <select>
 * @param {HTMLSelectElement} selectEl 
 */
export function populateDepartmentOptions(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="" disabled selected>-- Pilih Program Studi / Jurusan --</option>';
    DEPARTMENTS.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        selectEl.appendChild(opt);
    });
}

/**
 * Sanitasi string untuk mencegah celah keamanan XSS saat menampilkan nama pengguna
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
/**
 * Melakukan logout langsung tanpa dialog (atau setelah konfirmasi)
 */
export function logoutStudentNow() {
    clearStudentSession();
    window.location.href = 'login.html?logout=1';
}

/**
 * Menampilkan modal dialog konfirmasi keluar kustom yang bekerja 100% andal di iframe & mobile.
 * Memakai z-index 99999999 sehingga tidak pernah tertutup oleh canvas confetti atau elemen layar lain.
 * @param {Function} [onConfirm] Callback yang dipanggil saat user menyetujui keluar
 */
export function promptLogout(onConfirm) {
    const session = getStudentSession();
    const studentName = session ? session.nama : 'mahasiswa';

    let modal = document.getElementById('modal-logout-confirm');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-logout-confirm';
        modal.className = 'modal-overlay logout-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="glass-panel modal-box fade-in" style="max-width:440px; text-align:center; padding:28px 24px; position:relative; z-index:100000000; pointer-events:auto; box-shadow: 0 16px 40px rgba(0,0,0,0.65); border: 1px solid rgba(255, 92, 119, 0.4);">
                <div style="font-size:2.8rem; margin-bottom:12px;">🚪</div>
                <h3 style="margin-bottom:8px; font-size:1.35rem; color:var(--white);">Keluar dari Akun?</h3>
                <p id="modal-logout-dynamic-desc" style="color:var(--gray); font-size:0.92rem; margin-bottom:24px; line-height:1.5;">
                    Apakah Anda yakin ingin mengakhiri sesi pembelajaran untuk <strong>${escapeHtml(studentName)}</strong>?
                </p>
                <div class="btn-row" style="margin-top:0; justify-content:center; gap:12px; flex-wrap:wrap;">
                    <button id="btn-modal-logout-cancel" type="button" class="btn btn-outline" style="min-width:110px; cursor:pointer; pointer-events:auto;">
                        Batal
                    </button>
                    <button id="btn-modal-logout-proceed" type="button" class="btn btn-primary" style="background:#dc3545; border-color:#dc3545; min-width:140px; box-shadow:0 0 16px rgba(220, 53, 69, 0.55); cursor:pointer; pointer-events:auto;">
                        Ya, Keluar Akun ➔
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const descEl = modal.querySelector('#modal-logout-dynamic-desc');
        if (descEl) {
            descEl.innerHTML = `Apakah Anda yakin ingin mengakhiri sesi pembelajaran untuk <strong>${escapeHtml(studentName)}</strong>?`;
        }
    }

    // Tampilkan modal dengan inline style kuat agar tidak terhalang oleh komponen lain
    modal.style.cssText = 'position:fixed !important; inset:0 !important; z-index:99999999 !important; background:rgba(3,8,16,0.88) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; display:flex !important; align-items:center !important; justify-content:center !important; pointer-events:auto !important; padding:20px !important;';
    modal.classList.add('open');

    const handleClose = () => {
        modal.style.display = 'none';
        modal.classList.remove('open');
    };

    const btnCancel = modal.querySelector('#btn-modal-logout-cancel');
    if (btnCancel) {
        btnCancel.onclick = (e) => {
            e.preventDefault();
            soundManager.playClick();
            handleClose();
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) {
            handleClose();
        }
    };

    const btnProceed = modal.querySelector('#btn-modal-logout-proceed');
    if (btnProceed) {
        btnProceed.onclick = (e) => {
            e.preventDefault();
            soundManager.playClick();
            handleClose();
            if (typeof onConfirm === 'function') {
                onConfirm();
            } else {
                logoutStudentNow();
            }
        };
    }
}

/**
 * Inisialisasi tampilan bar pengguna (Halo, Nama) dan tombol Keluar di top bar
 * Digunakan di index.html, materi.html, kuis.html, dan hasil.html
 */
export function initStudentNavBar() {
    const session = getStudentSession();
    const container = document.getElementById('student-nav-info');
    if (!container) return;

    if (session) {
        container.style.display = 'inline-flex';
        container.innerHTML = `
            <div class="student-pill-badge" title="Login sebagai: ${escapeHtml(session.nama)} (${escapeHtml(session.nim)}) - ${escapeHtml(session.jurusan)}">
                <span class="student-avatar-icon">🎓</span>
                <span class="student-name-text">Halo, <strong>${escapeHtml(session.nama.split(' ')[0])}</strong></span>
                <button type="button" id="btn-student-logout" class="student-logout-btn" title="Keluar dari akun mahasiswa">
                    Keluar 🚪
                </button>
            </div>
        `;
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// Global Event Delegation: Menangkap klik pada SEMUA tombol logout mahasiswa di seluruh halaman
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('#btn-student-logout, .student-logout-btn, .student-logout-btn-action, [data-student-logout], #btn-logout-selesai, #btn-logout-nilai-success, #btn-logout-nilai-fail, #btn-direct-logout');
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            soundManager.playClick();
            promptLogout(() => {
                logoutStudentNow();
            });
        }
    });
}
