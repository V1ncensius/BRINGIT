<?php
// Contoh konfigurasi backend BRINGIT (progres 30%).
// Salin menjadi config.php lalu sesuaikan:
//   Windows: copy config.example.php config.php
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'bringit',
        'user' => 'root',
        'pass' => '',
    ],
    // Rahasia tanda tangan JWT (HS256). Wajib diganti, minimal 32 karakter acak.
    'jwt_secret' => 'ganti-dengan-rahasia-acak-minimal-32-karakter',
    // Origin frontend yang diizinkan (dipakai saat backend diakses langsung, tanpa proxy Vite).
    'cors_origin' => 'http://localhost:5173',
];
