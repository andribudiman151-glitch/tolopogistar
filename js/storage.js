/**
 * js/storage.js
 * Modul Terpusat Pengelolaan Data Mahasiswa & Riwayat Kuis Topologi Jaringan Star.
 * 
 * =========================================================================================
 * KETERBATASAN LOCALSTORAGE:
 * Penyimpanan ini secara default menggunakan `localStorage` peramban (browser) tanpa backend.
 * Data hanya tersimpan secara lokal pada browser dan perangkat yang sedang digunakan.
 * Jika mahasiswa membuka aplikasi dari perangkat atau browser lain, data tidak akan tersinkronisasi.
 * 
 * PANDUAN INTEGRASI DATABASE / GOOGLE SHEETS / FIREBASE:
 * Seluruh operasi simpan dan baca data diisolasi ke dalam fungsi-fungsi di berkas ini.
 * Jika di kemudian hari ingin menggunakan penyimpanan terpusat (misal Google Sheets API,
 * Firebase Firestore, atau REST API backend), Anda HANYA perlu mengubah implementasi internal
 * fungsi-fungsi di storage.js tanpa perlu merombak berkas-berkas antarmuka lainnya.
 * =========================================================================================
 */

const STORAGE_KEY_STUDENTS = 'topologiStar_students_data';

/**
 * Mengambil seluruh daftar mahasiswa dari localStorage
 * @returns {Array<Object>} Daftar objek mahasiswa
 */
export function getAllStudents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Gagal membaca data mahasiswa dari localStorage:', e);
        return [];
    }
}

/**
 * Menyimpan seluruh daftar mahasiswa ke localStorage
 * @param {Array<Object>} students 
 */
function saveAllStudents(students) {
    try {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
        return true;
    } catch (e) {
        console.error('Gagal menyimpan data ke localStorage:', e);
        return false;
    }
}

/**
 * Mencari data satu mahasiswa berdasarkan NIM
 * @param {string} nim 
 * @returns {Object|null}
 */
export function getStudentByNim(nim) {
    if (!nim) return null;
    const cleanNim = String(nim).trim();
    const students = getAllStudents();
    return students.find(s => String(s.nim).trim() === cleanNim) || null;
}

/**
 * Menyimpan atau memperbarui data profil mahasiswa (saat login).
 * Jika NIM sudah ada, perbarui data lama dan tambahkan loginCount (tanpa duplikat).
 * @param {Object} data { nama, nim, jurusan }
 * @returns {Object} Data mahasiswa yang telah diperbarui/dibuat
 */
export function upsertStudent(data) {
    if (!data || !data.nim) {
        throw new Error('NIM wajib disertakan untuk menyimpan data mahasiswa.');
    }

    const students = getAllStudents();
    const cleanNim = String(data.nim).trim();
    const cleanNama = String(data.nama || '').trim();
    const cleanJurusan = String(data.jurusan || '').trim();
    const nowIso = new Date().toISOString();

    const existingIndex = students.findIndex(s => String(s.nim).trim() === cleanNim);

    if (existingIndex >= 0) {
        // Perbarui mahasiswa yang sudah ada
        const existing = students[existingIndex];
        existing.nama = cleanNama || existing.nama;
        existing.jurusan = cleanJurusan || existing.jurusan;
        existing.lastLogin = nowIso;
        existing.loginCount = (existing.loginCount || 1) + 1;
        if (!Array.isArray(existing.attempts)) {
            existing.attempts = [];
        }
        students[existingIndex] = existing;
        saveAllStudents(students);
        return existing;
    } else {
        // Buat data mahasiswa baru
        const newStudent = {
            id: 'std_' + cleanNim + '_' + Date.now(),
            nama: cleanNama,
            nim: cleanNim,
            jurusan: cleanJurusan,
            firstLogin: nowIso,
            lastLogin: nowIso,
            loginCount: 1,
            attempts: []
        };
        students.push(newStudent);
        saveAllStudents(students);
        return newStudent;
    }
}

/**
 * Menambahkan catatan percobaan kuis ke profil mahasiswa berdasarkan NIM
 * @param {string} nim 
 * @param {Object} attemptData { score, correct, total, status, finishedAt }
 * @returns {boolean} Berhasil atau gagal
 */
