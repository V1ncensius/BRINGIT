<?php
// Matchmaking — UC-04 (FR-04 daftar tim, FR-05 sparring sesama cabang).
class MatchmakingController
{
    public static function search()
    {
        Auth::require();
        $mine = Database::one('SELECT * FROM teams WHERE user_id = ?', [Auth::$user['id']]);
        if (!$mine) Http::fail(404, 'Profil tim belum dibuat.');
        $q = $_GET;
        $sid = P::sportId($q['sport'] ?? null) ?: (int) $mine['primary_sport_id'];
        $myElo = P::elo($mine['id'], $sid);

        $ids = array_column(Database::all('SELECT team_id FROM team_sports WHERE sport_category_id = ?', [$sid]), 'team_id');
        $list = [];
        if ($ids) {
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $params = $ids;
            $sql = "SELECT * FROM teams WHERE id IN ($ph) AND id <> ? AND verified = 1";
            $params[] = $mine['id'];
            if (!empty($q['city'])) { $sql .= ' AND city = ?'; $params[] = $q['city']; }
            if (!empty($q['level'])) { $sql .= ' AND level = ?'; $params[] = $q['level']; }
            $list = Database::all($sql, $params);
        }
        $cards = [];
        foreach ($list as $t) {
            $card = P::teamCard($t, $sid);
            $card['elo_gap'] = $card['elo'] - $myElo;
            $cards[] = $card;
        }
        $sort = $q['sort'] ?? 'elo_nearest';
        if ($sort === 'elo_desc') usort($cards, function ($a, $b) { return $b['elo'] <=> $a['elo']; });
        elseif ($sort === 'wins') usort($cards, function ($a, $b) { return $b['wins'] <=> $a['wins']; });
        else usort($cards, function ($a, $b) { return abs($a['elo_gap']) <=> abs($b['elo_gap']); });

        return [
            'items' => $cards,
            'my_elo' => $myElo,
            'my_sports' => array_map([P::class, 'sportName'], P::teamSports($mine['id'])),
        ];
    }

    public static function detail($params)
    {
        Auth::require();
        $t = Database::one('SELECT * FROM teams WHERE id = ?', [(int) $params['id']]);
        if (!$t) Http::fail(404, 'Tim tidak ditemukan.');
        return P::teamCard($t);
    }

    public static function send()
    {
        Auth::require();
        $mine = Auth::team();
        $b = Http::body();
        $target = Database::one('SELECT * FROM teams WHERE id = ?', [(int) ($b['to_team_id'] ?? 0)]);
        if (!$target) Http::fail(404, 'Tim lawan tidak ditemukan.');
        $sid = P::sportId($b['sport'] ?? null) ?: (int) $mine['primary_sport_id'];
        // FR-05: permintaan hanya untuk tim dengan cabang olahraga yang sama
        if (!in_array($sid, P::teamSports($mine['id']), true) || !in_array($sid, P::teamSports($target['id']), true)) {
            Http::fail(422, 'Permintaan sparring hanya bisa dikirim ke tim dengan cabang olahraga yang sama.');
        }
        if (empty($b['date']) || empty($b['time'])) {
            Http::fail(422, 'Tanggal dan waktu wajib diisi.', ['date' => empty($b['date']) ? 'Pilih tanggal.' : null]);
        }
        if (trim($b['location'] ?? '') === '' || mb_strlen(trim($b['location'])) < 4) {
            Http::fail(422, 'Lokasi belum jelas. Lengkapi nama lapangan.', ['location' => 'Lengkapi lokasi pertandingan.']);
        }
        if (($b['date'] ?? '') < P::today()) {
            Http::fail(422, 'Tanggal tidak boleh di masa lalu.', ['date' => 'Tanggal tidak boleh di masa lalu.']);
        }
        $dup = Database::one(
            "SELECT id FROM opponent_requests WHERE from_team_id = ? AND to_team_id = ? AND status = 'pending'",
            [$mine['id'], $target['id']]
        );
        if ($dup) Http::fail(409, "Anda sudah mengirim undangan ke {$target['team_name']}. Tunggu tanggapannya.");

        Database::run(
            'INSERT INTO opponent_requests (from_team_id, to_team_id, sport_category_id, proposed_date, proposed_time, duration, location, note)
             VALUES (?,?,?,?,?,?,?,?)',
            [$mine['id'], $target['id'], $sid, $b['date'], $b['time'], (int) ($b['duration'] ?? 60), trim($b['location']), (string) ($b['note'] ?? '')]
        );
        $id = Database::lastId();
        Notifier::toTeam($target['id'], "Undangan sparring baru dari {$mine['team_name']}.", '/tim/cari-lawan?tab=masuk');
        $req = Database::one('SELECT * FROM opponent_requests WHERE id = ?', [$id]);
        return ['message' => "Undangan terkirim ke {$target['team_name']}.", 'request' => self::view($req, $mine['id'])];
    }

