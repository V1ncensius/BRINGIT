/**
 * Database tiruan (mock) untuk menjalankan frontend tanpa backend.
 * Struktur tabel mengikuti ERD pada SDD 4.3 (users, teams, sport_categories,
 * team_sports, opponent_requests, matches, match_results, elo_ratings,
 * referees/photographers -> providers, *_bookings -> bookings, payments,
 * subscriptions, subscription_plans, reviews, disputes, notifications).
 * Data disimpan di localStorage agar perubahan bertahan saat halaman dimuat ulang.
 */
const STORAGE_KEY = 'bringit.mockdb.v1';

const S = { FUTSAL: 1, BASKET: 2, TENIS: 3, PADEL: 4, BULU: 5, MINI: 6 };

function seed() {
  const users = [
    { id: 1, name: 'Rizky Ramadhan', email: 'kapten@garudaunited.id', password: 'bringit123', phone: '0812 3456 7890', role: 'team', status: 'verified', created_at: '2026-08-03' },
    { id: 2, name: 'Andi Pratama', email: 'andi@bringit.id', password: 'bringit123', phone: '0813 2222 1111', role: 'referee', status: 'verified', created_at: '2026-06-10' },
    { id: 3, name: 'Bima Aditya', email: 'bima@bringit.id', password: 'bringit123', phone: '0813 3333 4444', role: 'photographer', status: 'verified', created_at: '2026-06-21' },
    { id: 4, name: 'Nadia', email: 'admin@bringit.id', password: 'bringit123', phone: '0811 0000 0001', role: 'admin', status: 'verified', created_at: '2026-01-01' },
    { id: 5, name: 'Sari Putri', email: 'sari@bringit.id', password: 'bringit123', phone: '0815 1234 0000', role: 'photographer', status: 'verified', created_at: '2026-07-02' },
    { id: 6, name: 'Raka Saputra', email: 'raka@bringit.id', password: 'bringit123', phone: '0817 1111 2222', role: 'referee', status: 'pending', created_at: '2026-10-12', document: 'Lisensi futsal', note: 'Lisensi valid' },
    { id: 7, name: 'Naufal Akbar', email: 'naufal@bringit.id', password: 'bringit123', phone: '0817 3333 4444', role: 'photographer', status: 'pending', created_at: '2026-10-11', document: 'Portofolio', note: 'Portofolio 24 foto' },
    { id: 8, name: 'Yoga Firmansyah', email: 'kapten@cimahirangers.id', password: 'bringit123', phone: '0818 5555 6666', role: 'team', status: 'pending', created_at: '2026-10-12', document: 'Identitas kapten', note: 'Tim futsal' },
  ];

  // Tim lain (pemilik akun fiktif dimulai dari id 100)
  const otherTeams = [
    ['Northside FC', 'Dimas Saputra', 'Menengah', 'Cicendo', 1248, [10, 2, 4], 'Tim futsal Bandung sejak 2024. Siap sparring dengan tim menengah, fair play selalu.', 'Sabtu, 18.00–21.00'],
    ['Bandung City', 'Fajar Nugraha', 'Menengah', 'Sukajadi', 1240, [9, 2, 4], 'Main tiap pekan di Sukajadi. Cari lawan yang suka tempo cepat.', 'Jumat, 19.00–21.00'],
    ['Citra FC', 'Hendra Wijaya', 'Menengah', 'Antapani', 1215, [8, 1, 5], 'Komunitas karyawan Antapani. Santai tapi serius soal skor.', 'Minggu, 16.00–18.00'],
    ['Dago Athletic', 'Gilang Ramdani', 'Menengah', 'Dago', 1302, [14, 2, 4], 'Tim kampus Dago, rutin sparring untuk persiapan liga antar-kampus.', 'Sabtu, 16.00–18.00'],
    ['Bandung Titans', 'Reza Mahendra', 'Mahir', 'Arcamanik', 1486, [21, 2, 3], 'Juara liga amatir Bandung 2025.', 'Minggu, 19.00–21.00'],
    ['Cimahi United', 'Agus Setiawan', 'Mahir', 'Cimahi', 1442, [19, 1, 4], 'Basis di Cimahi, sering main ke Bandung.', 'Sabtu, 19.00–21.00'],
    ['Buah Batu Warriors', 'Iqbal Maulana', 'Menengah', 'Buah Batu', 1290, [12, 3, 5], 'Tim warga Buah Batu, terbuka untuk sparring malam.', 'Kamis, 20.00–22.00'],
    ['Antapani Raya', 'Doni Prasetyo', 'Menengah', 'Antapani', 1285, [11, 4, 4], 'Lapangan tetap di Antapani Futsal.', 'Rabu, 19.00–21.00'],
    ['Pasundan FC', 'Rudi Hartono', 'Menengah', 'Lengkong', 1280, [11, 2, 6], 'Tim alumni SMA Pasundan.', 'Sabtu, 20.00–22.00'],
    ['Ujungberung FC', 'Asep Sunandar', 'Mahir', 'Ujungberung', 1270, [12, 1, 6], 'Fisik kuat, main keras tapi bersih.', 'Minggu, 08.00–10.00'],
    ['Arcamanik FC', 'Tegar Pamungkas', 'Menengah', 'Arcamanik', 1230, [8, 3, 5], 'Mencari lawan rutin tiap akhir pekan.', 'Minggu, 10.00–12.00'],
    ['Pasteur FC', 'Bayu Saputra', 'Pemula', 'Pasteur', 1198, [5, 2, 7], 'Tim baru, ingin banyak jam terbang.', 'Jumat, 20.00–22.00'],
  ];

  const teams = [
    {
      id: 1, user_id: 1, team_name: 'Garuda United', logo: null, city: 'Bandung', area: 'Coblong', level: 'Menengah',
      players: 12, venue: 'GOR C-Tra Arena, Bandung', schedule: 'Sabtu & Minggu · 18.00–21.00 WIB',
      about: 'Tim futsal komunitas Bandung. Kompetitif, sportif, dan terbuka untuk sparring.', sports: [S.FUTSAL, S.BASKET],
      primary_sport: S.FUTSAL, joined: '2026-08-03', verified: true,
      roster: [
        { name: 'Rizky Ramadhan', position: 'Anchor', number: 4 },
        { name: 'Fikri Hidayat', position: 'Kiper', number: 1 },
        { name: 'Aldi Kurniawan', position: 'Flank', number: 7 },
        { name: 'Bagas Permana', position: 'Pivot', number: 9 },
        { name: 'Yusuf Maulana', position: 'Flank', number: 11 },
      ],
    },
  ];
  const eloRatings = [
    { team_id: 1, sport_id: S.FUTSAL, rating: 1264, updated_at: '2026-10-10' },
    { team_id: 1, sport_id: S.BASKET, rating: 1080, updated_at: '2026-09-28' },
  ];
  const records = { '1-1': [12, 3, 3], '1-2': [3, 0, 3] };

  otherTeams.forEach(([name, captain, level, area, elo, rec, about, avail], i) => {
    const id = i + 2;
    const uid = 100 + i;
    const city = area === 'Cimahi' ? 'Cimahi' : 'Bandung';
    users.push({ id: uid, name: captain, email: `kapten${id}@bringit.test`, password: 'bringit123', phone: '-', role: 'team', status: 'verified', created_at: '2026-05-01' });
    teams.push({ id, user_id: uid, team_name: name, logo: null, city: city === 'Cimahi' ? 'Bandung' : city, area, level, players: 10 + (i % 5), venue: `${area} Futsal Center`, schedule: avail, about, sports: [S.FUTSAL], primary_sport: S.FUTSAL, joined: '2025-11-01', verified: true, availability: avail });
    eloRatings.push({ team_id: id, sport_id: S.FUTSAL, rating: elo, updated_at: '2026-10-10' });
    records[`${id}-1`] = rec;
  });
  // Beberapa tim basket agar filter cabang lain tidak kosong
  [['Bandung Hoops', 'Mahir', 1310], ['Dago Ballers', 'Menengah', 1105], ['Cihampelas Five', 'Menengah', 1060]].forEach(([name, level, elo], i) => {
    const id = 20 + i;
    users.push({ id: 200 + i, name: `Kapten ${name}`, email: `kapten${id}@bringit.test`, password: 'bringit123', phone: '-', role: 'team', status: 'verified', created_at: '2026-05-01' });
    teams.push({ id, user_id: 200 + i, team_name: name, logo: null, city: 'Bandung', area: 'Bandung', level, players: 8, venue: 'GOR Pajajaran', schedule: 'Sabtu, 15.00–17.00', about: 'Tim basket komunitas Bandung.', sports: [S.BASKET], primary_sport: S.BASKET, joined: '2026-02-01', verified: true, availability: 'Sabtu, 15.00–17.00' });
    eloRatings.push({ team_id: id, sport_id: S.BASKET, rating: elo, updated_at: '2026-10-01' });
    records[`${id}-2`] = [6 + i, 0, 4];
  });
  // Tim yang menunggu verifikasi admin
  teams.push({ id: 30, user_id: 8, team_name: 'Cimahi Rangers', logo: null, city: 'Cimahi', area: 'Cimahi', level: 'Pemula', players: 11, venue: '-', schedule: '-', about: '', sports: [S.FUTSAL], primary_sport: S.FUTSAL, joined: '2026-10-12', verified: false });

  const eloHistory = [
    ['2026-08-01', 1090], ['2026-08-10', 1112], ['2026-08-17', 1128], ['2026-08-24', 1118], ['2026-08-31', 1150],
    ['2026-09-07', 1186], ['2026-09-14', 1214], ['2026-09-21', 1200], ['2026-09-28', 1238], ['2026-10-04', 1240],
    ['2026-10-10', 1264],
  ].map(([date, rating]) => ({ team_id: 1, sport_id: S.FUTSAL, date, rating }));
  eloHistory.push(
    ...[['2026-08-20', 1000], ['2026-09-06', 1032], ['2026-09-20', 1056], ['2026-09-28', 1080]].map(([date, rating]) => ({ team_id: 1, sport_id: S.BASKET, date, rating })),
  );

  const opponentRequests = [
    { id: 501, from_team_id: 3, to_team_id: 1, sport_id: S.FUTSAL, status: 'pending', date: '2026-10-24', time: '19.00', duration: 60, location: 'Sukajadi Futsal · Lap. 1', note: 'Kami siap main tempo cepat. Bisa?', created_at: '2026-10-12' },
    { id: 502, from_team_id: 10, to_team_id: 1, sport_id: S.FUTSAL, status: 'pending', date: '2026-10-25', time: '20.00', duration: 90, location: 'Lengkong Futsal Center', note: '', created_at: '2026-10-11' },
    { id: 503, from_team_id: 1, to_team_id: 5, sport_id: S.FUTSAL, status: 'pending', date: '2026-10-31', time: '18.00', duration: 60, location: 'GOR C-Tra Arena · Lap. 2', note: 'Rematch dari 4 Okt?', created_at: '2026-10-12' },
    { id: 490, from_team_id: 2, to_team_id: 1, sport_id: S.FUTSAL, status: 'accepted', date: '2026-10-17', time: '19.00', duration: 60, location: 'GOR C-Tra Arena · Lapangan 2', note: '', created_at: '2026-10-10' },
  ];

  const matches = [
    {
      id: 1042, code: 'SP-1042', request_id: 490, team_a_id: 1, team_b_id: 2, sport_id: S.FUTSAL, level: 'Menengah',
      match_date: '2026-10-17', time: '19.00', duration: 60, location: 'GOR C-Tra Arena · Lapangan 2', status: 'proposed',
      proposal: { by_team_id: 2, date: '2026-10-17', time: '19.00', duration: 60, location: 'GOR C-Tra Arena · Lapangan 2', note: '', created_at: '2026-10-12', deadline: '14 Okt, 19.00 WIB' },
      confirmed_a: false, confirmed_b: true,
    },
    {
      id: 1038, code: 'SP-1038', team_a_id: 1, team_b_id: 4, sport_id: S.FUTSAL, level: 'Menengah',
      match_date: '2026-10-11', time: '19.00', duration: 60, location: 'GOR C-Tra Arena', status: 'result_pending',
      confirmed_a: true, confirmed_b: true,
    },
    { id: 1031, code: 'SP-1031', team_a_id: 1, team_b_id: 3, sport_id: S.FUTSAL, level: 'Menengah', match_date: '2026-10-10', time: '19.00', duration: 60, location: 'Sukajadi Futsal', status: 'final', confirmed_a: true, confirmed_b: true },
    { id: 1024, code: 'SP-1024', team_a_id: 1, team_b_id: 5, sport_id: S.FUTSAL, level: 'Menengah', match_date: '2026-10-04', time: '18.00', duration: 60, location: 'Dago Futsal', status: 'final', confirmed_a: true, confirmed_b: true },
    { id: 1017, code: 'SP-1017', team_a_id: 1, team_b_id: 12, sport_id: S.FUTSAL, level: 'Menengah', match_date: '2026-09-28', time: '19.00', duration: 60, location: 'GOR C-Tra Arena', status: 'final', confirmed_a: true, confirmed_b: true },
    // Sengketa antar tim lain (ditangani admin)
    { id: 1036, code: 'SP-1036', team_a_id: 10, team_b_id: 11, sport_id: S.FUTSAL, level: 'Menengah', match_date: '2026-10-09', time: '20.00', duration: 60, location: 'Lengkong Futsal Center', status: 'disputed', confirmed_a: true, confirmed_b: true },
  ];

  const matchResults = [
    {
      match_id: 1038, status: 'pending', confirmed_by_a: false, confirmed_by_b: true,
      report_a: { score_a: 3, score_b: 2, note: 'Laga selesai sesuai jadwal. Kedua tim bermain sportif.', at: '11 Okt, 20.10' },
      report_b: { score_a: 3, score_b: 2, note: '', at: '11 Okt, 20.45' },
    },
    { match_id: 1031, score_a: 4, score_b: 2, note: '', status: 'final', confirmed_by_a: true, confirmed_by_b: true, elo_delta_a: 24 },
    { match_id: 1024, score_a: 2, score_b: 2, note: '', status: 'final', confirmed_by_a: true, confirmed_by_b: true, elo_delta_a: 4 },
    { match_id: 1017, score_a: 1, score_b: 2, note: '', status: 'final', confirmed_by_a: true, confirmed_by_b: true, elo_delta_a: -12 },
    { match_id: 1036, status: 'disputed', confirmed_by_a: false, confirmed_by_b: false, report_a: { score_a: 2, score_b: 1, note: '', at: '9 Okt, 21.30' }, report_b: { score_a: 1, score_b: 1, note: '', at: '9 Okt, 21.42' } },
  ];

  const disputes = [
    { id: 7, code: 'DP-007', match_id: 1036, description: 'Gol kedua Pasundan FC dianggap offside oleh Ujungberung FC. Pasundan melaporkan 2–1, Ujungberung 1–1.', status: 'open', resolved_by_admin_id: null, created_at: '2026-10-10' },
  ];

  const providers = [
    { id: 1, user_id: 2, type: 'referee', city: 'Bandung', rate: 350000, unit: 'laga', specialization: ['Futsal', 'Mini Soccer'], license: 'Lisensi futsal level 2', experience_years: 5, duration: '60 menit / pertandingan', bio: 'Lisensi futsal level 2 · Spesialisasi: futsal & sepak bola. Tarif untuk 1 laga, durasi 60 menit.', verification_status: 'verified', base_rating: 4.9, base_reviews: 26, payout_account: 'BCA •••• 4821' },
    { id: 2, user_id: 3, type: 'photographer', city: 'Bandung', rate: 450000, unit: 'sesi', specialization: ['Futsal', 'Basket'], package: '60 menit · 50 foto edit', delivery: '3 hari setelah pertandingan', portfolio: 'instagram.com/bima.shoots', bio: 'Foto aksi olahraga · 60 menit · 50 foto edit · Kirim dalam 3 hari', verification_status: 'verified', base_rating: 4.8, base_reviews: 20, payout_account: 'Mandiri •••• 1190' },
    { id: 3, user_id: 5, type: 'photographer', city: 'Bandung', rate: 400000, unit: 'sesi', specialization: ['Futsal', 'Basket'], package: '60 menit · 40 foto edit', delivery: '2 hari setelah pertandingan', portfolio: 'saripho.to', bio: 'Futsal & basket · 60 menit · 40 foto edit · Kirim dalam 2 hari', verification_status: 'verified', base_rating: 4.8, base_reviews: 15, payout_account: 'BRI •••• 7781' },
    { id: 4, user_id: 6, type: 'referee', city: 'Bandung', rate: 300000, unit: 'laga', specialization: ['Futsal'], license: 'Lisensi futsal level 1', experience_years: 2, duration: '60 menit / pertandingan', bio: 'Wasit futsal muda.', verification_status: 'pending', base_rating: 0, base_reviews: 0 },
    { id: 5, user_id: 7, type: 'photographer', city: 'Bandung', rate: 350000, unit: 'sesi', specialization: ['Futsal'], package: '60 menit · 30 foto edit', delivery: '3 hari', portfolio: 'naufal.pics', bio: '', verification_status: 'pending', base_rating: 0, base_reviews: 0 },
  ];

  const slots = [
    { id: 1, provider_id: 1, date: '2026-10-17', time: '16.00', duration: 60 },
    { id: 2, provider_id: 1, date: '2026-10-17', time: '19.00', duration: 60 },
    { id: 3, provider_id: 1, date: '2026-10-18', time: '19.00', duration: 60, booking_code: 'JS-1091' },
    { id: 4, provider_id: 1, date: '2026-10-24', time: '18.00', duration: 60, booking_code: 'JS-1093' },
    { id: 5, provider_id: 2, date: '2026-10-17', time: '19.00', duration: 60 },
    { id: 6, provider_id: 2, date: '2026-10-18', time: '16.00', duration: 60 },
    { id: 7, provider_id: 3, date: '2026-10-17', time: '18.00', duration: 60 },
    { id: 8, provider_id: 3, date: '2026-10-17', time: '19.00', duration: 60 },
  ];

  const mk = (code, provider_id, team_id, label, date, time, location, status, price, extra = {}) => ({
    id: Number(code.slice(3)), code, provider_id, team_id, match_label: label, date, time, duration: 60, location, sport: 'Futsal', price, status, created_at: date, ...extra,
  });
  const bookings = [
    mk('JS-1091', 1, 3, 'Bandung City vs Cimahi United', '2026-10-18', '19.00', 'GOR C-Tra Arena · Lapangan 1', 'pending', 350000),
    mk('JS-1093', 1, 4, 'Citra FC vs Dago Athletic', '2026-10-24', '18.00', 'Antapani Futsal · Lapangan 2', 'pending', 350000),
    mk('JS-0873', 1, 1, 'Garuda United vs Bandung City', '2026-10-10', '19.00', 'Sukajadi Futsal', 'done', 350000, { match_id: 1031 }),
    mk('JS-0862', 1, 2, 'Northside FC vs Arcamanik FC', '2026-10-08', '19.00', 'Cicendo Futsal', 'paid_out', 350000),
    mk('JS-0851', 1, 5, 'Dago Athletic vs Garuda United', '2026-10-04', '18.00', 'Dago Futsal', 'paid_out', 350000),
    mk('JS-0848', 1, 6, 'Bandung Titans vs Cimahi United', '2026-10-03', '19.00', 'Arcamanik Sport Hall', 'paid_out', 350000),
    mk('JS-0842', 1, 8, 'Buah Batu Warriors vs Pasundan FC', '2026-10-02', '20.00', 'Buah Batu Futsal', 'paid_out', 350000),
    mk('JS-0839', 1, 9, 'Antapani Raya vs Citra FC', '2026-10-02', '18.00', 'Antapani Futsal', 'paid_out', 350000),
    mk('JS-0835', 1, 10, 'Pasundan FC vs Pasteur FC', '2026-10-01', '19.00', 'Lengkong Futsal Center', 'paid_out', 350000),
    mk('JS-0831', 1, 12, 'Arcamanik FC vs Ujungberung FC', '2026-10-01', '16.00', 'Arcamanik Sport Hall', 'paid_out', 350000),
    mk('JS-0812', 1, 2, 'Northside FC vs Citra FC', '2026-09-26', '19.00', 'Cicendo Futsal', 'paid_out', 350000),
    mk('JS-0880', 2, 5, 'Dago Athletic vs Bandung Titans', '2026-10-11', '16.00', 'Dago Futsal', 'done', 450000),
    mk('JS-0866', 2, 2, 'Northside FC vs Citra FC', '2026-10-06', '19.00', 'Cicendo Futsal', 'paid_out', 450000),
    mk('JS-0844', 2, 6, 'Cimahi United vs Pasundan FC', '2026-10-03', '19.00', 'Cimahi Sport Center', 'paid_out', 450000),
    mk('JS-0841', 2, 9, 'Antapani Raya vs Arcamanik FC', '2026-10-02', '20.00', 'Antapani Futsal', 'paid_out', 450000),
    mk('JS-1095', 2, 7, 'Buah Batu Warriors vs Ujungberung FC', '2026-10-25', '19.00', 'Buah Batu Futsal', 'pending', 450000),
  ];

  const reviews = [
    { id: 1, team_id: 2, provider_id: 1, booking_code: 'JS-0862', rating: 5, comment: 'Keputusan adil dan komunikatif. Akan pesan lagi untuk laga berikutnya.', author: 'Dimas · Northside FC', created_at: '2026-10-08' },
    { id: 2, team_id: 5, provider_id: 1, booking_code: 'JS-0851', rating: 5, comment: 'Tegas dan tepat waktu.', author: 'Gilang · Dago Athletic', created_at: '2026-10-05' },
    { id: 3, team_id: 2, provider_id: 2, booking_code: 'JS-0866', rating: 5, comment: 'Fotonya tajam, momen gol dapat semua.', author: 'Dimas · Northside FC', created_at: '2026-10-09' },
    { id: 4, team_id: 6, provider_id: 3, booking_code: 'JS-0700', rating: 4, comment: 'Hasil bagus, pengiriman cepat.', author: 'Agus · Cimahi United', created_at: '2026-09-20' },
  ];

  const plans = [
    { id: 1, name: 'Premium Bulanan', price: 49000, duration_days: 30, active: true, features: 'ELO semua cabang · Ranking · Statistik' },
    { id: 2, name: 'Premium Musiman', price: 129000, duration_days: 90, active: true, features: 'ELO semua cabang · Ranking · Statistik · Hemat 12%' },
  ];

  const subscriptions = [{ id: 1, team_id: 2, plan_id: 1, start_date: '2026-10-12', end_date: '2026-11-11', status: 'active' }];

  const payments = [
    { id: 1091, code: 'TX-1091', booking_type: 'referee', booking_code: 'JS-1091', user_label: 'Bandung City', amount: 367500, method: 'QRIS', status: 'held', created_at: '2026-10-12' },
    { id: 1093, code: 'TX-1093', booking_type: 'referee', booking_code: 'JS-1093', user_label: 'Citra FC', amount: 367500, method: 'QRIS', status: 'held', created_at: '2026-10-12' },
    { id: 1095, code: 'TX-1095', booking_type: 'photographer', booking_code: 'JS-1095', user_label: 'Buah Batu Warriors', amount: 472500, method: 'GoPay', status: 'held', created_at: '2026-10-12' },
    { id: 1088, code: 'TX-1088', booking_type: 'subscription', booking_code: 'Premium Bulanan', user_label: 'Northside FC', amount: 49000, method: 'QRIS', status: 'success', created_at: '2026-10-12' },
    { id: 873, code: 'TX-0873', booking_type: 'referee', booking_code: 'JS-0873', user_label: 'Garuda United', amount: 367500, method: 'QRIS', status: 'done', created_at: '2026-10-09' },
    { id: 862, code: 'TX-0862', booking_type: 'referee', booking_code: 'JS-0862', user_label: 'Northside FC', amount: 367500, method: 'Virtual Account BCA', status: 'paid_out', created_at: '2026-10-07' },
    { id: 851, code: 'TX-0851', booking_type: 'referee', booking_code: 'JS-0851', user_label: 'Dago Athletic', amount: 367500, method: 'QRIS', status: 'paid_out', created_at: '2026-10-03' },
    { id: 880, code: 'TX-0880', booking_type: 'photographer', booking_code: 'JS-0880', user_label: 'Dago Athletic', amount: 472500, method: 'OVO', status: 'done', created_at: '2026-10-10' },
    { id: 866, code: 'TX-0866', booking_type: 'photographer', booking_code: 'JS-0866', user_label: 'Northside FC', amount: 472500, method: 'QRIS', status: 'paid_out', created_at: '2026-10-05' },
    { id: 1079, code: 'TX-1079', booking_type: 'subscription', booking_code: 'Premium Musiman', user_label: 'Bandung Titans', amount: 129000, method: 'Virtual Account Mandiri', status: 'success', created_at: '2026-10-04' },
    { id: 1072, code: 'TX-1072', booking_type: 'subscription', booking_code: 'Premium Bulanan', user_label: 'Dago Athletic', amount: 49000, method: 'QRIS', status: 'success', created_at: '2026-10-02' },
    { id: 1066, code: 'TX-1066', booking_type: 'subscription', booking_code: 'Premium Bulanan', user_label: 'Pasteur FC', amount: 49000, method: 'GoPay', status: 'failed', created_at: '2026-10-01' },
  ];

  const reports = [
    { id: 21, code: 'MD-021', title: 'Ulasan pertandingan dilaporkan', reason: 'Bahasa tidak pantas', excerpt: 'Tim lawan tidak sportif dan sengaja memancing emosi di lapangan…', reporter: 'Citra FC', created_at: '12 Okt, 09.14 WIB', priority: 'high', status: 'open' },
    { id: 19, code: 'MD-019', title: 'Logo tim diduga milik tim lain', reason: 'Pelanggaran identitas', excerpt: 'Pasteur FC memakai logo yang sama dengan klub kami.', reporter: 'Arcamanik FC', created_at: '11 Okt, 15.40 WIB', priority: 'normal', status: 'open' },
  ];

  const notifications = [
    { id: 1, user_id: 1, message: 'Northside FC mengirim usulan jadwal untuk 17 Okt.', link: '/tim/pertandingan', is_read: false, created_at: '2026-10-12T10:20:00' },
    { id: 2, user_id: 1, message: 'Citra FC mengonfirmasi hasil 3–2. Selesaikan konfirmasi tim Anda.', link: '/tim/pertandingan', is_read: false, created_at: '2026-10-11T21:02:00' },
    { id: 3, user_id: 1, message: 'Undangan sparring baru dari Bandung City.', link: '/tim/cari-lawan?tab=masuk', is_read: false, created_at: '2026-10-12T08:00:00' },
    { id: 4, user_id: 1, message: 'Menang 4–2 vs Bandung City terkonfirmasi. ELO +24.', link: '/tim/premium', is_read: true, created_at: '2026-10-10T22:00:00' },
    { id: 5, user_id: 2, message: 'Pesanan baru JS-1091 dari Bandung City.', link: '/penyedia/pesanan', is_read: false, created_at: '2026-10-12T11:00:00' },
    { id: 6, user_id: 2, message: 'Pesanan baru JS-1093 dari Citra FC.', link: '/penyedia/pesanan', is_read: false, created_at: '2026-10-12T12:30:00' },
    { id: 7, user_id: 3, message: 'Pesanan baru JS-1095 dari Buah Batu Warriors.', link: '/penyedia/pesanan', is_read: false, created_at: '2026-10-12T09:00:00' },
    { id: 8, user_id: 4, message: '3 akun menunggu verifikasi.', link: '/admin/verifikasi', is_read: false, created_at: '2026-10-12T09:30:00' },
    { id: 9, user_id: 4, message: 'Laporan konten prioritas tinggi MD-021.', link: '/admin/moderasi', is_read: false, created_at: '2026-10-12T09:14:00' },
  ];

  const sports = [
    { id: S.FUTSAL, name: 'Futsal', active: true },
    { id: S.BASKET, name: 'Basket', active: true },
    { id: S.TENIS, name: 'Tenis', active: true },
    { id: S.PADEL, name: 'Padel', active: true },
    { id: S.BULU, name: 'Bulu Tangkis', active: true },
    { id: S.MINI, name: 'Mini Soccer', active: true },
  ];

  return {
    users, teams, sports, eloRatings, eloHistory, records, opponentRequests, matches, matchResults, disputes,
    providers, slots, bookings, reviews, plans, subscriptions, payments, reports, notifications,
    settings: { provider_commission: 10, team_fee: 5 },
    seq: 2000,
  };
}

let cache = null;

export function db() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* storage penuh / tidak tersedia: data tetap di memori */
  }
}

export function resetDb() {
  cache = seed();
  save();
}

export const nextId = () => {
  const d = db();
  d.seq += 1;
  return d.seq;
};
