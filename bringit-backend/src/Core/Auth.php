<?php
// Penjaga endpoint bertanda kunci: memastikan pemanggil adalah akun tim (SRS 1.3).
class Auth
{
    public static $user = null;
    public static $team = null;

    /** Wajib login; bila $mustBeTeam, peran harus 'team'. Mengembalikan user. */
    public static function require($mustBeTeam = true)
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $m)) {
            Http::fail(401, 'Sesi berakhir. Silakan masuk kembali.');
        }
        $uid = Jwt::verify(trim($m[1]));
        if (!$uid) Http::fail(401, 'Sesi berakhir. Silakan masuk kembali.');
        $user = Database::one('SELECT * FROM users WHERE id = ?', [$uid]);
        if (!$user) Http::fail(401, 'Sesi berakhir. Silakan masuk kembali.');
        if ($mustBeTeam && $user['role'] !== 'team') {
            Http::fail(403, 'Anda tidak memiliki akses ke fitur ini.');
        }
        self::$user = $user;
        return $user;
    }

    /** Tim milik pengguna yang sedang login (404 bila belum ada). */
    public static function team()
    {
        if (self::$team) return self::$team;
        $team = Database::one('SELECT * FROM teams WHERE user_id = ?', [self::$user['id']]);
        if (!$team) Http::fail(404, 'Profil tim belum dibuat.');
        self::$team = $team;
        return $team;
    }
}
