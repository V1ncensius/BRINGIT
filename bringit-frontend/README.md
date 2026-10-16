# BRINGIT — Frontend

Frontend **Sistem Informasi Pencarian Lawan Sparring BRINGIT**, dibangun dari desain UI
(desktop + mobile) dan mengikuti dokumen SRS & SDD v1.0.

- **Stack:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 + lucide-react
- **Arsitektur:** SPA yang memanggil REST API (JSON) dengan autentikasi token/JWT (SRS 3.4, NFR-05)
- **Responsif:** sidebar di desktop, header + bottom navigation + drawer di mobile (NFR-09)
- **Mock API bawaan:** bisa dijalankan tanpa backend; tinggal dimatikan saat backend PHP/MySQL siap

---

## Menjalankan

```bash
npm install
cp .env.example .env      # opsional, default sudah memakai mock
npm run dev               # http://localhost:5173
npm run build             # hasil produksi di folder dist/
```

### Akun demo (mode mock) — kata sandi semua: `bringit123`

| Peran      | Email                    | Halaman awal |
|------------|--------------------------|--------------|
| Tim        | kapten@garudaunited.id   | `/tim`       |
| Wasit      | andi@bringit.id          | `/penyedia`  |
| Fotografer | bima@bringit.id          | `/penyedia`  |
| Admin      | admin@bringit.id         | `/admin`     |

Data mock disimpan di `localStorage` (`bringit.mockdb.v1`). Hapus key tersebut untuk mengulang data awal.

---

## Struktur folder

```
src/
├── config/          constants.js (peran, cabang, level, status), navigation.js (menu per peran)
├── context/         AuthContext (sesi & token), ToastContext (notifikasi singkat)
├── hooks/           useAsync / useAction (loading, error, reload)
├── lib/             format.js (Rupiah, tanggal Indonesia), elo.js (rumus ELO)
├── services/        satu modul per domain (NFR-11: matchmaking, ELO, payment, booking terpisah)
│   ├── apiClient.js         fetch wrapper + JWT + ApiError + saklar mock
│   ├── authService.js       teamService.js       matchmakingService.js   matchService.js
│   ├── eloService.js        paymentService.js    bookingService.js       providerService.js
│   ├── adminService.js      notificationService.js  sportService.js
│   └── mock/                db.js (seed data mengikuti ERD) + router.js (handler endpoint)
├── components/
│   ├── layout/      AppShell (sidebar/topbar/bottom-nav), AuthLayout, NotificationBell
│   ├── routing/     ProtectedRoute (hak akses per peran), GuestRoute
│   ├── ui/          Button, Field, Tabs, Avatar, StatCard, Modal, LineChart, StarRating, …
│   └── PaymentModal.jsx     langkah payment gateway (redirect / sandbox)
└── pages/
    ├── auth/        Login, Register
    ├── team/        Dashboard, TeamProfile, FindOpponent, Matches, PremiumElo, Services
    ├── provider/    ProviderDashboard, ProviderProfile, ProviderSchedule, ProviderOrders, ProviderEarnings
    └── admin/       AdminDashboard, AdminPages (verifikasi, moderasi, paket, cabang, transaksi)
```

---

## Pemetaan desain → halaman → kebutuhan

| Desain                      | Route                                   | Use case / FR |
|-----------------------------|-----------------------------------------|---------------|
| Masuk                       | `/masuk`                                | UC-02 · FR-01 |
| Daftar                      | `/daftar`                               | UC-01, UC-12, UC-15 · FR-01 |
| Beranda tim                 | `/tim`                                  | FR-09, FR-20 |
| Profil akun dan tim         | `/tim/profil`                           | UC-03 · FR-02 |
| Cari lawan sparring         | `/tim/cari-lawan` (+ `?tab=masuk/terkirim`) | UC-04 · FR-04, FR-05 |
| Pertandingan                | `/tim/pertandingan` (+ `?tab=undangan/riwayat`) | UC-05, UC-06 · FR-06–FR-09 |
| Premium dan ranking ELO     | `/tim/premium`                          | UC-07, UC-08 · FR-10–FR-13 |
| Jasa wasit dan fotografer   | `/tim/jasa` (+ `?tab=pesanan`)          | UC-09–UC-11 · FR-14, FR-15, FR-17, FR-18, FR-27 |
| Dashboard penyedia jasa     | `/penyedia`, `/penyedia/profil`, `/penyedia/jadwal`, `/penyedia/pesanan`, `/penyedia/riwayat` | UC-12–UC-17 · FR-03, FR-16, FR-19 |
| Admin Bringit               | `/admin`, `/admin/verifikasi`, `/admin/moderasi`, `/admin/paket`, `/admin/cabang`, `/admin/transaksi` | UC-18, UC-19 · FR-21–FR-26 |

Aturan bisnis yang ditegakkan di UI dan mock API:

- Undangan sparring hanya untuk tim dengan cabang olahraga yang sama (FR-05).
- Hasil resmi setelah **kedua tim** mengonfirmasi; skor berbeda → “Laporkan selisih” → sengketa admin (FR-07, FR-08, FR-25).
- ELO dihitung otomatis per cabang (K = 32) **hanya untuk tim Premium** (FR-11); rumus di `src/lib/elo.js`.
- Wasit hanya tampil bila spesialisasinya cocok dengan cabang yang dicari (FR-27).
- Pembayaran gagal → pesanan batal dan tidak dikirim ke penyedia; penyedia menolak → dana dikembalikan (UC-09/10/13/16).
- Wasit/fotografer belum terverifikasi tidak tampil di pencarian dan tidak bisa menerima pesanan (UC-12/15).
- Validasi: format email, kata sandi ≥ 8 karakter huruf+angka, skor bilangan bulat ≥ 0, logo PNG/JPG/WEBP ≤ 2 MB.

---

## Menghubungkan ke backend PHP

1. Ubah `.env`:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_USE_MOCK=false
   ```
2. Saat `npm run dev`, request ke `/api` juga bisa diproxy ke backend (lihat `vite.config.js`).
3. Backend mengembalikan JSON — boleh langsung objek atau dibungkus `{ "data": ... }`.
   Error: status HTTP 4xx/5xx dengan `{ "message": "...", "errors": { "field": "pesan" } }`.
4. Token dikirim sebagai `Authorization: Bearer <token>`; respons 401 otomatis mengeluarkan pengguna.
5. Pembayaran: `POST /payments/checkout` dan `POST /bookings` mengembalikan `redirect_url`
   (mis. Midtrans Snap / Xendit). Di mode backend, browser langsung diarahkan ke URL tersebut.

### Kontrak API (dipakai oleh `src/services`)

| Modul | Endpoint |
|-------|----------|
| Auth | `POST /auth/login` · `POST /auth/register` · `GET /auth/me` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/resend-verification` · `POST /auth/change-password` |
| Master | `GET /sports` (`?all=1` untuk admin) |
| Tim | `GET/PUT /teams/me` · `POST /teams/me/logo` · `GET /teams/me/stats?sport=` · `GET /teams/me/activities` · `PUT /users/me` |
| Matchmaking | `GET /teams?city=&sport=&level=&sort=elo_nearest\|elo_desc\|wins` · `GET /teams/:id` · `POST /opponent-requests` · `GET /opponent-requests?box=incoming\|outgoing` · `PATCH /opponent-requests/:id {action: accept\|reject\|cancel}` |
| Pertandingan | `GET /matches?scope=active\|history` · `GET /matches/:id` · `POST /matches/:id/confirm-schedule` · `POST /matches/:id/propose` · `POST /matches/:id/cancel` · `POST /matches/:id/result {my_score, opponent_score, note}` · `POST /matches/:id/result/confirm` · `POST /matches/:id/result/dispute {reason}` |
| ELO & Premium | `GET /elo/me?sport=` · `GET /elo/leaderboard?sport=&city=` · `GET /subscription-plans` · `GET /subscriptions/me` · `POST /payments/checkout {type, plan_id, method}` · `GET /payments/:id` · `GET /settings/commission` |
| Booking jasa | `GET /providers?type=&city=&sport=&date=` · `GET /providers/:id` · `POST /bookings` · `GET /bookings/me` · `POST /reviews` · `GET /reviews?provider_id=` |
| Penyedia | `GET/PUT /provider/me` · `GET /provider/summary` · `GET /provider/bookings?status=` · `PATCH /provider/bookings/:id {action: accept\|reject\|complete}` · `GET/POST /provider/slots` · `DELETE /provider/slots/:id` · `GET /provider/earnings?period=` |
| Admin | `GET /admin/summary` · `GET /admin/verifications` · `PATCH /admin/verifications/:userId {action, reason}` · `GET /admin/reports` · `PATCH /admin/reports/:id {action: remove\|dismiss}` · `GET /admin/disputes` · `PATCH /admin/disputes/:id` · `GET /admin/plans` · `PUT /admin/plans/:id` · `PUT /admin/commission` · `POST /admin/sports` · `PATCH /admin/sports/:id {active}` · `GET /admin/transactions?type=&status=` |
| Notifikasi | `GET /notifications` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` |

`POST /payments/:id/simulate` hanya ada di mock (pengganti callback/webhook payment gateway).

---

## Catatan penyesuaian terhadap desain

- Nama cabang mengikuti SRS 1.3 (Futsal, Basket, Tenis, Padel, **Bulu Tangkis**, Mini Soccer); desain memakai “Badminton”.
- Desain dashboard penyedia menampilkan tab wasit & fotografer sekaligus sebagai contoh. Di aplikasi,
  satu akun memiliki satu peran, sehingga form profil menyesuaikan peran yang login (wasit: spesialisasi
  & lisensi; fotografer: paket, waktu kirim, portofolio).
- Ditambahkan elemen yang dibutuhkan SRS tetapi belum tergambar: tab undangan masuk/terkirim, form daftar
  pemain, ubah kata sandi, panel sengketa admin, notifikasi, modal pembayaran, dan state kosong/error.
- Font Inter di-*bundle* lewat `@fontsource/inter` (tidak bergantung ke Google Fonts).