export function addAttempt(nim, attemptData) {
    if (!nim || !attemptData) return false;

    const students = getAllStudents();
    const cleanNim = String(nim).trim();
    const student = students.find(s => String(s.nim).trim() === cleanNim);

    if (!student) {
        console.warn(`Mahasiswa dengan NIM ${nim} tidak ditemukan saat menambahkan attempt.`);
        return false;
    }

    if (!Array.isArray(student.attempts)) {
        student.attempts = [];
    }

    const newAttempt = {
        score: typeof attemptData.score === 'number' ? attemptData.score : 0,
        correct: typeof attemptData.correct === 'number' ? attemptData.correct : 0,
        total: typeof attemptData.total === 'number' ? attemptData.total : 10,
        status: attemptData.status || (attemptData.score >= 75 ? 'BERHASIL' : 'BELUM BERHASIL'),
        finishedAt: attemptData.finishedAt || new Date().toISOString()
    };

    student.attempts.push(newAttempt);
    saveAllStudents(students);
    return true;
}

/**
 * Menghapus satu mahasiswa berdasarkan NIM
 * @param {string} nim 
 * @returns {boolean}
 */
export function deleteStudent(nim) {
    if (!nim) return false;
    const cleanNim = String(nim).trim();
    const students = getAllStudents();
    const filtered = students.filter(s => String(s.nim).trim() !== cleanNim);
    if (filtered.length === students.length) return false;
    return saveAllStudents(filtered);
}

/**
 * Menghapus seluruh data mahasiswa (reset database lokal)
 * @returns {boolean}
 */
export function clearAllStudents() {
    try {
        localStorage.removeItem(STORAGE_KEY_STUDENTS);
        return true;
    } catch (e) {
        console.error('Gagal mereset data mahasiswa:', e);
        return false;
    }
}

/**
 * Mengunduh seluruh data mahasiswa dan riwayat kuis ke berkas CSV
 * Format UTF-8 dengan BOM (\uFEFF) agar terbaca sempurna di Microsoft Excel (karakter Indonesia)
 */
export function exportCSV() {
    const students = getAllStudents();

    if (students.length === 0) {
        return { success: false, message: 'Tidak ada data mahasiswa untuk diekspor.' };
    }

    // Header Kolom CSV
    const headers = [
        "No",
        "Nama Lengkap",
        "NIM",
        "Jurusan",
        "Pertama Login",
        "Terakhir Login",
        "Jumlah Login",
        "Jumlah Percobaan Kuis",
        "Nilai Terakhir",
        "Nilai Tertinggi",
        "Status Akhir",
        "Riwayat Lengkap Nilai"
    ];

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const stringified = String(str).replace(/"/g, '""');
        return `"${stringified}"`;
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '-';
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            return d.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\./g, ':');
        } catch (e) {
            return isoStr;
        }
    };

    const rows = students.map((std, index) => {
        const attempts = Array.isArray(std.attempts) ? std.attempts : [];
        const attemptCount = attempts.length;

        let lastScore = '-';
        let highScore = '-';
        let finalStatus = 'Belum Kuis';

        if (attemptCount > 0) {
            const lastAttempt = attempts[attempts.length - 1];
            lastScore = lastAttempt.score;
            highScore = Math.max(...attempts.map(a => a.score || 0));
            finalStatus = highScore >= 75 ? 'BERHASIL' : 'BELUM BERHASIL';
        }

        const historySummary = attempts
            .map((a, i) => `#${i + 1}: ${a.score} (${a.status})`)
            .join(' | ') || '-';

        return [
            index + 1,
            escapeCsv(std.nama),
            escapeCsv(std.nim),
            escapeCsv(std.jurusan),
            escapeCsv(formatDate(std.firstLogin)),
            escapeCsv(formatDate(std.lastLogin)),
            std.loginCount || 1,
            attemptCount,
            lastScore,
            highScore,
            escapeCsv(finalStatus),
            escapeCsv(historySummary)
        ].join(';');
    });

    // Gabungkan direktif separator Excel, header, dan baris dengan pemisah CRLF (\r\n)
    // Awalan \uFEFF (UTF-8 Byte Order Mark) memastikan Microsoft Excel mengenali encoding UTF-8
    // dan direktif 'sep=;' memastikan Excel membuka file dengan kolom terpisah secara tepat di semua regional setting.
    const BOM = '\uFEFF';
    const csvContent = BOM + 'sep=;\r\n' + [headers.join(';'), ...rows].join('\r\n');

    // Buat Blob UTF-8 dengan BOM untuk unduhan berkas .csv
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `data-mahasiswa-topologi-star-${dateStr}_${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: students.length };
}
