<?php
// Pertandingan — UC-05 jadwal (FR-06) dan UC-06 hasil dua pihak (FR-07, FR-08, FR-09).
class MatchController
{
    /** Memuat pertandingan milik tim yang login; tim lain ditolak (hak akses). */
    private static function load($id)
    {
        $mine = Auth::team();
        $m = Database::one('SELECT * FROM matches WHERE id = ?', [(int) $id]);
        if (!$m) Http::fail(404, 'Pertandingan tidak ditemukan.');
        if ((int) $m['team_a_id'] !== (int) $mine['id'] && (int) $m['team_b_id'] !== (int) $mine['id']) {
            Http::fail(403, 'Tidak diizinkan.');
        }
        $oppId = (int) $m['team_a_id'] === (int) $mine['id'] ? (int) $m['team_b_id'] : (int) $m['team_a_id'];
        return [$mine, $m, $oppId];
    }

    public static function list()
    {
        Auth::require();
        $mine = Auth::team();
        $scope = $_GET['scope'] ?? 'active';
        $rows = Database::all(
            'SELECT * FROM matches WHERE team_a_id = ? OR team_b_id = ?',
            [$mine['id'], $mine['id']]
        );
        $history = ['final', 'cancelled'];
        $out = [];
        foreach ($rows as $m) {
            $isHistory = in_array($m['status'], $history, true);
            if ($scope === 'history' ? !$isHistory : $isHistory) continue;
            $out[] = P::matchView($m, $mine['id']);
        }
        usort($out, function ($a, $b) use ($scope) {
            return $scope === 'history'
                ? strcmp($b['match_date'], $a['match_date'])
                : strcmp($a['match_date'], $b['match_date']);
        });
        return $out;
    }

    public static function detail($params)
    {
        Auth::require();
        [$mine, $m] = self::load($params['id']);
        return P::matchView($m, $mine['id']);
    }

    /** Menyetujui usulan jadwal lawan (UC-05). */
    public static function confirmSchedule($params)
    {
        Auth::require();
        [$mine, $m, $oppId] = self::load($params['id']);
        if ($m['status'] !== 'proposed') Http::fail(409, 'Jadwal ini sudah dikonfirmasi.');
        if ((int) $m['proposal_by_team_id'] === (int) $mine['id']) {
            Http::fail(409, 'Menunggu persetujuan tim lawan atas usulan Anda.');
        }
        Database::run(
            "UPDATE matches SET match_date=?, match_time=?, duration=?, location=?, status='scheduled',
             proposal_by_team_id=NULL, proposal_date=NULL, proposal_time=NULL,
             proposal_duration=NULL, proposal_location=NULL, proposal_note=NULL, proposal_created_at=NULL
             WHERE id=?",
            [$m['proposal_date'], $m['proposal_time'], $m['proposal_duration'], $m['proposal_location'], $m['id']]
        );
        $m = Database::one('SELECT * FROM matches WHERE id = ?', [$m['id']]);
        Notifier::toTeam($oppId, "{$mine['team_name']} mengonfirmasi jadwal {$m['match_date']} {$m['match_time']}.", '/tim/pertandingan');
        return ['message' => 'Jadwal terkonfirmasi. Pengingat akan dikirim ke kedua tim.'];
    }

    /** Mengajukan jadwal alternatif (UC-05). */
    public static function propose($params)
    {
        Auth::require();
        [$mine, $m, $oppId] = self::load($params['id']);
        $b = Http::body();
        if (!in_array($m['status'], ['proposed', 'scheduled'], true)) {
            Http::fail(409, 'Jadwal tidak bisa diubah pada status ini.');
        }
        if (empty($b['date']) || empty($b['time'])) Http::fail(422, 'Tanggal dan waktu wajib diisi.');
        if (trim($b['location'] ?? '') === '' || mb_strlen(trim($b['location'])) < 4) {
            Http::fail(422, 'Lokasi belum jelas. Lengkapi nama lapangan.', ['location' => 'Lengkapi lokasi pertandingan.']);
        }
        Database::run(
            "UPDATE matches SET status='proposed', proposal_by_team_id=?, proposal_date=?, proposal_time=?,
             proposal_duration=?, proposal_location=?, proposal_note=?, proposal_created_at=NOW() WHERE id=?",
            [$mine['id'], $b['date'], $b['time'], (int) ($b['duration'] ?? $m['duration']), trim($b['location']), (string) ($b['note'] ?? ''), $m['id']]
        );
        Notifier::toTeam($oppId, "{$mine['team_name']} mengajukan jadwal alternatif.", '/tim/pertandingan');
        return ['message' => 'Usulan jadwal baru terkirim ke lawan.'];
    }

