/**
 * public/sw.js — Service Worker "pembersih" (kill-switch)
 *
 * Aplikasi ini TIDAK memakai service worker. File ini sengaja dipertahankan
 * agar browser yang masih menyimpan service worker lama (versi sebelumnya)
 * mengambil berkas ini saat pengecekan update, lalu:
 *   1. menghapus semua cache lama,
 *   2. membatalkan pendaftaran dirinya sendiri,
 *   3. memuat ulang halaman yang terbuka.
 * Setelah itu CSS/JS kembali dimuat langsung dari server.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) { /* abaikan */ }
        try { await self.registration.unregister(); } catch (e) { /* abaikan */ }
        const clientList = await self.clients.matchAll({ type: 'window' });
        clientList.forEach((c) => { try { c.navigate(c.url); } catch (e) { /* abaikan */ } });
    })());
});

// Tidak ada handler 'fetch' => semua permintaan langsung ke jaringan.
