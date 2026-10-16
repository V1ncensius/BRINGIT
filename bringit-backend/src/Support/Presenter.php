<?php
// Pembentuk tampilan JSON agar sama dengan kontrak mock frontend.
class P
{
    public static function sportName($id)
    {
        $row = Database::one('SELECT name FROM sport_categories WHERE id = ?', [(int) $id]);
        return $row ? $row['name'] : '-';
    }

    public static function sportId($nameOrId)
    {
        if ($nameOrId === null || $nameOrId === '') return null;
        if (is_numeric($nameOrId)) {
            $row = Database::one('SELECT id FROM sport_categories WHERE id = ?', [(int) $nameOrId]);
            return $row ? (int) $row['id'] : null;
        }
        $row = Database::one('SELECT id FROM sport_categories WHERE LOWER(name) = LOWER(?)', [trim((string) $nameOrId)]);
        return $row ? (int) $row['id'] : null;
    }

    public static function teamSports($teamId)
    {
        return array_map('intval', array_column(
            Database::all('SELECT sport_category_id FROM team_sports WHERE team_id = ?', [$teamId]),
            'sport_category_id'
        ));
    }

    public static function elo($teamId, $sportId)
    {
        $row = Database::one(
            'SELECT rating FROM elo_ratings WHERE team_id = ? AND sport_category_id = ?',
            [$teamId, $sportId]
        );
        if ($row) return (int) $row['rating'];
        Database::run(
            'INSERT INTO elo_ratings (team_id, sport_category_id, rating, updated_at) VALUES (?,?,1000,CURDATE())',
            [$teamId, $sportId]
        );
        return 1000;
    }

    /** Menang/seri/kalah dihitung dari pertandingan final (FR-09). */
    public static function record($teamId, $sportId)
    {
        $rows = Database::all(
            "SELECT m.team_a_id, r.score_a, r.score_b FROM matches m
             JOIN match_results r ON r.match_id = m.id
             WHERE m.status = 'final' AND r.status = 'final'
               AND m.sport_category_id = ? AND (m.team_a_id = ? OR m.team_b_id = ?)",
            [$sportId, $teamId, $teamId]
        );
        $w = $d = $l = 0;
        foreach ($rows as $row) {
            $mine = ((int) $row['team_a_id'] === (int) $teamId) ? (int) $row['score_a'] : (int) $row['score_b'];
            $theirs = ((int) $row['team_a_id'] === (int) $teamId) ? (int) $row['score_b'] : (int) $row['score_a'];
            if ($mine > $theirs) $w++;
            elseif ($mine === $theirs) $d++;
            else $l++;
        }
        return [$w, $d, $l];
    }

    public static function initials($name)
    {
        $parts = preg_split('/\s+/', trim((string) $name), -1, PREG_SPLIT_NO_EMPTY);
        $parts = array_slice($parts, 0, 2);
        $out = '';
        foreach ($parts as $w) $out .= mb_strtoupper(mb_substr($w, 0, 1));
        return $out;
    }

    public static function publicUser($u)
    {
        if (!$u) return null;
        $team = Database::one('SELECT id, team_name, city FROM teams WHERE user_id = ?', [$u['id']]);
        unset($u['password']);
        $u['id'] = (int) $u['id'];
        $u['team_id'] = $team ? (int) $team['id'] : null;
        $u['team_name'] = $team ? $team['team_name'] : null;
        $u['city'] = $team ? $team['city'] : null;
        $u['provider_id'] = null;
        $u['is_premium'] = false; // Premium dikerjakan di progres berikutnya
        return $u;
    }

    public static function teamCard($t, $sid = null)
    {
        $sid = $sid ? (int) $sid : (int) $t['primary_sport_id'];
        [$w, $d, $l] = self::record($t['id'], $sid);
        $captain = Database::one('SELECT name FROM users WHERE id = ?', [$t['user_id']]);
        $sports = array_map([self::class, 'sportName'], self::teamSports($t['id']));
        return [
            'id' => (int) $t['id'],
            'team_name' => $t['team_name'],
            'initials' => self::initials($t['team_name']),
            'logo' => $t['logo'],
            'city' => $t['city'],
            'area' => $t['area'],
            'level' => $t['level'],
            'sport' => self::sportName($sid),
            'sport_id' => $sid,
            'sports' => $sports,
            'elo' => self::elo($t['id'], $sid),
            'wins' => $w,
            'draws' => $d,
            'losses' => $l,
            'played' => $w + $d + $l,
            'verified' => (bool) $t['verified'],
            'captain' => $captain ? $captain['name'] : null,
            'about' => $t['about'],
            'availability' => $t['schedule'],
            'venue' => $t['venue'],
        ];
    }