    public static function cancel($params)
    {
        Auth::require();
        [$mine, $m, $oppId] = self::load($params['id']);
        if (in_array($m['status'], ['final', 'cancelled'], true)) {
            Http::fail(409, 'Pertandingan tidak bisa dibatalkan.');
        }
        Database::run("UPDATE matches SET status='cancelled' WHERE id=?", [$m['id']]);
        Notifier::toTeam($oppId, "{$mine['team_name']} membatalkan pertandingan {$m['code']}.", '/tim/pertandingan?tab=riwayat');
        return ['message' => 'Pertandingan dibatalkan. Lawan telah diberi tahu.'];
    }

    /** Melapor skor dari sisi tim yang login (FR-07). */
    public static function submitResult($params)
    {
        Auth::require();
        [$mine, $m, $oppId] = self::load($params['id']);
        if (!in_array($m['status'], ['scheduled', 'result_pending'], true)) {
            Http::fail(409, 'Hasil hanya bisa diinput untuk pertandingan terjadwal.');
        }
        $b = Http::body();
        $mineScore = is_numeric($b['my_score'] ?? null) ? (int) $b['my_score'] : null;
        $oppScore = is_numeric($b['opponent_score'] ?? null) ? (int) $b['opponent_score'] : null;
        if ($mineScore === null || $oppScore === null || $mineScore < 0 || $oppScore < 0
            || (string) ($b['my_score'] ?? '') === '' || (string) ($b['opponent_score'] ?? '') === '') {
            Http::fail(422, 'Skor harus bilangan bulat dan tidak negatif.', ['score' => 'Skor tidak valid.']);
        }
        $iAmA = (int) $m['team_a_id'] === (int) $mine['id'];
        $scoreA = $iAmA ? $mineScore : $oppScore;
        $scoreB = $iAmA ? $oppScore : $mineScore;

        $res = P::getResult($m['id']);
        if (!$res) {
            Database::run("INSERT INTO match_results (match_id, status) VALUES (?,'pending')", [$m['id']]);
            $res = P::getResult($m['id']);
        }
        $prevA = $iAmA ? $res['report_a_score_a'] : $res['report_b_score_a'];
        $prevB = $iAmA ? $res['report_a_score_b'] : $res['report_b_score_b'];
        if ($iAmA) {
            Database::run(
                'UPDATE match_results SET report_a_score_a=?, report_a_score_b=?, report_a_note=?, report_a_at=NOW() WHERE match_id=?',
                [$scoreA, $scoreB, (string) ($b['note'] ?? ''), $m['id']]
            );
        } else {
            Database::run(
                'UPDATE match_results SET report_b_score_a=?, report_b_score_b=?, report_b_note=?, report_b_at=NOW() WHERE match_id=?',
                [$scoreA, $scoreB, (string) ($b['note'] ?? ''), $m['id']]
            );
        }
        // Skor berubah -> konfirmasi sebelumnya tidak berlaku lagi (FR-08).
        if ($prevA === null || (int) $prevA !== $scoreA || (int) $prevB !== $scoreB) {
            Database::run('UPDATE match_results SET confirmed_by_a=0, confirmed_by_b=0 WHERE match_id=?', [$m['id']]);
        }
        Database::run("UPDATE match_results SET status='pending' WHERE match_id=?", [$m['id']]);
        Database::run("UPDATE matches SET status='result_pending' WHERE id=?", [$m['id']]);
        Notifier::toTeam($oppId, "{$mine['team_name']} mengirim hasil {$scoreA}–{$scoreB} untuk {$m['code']}. Mohon konfirmasi.", '/tim/pertandingan');
        return ['message' => 'Laporan hasil terkirim. Menunggu konfirmasi kedua tim.'];
    }