    /** box=incoming (masuk) atau outgoing (terkirim). */
    public static function list()
    {
        Auth::require();
        $mine = Auth::team();
        $box = $_GET['box'] ?? 'incoming';
        $incoming = $box !== 'outgoing';
        $rows = Database::all(
            $incoming
                ? 'SELECT * FROM opponent_requests WHERE to_team_id = ? ORDER BY created_at DESC'
                : 'SELECT * FROM opponent_requests WHERE from_team_id = ? ORDER BY created_at DESC',
            [$mine['id']]
        );
        $out = [];
        foreach ($rows as $r) {
            if ($incoming && $r['status'] === 'accepted') continue;
            $out[] = self::view($r, $mine['id'], $incoming);
        }
        return $out;
    }

    public static function respond($params)
    {
        Auth::require();
        $mine = Auth::team();
        $b = Http::body();
        $r = Database::one('SELECT * FROM opponent_requests WHERE id = ?', [(int) $params['id']]);
        if (!$r) Http::fail(404, 'Permintaan tidak ditemukan.');
        $action = $b['action'] ?? '';

        if ($action === 'cancel') {
            if ((int) $r['from_team_id'] !== (int) $mine['id']) Http::fail(403, 'Tidak diizinkan.');
            Database::run("UPDATE opponent_requests SET status = 'cancelled' WHERE id = ?", [$r['id']]);
            return ['message' => 'Undangan dibatalkan.'];
        }
        if ((int) $r['to_team_id'] !== (int) $mine['id']) Http::fail(403, 'Tidak diizinkan.');
        if ($r['status'] !== 'pending') Http::fail(409, 'Permintaan ini sudah ditanggapi.');
        $from = Database::one('SELECT * FROM teams WHERE id = ?', [$r['from_team_id']]);

        if ($action === 'reject') {
            Database::run("UPDATE opponent_requests SET status = 'rejected' WHERE id = ?", [$r['id']]);
            Notifier::toTeam($from['id'], "{$mine['team_name']} menolak undangan sparring Anda.", '/tim/cari-lawan?tab=terkirim');
            return ['message' => 'Undangan ditolak.'];
        }
        if ($action !== 'accept') Http::fail(422, 'Aksi tidak dikenal.');
        Database::run("UPDATE opponent_requests SET status = 'accepted' WHERE id = ?", [$r['id']]);
        Database::run(
            "INSERT INTO matches (code, request_id, team_a_id, team_b_id, sport_category_id, level, match_date, match_time, duration, location, status)
             VALUES ('TMP',?,?,?,?,?,?,?,?,?,'scheduled')",
            [$r['id'], $mine['id'], $from['id'], $r['sport_category_id'], $mine['level'], $r['proposed_date'], $r['proposed_time'], $r['duration'], $r['location']]
        );
        $mid = Database::lastId();
        $code = 'SP-' . (1000 + $mid);
        Database::run('UPDATE matches SET code = ? WHERE id = ?', [$code, $mid]);
        Notifier::toTeam($from['id'], "{$mine['team_name']} menerima undangan. Jadwal {$r['proposed_date']} {$r['proposed_time']} terkonfirmasi.", '/tim/pertandingan');
        return ['message' => 'Undangan diterima. Jadwal pertandingan tersimpan.', 'match_id' => $mid];
    }

    private static function view($r, $myTeamId, $incoming = null)
    {
        if ($incoming === null) $incoming = ((int) $r['to_team_id'] === (int) $myTeamId);
        $other = Database::one('SELECT * FROM teams WHERE id = ?', [$incoming ? $r['from_team_id'] : $r['to_team_id']]);
        return [
            'id' => (int) $r['id'],
            'from_team_id' => (int) $r['from_team_id'],
            'to_team_id' => (int) $r['to_team_id'],
            'sport_id' => (int) $r['sport_category_id'],
            'sport' => P::sportName($r['sport_category_id']),
            'status' => $r['status'],
            'date' => $r['proposed_date'],
            'time' => $r['proposed_time'],
            'duration' => (int) $r['duration'],
            'location' => $r['location'],
            'note' => $r['note'],
            'created_at' => $r['created_at'],
            'team' => $other ? P::teamCard($other, $r['sport_category_id']) : null,
        ];
    }
}
