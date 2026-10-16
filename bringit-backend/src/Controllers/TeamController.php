<?php
// Profil tim — UC-03 (FR-02, FR-09).
class TeamController
{
    private static function fullTeam($teamId)
    {
        $t = Database::one('SELECT * FROM teams WHERE id = ?', [$teamId]);
        $t['sports'] = P::teamSports($teamId);
        $t['players_list'] = Database::all('SELECT name, position, number FROM team_players WHERE team_id = ? ORDER BY id', [$teamId]);
        return $t;
    }

    public static function me()
    {
        Auth::require();
        $t = self::fullTeam(Auth::team()['id']);
        $u = Database::one('SELECT name, email, phone FROM users WHERE id = ?', [Auth::$user['id']]);
        $summaries = [];
        foreach ($t['sports'] as $sid) {
            [$w, $d, $l] = P::record($t['id'], $sid);
            $played = $w + $d + $l;
            $summaries[] = [
                'sport' => P::sportName($sid),
                'elo' => P::elo($t['id'], $sid),
                'played' => $played,
                'win_rate' => $played ? (int) round($w / $played * 100) : 0,
            ];
        }
        return [
            'id' => (int) $t['id'],
            'team_name' => $t['team_name'],
            'logo' => $t['logo'],
            'city' => $t['city'],
            'area' => $t['area'],
            'level' => $t['level'],
            'players' => (int) $t['players'],
            'venue' => $t['venue'],
            'schedule' => $t['schedule'],
            'about' => $t['about'],
            'sports' => array_map('intval', $t['sports']),
            'sport_names' => array_map([P::class, 'sportName'], $t['sports']),
            'primary_sport' => (int) $t['primary_sport_id'],
            'primary_sport_name' => P::sportName($t['primary_sport_id']),
            'captain' => $u['name'],
            'email' => $u['email'],
            'phone' => $u['phone'],
            'roster' => array_map(function ($p) {
                return ['name' => $p['name'], 'position' => $p['position'], 'number' => $p['number'] !== null ? (int) $p['number'] : ''];
            }, $t['players_list']),
            'joined' => $t['joined'],
            'verified' => (bool) $t['verified'],
            'is_premium' => false,
            'summary' => $summaries,
        ];
    }

    public static function update()
    {
        Auth::require();
        $mine = Auth::team();
        $b = Http::body();
        $errors = [];
        if (trim($b['team_name'] ?? '') === '') $errors['team_name'] = 'Nama tim wajib diisi.';
        if (empty($b['city'])) $errors['city'] = 'Kota wajib dipilih.';
        if (empty($b['sports']) || !is_array($b['sports'])) $errors['sports'] = 'Pilih minimal satu cabang olahraga.';
        if ($errors) Http::fail(422, 'Data wajib belum lengkap.', $errors);

        $sports = [];
        foreach ((array) $b['sports'] as $s) {
            $sid = P::sportId($s);
            if ($sid && !in_array($sid, $sports, true)) $sports[] = $sid;
        }
        if (!$sports) Http::fail(422, 'Data wajib belum lengkap.', ['sports' => 'Pilih minimal satu cabang olahraga.']);
        $primary = P::sportId($b['primary_sport'] ?? null);
        if (!$primary || !in_array($primary, $sports, true)) $primary = $sports[0];

        Database::run(
            'UPDATE teams SET team_name=?, city=?, level=?, players=?, venue=?, schedule=?, about=?, primary_sport_id=? WHERE id=?',
            [
                trim($b['team_name']), $b['city'],
                in_array($b['level'] ?? '', ['Pemula', 'Menengah', 'Mahir'], true) ? $b['level'] : $mine['level'],
                max(0, (int) ($b['players'] ?? 0)),
                (string) ($b['venue'] ?? ''), (string) ($b['schedule'] ?? ''),
                (string) ($b['about'] ?? ''), $primary, $mine['id'],
            ]
        );
        Database::run('DELETE FROM team_sports WHERE team_id = ?', [$mine['id']]);
        foreach ($sports as $sid) {
            Database::run('INSERT INTO team_sports (team_id, sport_category_id) VALUES (?,?)', [$mine['id'], $sid]);
            P::elo($mine['id'], $sid);
        }
        Database::run('DELETE FROM team_players WHERE team_id = ?', [$mine['id']]);
        if (is_array($b['roster'] ?? null)) {
            foreach ($b['roster'] as $p) {
                if (trim($p['name'] ?? '') === '') continue;
                Database::run(
                    'INSERT INTO team_players (team_id, name, position, number) VALUES (?,?,?,?)',
                    [$mine['id'], trim($p['name']), (string) ($p['position'] ?? ''), $p['number'] === '' || $p['number'] === null ? null : (int) $p['number']]
                );
            }
        }
        return ['message' => 'Profil tim berhasil diperbarui.'];
    }

