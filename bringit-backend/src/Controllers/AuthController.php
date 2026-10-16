<?php
// Auth — UC-01 daftar, UC-02 login (FR-01). Kata sandi memakai bcrypt (NFR-04).
class AuthController
{
    public static function register()
    {
        $b = Http::body();
        $errors = [];
        $role = $b['role'] ?? '';
        if (!in_array($role, ['team', 'referee', 'photographer'], true)) $errors['role'] = 'Pilih peran.';
        if (trim($b['name'] ?? '') === '') $errors['name'] = 'Nama lengkap wajib diisi.';
        if ($role === 'team' && trim($b['team_name'] ?? '') === '') $errors['team_name'] = 'Nama tim wajib diisi.';
        if (!preg_match('/^\S+@\S+\.\S+$/', $b['email'] ?? '')) $errors['email'] = 'Format email tidak valid.';
        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d).{8,}$/', $b['password'] ?? '')) $errors['password'] = 'Minimal 8 karakter, termasuk huruf dan angka.';
        if ($errors) Http::fail(422, 'Periksa kembali data yang diisi.', $errors);

        $exists = Database::one('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [trim($b['email'])]);
        if ($exists) Http::fail(409, 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.', ['email' => 'Email sudah terdaftar.']);

        Database::run(
            'INSERT INTO users (name, email, password, phone, role, status) VALUES (?,?,?,?,?,?)',
            [trim($b['name']), trim($b['email']), password_hash($b['password'], PASSWORD_DEFAULT), trim($b['phone'] ?? ''), $role, 'verified']
        );
        $uid = Database::lastId();

        if ($role === 'team') {
            $today = P::today();
            Database::run(
                "INSERT INTO teams (user_id, team_name, city, level, players, joined) VALUES (?,?,?,'Pemula',0,?)",
                [$uid, trim($b['team_name']), trim($b['city'] ?? '') !== '' ? trim($b['city']) : 'Bandung', $today]
            );
            $tid = Database::lastId();
            Database::run('INSERT INTO team_sports (team_id, sport_category_id) VALUES (?,1)', [$tid]);
            Database::run('INSERT INTO elo_ratings (team_id, sport_category_id, rating, updated_at) VALUES (?,?,1000,?)', [$tid, 1, $today]);
        }

        $user = Database::one('SELECT * FROM users WHERE id = ?', [$uid]);
        return [
            'message' => 'Akun tim berhasil dibuat.',
            'token' => Jwt::issue($uid),
            'user' => P::publicUser($user),
        ];
    }

    public static function login()
    {
        $b = Http::body();
        $email = strtolower(trim($b['email'] ?? ''));
        if ($email === '' || empty($b['password'])) {
            Http::fail(422, 'Email dan kata sandi wajib diisi.', [
                'email' => $email === '' ? 'Email wajib diisi.' : null,
                'password' => empty($b['password']) ? 'Kata sandi wajib diisi.' : null,
            ]);
        }
        $u = Database::one('SELECT * FROM users WHERE LOWER(email) = ?', [$email]);
        if (!$u || !password_verify($b['password'], $u['password'])) {
            Http::fail(401, 'Email atau kata sandi salah.');
        }
        if ($u['status'] === 'pending') {
            Http::fail(403, 'Akun belum terverifikasi. Buka tautan verifikasi di email Anda.');
        }
        return ['token' => Jwt::issue($u['id']), 'user' => P::publicUser($u)];
    }

    public static function me()
    {
        $u = Auth::require(false);
        return P::publicUser($u);
    }

    public static function logout()
    {
        Auth::require(false);
        return ['ok' => true];
    }

    public static function forgotPassword()
    {
        $b = Http::body();
        if (!preg_match('/^\S+@\S+\.\S+$/', $b['email'] ?? '')) Http::fail(422, 'Masukkan email yang valid.');
        return ['message' => 'Jika email terdaftar, tautan atur ulang kata sandi telah dikirim.'];
    }

    public static function resendVerification()
    {
        return ['message' => 'Tautan verifikasi dikirim ulang.'];
    }

    public static function changePassword()
    {
        $u = Auth::require(false);
        $b = Http::body();
        if (!password_verify($b['current_password'] ?? '', $u['password'])) {
            Http::fail(422, 'Kata sandi saat ini salah.', ['current_password' => 'Kata sandi saat ini salah.']);
        }
        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d).{8,}$/', $b['new_password'] ?? '')) {
            Http::fail(422, 'Kata sandi baru tidak memenuhi syarat.', ['new_password' => 'Minimal 8 karakter, termasuk huruf dan angka.']);
        }
        Database::run('UPDATE users SET password = ? WHERE id = ?', [password_hash($b['new_password'], PASSWORD_DEFAULT), $u['id']]);
        return ['message' => 'Kata sandi diperbarui.'];
    }
}
