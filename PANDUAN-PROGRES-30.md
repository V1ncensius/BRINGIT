# Panduan Progres 30% — BRINGIT

> Sistem Informasi Pencarian Lawan Sparring · panduan pengerjaan progres minimal 30% fitur SRS/SDD,
> dengan prioritas pada fitur esensial.

**Isi paket `bringit-progres-30.zip`:**

| Folder | Isi |
|---|---|
| `bringit-frontend/` | React + Vite + Tailwind (desain Bringit). Memiliki saklar `VITE_SCOPE=progress30`. |
| `bringit-backend/` | REST API PHP 8 + MySQL untuk UC-01 s.d. UC-06. Tanpa framework dan tanpa Composer. |
| `PANDUAN-PROGRES-30.md` | Dokumen ini. |

Semua kode di paket ini **sudah diuji**: alur daftar → profil → cari lawan → undangan → jadwal → input dan konfirmasi hasil dijalankan otomatis di browser terhadap backend PHP + MariaDB yang sebenarnya, tanpa error.

---

## Daftar isi

1. [Target dan cakupan 30%](#1-target-dan-cakupan-30)
2. [Arsitektur singkat](#2-arsitektur-singkat)
3. [Persiapan](#3-persiapan)
4. [Langkah 1 — Database](#4-langkah-1--database)
5. [Langkah 2 — Backend PHP](#5-langkah-2--backend-php)
6. [Langkah 3 — Frontend](#6-langkah-3--frontend)
7. [Langkah 4 — Pengujian per use case](#7-langkah-4--pengujian-per-use-case)
8. [Rencana kerja 7 hari](#8-rencana-kerja-7-hari)
9. [Bahan laporan dan demo progres](#9-bahan-laporan-dan-demo-progres)
10. [Troubleshooting](#10-troubleshooting)
11. [Setelah 30%: progres berikutnya](#11-setelah-30-progres-berikutnya)

---

## 1. Target dan cakupan 30%

SRS memuat **27 kebutuhan fungsional (FR)** dan **18 use case (UC)**. Batas 30% berarti minimal **9 FR** atau **6 UC**.

Fitur esensial adalah alur inti yang membuat BRINGIT berguna tanpa fitur tambahan apa pun: **daftar → profil tim → cari lawan → sepakati jadwal → catat hasil**. Premium/ELO, jasa wasit/fotografer, dan panel admin dibangun di atas alur ini, sehingga dikerjakan belakangan.

### Cakupan yang dikerjakan

| No | Use case | FR | Halaman | Status target |
|---|---|---|---|---|
| 1 | **UC-01** Mendaftarkan akun tim baru | FR-01 | `/daftar` | ✅ |
| 2 | **UC-02** Masuk ke akun (login) | FR-01 | `/masuk` | ✅ |
| 3 | **UC-03** Membuat & memperbarui profil tim | FR-02 | `/tim/profil` | ✅ |
| 4 | **UC-04** Mencari & memilih lawan sparring | FR-04, FR-05 | `/tim/cari-lawan` | ✅ |
| 5 | **UC-05** Mengirim & mengonfirmasi jadwal | FR-06 | `/tim/pertandingan` | ✅ |
| 6 | **UC-06** Menginput & mengonfirmasi hasil | FR-07, FR-08, FR-09 | `/tim/pertandingan`, `/tim` | ✅ |
| + | Notifikasi di dalam aplikasi | FR-20 | ikon lonceng | ✅ |

**Hitungan progres:**

- Use case: 6 dari 18 = **33,3%**
- FR: FR-01, 02, 04, 05, 06, 07, 08, 09, 20 = 9 dari 27 = **33,3%**

### Yang ditunda (dicatat sebagai "progres berikutnya")

| Kelompok | UC | FR |
|---|---|---|
| Premium & ELO | UC-07, UC-08 | FR-10 s.d. FR-13 |
| Jasa wasit & fotografer | UC-09 s.d. UC-17 | FR-03, FR-14 s.d. FR-19, FR-27 |
| Administrasi | UC-18, UC-19 | FR-21 s.d. FR-26 |

> Tabel `elo_ratings` dan `disputes` sudah dibuat di database, tetapi logika perhitungan ELO dan panel admin belum dibuat. Sengketa hasil sudah tercatat, keputusannya oleh admin menyusul.

---

## 2. Arsitektur singkat

```
┌───────────────────────┐   HTTP + JSON    ┌──────────────────────────┐   PDO    ┌──────────┐
│  Frontend (React)     │ ───────────────▶ │  Backend PHP (REST API)  │ ───────▶ │  MySQL   │
│  localhost:5173       │  /api/...        │  127.0.0.1:8000          │          │ bringit  │
│  Authorization:Bearer │ ◀─────────────── │  JWT HS256               │ ◀─────── │          │
└───────────────────────┘                  └──────────────────────────┘          └──────────┘
        │  Vite proxy: /api → 127.0.0.1:8000 (tanpa masalah CORS saat development)
```

Pembagian modul backend sesuai NFR-11 (modular):

| Modul | File | Use case |
|---|---|---|
| Auth | `src/Controllers/AuthController.php` | UC-01, UC-02 |
| Profil tim | `src/Controllers/TeamController.php` | UC-03 |
| Matchmaking | `src/Controllers/MatchmakingController.php` | UC-04 |
| Pertandingan | `src/Controllers/MatchController.php` | UC-05, UC-06 |
| Notifikasi & master | `src/Controllers/MiscController.php`, `src/Support/Notifier.php` | FR-20 |
| Inti | `src/Core/` (Database, Jwt, Auth, Router, Http) | — |

---

## 3. Persiapan

| Software | Versi | Catatan |
|---|---|---|
| Node.js | 18 atau lebih baru (disarankan 20/22) | Untuk frontend |
| PHP | 8.1 atau lebih baru | Ekstensi `pdo_mysql` aktif. XAMPP 8.2 sudah termasuk. |
| MySQL / MariaDB | MySQL 8 / MariaDB 10.4+ | XAMPP sudah termasuk |
| Git | apa saja | Commit per langkah sebagai bukti progres |

Struktur folder yang disarankan (satu repo):

```
bringit/
├── bringit-frontend/
├── bringit-backend/
└── PANDUAN-PROGRES-30.md
```

> **Windows + XAMPP:** jalankan **Apache** dan **MySQL** dari XAMPP Control Panel. Pastikan `php -v` bisa dijalankan dari terminal. Kalau belum, tambahkan `C:\xampp\php` ke PATH.

---

## 4. Langkah 1 — Database

### 4.1 Buat database dan impor skema

Lewat **phpMyAdmin** (`http://localhost/phpmyadmin`):

1. Buat database `bringit` dengan collation `utf8mb4_unicode_ci`.
2. Buka tab **Import**, pilih `bringit-backend/database/schema.sql`, lalu klik **Go**.

Atau lewat terminal:

```bash
mysql -u root -e "CREATE DATABASE bringit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root bringit < bringit-backend/database/schema.sql
```

> `schema.sql` memakai `DROP TABLE IF EXISTS`. Mengimpor ulang akan **menghapus semua data**, jadi gunakan hanya untuk reset.

### 4.2 Tabel yang dibuat

| Tabel | Asal ERD | Fungsi |
|---|---|---|
| `users` | ✅ | Akun (role `team` di progres ini) |
| `sport_categories` | ✅ | Master cabang: Futsal, Basket, Tenis, Padel, Bulu Tangkis, Mini Soccer |
| `teams` | ✅ + kolom [+] | Profil tim |
| `team_sports` | ✅ | Relasi banyak-ke-banyak tim ↔ cabang |
| `team_players` | [+] baru | Daftar pemain (FR-02 menyebut "daftar pemain") |
| `opponent_requests` | ✅ + kolom [+] | Undangan sparring (UC-04) |
| `matches` | ✅ + kolom [+] | Jadwal pertandingan (UC-05) |
| `match_results` | ✅ + kolom [+] | Skor dan konfirmasi dua tim (UC-06) |
| `disputes` | ✅ | Laporan selisih skor |
| `notifications` | ✅ | Notifikasi (FR-20) |
| `elo_ratings` | ✅ | Disiapkan, dengan nilai default 1000 |

### 4.3 Penyesuaian terhadap ERD

ERD di SDD sudah bagus, tetapi beberapa kolom dibutuhkan oleh alur use case. **Tuliskan ini di laporan** sebagai revisi kecil rancangan:

| Tabel | Kolom tambahan | Alasan (rujukan SRS) |
|---|---|---|
| `teams` | `area, players, venue, schedule, about, primary_sport_id` | Formulir profil UC-03 dan halaman profil di desain |
| `opponent_requests` | `proposed_date, proposed_time, duration, location, note` | UC-04/05: undangan sudah membawa usulan jadwal |
| `matches` | `team_a_id, team_b_id, sport_category_id, match_time, duration` | Mempermudah query riwayat per tim (FR-09) |
| `matches` | `proposal_*` (6 kolom) | UC-05: "mengajukan perubahan jadwal" |
| `match_results` | `report_a_*`, `report_b_*` | FR-07/08: masing-masing tim melapor, lalu dicocokkan |

### 4.4 Data demo (opsional, sangat disarankan untuk presentasi)

```bash
cd bringit-backend
php database/seed.php
```

Perintah ini membuat 6 tim futsal di Bandung (kata sandi semua: `bringit123`):

| Email | Tim |
|---|---|
| `kapten@garudaunited.id` | Garuda United (akun utama untuk demo) |
| `kapten@northside.id` | Northside FC |
| `kapten@bandungcity.id` | Bandung City |
| `kapten@citrafc.id` | Citra FC |
| `kapten@dagoathletic.id` | Dago Athletic |
| `kapten@titans.id` | Bandung Titans (level Mahir) |

Selain akun, seed juga menyiapkan tiga keadaan untuk demo:

- satu undangan masuk dari Bandung City (untuk demo UC-04),
- satu usulan jadwal dari Northside FC (untuk demo UC-05),
- satu pertandingan kemarin vs Citra FC yang belum ada hasilnya (untuk demo UC-06).

---

## 5. Langkah 2 — Backend PHP

### 5.1 Konfigurasi

```bash
cd bringit-backend
cp config.example.php config.php      # Windows: copy config.example.php config.php
```

Isi `config.php`:

```php
'db' => ['host' => '127.0.0.1', 'port' => 3306, 'name' => 'bringit', 'user' => 'root', 'pass' => ''],
'jwt_secret'  => 'ganti-dengan-rahasia-acak-minimal-32-karakter',
'cors_origin' => 'http://localhost:5173',
```

> Jangan commit `config.php` ke Git. Tambahkan ke `.gitignore`.

### 5.2 Menjalankan server

**Cara A — PHP built-in server (paling mudah):**

```bash
cd bringit-backend
php -S 127.0.0.1:8000 -t public public/index.php
```

Uji: buka `http://127.0.0.1:8000/api/sports`. Hasilnya harus berupa JSON daftar cabang olahraga.

**Cara B — Apache XAMPP:** salin folder ke `C:\xampp\htdocs\bringit-backend`. API ada di `http://localhost/bringit-backend/public/api/...`. File `public/.htaccess` sudah meneruskan header `Authorization`. Ubah `target` proxy di `bringit-frontend/vite.config.js` sesuai alamat ini.

### 5.3 Daftar endpoint progres 30%

Semua endpoint memakai awalan `/api`. Endpoint bertanda 🔒 butuh header `Authorization: Bearer <token>`.

| UC | Method & path | Keterangan |
|---|---|---|
| UC-01 | `POST /auth/register` | `{role:"team", name, team_name, email, phone, city, password}` → `{message, token, user}` |
| UC-02 | `POST /auth/login` | `{email, password}` → `{token, user}` |
| UC-02 | 🔒 `GET /auth/me` | Data pengguna yang sedang login |
| — | `GET /sports` | Daftar cabang aktif |
| UC-03 | 🔒 `GET /teams/me` · `PUT /teams/me` | Ambil/ubah profil, cabang (array nama), dan daftar pemain |
| UC-03 | 🔒 `POST /teams/me/logo` · `PUT /users/me` | Logo (data URL ≤ 2 MB) dan data akun kapten |
| UC-03 | 🔒 `POST /auth/change-password` | Ubah kata sandi |
| UC-04 | 🔒 `GET /teams?city=&sport=&level=&sort=` | Cari lawan (hanya tim dengan cabang yang sama) |
| UC-04 | 🔒 `POST /opponent-requests` | `{to_team_id, sport, date, time, duration, location, note}` |
| UC-04 | 🔒 `GET /opponent-requests?box=incoming\|outgoing` | Undangan masuk/terkirim |
| UC-04/05 | 🔒 `PATCH /opponent-requests/:id` | `{action: accept\|reject\|cancel}`; *accept* langsung membuat jadwal |
| UC-05 | 🔒 `GET /matches?scope=active\|history` | Daftar pertandingan |
| UC-05 | 🔒 `POST /matches/:id/confirm-schedule` | Setujui usulan jadwal lawan |
| UC-05 | 🔒 `POST /matches/:id/propose` | Ajukan jadwal alternatif `{date, time, location, note}` |
| UC-05 | 🔒 `POST /matches/:id/cancel` | Batalkan pertandingan |
| UC-06 | 🔒 `POST /matches/:id/result` | `{my_score, opponent_score, note}` |
| UC-06 | 🔒 `POST /matches/:id/result/confirm` | Konfirmasi skor; final bila kedua tim setuju |
| UC-06 | 🔒 `POST /matches/:id/result/dispute` | `{reason}`; status menjadi sengketa |
| FR-09 | 🔒 `GET /teams/me/stats` · `GET /teams/me/activities` | Statistik dan aktivitas untuk Beranda |
| FR-20 | 🔒 `GET /notifications` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` | Notifikasi |

Format error seragam: status HTTP 4xx/5xx dan body `{"message": "...", "errors": {"field": "pesan"}}`. Frontend otomatis menampilkan `message` sebagai notifikasi dan `errors` di bawah kolom form.

### 5.4 Logika penting yang perlu dijelaskan saat presentasi

**a) Password dan JWT (NFR-04, NFR-05).** Password disimpan dengan `password_hash()` (bcrypt). Saat login, server mengembalikan JWT bertanda tangan HMAC-SHA256 yang berlaku 7 hari.

```php
// src/Core/Jwt.php (ringkas)
$sig = b64(hash_hmac('sha256', "$head.$body", $secret, true));
return "$head.$body.$sig";
// Verifikasi: hash_equals($expected, $sig) && exp > time()
```

**b) Hak akses (SRS 1.3).** Setiap endpoint 🔒 memanggil `Auth::team()`. Selain itu, `MatchController::load()` memastikan tim yang login adalah peserta pertandingan, sehingga tim lain tidak bisa mengubah data yang bukan miliknya.

**c) FR-05: sparring hanya untuk cabang yang sama.**

```php
// MatchmakingController::send()
if (!in_array($sid, P::teamSports($mine['id'])) || !in_array($sid, P::teamSports($target['id']))) {
    Http::fail(422, 'Permintaan sparring hanya bisa dikirim ke tim dengan cabang olahraga yang sama.');
}
```

**d) FR-07 dan FR-08: konfirmasi hasil dua pihak.**

1. Setiap tim melapor skor ke kolom `report_a_*` atau `report_b_*`.
2. Kalau skor yang dilaporkan berubah, kedua konfirmasi direset (`confirmed_by_a = confirmed_by_b = 0`).
3. Konfirmasi ditolak kalau laporan kedua tim berbeda. Tim diarahkan untuk memperbarui hasil atau melaporkan selisih ke admin.
4. Status menjadi `final` hanya jika `confirmed_by_a = 1` **dan** `confirmed_by_b = 1`. Setelah itu hasil masuk ke riwayat (FR-09).

**e) Keamanan query.** Semua query memakai *prepared statement* PDO (`Database::run($sql, $params)`), sehingga aman dari SQL injection.

---

## 6. Langkah 3 — Frontend

### 6.1 Pengaturan `.env`

```bash
cd bringit-frontend
cp .env.example .env        # Windows: copy .env.example .env
```

Isi `.env` untuk progres 30%:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
VITE_SCOPE=progress30
```

| Variabel | Nilai | Efek |
|---|---|---|
| `VITE_USE_MOCK` | `false` | Memakai backend PHP. Isi `true` untuk data contoh di browser tanpa backend. |
| `VITE_SCOPE` | `progress30` | Menyembunyikan menu dan rute Premium, Jasa, Penyedia, dan Admin. Pendaftaran hanya untuk Tim. |
| `VITE_SCOPE` | `full` | Semua fitur tampil (untuk progres berikutnya) |

### 6.2 Instal dan jalankan

```bash
npm install
npm run dev               # buka http://localhost:5173
```

> **Penting (Windows):** jika `npm run dev` gagal dengan *"'vite' is not recognized"*, kemungkinan `NODE_ENV=production` sedang aktif sehingga devDependencies tidak terpasang. Jalankan `Remove-Item Env:NODE_ENV`, lalu `npm install --include=dev`.

Pastikan backend (langkah 5.2) sudah berjalan. Vite meneruskan `/api/*` ke `http://127.0.0.1:8000` (lihat `vite.config.js`).

### 6.3 Yang tampil di mode `progress30`

- Menu samping hanya berisi **Beranda, Profil tim, Cari lawan, Pertandingan**.
- Pendaftaran hanya untuk peran **Tim**.
- Kartu "Pesan wasit", promo Premium, dan saran wasit disembunyikan.
- Membuka `/tim/premium` atau `/admin` menampilkan halaman 404.

File yang mengatur saklar ini: `src/config/features.js`.

---

## 7. Langkah 4 — Pengujian per use case

Gunakan tabel ini sebagai **lembar uji**. Centang setiap baris dan simpan screenshot sebagai bukti. Skenario pengecualian diambil langsung dari bagian *Exception Conditions* di SRS.

### UC-01 Daftar akun tim

| ID | Skenario | Langkah | Hasil yang diharapkan | ✔ |
|---|---|---|---|---|
| T01-1 | Normal | Isi semua kolom dengan benar → **Buat akun tim** | Masuk ke halaman Profil tim, muncul notifikasi "Akun tim berhasil dibuat" | ☐ |
| T01-2 | Email sudah dipakai | Daftar dengan `kapten@citrafc.id` | Pesan "Email sudah terdaftar" | ☐ |
| T01-3 | Data tidak valid | Email tanpa `@`, kata sandi `abc` | Pesan error di bawah kolom, akun tidak dibuat | ☐ |
| T01-4 | Konfirmasi sandi beda | Isi konfirmasi berbeda | "Konfirmasi kata sandi tidak sama" | ☐ |

### UC-02 Login

| ID | Skenario | Langkah | Hasil yang diharapkan | ✔ |
|---|---|---|---|---|
| T02-1 | Normal | `kapten@garudaunited.id` / `bringit123` | Masuk ke Beranda tim | ☐ |
| T02-2 | Sandi salah | Sandi `salah123` | "Email atau kata sandi salah", tetap di halaman login | ☐ |
| T02-3 | Akses tanpa login | Buka `/tim` setelah logout | Dialihkan ke `/masuk` | ☐ |

### UC-03 Profil tim

| ID | Skenario | Langkah | Hasil yang diharapkan | ✔ |
|---|---|---|---|---|
| T03-1 | Ubah profil | Ubah level, kota, dan jumlah pemain → **Simpan perubahan** | "Profil tim berhasil diperbarui", data tetap ada setelah reload | ☐ |
| T03-2 | Tambah cabang | **+ Tambah cabang** → Tenis → Simpan | Chip Tenis muncul, tim ikut tampil di pencarian Tenis | ☐ |
| T03-3 | Cabang kosong | Hapus semua chip cabang → Simpan | "Pilih minimal satu cabang olahraga", tidak tersimpan | ☐ |
| T03-4 | Logo tidak valid | Unggah file PDF atau gambar > 2 MB | Ditolak dengan pesan format/ukuran | ☐ |
| T03-5 | Daftar pemain | Tab *Profil tim* → tambah 2 pemain → Simpan | Pemain tersimpan | ☐ |

### UC-04 Cari dan pilih lawan

| ID | Skenario | Langkah | Hasil yang diharapkan | ✔ |
|---|---|---|---|---|
| T04-1 | Filter | Kota Bandung, Futsal, Menengah → **Terapkan filter** | Muncul 4 tim (data seed), diurutkan berdasarkan ELO terdekat | ☐ |
| T04-2 | Tidak ada hasil | Kota Surabaya | "Tidak ditemukan lawan yang sesuai" | ☐ |
| T04-3 | Kirim undangan | Pilih lawan → isi lokasi → **Kirim undangan** | Pindah ke tab *Undangan terkirim*, status "Menunggu" | ☐ |
| T04-4 | Undangan ganda | Kirim lagi ke tim yang sama | "Anda sudah mengirim undangan ke ..." | ☐ |
| T04-5 | Lokasi kosong | Kosongkan lokasi | "Lengkapi nama lapangan / lokasi." | ☐ |
| T04-6 | Terima undangan | Tab *Undangan masuk* → **Terima** | Undangan hilang dan pertandingan muncul di menu Pertandingan | ☐ |
| T04-7 | Tolak undangan | **Tolak** | Pengirim mendapat notifikasi penolakan | ☐ |

### UC-05 Jadwal pertandingan

| ID | Skenario | Langkah | Hasil yang diharapkan | ✔ |
|---|---|---|---|---|
| T05-1 | Konfirmasi usulan | Kartu "Usulan dari Northside FC" → **Konfirmasi jadwal** | Status menjadi "Terjadwal" | ☐ |
| T05-2 | Ajukan alternatif | Isi tanggal/waktu/lokasi baru → **Kirim usulan baru** | Status "Menunggu Northside FC". Login sebagai Northside untuk melihat usulan. | ☐ |
| T05-3 | Lokasi tidak jelas | Lokasi diisi "a" | Ditolak, diminta melengkapi lokasi | ☐ |
| T05-4 | Batalkan | **Batalkan** | Pertandingan pindah ke Riwayat (dibatalkan) dan lawan mendapat notifikasi | ☐ |

### UC-06 Hasil pertandingan

| ID | Skenario | Langkah | Hasil yang diharapkan | ✔ |
|---|---|---|---|---|
| T06-1 | Input skor | Garuda: skor 3 : 2 → **Kirim / perbarui hasil** | "Laporan hasil terkirim" | ☐ |
| T06-2 | Konfirmasi dua pihak | Login Citra FC → **Konfirmasi hasil**, lalu login Garuda → **Konfirmasi hasil** | "Hasil resmi tercatat", muncul di Riwayat dengan keterangan "Menang" | ☐ |
| T06-3 | Skor berbeda | Garuda melapor 3:2, Citra melapor 2:2 | Badge "Skor berbeda", tombol konfirmasi tidak aktif | ☐ |
| T06-4 | Laporkan selisih | **Laporkan selisih** → isi alasan | Status "Sengketa · ditinjau admin" | ☐ |
| T06-5 | Skor tidak valid | Kosongkan skor | "Skor harus bilangan bulat 0 atau lebih" | ☐ |
| T06-6 | Statistik | Buka Beranda setelah hasil final | Kartu Pertandingan/Kemenangan bertambah, aktivitas tercatat | ☐ |

### FR-20 Notifikasi

| ID | Skenario | Hasil yang diharapkan | ✔ |
|---|---|---|---|
| T20-1 | Setelah aksi UC-04/05/06 | Lonceng lawan menampilkan titik oranye dan pesan terkait | ☐ |
| T20-2 | Klik notifikasi | Diarahkan ke halaman terkait dan pesan ditandai dibaca | ☐ |

> **Tip:** pakai dua browser (misalnya Chrome dan Edge, atau satu jendela *incognito*) supaya bisa login sebagai dua tim sekaligus.

---

## 8. Rencana kerja 7 hari

| Hari | Kegiatan | Commit Git |
|---|---|---|
| 1 | Setup XAMPP/Node, impor `schema.sql`, jalankan seed, pelajari struktur folder | `chore: setup database & proyek` |
| 2 | Backend Auth (UC-01, UC-02), uji dengan Postman/curl | `feat(auth): register & login JWT` |
| 3 | Backend profil tim (UC-03) dan sambungkan ke frontend | `feat(team): profil tim & cabang olahraga` |
| 4 | Backend matchmaking dan undangan (UC-04) | `feat(matchmaking): cari lawan & undangan` |
| 5 | Backend jadwal dan hasil (UC-05, UC-06) | `feat(match): jadwal & konfirmasi hasil` |
| 6 | Notifikasi, isi lembar uji bagian 7, perbaiki bug | `test: lembar uji UC-01..06` |
| 7 | Siapkan laporan, screenshot, dan latihan demo | `docs: laporan progres 30%` |

> Kalau dikerjakan berkelompok, bagi per modul: (1) Auth + Profil, (2) Matchmaking, (3) Pertandingan, (4) Database + pengujian + laporan.

---

## 9. Bahan laporan dan demo progres

### 9.1 Tabel status FR (salin ke laporan)

| FR | Deskripsi singkat | Status |
|---|---|---|
| FR-01 | Registrasi & login email/password | ✅ Selesai (tim) |
| FR-02 | Profil tim + pilih cabang olahraga | ✅ Selesai |
| FR-04 | Daftar tim berdasarkan filter kota/cabang/level | ✅ Selesai |
| FR-05 | Sparring hanya antar cabang yang sama | ✅ Selesai |
| FR-06 | Kedua tim menyepakati jadwal & lokasi | ✅ Selesai |
| FR-07 | Input skor oleh minimal satu tim | ✅ Selesai |
| FR-08 | Konfirmasi dua tim sebelum hasil final | ✅ Selesai |
| FR-09 | Riwayat pertandingan setiap tim | ✅ Selesai |
| FR-20 | Notifikasi permintaan & jadwal | ✅ Selesai (in-app) |
| FR-03, FR-10 s.d. 19, 21 s.d. 27 | Premium, ELO, jasa, admin | ⏳ Progres berikutnya |
| **Total** | | **9 / 27 = 33,3%** |

### 9.2 Screenshot yang perlu dilampirkan

1. Halaman Daftar dan Masuk.
2. Profil tim (sebelum/sesudah disimpan).
3. Cari lawan dengan hasil filter, lalu undangan terkirim.
4. Pertandingan: kartu konfirmasi jadwal dan kartu input hasil.
5. Riwayat pertandingan yang sudah "Terkonfirmasi".
6. Isi tabel di phpMyAdmin (`opponent_requests`, `matches`, `match_results`) sebagai bukti data tersimpan.
7. Respons API di Postman atau di tab Network browser (misalnya `POST /api/auth/login`).

### 9.3 Skenario demo 5 menit

1. **Daftar** tim baru → otomatis masuk ke Profil → pilih cabang dan level → Simpan. *(UC-01, UC-03)*
2. **Logout**, lalu **login** sebagai Garuda United. *(UC-02)*
3. **Cari lawan** dengan filter Futsal Menengah Bandung → pilih tim → **Kirim undangan**. *(UC-04)*
4. Buka **Undangan masuk** → **Terima** undangan dari Bandung City, jadwal langsung tersimpan. *(UC-04/05)*
5. **Pertandingan** → konfirmasi usulan dari Northside FC. *(UC-05)*
6. Input skor vs Citra FC → buka browser kedua (login Citra) → **Konfirmasi** → kembali ke Garuda → **Konfirmasi** → tunjukkan Riwayat dan statistik di Beranda. *(UC-06, FR-09)*
7. Tunjukkan lonceng notifikasi dan isi tabel di phpMyAdmin. *(FR-20)*

---

## 10. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `'vite' is not recognized` | devDependencies tidak terpasang (`NODE_ENV=production`) | `Remove-Item Env:NODE_ENV` lalu `npm install --include=dev` |
| `ENOENT ... package.json` | Terminal tidak berada di folder yang berisi `package.json` | `cd` ke folder yang benar (waspada folder bertingkat hasil ekstrak) |
| Frontend: "Tidak dapat terhubung ke server" | Backend belum jalan / port salah | Jalankan `php -S 127.0.0.1:8000 -t public public/index.php`, cek `vite.config.js` |
| `{"message":"Terjadi kesalahan pada server."}` | Error PHP/SQL | Lihat output terminal `php -S` atau `C:\xampp\apache\logs\error.log` |
| `SQLSTATE[HY000] [1045] Access denied` | User/password DB salah | Sesuaikan `config.php` (XAMPP: `root`, password kosong) |
| `SQLSTATE[HY000] [2002]` | MySQL belum jalan | Start MySQL di XAMPP Control Panel |
| `could not find driver` | Ekstensi `pdo_mysql` mati | Aktifkan `extension=pdo_mysql` di `php.ini` |
| Login sukses tapi langsung keluar lagi (401) | Header `Authorization` tidak diteruskan Apache | Pakai `php -S`, atau pastikan `.htaccess` aktif (`AllowOverride All`) |
| Error CORS di console | Frontend memanggil backend langsung tanpa proxy | Gunakan `VITE_API_BASE_URL=/api` (proxy), atau set `cors_origin` di `config.php` |
| Tanggal hasil pertandingan tidak sesuai | Zona waktu | Backend memakai WIB (`Asia/Jakarta`, `time_zone '+07:00'`) |
| Data demo ingin diulang | — | Impor ulang `schema.sql` lalu `php database/seed.php` |

---

## 11. Setelah 30%: progres berikutnya

Urutan yang disarankan, tiap tahap sekitar 20–25%:

1. **Premium & ELO** (UC-07, UC-08 · FR-10 s.d. 13). Hitung ELO di `MatchController::confirmResult()` saat hasil final. Rumus sudah tersedia di `bringit-frontend/src/lib/elo.js` (K = 32). Tambah tabel `subscription_plans`, `subscriptions`, `payments`, dan integrasi Midtrans sandbox.
2. **Jasa wasit & fotografer** (UC-09 s.d. 17 · FR-03, 14 s.d. 19, 27).
3. **Admin** (UC-18, UC-19 · FR-21 s.d. 26): verifikasi akun, keputusan sengketa (`disputes` sudah tersedia), paket dan komisi, laporan transaksi.

Untuk menampilkan semua halaman tersebut di frontend, ubah `.env` menjadi `VITE_SCOPE=full`. Halamannya sudah jadi dan mengikuti desain, tinggal disambungkan ke endpoint backend yang baru. Daftar lengkap endpoint ada di `bringit-frontend/README.md`.
