<?php
// Data demo progres 30%: 6 tim futsal Bandung (sandi semua: bringit123),
// plus satu undangan masuk, satu usulan jadwal, dan satu laga siap input hasil.
// Jalankan: php database/seed.php  (dari folder bringit-backend)
error_reporting(E_ALL & ~E_DEPRECATED);
date_default_timezone_set('Asia/Jakarta');

require __DIR__ . '/../src/Core/Database.php';

$PASS = password_hash('bringit123', PASSWORD_DEFAULT);
$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));
$nextWeek = date('Y-m-d', strtotime('+7 days'));

$teams = [
    // email, kapten, tim, level, area, elo, venue, jadwal, tentang
    ['kapten@garudaunited.id', 'Rizky Ramadhan', 'Garuda United', 'Menengah', 'Coblong', 1264, 'GOR C-Tra Arena, Bandung', 'Sabtu & Minggu · 18.00–21.00 WIB', 'Tim futsal komunitas Bandung. Kompetitif, sportif, dan terbuka untuk sparring.'],
    ['kapten@northside.id', 'Dimas Saputra', 'Northside FC', 'Menengah', 'Cicendo', 1248, 'Cicendo Futsal Center', 'Sabtu, 18.00–21.00', 'Tim futsal Bandung sejak 2024. Siap sparring dengan tim menengah, fair play selalu.'],
    ['kapten@bandungcity.id', 'Fajar Nugraha', 'Bandung City', 'Menengah', 'Sukajadi', 1240, 'Sukajadi Futsal · Lap. 1', 'Jumat, 19.00–21.00', 'Main tiap pekan di Sukajadi. Cari lawan yang suka tempo cepat.'],
    ['kapten@citrafc.id', 'Hendra Wijaya', 'Citra FC', 'Menengah', 'Antapani', 1215, 'Antapani Futsal Center', 'Minggu, 16.00–18.00', 'Komunitas karyawan Antapani. Santai tapi serius soal skor.'],
    ['kapten@dagoathletic.id', 'Gilang Ramdani', 'Dago Athletic', 'Menengah', 'Dago', 1302, 'Dago Futsal Center', 'Sabtu, 16.00–18.00', 'Tim kampus Dago, rutin sparring untuk persiapan liga antar-kampus.'],
    ['kapten@titans.id', 'Reza Mahendra', 'Bandung Titans', 'Mahir', 'Arcamanik', 1486, 'Arcamanik Futsal Center', 'Minggu, 19.00–21.00', 'Juara liga amatir Bandung 2025.'],
];

$ids = [];
foreach ($teams as $t) {
    [$email, $captain, $name, $level, $area, $elo, $venue, $schedule, $about] = $t;
    Database::run(
        'INSERT INTO users (name, email, password, phone, role, status) VALUES (?,?,?,?,?,?)',
        [$captain, $email, $PASS, '0812 0000 0000', 'team', 'verified']
    );
    $uid = Database::lastId();
    Database::run(
        'INSERT INTO teams (user_id, team_name, city, area, level, players, venue, schedule, about, primary_sport_id, joined)
         VALUES (?,?,?, ?, ?,12, ?,?,?,1, ?)',
        [$uid, $name, 'Bandung', $area, $level, $venue, $schedule, $about, $today]
    );
    $tid = Database::lastId();
    Database::run('INSERT INTO team_sports (team_id, sport_category_id) VALUES (?,1)', [$tid]);
    Database::run('INSERT INTO elo_ratings (team_id, sport_category_id, rating, updated_at) VALUES (?,?,?,?)', [$tid, 1, $elo, $today]);
    $ids[$name] = $tid;
}

$G = $ids['Garuda United'];
$N = $ids['Northside FC'];
$B = $ids['Bandung City'];
$C = $ids['Citra FC'];

// Pemain Garuda United
foreach ([['Rizky Ramadhan', 'Anchor', 4], ['Fikri Hidayat', 'Kiper', 1], ['Aldi Kurniawan', 'Flank', 7], ['Bagas Permana', 'Pivot', 9], ['Yusuf Maulana', 'Flank', 11]] as $p) {
    Database::run('INSERT INTO team_players (team_id, name, position, number) VALUES (?,?,?,?)', [$G, $p[0], $p[1], $p[2]]);
}

// 1) Undangan masuk dari Bandung City -> Garuda (demo UC-04 terima/tolak)
Database::run(
    "INSERT INTO opponent_requests (from_team_id, to_team_id, sport_category_id, status, proposed_date, proposed_time, duration, location, note)
     VALUES (?,?,1,'pending',?, '19.00', 60, 'Sukajadi Futsal · Lap. 1', 'Kami siap main tempo cepat. Bisa?')",
    [$B, $G, $nextWeek]
);
Database::run(
    'INSERT INTO notifications (user_id, message, link) SELECT user_id, ?, ? FROM teams WHERE id = ?',
    ["Undangan sparring baru dari Bandung City.", '/tim/cari-lawan?tab=masuk', $G]
);

// 2) Pertandingan vs Northside FC dengan usulan jadwal dari lawan (demo UC-05 konfirmasi)
Database::run(
    "INSERT INTO matches (code, team_a_id, team_b_id, sport_category_id, level, match_date, match_time, duration, location, status,
      proposal_by_team_id, proposal_date, proposal_time, proposal_duration, proposal_location, proposal_note, proposal_created_at)
     VALUES ('SP-TMP1',?,?,1,'Menengah',?, '19.00', 60, 'GOR C-Tra Arena · Lapangan 2', 'proposed', ?, ?, '19.00', 60, 'GOR C-Tra Arena · Lapangan 2', '', NOW())",
    [$G, $N, $nextWeek, $N, $nextWeek]
);
$mid = Database::lastId();
Database::run('UPDATE matches SET code = ? WHERE id = ?', ['SP-' . (1000 + $mid), $mid]);
Database::run(
    'INSERT INTO notifications (user_id, message, link) SELECT user_id, ?, ? FROM teams WHERE id = ?',
    ["Northside FC mengirim usulan jadwal.", '/tim/pertandingan', $G]
);

// 3) Pertandingan kemarin vs Citra FC, terjadwal, siap input hasil (demo UC-06)
Database::run(
    "INSERT INTO matches (code, team_a_id, team_b_id, sport_category_id, level, match_date, match_time, duration, location, status)
     VALUES ('SP-TMP2',?,?,1,'Menengah',?, '19.00', 60, 'GOR C-Tra Arena', 'scheduled')",
    [$G, $C, $yesterday]
);
$mid2 = Database::lastId();
Database::run('UPDATE matches SET code = ? WHERE id = ?', ['SP-' . (1000 + $mid2), $mid2]);

echo "Seed selesai: 6 tim + 1 undangan masuk + 1 usulan jadwal + 1 laga siap input hasil.\n";
echo "Akun demo (sandi: bringit123): kapten@garudaunited.id (utama), kapten@northside.id, kapten@bandungcity.id, kapten@citrafc.id, kapten@dagoathletic.id, kapten@titans.id\n";