    public static function getResult($matchId)
    {
        return Database::one('SELECT * FROM match_results WHERE match_id = ?', [$matchId]);
    }

    public static function matchView($m, $myTeamId)
    {
        $myTeamId = (int) $myTeamId;
        $res = self::getResult($m['id']);
        $a = Database::one('SELECT * FROM teams WHERE id = ?', [$m['team_a_id']]);
        $b = Database::one('SELECT * FROM teams WHERE id = ?', [$m['team_b_id']]);
        $iAmA = (int) $m['team_a_id'] === $myTeamId;
        $opp = $iAmA ? $b : $a;
        $outcome = null;
        if ($res && $res['status'] === 'final' && $res['score_a'] !== null) {
            $mine = $iAmA ? (int) $res['score_a'] : (int) $res['score_b'];
            $theirs = $iAmA ? (int) $res['score_b'] : (int) $res['score_a'];
            $outcome = $mine > $theirs ? 'Menang' : ($mine === $theirs ? 'Seri' : 'Kalah');
        }
        $result = null;
        if ($res) {
            $ra = $res['report_a_score_a'] !== null ? [
                'score_a' => (int) $res['report_a_score_a'],
                'score_b' => (int) $res['report_a_score_b'],
                'note' => $res['report_a_note'],
                'at' => $res['report_a_at'],
            ] : null;
            $rb = $res['report_b_score_a'] !== null ? [
                'score_a' => (int) $res['report_b_score_a'],
                'score_b' => (int) $res['report_b_score_b'],
                'note' => $res['report_b_note'],
                'at' => $res['report_b_at'],
            ] : null;
            $result = [
                'status' => $res['status'],
                'score_a' => $res['score_a'] !== null ? (int) $res['score_a'] : ($ra ? $ra['score_a'] : ($rb ? $rb['score_a'] : null)),
                'score_b' => $res['score_b'] !== null ? (int) $res['score_b'] : ($ra ? $ra['score_b'] : ($rb ? $rb['score_b'] : null)),
                'my_report' => $iAmA ? $ra : $rb,
                'opponent_report' => $iAmA ? $rb : $ra,
                'reports_match' => (bool) ($ra && $rb && $ra['score_a'] === $rb['score_a'] && $ra['score_b'] === $rb['score_b']),
                'i_confirmed' => (bool) ($iAmA ? $res['confirmed_by_a'] : $res['confirmed_by_b']),
                'opponent_confirmed' => (bool) ($iAmA ? $res['confirmed_by_b'] : $res['confirmed_by_a']),
                'elo_delta' => null, // ELO dihitung di progres berikutnya
                'outcome' => $outcome,
            ];
        }
        $proposal = null;
        if ($m['proposal_by_team_id'] !== null) {
            $proposal = [
                'by_team_id' => (int) $m['proposal_by_team_id'],
                'date' => $m['proposal_date'],
                'time' => $m['proposal_time'],
                'duration' => (int) $m['proposal_duration'],
                'location' => $m['proposal_location'],
                'note' => $m['proposal_note'] ?? '',
                'created_at' => $m['proposal_created_at'],
                'deadline' => '2 hari',
            ];
        }
        return [
            'id' => (int) $m['id'],
            'code' => $m['code'],
            'request_id' => $m['request_id'] !== null ? (int) $m['request_id'] : null,
            'team_a_id' => (int) $m['team_a_id'],
            'team_b_id' => (int) $m['team_b_id'],
            'sport_id' => (int) $m['sport_category_id'],
            'level' => $m['level'],
            'match_date' => $m['match_date'],
            'time' => $m['match_time'],
            'duration' => (int) $m['duration'],
            'location' => $m['location'],
            'status' => $m['status'],
            'confirmed_a' => true,
            'confirmed_b' => true,
            'proposal' => $proposal,
            'sport' => self::sportName($m['sport_category_id']),
            'team_a' => $a ? ['id' => (int) $a['id'], 'name' => $a['team_name'], 'initials' => self::initials($a['team_name'])] : null,
            'team_b' => $b ? ['id' => (int) $b['id'], 'name' => $b['team_name'], 'initials' => self::initials($b['team_name'])] : null,
            'opponent' => $opp ? ['id' => (int) $opp['id'], 'name' => $opp['team_name'], 'initials' => self::initials($opp['team_name'])] : null,
            'i_am_a' => $iAmA,
            'proposal_from_opponent' => $proposal ? ((int) $m['proposal_by_team_id'] !== $myTeamId) : false,
            'result' => $result,
        ];
    }

    public static function today()
    {
        return date('Y-m-d');
    }

    public static function now()
    {
        return date('Y-m-d H:i:s');
    }
}