    /** Konfirmasi skor; final hanya bila kedua tim setuju (FR-08). */
    public static function confirmResult($params)
    {
        Auth::require();
        [$mine, $m, $oppId] = self::load($params['id']);
        $res = P::getResult($m['id']);
        if (!$res || ($res['report_a_score_a'] === null && $res['report_b_score_a'] === null)) {
            Http::fail(409, 'Belum ada hasil yang dilaporkan. Input skor terlebih dahulu.');
        }
        if ($res['report_a_score_a'] !== null && $res['report_b_score_a'] !== null
            && ((int) $res['report_a_score_a'] !== (int) $res['report_b_score_a']
                || (int) $res['report_a_score_b'] !== (int) $res['report_b_score_b'])) {
            Http::fail(409, 'Skor kedua tim berbeda. Perbarui hasil atau laporkan selisih ke admin.');
        }
        $agreed = $res['report_a_score_a'] !== null ? [$res['report_a_score_a'], $res['report_a_score_b']] : [$res['report_b_score_a'], $res['report_b_score_b']];
        $iAmA = (int) $m['team_a_id'] === (int) $mine['id'];
        Database::run(
            'UPDATE match_results SET score_a=?, score_b=?, confirmed_by_a=?, confirmed_by_b=? WHERE match_id=?',
            [(int) $agreed[0], (int) $agreed[1], $res['confirmed_by_a'] || $iAmA ? 1 : 0, $res['confirmed_by_b'] || !$iAmA ? 1 : 0, $m['id']]
        );
        $res = P::getResult($m['id']);
        if ($res['confirmed_by_a'] && $res['confirmed_by_b']) {
            Database::run("UPDATE match_results SET status='final' WHERE match_id=?", [$m['id']]);
            Database::run("UPDATE matches SET status='final' WHERE id=?", [$m['id']]);
            $a = Database::one('SELECT team_name FROM teams WHERE id=?', [$m['team_a_id']]);
            $b = Database::one('SELECT team_name FROM teams WHERE id=?', [$m['team_b_id']]);
            $label = "{$a['team_name']} {$res['score_a']}–{$res['score_b']} {$b['team_name']}";
            Notifier::toTeam($m['team_a_id'], "Hasil {$label} resmi tercatat.", '/tim/pertandingan?tab=riwayat');
            Notifier::toTeam($m['team_b_id'], "Hasil {$label} resmi tercatat.", '/tim/pertandingan?tab=riwayat');
        } else {
            Notifier::toTeam($oppId, "{$mine['team_name']} mengonfirmasi hasil {$m['code']}. Selesaikan konfirmasi tim Anda.", '/tim/pertandingan');
        }
        $res = P::getResult($m['id']);
        $final = $res['status'] === 'final';
        return [
            'final' => $final,
            'message' => $final ? 'Hasil resmi tercatat di riwayat.' : 'Konfirmasi tersimpan. Menunggu tim lawan.',
        ];
    }

    /** Melaporkan selisih skor ke admin (status sengketa, keputusan menyusul). */
    public static function disputeResult($params)
    {
        Auth::require();
        [$mine, $m, $oppId] = self::load($params['id']);
        $b = Http::body();
        if (trim($b['reason'] ?? '') === '') Http::fail(422, 'Jelaskan alasan keberatan.', ['reason' => 'Alasan wajib diisi.']);
        Database::run("UPDATE matches SET status='disputed' WHERE id=?", [$m['id']]);
        if (P::getResult($m['id'])) {
            Database::run("UPDATE match_results SET status='disputed' WHERE match_id=?", [$m['id']]);
        }
        Database::run('SELECT COUNT(*) c FROM disputes', []);
        $count = (int) Database::one('SELECT COUNT(*) c FROM disputes')['c'];
        $code = 'DP-' . str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);
        Database::run(
            "INSERT INTO disputes (code, match_id, description, status) VALUES (?,?,?,'open')",
            [$code, $m['id'], "{$mine['team_name']}: " . trim($b['reason'])]
        );
        Notifier::toTeam($oppId, "{$mine['team_name']} mengajukan keberatan atas hasil {$m['code']}. Kasus diteruskan ke admin.", '/tim/pertandingan');
        return ['message' => 'Keberatan dikirim. Admin akan meninjau sengketa ini.'];
    }
}