    public static function logo()
    {
        Auth::require();
        $mine = Auth::team();
        $b = Http::body();
        if (!preg_match('#^data:image/(png|jpe?g|webp);base64,#i', $b['logo'] ?? '')) {
            Http::fail(422, 'Format logo harus PNG, JPG, atau WEBP.');
        }
        if (strlen($b['logo']) > 2800000) Http::fail(422, 'Ukuran logo maksimal 2 MB.');
        Database::run('UPDATE teams SET logo = ? WHERE id = ?', [$b['logo'], $mine['id']]);
        return ['logo' => $b['logo']];
    }

    public static function updateAccount()
    {
        $u = Auth::require();
        $b = Http::body();
        if (trim($b['name'] ?? '') === '') Http::fail(422, 'Nama wajib diisi.', ['name' => 'Nama wajib diisi.']);
        if (!preg_match('/^\S+@\S+\.\S+$/', $b['email'] ?? '')) Http::fail(422, 'Format email tidak valid.', ['email' => 'Format email tidak valid.']);
        $dup = Database::one('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?', [trim($b['email']), $u['id']]);
        if ($dup) Http::fail(409, 'Email sudah dipakai akun lain.', ['email' => 'Email sudah dipakai akun lain.']);
        Database::run('UPDATE users SET name=?, email=?, phone=? WHERE id=?', [trim($b['name']), trim($b['email']), (string) ($b['phone'] ?? ''), $u['id']]);
        return P::publicUser(Database::one('SELECT * FROM users WHERE id = ?', [$u['id']]));
    }

    /** Statistik Beranda (FR-09): ikut pola mock — dihitung per cabang utama. */
    public static function stats()
    {
        Auth::require();
        $mine = Auth::team();
        $q = $_GET;
        $sid = P::sportId($q['sport'] ?? null) ?: (int) $mine['primary_sport_id'];
        [$w, $d, $l] = P::record($mine['id'], $sid);
        $board = Database::all(
            'SELECT t.id FROM teams t JOIN team_sports ts ON ts.team_id = t.id
             WHERE t.verified = 1 AND t.city = ? AND ts.sport_category_id = ?',
            [$mine['city'], $sid]
        );
        $rows = [];
        foreach ($board as $row) $rows[] = ['id' => (int) $row['id'], 'elo' => P::elo($row['id'], $sid)];
        usort($rows, function ($a, $b) { return $b['elo'] <=> $a['elo']; });
        $rank = 0;
        foreach ($rows as $i => $r) {
            if ($r['id'] === (int) $mine['id']) { $rank = $i + 1; break; }
        }
        return [
            'sport' => P::sportName($sid),
            'played' => $w + $d + $l,
            'wins' => $w, 'draws' => $d, 'losses' => $l,
            'elo' => P::elo($mine['id'], $sid),
            'elo_last_delta' => 0,
            'rank' => $rank,
            'total_teams' => count($rows),
            'city' => $mine['city'],
            'is_premium' => false,
        ];
    }

    /** Aktivitas terbaru untuk Beranda (maksimal 5). */
    public static function activities()
    {
        Auth::require();
        $mine = Auth::team();
        $matches = Database::all(
            'SELECT * FROM matches WHERE team_a_id = ? OR team_b_id = ? ORDER BY match_date DESC LIMIT 20',
            [$mine['id'], $mine['id']]
        );
        $items = [];
        foreach ($matches as $m) {
            $v = P::matchView($m, $mine['id']);
            if ($m['status'] === 'proposed' && $v['proposal_from_opponent']) {
                $items[] = ['text' => $v['opponent']['name'] . ' mengirim usulan jadwal', 'date' => $m['proposal_date'] ?? $m['match_date'], 'status' => 'Tinjau jadwal →', 'link' => '/tim/pertandingan'];
            } elseif ($m['status'] === 'result_pending' && $v['result']) {
                $items[] = ['text' => "Hasil {$v['result']['score_a']}–{$v['result']['score_b']} vs {$v['opponent']['name']} dikirim", 'date' => $m['match_date'], 'status' => 'Perlu konfirmasi', 'link' => '/tim/pertandingan'];
            } elseif ($m['status'] === 'final' && $v['result']) {
                $my = $v['i_am_a'] ? $v['result']['score_a'] : $v['result']['score_b'];
                $op = $v['i_am_a'] ? $v['result']['score_b'] : $v['result']['score_a'];
                $items[] = ['text' => "{$v['result']['outcome']} {$my}–{$op} vs {$v['opponent']['name']}", 'date' => $m['match_date'], 'status' => 'Terkonfirmasi', 'link' => '/tim/pertandingan?tab=riwayat'];
            } elseif ($m['status'] === 'disputed') {
                $items[] = ['text' => "Sengketa hasil vs {$v['opponent']['name']}", 'date' => $m['match_date'], 'status' => 'Ditinjau admin', 'link' => '/tim/pertandingan'];
            }
        }
        usort($items, function ($a, $b) { return strcmp($b['date'], $a['date']); });
        return array_slice($items, 0, 5);
    }
}
