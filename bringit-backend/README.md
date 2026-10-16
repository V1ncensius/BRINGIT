# BRINGIT — Backend (progres 30%)

REST API PHP 8 + MySQL untuk UC-01 s.d. UC-06 dan notifikasi (FR-20).
Tanpa framework dan tanpa Composer, sesuai panduan `PANDUAN-PROGRES-30.md`.

## Menjalankan

```bash
copy config.example.php config.php   # sesuaikan DB + jwt_secret
mysql -u root -e "CREATE DATABASE bringit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root bringit < database/schema.sql
php database/seed.php                # data demo (opsional)
php -S 127.0.0.1:8000 -t public public/index.php
```

Uji: buka `http://127.0.0.1:8000/api/sports` → JSON daftar cabang olahraga.

## Struktur

```
config.example.php  contoh konfigurasi (config.php tidak di-commit)
database/schema.sql skema + master cabang
database/seed.php   6 tim demo Bandung (sandi: bringit123)
public/index.php    pintu masuk + pendaftaran rute
src/Core/          Database, Jwt, Auth, Router, Http
src/Support/       Presenter (bentuk JSON), Notifier (FR-20)
src/Controllers/   Auth, Team, Matchmaking, Match, Misc
```
