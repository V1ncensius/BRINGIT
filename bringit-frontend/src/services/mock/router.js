/**
 * Mock REST API. Setiap handler meniru kontrak endpoint backend yang
 * didokumentasikan di README (bagian "Kontrak API"). Ganti VITE_USE_MOCK=false
 * untuk memakai backend PHP sesungguhnya.
 */
import { ApiError } from '../apiClient.js';
import { db, save, nextId } from './db.js';
import { calcElo } from '../../lib/elo.js';

const LATENCY = 220;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const localISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => localISO();
const nowISO = () => new Date().toISOString();
const fail = (status, message, errors) => {
  throw new ApiError(status, message, errors);
};

/* ------------------------------------------------------------------ helpers */
const D = () => db();
const sportName = (id) => D().sports.find((s) => s.id === Number(id))?.name ?? '-';
const sportId = (nameOrId) => {
  if (!nameOrId) return null;
  if (!Number.isNaN(Number(nameOrId))) return Number(nameOrId);
  return D().sports.find((s) => s.name.toLowerCase() === String(nameOrId).toLowerCase())?.id ?? null;
};
const userById = (id) => D().users.find((u) => u.id === id);
const teamById = (id) => D().teams.find((t) => t.id === id);
const teamOfUser = (uid) => D().teams.find((t) => t.user_id === uid);
const providerOfUser = (uid) => D().providers.find((p) => p.user_id === uid);
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const publicUser = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  const team = u.role === 'team' ? teamOfUser(u.id) : null;
  const provider = ['referee', 'photographer'].includes(u.role) ? providerOfUser(u.id) : null;
  return {
    ...rest,
    team_id: team?.id ?? null,
    team_name: team?.team_name ?? null,
    city: team?.city ?? provider?.city ?? null,
    provider_id: provider?.id ?? null,
    is_premium: team ? isPremium(team.id) : false,
  };
};

function auth(token, roles) {
  const id = Number(String(token || '').replace('mock.', ''));
  const user = userById(id);
  if (!user) fail(401, 'Sesi berakhir. Silakan masuk kembali.');
  if (roles && !roles.includes(user.role)) fail(403, 'Anda tidak memiliki akses ke fitur ini.');
  return user;
}
const myTeam = (user) => teamOfUser(user.id) || fail(404, 'Profil tim belum dibuat.');
const myProvider = (user) => providerOfUser(user.id) || fail(404, 'Profil penyedia belum dibuat.');

function activeSubscription(teamId) {
  const t = today();
  return D().subscriptions.find((s) => s.team_id === teamId && s.status === 'active' && s.end_date >= t) || null;
}
const isPremium = (teamId) => !!activeSubscription(teamId);

function getElo(teamId, sid) {
  let row = D().eloRatings.find((e) => e.team_id === teamId && e.sport_id === sid);
  if (!row) {
    row = { team_id: teamId, sport_id: sid, rating: 1000, updated_at: today() };
    D().eloRatings.push(row);
  }
  return row;
}
const record = (teamId, sid) => D().records[`${teamId}-${sid}`] || [0, 0, 0];
const addRecord = (teamId, sid, outcome) => {
  const r = [...record(teamId, sid)];
  r[outcome === 'w' ? 0 : outcome === 'd' ? 1 : 2] += 1;
  D().records[`${teamId}-${sid}`] = r;
};

function notify(userId, message, link) {
  D().notifications.unshift({ id: nextId(), user_id: userId, message, link, is_read: false, created_at: nowISO() });
}
const notifyTeam = (teamId, message, link) => {
  const t = teamById(teamId);
  if (t) notify(t.user_id, message, link);
};

function teamCard(t, sid) {
  const s = sid ?? t.primary_sport;
  const [w, d, l] = record(t.id, s);
  const captain = userById(t.user_id);
  return {
    id: t.id,
    team_name: t.team_name,
    initials: initials(t.team_name),
    logo: t.logo,
    city: t.city,
    area: t.area,
    level: t.level,
    sport: sportName(s),
    sport_id: s,
    sports: t.sports.map(sportName),
    elo: getElo(t.id, s).rating,
    wins: w,
    draws: d,
    losses: l,
    played: w + d + l,
    verified: t.verified,
    captain: captain?.name,
    about: t.about,
    availability: t.availability || t.schedule,
    venue: t.venue,
  };
}

function matchView(m, myTeamId) {
  const res = D().matchResults.find((r) => r.match_id === m.id) || null;
  const a = teamById(m.team_a_id);
  const b = teamById(m.team_b_id);
  const iAmA = m.team_a_id === myTeamId;
  const opp = iAmA ? b : a;
  let outcome = null;
  if (res && res.status === 'final') {
    const mine = iAmA ? res.score_a : res.score_b;
    const theirs = iAmA ? res.score_b : res.score_a;
    outcome = mine > theirs ? 'Menang' : mine === theirs ? 'Seri' : 'Kalah';
  }
  return {
    ...m,
    sport: sportName(m.sport_id),
    team_a: { id: a.id, name: a.team_name, initials: initials(a.team_name) },
    team_b: { id: b.id, name: b.team_name, initials: initials(b.team_name) },
    opponent: opp ? { id: opp.id, name: opp.team_name, initials: initials(opp.team_name) } : null,
    i_am_a: iAmA,
    proposal_from_opponent: m.proposal ? m.proposal.by_team_id !== myTeamId : false,
    result: res
      ? {
          status: res.status,
          score_a: res.score_a ?? (res.report_a || res.report_b)?.score_a,
          score_b: res.score_b ?? (res.report_a || res.report_b)?.score_b,
          my_report: iAmA ? res.report_a : res.report_b,
          opponent_report: iAmA ? res.report_b : res.report_a,
          reports_match: !!(res.report_a && res.report_b && res.report_a.score_a === res.report_b.score_a && res.report_a.score_b === res.report_b.score_b),
          i_confirmed: iAmA ? res.confirmed_by_a : res.confirmed_by_b,
          opponent_confirmed: iAmA ? res.confirmed_by_b : res.confirmed_by_a,
          elo_delta: iAmA ? res.elo_delta_a : res.elo_delta_a != null ? -res.elo_delta_a : null,
          outcome,
        }
      : null,
  };
}

function finalizeMatch(m, res) {
  res.status = 'final';
  m.status = 'final';
  const sa = Number(res.score_a);
  const sb = Number(res.score_b);
  addRecord(m.team_a_id, m.sport_id, sa > sb ? 'w' : sa === sb ? 'd' : 'l');
  addRecord(m.team_b_id, m.sport_id, sb > sa ? 'w' : sa === sb ? 'd' : 'l');
  // FR-11: ELO dihitung otomatis per cabang, hanya untuk tim premium.
  const ea = getElo(m.team_a_id, m.sport_id);
  const eb = getElo(m.team_b_id, m.sport_id);
  const { deltaA, deltaB } = calcElo(ea.rating, eb.rating, sa, sb);
  const d = today();
  if (isPremium(m.team_a_id)) {
    ea.rating += deltaA;
    ea.updated_at = d;
    D().eloHistory.push({ team_id: m.team_a_id, sport_id: m.sport_id, date: d, rating: ea.rating });
    res.elo_delta_a = deltaA;
  }
  if (isPremium(m.team_b_id)) {
    eb.rating += deltaB;
    eb.updated_at = d;
    D().eloHistory.push({ team_id: m.team_b_id, sport_id: m.sport_id, date: d, rating: eb.rating });
  }
  const label = `${teamById(m.team_a_id).team_name} ${sa}–${sb} ${teamById(m.team_b_id).team_name}`;
  notifyTeam(m.team_a_id, `Hasil ${label} resmi tercatat.`, '/tim/pertandingan?tab=riwayat');
  notifyTeam(m.team_b_id, `Hasil ${label} resmi tercatat.`, '/tim/pertandingan?tab=riwayat');
}

function providerView(p) {
  const u = userById(p.user_id);
  const revs = D().reviews.filter((r) => r.provider_id === p.id);
  const count = p.base_reviews + revs.length;
  const sum = p.base_rating * p.base_reviews + revs.reduce((s, r) => s + r.rating, 0);
  return {
    ...p,
    name: u?.name,
    email: u?.email,
    phone: u?.phone,
    initials: initials(u?.name),
    rating: count ? Math.round((sum / count) * 10) / 10 : 0,
    review_count: count,
    slots: D().slots.filter((s) => s.provider_id === p.id && !s.booking_code && s.date >= '2026-10-01').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
  };
}

const commissionOf = (price) => Math.round((price * D().settings.provider_commission) / 100);
const feeOf = (price) => Math.round((price * D().settings.team_fee) / 100);

function bookingView(b) {
  const p = D().providers.find((x) => x.id === b.provider_id);
  const team = teamById(b.team_id);
  const review = D().reviews.find((r) => r.booking_code === b.code);
  return {
    ...b,
    provider_type: p?.type,
    provider_name: userById(p?.user_id)?.name,
    team_name: team?.team_name,
    net: b.price - commissionOf(b.price),
    fee: feeOf(b.price),
    total: b.price + feeOf(b.price),
    review: review || null,
  };
}

const payStatusLabel = { pending: 'Menunggu pembayaran', success: 'Berhasil', failed: 'Gagal', held: 'Dana ditahan', done: 'Selesai', paid_out: 'Dibayarkan', refunded: 'Dikembalikan' };
const payTypeLabel = (p) => (p.booking_type === 'subscription' ? p.booking_code : `Jasa ${p.booking_type === 'referee' ? 'wasit' : 'fotografer'} · ${p.booking_code}`);

/* ------------------------------------------------------------------ routes */
const routes = [];
const on = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
  routes.push({ method, re, keys, handler });
};

/* ---------- Auth (FR-01) ---------- */
on('POST', '/auth/login', ({ body }) => {
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email || !body?.password) fail(422, 'Email dan kata sandi wajib diisi.', { email: !email ? 'Email wajib diisi.' : undefined, password: !body?.password ? 'Kata sandi wajib diisi.' : undefined });
  const u = D().users.find((x) => x.email.toLowerCase() === email);
  if (!u || u.password !== body.password) {
    if (u) {
      u.failed = (u.failed || 0) + 1;
      save();
      if (u.failed >= 5) fail(423, 'Terlalu banyak percobaan gagal. Akun dikunci sementara — silakan atur ulang kata sandi.');
    }
    fail(401, 'Email atau kata sandi salah.');
  }
  if (u.status === 'unverified') fail(403, 'Akun belum terverifikasi. Buka tautan verifikasi di email Anda.', { code: 'UNVERIFIED' });
  u.failed = 0;
  save();
  return { token: `mock.${u.id}`, user: publicUser(u) };
});

on('POST', '/auth/register', ({ body }) => {
  const errors = {};
  const role = body?.role;
  if (!['team', 'referee', 'photographer'].includes(role)) errors.role = 'Pilih peran.';
  if (!body?.name?.trim()) errors.name = 'Nama lengkap wajib diisi.';
  if (role === 'team' && !body?.team_name?.trim()) errors.team_name = 'Nama tim wajib diisi.';
  if (!/^\S+@\S+\.\S+$/.test(body?.email || '')) errors.email = 'Format email tidak valid.';
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(body?.password || '')) errors.password = 'Minimal 8 karakter, termasuk huruf dan angka.';
  if (Object.keys(errors).length) fail(422, 'Periksa kembali data yang diisi.', errors);
  if (D().users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) fail(409, 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.', { email: 'Email sudah terdaftar.' });

  const id = nextId();
  // Mode demo: akun langsung dianggap sudah membuka tautan verifikasi email.
  // Tim aktif setelah verifikasi email; wasit/fotografer menunggu verifikasi admin (UC-12, UC-15).
  const status = role === 'team' ? 'verified' : 'pending';
  D().users.push({ id, name: body.name.trim(), email: body.email.trim(), password: body.password, phone: body.phone || '', role, status, created_at: today(), document: role === 'team' ? 'Identitas kapten' : role === 'referee' ? 'Lisensi wasit' : 'Portofolio', note: 'Pendaftar baru' });
  if (role === 'team') {
    D().teams.push({ id: nextId(), user_id: id, team_name: body.team_name.trim(), logo: null, city: body.city || 'Bandung', area: '', level: 'Pemula', players: 0, venue: '', schedule: '', about: '', sports: [1], primary_sport: 1, joined: today(), verified: true });
  } else {
    D().providers.push({ id: nextId(), user_id: id, type: role, city: body.city || 'Bandung', rate: 0, unit: role === 'referee' ? 'laga' : 'sesi', specialization: [], verification_status: 'pending', base_rating: 0, base_reviews: 0, bio: '' });
  }
  D().users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id, `Pendaftar baru menunggu verifikasi: ${body.name}.`, '/admin/verifikasi'));
  save();
  return { message: 'Akun dibuat. Tautan verifikasi telah dikirim ke email Anda.', token: `mock.${id}`, user: publicUser(userById(id)) };
});

on('GET', '/auth/me', ({ user }) => publicUser(user));
on('POST', '/auth/logout', () => ({ ok: true }));
on('POST', '/auth/resend-verification', () => ({ message: 'Tautan verifikasi dikirim ulang.' }));
on('POST', '/auth/forgot-password', ({ body }) => {
  if (!/^\S+@\S+\.\S+$/.test(body?.email || '')) fail(422, 'Masukkan email yang valid.');
  return { message: 'Jika email terdaftar, tautan atur ulang kata sandi telah dikirim.' };
});
on('POST', '/auth/change-password', ({ user, body }) => {
  if (user.password !== body?.current_password) fail(422, 'Kata sandi saat ini salah.', { current_password: 'Kata sandi saat ini salah.' });
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(body?.new_password || '')) fail(422, 'Kata sandi baru tidak memenuhi syarat.', { new_password: 'Minimal 8 karakter, termasuk huruf dan angka.' });
  user.password = body.new_password;
  save();
  return { message: 'Kata sandi diperbarui.' };
});

/* ---------- Master data ---------- */
on('GET', '/sports', ({ query }) => (query.all ? D().sports : D().sports.filter((s) => s.active)));

/* ---------- Profil tim (FR-02) ---------- */
on('GET', '/teams/me', ({ user }) => {
  const t = myTeam(user);
  return {
    ...t,
    sport_names: t.sports.map(sportName),
    primary_sport_name: sportName(t.primary_sport),
    captain: user.name,
    email: user.email,
    phone: user.phone,
    is_premium: isPremium(t.id),
    summary: t.sports.map((sid) => {
      const [w, d, l] = record(t.id, sid);
      const played = w + d + l;
      return { sport: sportName(sid), elo: getElo(t.id, sid).rating, played, win_rate: played ? Math.round((w / played) * 100) : 0 };
    }),
  };
});
on('PUT', '/teams/me', ({ user, body }) => {
  const t = myTeam(user);
  const errors = {};
  if (!body.team_name?.trim()) errors.team_name = 'Nama tim wajib diisi.';
  if (!body.city) errors.city = 'Kota wajib dipilih.';
  if (!body.sports?.length) errors.sports = 'Pilih minimal satu cabang olahraga.';
  if (Object.keys(errors).length) fail(422, 'Data wajib belum lengkap.', errors);
  const sports = body.sports.map(sportId).filter(Boolean);
  Object.assign(t, {
    team_name: body.team_name.trim(),
    city: body.city,
    level: body.level,
    players: Number(body.players) || 0,
    venue: body.venue ?? t.venue,
    schedule: body.schedule ?? t.schedule,
    about: body.about ?? t.about,
    roster: Array.isArray(body.roster) ? body.roster.filter((r) => r.name?.trim()) : t.roster || [],
    sports,
    primary_sport: sportId(body.primary_sport) && sports.includes(sportId(body.primary_sport)) ? sportId(body.primary_sport) : sports[0],
  });
  sports.forEach((sid) => getElo(t.id, sid));
  save();
  return { message: 'Profil tim berhasil diperbarui.' };
});
on('POST', '/teams/me/logo', ({ user, body }) => {
  const t = myTeam(user);
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(body?.logo || '')) fail(422, 'Format logo harus PNG, JPG, atau WEBP.');
  if (body.logo.length > 2.8e6) fail(422, 'Ukuran logo maksimal 2 MB.');
  t.logo = body.logo;
  save();
  return { logo: t.logo };
});
on('PUT', '/users/me', ({ user, body }) => {
  if (!body.name?.trim()) fail(422, 'Nama wajib diisi.', { name: 'Nama wajib diisi.' });
  if (!/^\S+@\S+\.\S+$/.test(body.email || '')) fail(422, 'Format email tidak valid.', { email: 'Format email tidak valid.' });
  Object.assign(user, { name: body.name.trim(), email: body.email.trim(), phone: body.phone || '' });
  save();
  return publicUser(user);
});
on('GET', '/teams/me/stats', ({ user, query }) => {
  const t = myTeam(user);
  const sid = sportId(query.sport) || t.primary_sport;
  const [w, d, l] = record(t.id, sid);
  const board = D().teams.filter((x) => x.verified && x.city === t.city && x.sports.includes(sid)).map((x) => ({ id: x.id, elo: getElo(x.id, sid).rating })).sort((a, b) => b.elo - a.elo);
  const hist = D().eloHistory.filter((h) => h.team_id === t.id && h.sport_id === sid).sort((a, b) => a.date.localeCompare(b.date));
  const last = hist.length > 1 ? hist[hist.length - 1].rating - hist[hist.length - 2].rating : 0;
  return {
    sport: sportName(sid), played: w + d + l, wins: w, draws: d, losses: l,
    elo: getElo(t.id, sid).rating, elo_last_delta: last,
    rank: board.findIndex((x) => x.id === t.id) + 1, total_teams: board.length, city: t.city, is_premium: isPremium(t.id),
  };
});
on('GET', '/teams/me/activities', ({ user }) => {
  const t = myTeam(user);
  const items = [];
  D().matches.filter((m) => m.team_a_id === t.id || m.team_b_id === t.id).forEach((m) => {
    const v = matchView(m, t.id);
    if (m.status === 'proposed' && v.proposal_from_opponent) items.push({ text: `${v.opponent.name} mengirim usulan jadwal`, date: m.proposal.created_at, status: 'Tinjau jadwal →', link: '/tim/pertandingan' });
    if (m.status === 'result_pending') items.push({ text: `Hasil ${v.result.score_a}–${v.result.score_b} vs ${v.opponent.name} dikirim`, date: m.match_date, status: 'Perlu konfirmasi', link: '/tim/pertandingan' });
    if (m.status === 'final' && v.result) items.push({ text: `${v.result.outcome} ${v.i_am_a ? v.result.score_a : v.result.score_b}–${v.i_am_a ? v.result.score_b : v.result.score_a} vs ${v.opponent.name}${v.result.elo_delta ? ` · ELO ${v.result.elo_delta > 0 ? '+' : ''}${v.result.elo_delta}` : ''}`, date: m.match_date, status: 'Terkonfirmasi', link: '/tim/pertandingan?tab=riwayat' });
    if (m.status === 'disputed') items.push({ text: `Sengketa hasil vs ${v.opponent.name}`, date: m.match_date, status: 'Ditinjau admin', link: '/tim/pertandingan' });
  });
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
});

/* ---------- Matchmaking (FR-04, FR-05) ---------- */
on('GET', '/teams', ({ user, query }) => {
  const mine = myTeam(user);
  const sid = sportId(query.sport) || mine.primary_sport;
  const myElo = getElo(mine.id, sid).rating;
  let list = D().teams.filter((t) => t.id !== mine.id && t.verified && t.sports.includes(sid));
  if (query.city) list = list.filter((t) => t.city === query.city);
  if (query.level) list = list.filter((t) => t.level === query.level);
  const cards = list.map((t) => ({ ...teamCard(t, sid), elo_gap: getElo(t.id, sid).rating - myElo }));
  if (query.sort === 'elo_desc') cards.sort((a, b) => b.elo - a.elo);
  else if (query.sort === 'wins') cards.sort((a, b) => b.wins - a.wins);
  else cards.sort((a, b) => Math.abs(a.elo_gap) - Math.abs(b.elo_gap));
  return { items: cards, my_elo: myElo, my_sports: mine.sports.map(sportName) };
});
on('GET', '/teams/:id', ({ params }) => {
  const t = teamById(Number(params.id)) || fail(404, 'Tim tidak ditemukan.');
  return teamCard(t);
});
on('POST', '/opponent-requests', ({ user, body }) => {
  const mine = myTeam(user);
  const target = teamById(Number(body.to_team_id)) || fail(404, 'Tim lawan tidak ditemukan.');
  const sid = sportId(body.sport) || mine.primary_sport;
  // FR-05: permintaan hanya untuk tim dengan cabang olahraga yang sama
  if (!mine.sports.includes(sid) || !target.sports.includes(sid)) fail(422, 'Permintaan sparring hanya bisa dikirim ke tim dengan cabang olahraga yang sama.');
  if (!body.date || !body.time) fail(422, 'Tanggal dan waktu wajib diisi.', { date: !body.date ? 'Pilih tanggal.' : undefined });
  if (!body.location?.trim() || body.location.trim().length < 4) fail(422, 'Lokasi belum jelas. Lengkapi nama lapangan.', { location: 'Lengkapi lokasi pertandingan.' });
  if (body.date < today()) fail(422, 'Tanggal tidak boleh di masa lalu.', { date: 'Tanggal tidak boleh di masa lalu.' });
  if (D().opponentRequests.some((r) => r.from_team_id === mine.id && r.to_team_id === target.id && r.status === 'pending')) fail(409, `Anda sudah mengirim undangan ke ${target.team_name}. Tunggu tanggapannya.`);
  const req = { id: nextId(), from_team_id: mine.id, to_team_id: target.id, sport_id: sid, status: 'pending', date: body.date, time: body.time, duration: Number(body.duration) || 60, location: body.location.trim(), note: body.note || '', created_at: today() };
  D().opponentRequests.push(req);
  notifyTeam(target.id, `Undangan sparring baru dari ${mine.team_name}.`, '/tim/cari-lawan?tab=masuk');
  save();
  return { message: `Undangan terkirim ke ${target.team_name}.`, request: req };
});
on('GET', '/opponent-requests', ({ user, query }) => {
  const mine = myTeam(user);
  const incoming = query.box !== 'outgoing';
  return D().opponentRequests
    .filter((r) => (incoming ? r.to_team_id === mine.id : r.from_team_id === mine.id))
    .filter((r) => r.status !== 'accepted' || !incoming)
    .map((r) => ({ ...r, sport: sportName(r.sport_id), team: teamCard(teamById(incoming ? r.from_team_id : r.to_team_id), r.sport_id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
});
on('PATCH', '/opponent-requests/:id', ({ user, params, body }) => {
  const mine = myTeam(user);
  const r = D().opponentRequests.find((x) => x.id === Number(params.id)) || fail(404, 'Permintaan tidak ditemukan.');
  if (body.action === 'cancel') {
    if (r.from_team_id !== mine.id) fail(403, 'Tidak diizinkan.');
    r.status = 'cancelled';
    save();
    return { message: 'Undangan dibatalkan.' };
  }
  if (r.to_team_id !== mine.id) fail(403, 'Tidak diizinkan.');
  if (r.status !== 'pending') fail(409, 'Permintaan ini sudah ditanggapi.');
  const from = teamById(r.from_team_id);
  if (body.action === 'reject') {
    r.status = 'rejected';
    notifyTeam(from.id, `${mine.team_name} menolak undangan sparring Anda.`, '/tim/cari-lawan?tab=terkirim');
    save();
    return { message: 'Undangan ditolak.' };
  }
  r.status = 'accepted';
  const id = nextId();
  // Usulan jadwal awal berasal dari pengirim undangan → tim penerima tinggal konfirmasi (UC-05)
  D().matches.push({
    id, code: `SP-${id}`, request_id: r.id, team_a_id: mine.id, team_b_id: from.id, sport_id: r.sport_id, level: mine.level,
    match_date: r.date, time: r.time, duration: r.duration, location: r.location, status: 'scheduled',
    proposal: null, confirmed_a: true, confirmed_b: true,
  });
  notifyTeam(from.id, `${mine.team_name} menerima undangan. Jadwal ${r.date} ${r.time} terkonfirmasi.`, '/tim/pertandingan');
  save();
  return { message: 'Undangan diterima. Jadwal pertandingan tersimpan.', match_id: id };
});

/* ---------- Pertandingan (FR-06..FR-09) ---------- */
on('GET', '/matches', ({ user, query }) => {
  const mine = myTeam(user);
  const all = D().matches.filter((m) => m.team_a_id === mine.id || m.team_b_id === mine.id).map((m) => matchView(m, mine.id));
  const history = ['final', 'cancelled'];
  const list = query.scope === 'history' ? all.filter((m) => history.includes(m.status)) : all.filter((m) => !history.includes(m.status));
  return list.sort((a, b) => (query.scope === 'history' ? b.match_date.localeCompare(a.match_date) : a.match_date.localeCompare(b.match_date)));
});
const loadMatch = (user, id) => {
  const mine = myTeam(user);
  const m = D().matches.find((x) => x.id === Number(id)) || fail(404, 'Pertandingan tidak ditemukan.');
  if (m.team_a_id !== mine.id && m.team_b_id !== mine.id) fail(403, 'Tidak diizinkan.');
  return { mine, m, oppId: m.team_a_id === mine.id ? m.team_b_id : m.team_a_id };
};
on('GET', '/matches/:id', ({ user, params }) => {
  const { mine, m } = loadMatch(user, params.id);
  return matchView(m, mine.id);
});
on('POST', '/matches/:id/confirm-schedule', ({ user, params }) => {
  const { mine, m, oppId } = loadMatch(user, params.id);
  if (m.status !== 'proposed') fail(409, 'Jadwal ini sudah dikonfirmasi.');
  if (m.proposal?.by_team_id === mine.id) fail(409, 'Menunggu persetujuan tim lawan atas usulan Anda.');
  Object.assign(m, { match_date: m.proposal.date, time: m.proposal.time, duration: m.proposal.duration, location: m.proposal.location, status: 'scheduled', proposal: null });
  notifyTeam(oppId, `${mine.team_name} mengonfirmasi jadwal ${m.match_date} ${m.time}.`, '/tim/pertandingan');
  save();
  return { message: 'Jadwal terkonfirmasi. Pengingat akan dikirim ke kedua tim.' };
});
on('POST', '/matches/:id/propose', ({ user, params, body }) => {
  const { mine, m, oppId } = loadMatch(user, params.id);
  if (!['proposed', 'scheduled'].includes(m.status)) fail(409, 'Jadwal tidak bisa diubah pada status ini.');
  if (!body.date || !body.time) fail(422, 'Tanggal dan waktu wajib diisi.');
  if (!body.location?.trim() || body.location.trim().length < 4) fail(422, 'Lokasi belum jelas. Lengkapi nama lapangan.', { location: 'Lengkapi lokasi pertandingan.' });
  m.status = 'proposed';
  m.proposal = { by_team_id: mine.id, date: body.date, time: body.time, duration: Number(body.duration) || m.duration, location: body.location.trim(), note: body.note || '', created_at: today(), deadline: '2 hari' };
  notifyTeam(oppId, `${mine.team_name} mengajukan jadwal alternatif.`, '/tim/pertandingan');
  save();
  return { message: 'Usulan jadwal baru terkirim ke lawan.' };
});
on('POST', '/matches/:id/cancel', ({ user, params }) => {
  const { mine, m, oppId } = loadMatch(user, params.id);
  if (['final', 'cancelled'].includes(m.status)) fail(409, 'Pertandingan tidak bisa dibatalkan.');
  m.status = 'cancelled';
  notifyTeam(oppId, `${mine.team_name} membatalkan pertandingan ${m.code}.`, '/tim/pertandingan?tab=riwayat');
  save();
  return { message: 'Pertandingan dibatalkan. Lawan telah diberi tahu.' };
});
on('POST', '/matches/:id/result', ({ user, params, body }) => {
  const { mine, m, oppId } = loadMatch(user, params.id);
  if (!['scheduled', 'result_pending'].includes(m.status)) fail(409, 'Hasil hanya bisa diinput untuk pertandingan terjadwal.');
  const mineScore = Number(body.my_score);
  const oppScore = Number(body.opponent_score);
  if (body.my_score === '' || body.opponent_score === '' || !Number.isInteger(mineScore) || !Number.isInteger(oppScore) || mineScore < 0 || oppScore < 0) fail(422, 'Skor harus bilangan bulat dan tidak negatif.', { score: 'Skor tidak valid.' });
  const iAmA = m.team_a_id === mine.id;
  const report = { score_a: iAmA ? mineScore : oppScore, score_b: iAmA ? oppScore : mineScore, note: body.note || '', at: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) };
  let res = D().matchResults.find((r) => r.match_id === m.id);
  if (!res) {
    res = { match_id: m.id, status: 'pending', report_a: null, report_b: null, confirmed_by_a: false, confirmed_by_b: false };
    D().matchResults.push(res);
  }
  const prev = iAmA ? res.report_a : res.report_b;
  if (iAmA) res.report_a = report;
  else res.report_b = report;
  // Skor berubah → konfirmasi sebelumnya tidak berlaku lagi (FR-08).
  if (!prev || prev.score_a !== report.score_a || prev.score_b !== report.score_b) {
    res.confirmed_by_a = false;
    res.confirmed_by_b = false;
  }
  res.status = 'pending';
  m.status = 'result_pending';
  notifyTeam(oppId, `${mine.team_name} mengirim hasil ${report.score_a}–${report.score_b} untuk ${m.code}. Mohon konfirmasi.`, '/tim/pertandingan');
  save();
  return { message: 'Laporan hasil terkirim. Menunggu konfirmasi kedua tim.' };
});
on('POST', '/matches/:id/result/confirm', ({ user, params }) => {
  const { mine, m, oppId } = loadMatch(user, params.id);
  const res = D().matchResults.find((r) => r.match_id === m.id);
  if (!res || (!res.report_a && !res.report_b)) fail(409, 'Belum ada hasil yang dilaporkan. Input skor terlebih dahulu.');
  if (res.report_a && res.report_b && (res.report_a.score_a !== res.report_b.score_a || res.report_a.score_b !== res.report_b.score_b)) fail(409, 'Skor kedua tim berbeda. Perbarui hasil atau laporkan selisih ke admin.');
  const agreed = res.report_a || res.report_b;
  res.score_a = agreed.score_a;
  res.score_b = agreed.score_b;
  if (m.team_a_id === mine.id) res.confirmed_by_a = true;
  else res.confirmed_by_b = true;
  if (res.confirmed_by_a && res.confirmed_by_b) finalizeMatch(m, res);
  else notifyTeam(oppId, `${mine.team_name} mengonfirmasi hasil ${m.code}. Selesaikan konfirmasi tim Anda.`, '/tim/pertandingan');
  save();
  const delta = m.team_a_id === mine.id ? res.elo_delta_a : res.elo_delta_a != null ? -res.elo_delta_a : null;
  return {
    final: res.status === 'final',
    message: res.status === 'final' ? (isPremium(mine.id) && delta != null ? `Hasil resmi. ELO ${delta >= 0 ? '+' : ''}${delta}.` : 'Hasil resmi tercatat di riwayat.') : 'Konfirmasi tersimpan. Menunggu tim lawan.',
  };
});
on('POST', '/matches/:id/result/dispute', ({ user, params, body }) => {
  const { mine, m, oppId } = loadMatch(user, params.id);
  if (!body?.reason?.trim()) fail(422, 'Jelaskan alasan keberatan.', { reason: 'Alasan wajib diisi.' });
  m.status = 'disputed';
  const res = D().matchResults.find((r) => r.match_id === m.id);
  if (res) res.status = 'disputed';
  const id = nextId();
  D().disputes.push({ id, code: `DP-${String(id).slice(-3)}`, match_id: m.id, description: `${mine.team_name}: ${body.reason.trim()}`, status: 'open', resolved_by_admin_id: null, created_at: today() });
  notifyTeam(oppId, `${mine.team_name} mengajukan keberatan atas hasil ${m.code}. Kasus diteruskan ke admin.`, '/tim/pertandingan');
  D().users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id, `Sengketa hasil baru pada ${m.code}.`, '/admin/moderasi'));
  save();
  return { message: 'Keberatan dikirim. Admin akan meninjau sengketa ini.' };
});

/* ---------- ELO & Premium (FR-10..FR-13) ---------- */
on('GET', '/elo/me', ({ user, query }) => {
  const t = myTeam(user);
  const sid = sportId(query.sport) || t.primary_sport;
  const [w, d, l] = record(t.id, sid);
  const played = w + d + l;
  const board = D().teams.filter((x) => x.verified && x.city === t.city && x.sports.includes(sid)).map((x) => ({ id: x.id, elo: getElo(x.id, sid).rating })).sort((a, b) => b.elo - a.elo);
  const history = D().eloHistory.filter((h) => h.team_id === t.id && h.sport_id === sid).sort((a, b) => a.date.localeCompare(b.date));
  const delta = history.length > 1 ? history[history.length - 1].rating - history[history.length - 2].rating : 0;
  return {
    sport: sportName(sid), team_name: t.team_name, city: t.city, rating: getElo(t.id, sid).rating, last_delta: delta,
    rank: board.findIndex((x) => x.id === t.id) + 1, total_teams: board.length, wins: w, draws: d, losses: l, played,
    win_rate: played ? Math.round((w / played) * 100) : 0, history, is_premium: isPremium(t.id),
    subscription: activeSubscription(t.id), last_update: history.at(-1)?.date ?? null,
  };
});
on('GET', '/elo/leaderboard', ({ user, query }) => {
  const t = myTeam(user);
  const sid = sportId(query.sport) || t.primary_sport;
  const city = query.city || t.city;
  return D().teams
    .filter((x) => x.verified && x.city === city && x.sports.includes(sid))
    .map((x) => {
      const [w, d, l] = record(x.id, sid);
      return { id: x.id, team_name: x.team_name, played: w + d + l, elo: getElo(x.id, sid).rating, is_me: x.id === t.id };
    })
    .sort((a, b) => b.elo - a.elo)
    .map((x, i) => ({ ...x, rank: i + 1 }));
});
on('GET', '/subscription-plans', () => D().plans.filter((p) => p.active));
on('GET', '/subscriptions/me', ({ user }) => {
  const t = myTeam(user);
  const s = activeSubscription(t.id);
  return s ? { ...s, plan: D().plans.find((p) => p.id === s.plan_id) } : null;
});
on('POST', '/payments/checkout', ({ user, body }) => {
  const t = myTeam(user);
  const plan = D().plans.find((p) => p.id === Number(body.plan_id) && p.active) || fail(404, 'Paket tidak ditemukan.');
  if (isPremium(t.id)) fail(409, 'Premium Anda masih aktif.');
  const id = nextId();
  const pay = { id, code: `TX-${id}`, booking_type: 'subscription', booking_code: plan.name, plan_id: plan.id, team_id: t.id, user_label: t.team_name, amount: plan.price, method: body.method || 'QRIS', status: 'pending', created_at: today() };
  D().payments.unshift(pay);
  save();
  return { payment: pay, redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${id}` };
});
on('GET', '/payments/:id', ({ params }) => D().payments.find((p) => p.id === Number(params.id)) || fail(404, 'Transaksi tidak ditemukan.'));
on('POST', '/payments/:id/simulate', ({ params, body }) => {
  const p = D().payments.find((x) => x.id === Number(params.id)) || fail(404, 'Transaksi tidak ditemukan.');
  if (p.status !== 'pending') return p;
  if (body.status !== 'success') {
    p.status = 'failed';
    if (p.booking_type !== 'subscription') {
      // UC-09/10: pembayaran gagal → pesanan dibatalkan, tidak ada notifikasi ke penyedia
      D().bookings = D().bookings.filter((b) => b.code !== p.booking_code);
    }
    save();
    return p;
  }
  if (p.booking_type === 'subscription') {
    p.status = 'success';
    const plan = D().plans.find((x) => x.id === p.plan_id);
    const start = today();
    const end = localISO(new Date(Date.now() + plan.duration_days * 864e5));
    D().subscriptions.push({ id: nextId(), team_id: p.team_id, plan_id: plan.id, start_date: start, end_date: end, status: 'active' });
    notifyTeam(p.team_id, `Premium aktif hingga ${end}. ELO kini diperbarui otomatis.`, '/tim/premium');
  } else {
    p.status = 'held';
    const b = D().bookings.find((x) => x.code === p.booking_code);
    if (b) {
      b.status = 'pending';
      const prov = D().providers.find((x) => x.id === b.provider_id);
      notify(prov.user_id, `Pesanan baru ${b.code} dari ${teamById(b.team_id).team_name}.`, '/penyedia/pesanan');
    }
  }
  save();
  return p;
});
on('GET', '/settings/commission', () => D().settings);

/* ---------- Booking jasa (FR-14, FR-15, FR-17, FR-18, FR-27) ---------- */
on('GET', '/providers', ({ query }) => {
  let list = D().providers.filter((p) => p.verification_status === 'verified');
  if (query.type && query.type !== 'all') list = list.filter((p) => p.type === query.type);
  if (query.city) list = list.filter((p) => p.city === query.city);
  // FR-27: wasit hanya tampil bila spesialisasinya sesuai cabang
  if (query.sport) list = list.filter((p) => p.type !== 'referee' || p.specialization.includes(query.sport));
  let views = list.map(providerView);
  if (query.date) views = views.map((p) => ({ ...p, available_on_date: p.slots.some((s) => s.date === query.date) }));
  return views.sort((a, b) => (b.available_on_date === true) - (a.available_on_date === true) || b.rating - a.rating);
});
on('GET', '/providers/:id', ({ params }) => providerView(D().providers.find((p) => p.id === Number(params.id)) || fail(404, 'Penyedia tidak ditemukan.')));
on('POST', '/bookings', ({ user, body }) => {
  const t = myTeam(user);
  const p = D().providers.find((x) => x.id === Number(body.provider_id) && x.verification_status === 'verified') || fail(404, 'Penyedia tidak tersedia.');
  if (!body.date || !body.time) fail(422, 'Pilih tanggal dan waktu.');
  if (!body.location?.trim()) fail(422, 'Lokasi wajib diisi.', { location: 'Lokasi wajib diisi.' });
  const slot = D().slots.find((s) => s.provider_id === p.id && s.date === body.date && s.time === String(body.time).slice(0, 5) && !s.booking_code);
  if (!slot) fail(409, `Tidak ada ${p.type === 'referee' ? 'wasit' : 'fotografer'} tersedia pada jadwal tersebut. Pilih slot lain.`);
  const match = body.match_id ? D().matches.find((m) => m.id === Number(body.match_id)) : null;
  const id = nextId();
  const code = `JS-${id}`;
  const label = match ? `${teamById(match.team_a_id).team_name} vs ${teamById(match.team_b_id).team_name}` : t.team_name;
  // Status "awaiting_payment" hingga payment gateway mengonfirmasi
  const b = { id, code, provider_id: p.id, team_id: t.id, match_id: match?.id ?? null, match_label: label, date: body.date, time: slot.time, duration: slot.duration, location: body.location.trim(), sport: match ? sportName(match.sport_id) : 'Futsal', price: p.rate, status: 'awaiting_payment', created_at: today() };
  D().bookings.unshift(b);
  slot.booking_code = code;
  const pay = { id: nextId(), code: `TX-${id}`, booking_type: p.type, booking_code: code, team_id: t.id, user_label: t.team_name, amount: p.rate + feeOf(p.rate), method: body.method || 'QRIS', status: 'pending', created_at: today() };
  D().payments.unshift(pay);
  save();
  return { booking: bookingView(b), payment: pay, redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${pay.id}` };
});
on('GET', '/bookings/me', ({ user }) => {
  const t = myTeam(user);
  return D().bookings.filter((b) => b.team_id === t.id && b.status !== 'awaiting_payment').map(bookingView).sort((a, b) => b.date.localeCompare(a.date));
});
on('POST', '/reviews', ({ user, body }) => {
  const t = myTeam(user);
  const b = D().bookings.find((x) => x.code === body.booking_code && x.team_id === t.id) || fail(404, 'Pesanan tidak ditemukan.');
  if (!['done', 'paid_out'].includes(b.status)) fail(422, 'Layanan belum selesai. Ulasan tersedia setelah pertandingan.');
  if (!(Number(body.rating) >= 1 && Number(body.rating) <= 5)) fail(422, 'Beri rating bintang sebelum mengirim.', { rating: 'Rating wajib diisi.' });
  const existing = D().reviews.find((r) => r.booking_code === b.code);
  if (existing) {
    Object.assign(existing, { rating: Number(body.rating), comment: body.comment || '' });
    save();
    return { message: 'Ulasan diperbarui.', review: existing };
  }
  const review = { id: nextId(), team_id: t.id, provider_id: b.provider_id, booking_code: b.code, rating: Number(body.rating), comment: body.comment || '', author: `${user.name.split(' ')[0]} · ${t.team_name}`, created_at: today() };
  D().reviews.unshift(review);
  const p = D().providers.find((x) => x.id === b.provider_id);
  notify(p.user_id, `${t.team_name} memberi ulasan ${review.rating}/5.`, '/penyedia');
  save();
  return { message: 'Terima kasih! Ulasan tampil di profil penyedia.', review };
});
on('GET', '/reviews', ({ query }) => {
  let list = D().reviews;
  if (query.provider_id) list = list.filter((r) => r.provider_id === Number(query.provider_id));
  return list.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((r) => ({ ...r, provider_name: userById(D().providers.find((p) => p.id === r.provider_id)?.user_id)?.name }));
});

/* ---------- Penyedia jasa (FR-03, FR-16, FR-19) ---------- */
on('GET', '/provider/me', ({ user }) => providerView(myProvider(user)));
on('PUT', '/provider/me', ({ user, body }) => {
  const p = myProvider(user);
  const errors = {};
  if (!body.name?.trim()) errors.name = 'Nama wajib diisi.';
  if (!(Number(body.rate) > 0)) errors.rate = 'Tarif harus lebih dari 0.';
  if (p.type === 'referee' && !body.specialization?.length) errors.specialization = 'Pilih minimal satu spesialisasi.';
  if (Object.keys(errors).length) fail(422, 'Periksa kembali data profil.', errors);
  user.name = body.name.trim();
  Object.assign(p, {
    city: body.city || p.city, rate: Number(body.rate), specialization: body.specialization || p.specialization, license: body.license ?? p.license,
    duration: body.duration ?? p.duration, package: body.package ?? p.package, delivery: body.delivery ?? p.delivery, portfolio: body.portfolio ?? p.portfolio, bio: body.bio ?? p.bio,
  });
  save();
  return { message: 'Profil penyedia disimpan.' };
});
on('GET', '/provider/summary', ({ user }) => {
  const p = myProvider(user);
  const v = providerView(p);
  const mine = D().bookings.filter((b) => b.provider_id === p.id);
  const month = '2026-10';
  const doneMonth = mine.filter((b) => ['done', 'paid_out'].includes(b.status) && b.date.startsWith(month));
  return {
    verified: p.verification_status === 'verified', type: p.type, name: user.name,
    net_month: doneMonth.reduce((s, b) => s + b.price - commissionOf(b.price), 0), done_month: doneMonth.length,
    new_orders: mine.filter((b) => b.status === 'pending').length, rating: v.rating, review_count: v.review_count,
    commission: D().settings.provider_commission,
  };
});
on('GET', '/provider/bookings', ({ user, query }) => {
  const p = myProvider(user);
  let list = D().bookings.filter((b) => b.provider_id === p.id && b.status !== 'awaiting_payment');
  if (query.status) list = list.filter((b) => query.status.split(',').includes(b.status));
  return list.map(bookingView).sort((a, b) => a.date.localeCompare(b.date));
});
on('PATCH', '/provider/bookings/:id', ({ user, params, body }) => {
  const p = myProvider(user);
  if (p.verification_status !== 'verified') fail(403, 'Akun Anda belum diverifikasi admin. Pesanan belum bisa diproses.');
  const b = D().bookings.find((x) => x.id === Number(params.id) && x.provider_id === p.id) || fail(404, 'Pesanan tidak ditemukan.');
  const pay = D().payments.find((x) => x.booking_code === b.code);
  if (body.action === 'accept') {
    if (b.status !== 'pending') fail(409, 'Pesanan sudah ditanggapi.');
    const clash = D().bookings.find((x) => x.provider_id === p.id && x.id !== b.id && x.status === 'accepted' && x.date === b.date && x.time === b.time);
    if (clash && !body.force) fail(409, `Jadwal bentrok dengan ${clash.code}.`, { code: 'CLASH' });
    b.status = 'accepted';
    notifyTeam(b.team_id, `${user.name} menerima pesanan ${b.code}.`, '/tim/jasa?tab=pesanan');
  } else if (body.action === 'reject') {
    if (b.status !== 'pending') fail(409, 'Pesanan sudah ditanggapi.');
    b.status = 'rejected';
    if (pay) pay.status = 'refunded';
    const slot = D().slots.find((s) => s.booking_code === b.code);
    if (slot) delete slot.booking_code;
    notifyTeam(b.team_id, `${user.name} menolak pesanan ${b.code}. Dana dikembalikan otomatis.`, '/tim/jasa?tab=pesanan');
  } else if (body.action === 'complete') {
    if (b.status !== 'accepted') fail(409, 'Hanya pesanan yang diterima yang bisa diselesaikan.');
    b.status = 'done';
    if (pay) pay.status = 'done';
    notifyTeam(b.team_id, `Layanan ${b.code} selesai. Beri ulasan untuk ${user.name}.`, '/tim/jasa');
  } else fail(422, 'Aksi tidak dikenal.');
  save();
  return { message: body.action === 'accept' ? 'Pesanan diterima. Tim telah diberi tahu.' : body.action === 'reject' ? 'Pesanan ditolak. Dana dikembalikan ke tim.' : 'Pesanan ditandai selesai.' };
});
on('GET', '/provider/slots', ({ user }) => {
  const p = myProvider(user);
  const rows = D().slots.filter((s) => s.provider_id === p.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const byDate = {};
  rows.forEach((s) => {
    (byDate[s.date] ||= []).push(s);
  });
  return Object.entries(byDate).map(([date, list]) => ({ date, slots: list }));
});
on('POST', '/provider/slots', ({ user, body }) => {
  const p = myProvider(user);
  if (!body.date || !body.time) fail(422, 'Pilih tanggal dan jam.');
  if (D().slots.some((s) => s.provider_id === p.id && s.date === body.date && s.time === body.time)) fail(409, 'Slot tersebut sudah ada.');
  D().slots.push({ id: nextId(), provider_id: p.id, date: body.date, time: body.time, duration: Number(body.duration) || 60 });
  save();
  return { message: 'Slot ketersediaan ditambahkan.' };
});
on('DELETE', '/provider/slots/:id', ({ user, params }) => {
  const p = myProvider(user);
  const s = D().slots.find((x) => x.id === Number(params.id) && x.provider_id === p.id) || fail(404, 'Slot tidak ditemukan.');
  if (s.booking_code) fail(409, 'Slot sudah ditahan pesanan dan tidak bisa dihapus.');
  D().slots = D().slots.filter((x) => x.id !== s.id);
  save();
  return { message: 'Slot dihapus.' };
});
on('GET', '/provider/earnings', ({ user, query }) => {
  const p = myProvider(user);
  const period = query.period || '2026-10';
  const rows = D().bookings.filter((b) => b.provider_id === p.id && ['done', 'paid_out', 'accepted'].includes(b.status) && (period === 'all' || b.date.startsWith(period))).map(bookingView).sort((a, b) => b.date.localeCompare(a.date));
  return { period, rows, total_net: rows.filter((r) => r.status !== 'accepted').reduce((s, r) => s + r.net, 0), payout_account: p.payout_account || '-' };
});

/* ---------- Admin (FR-21..FR-26) ---------- */
const adminOnly = (user) => {
  if (user.role !== 'admin') fail(403, 'Khusus admin.');
};
on('GET', '/admin/summary', ({ user }) => {
  adminOnly(user);
  const pending = D().users.filter((u) => u.status === 'pending');
  const vol = D().payments.filter((p) => p.created_at.startsWith('2026-10') && !['failed', 'pending', 'refunded'].includes(p.status)).reduce((s, p) => s + p.amount, 0);
  const openReports = D().reports.filter((r) => r.status === 'open');
  return {
    pending_count: pending.length,
    pending_breakdown: { team: pending.filter((u) => u.role === 'team').length, referee: pending.filter((u) => u.role === 'referee').length, photographer: pending.filter((u) => u.role === 'photographer').length },
    report_count: openReports.length, high_priority: openReports.filter((r) => r.priority === 'high').length,
    dispute_count: D().disputes.filter((d) => d.status === 'open').length, volume_month: vol,
  };
});
on('GET', '/admin/verifications', ({ user }) => {
  adminOnly(user);
  return D().users.filter((u) => u.status === 'pending').map((u) => {
    const t = u.role === 'team' ? teamOfUser(u.id) : null;
    return { id: u.id, name: t ? t.team_name : u.name, person: u.name, role: u.role, document: u.document || '-', note: u.note || '', city: t?.city || providerOfUser(u.id)?.city || '-', created_at: u.created_at, email: u.email };
  });
});
on('PATCH', '/admin/verifications/:id', ({ user, params, body }) => {
  adminOnly(user);
  const u = userById(Number(params.id)) || fail(404, 'Akun tidak ditemukan.');
  const approve = body.action === 'approve';
  if (!approve && !body.reason?.trim()) fail(422, 'Tuliskan alasan penolakan.', { reason: 'Alasan wajib diisi.' });
  u.status = approve ? 'verified' : 'rejected';
  const t = teamOfUser(u.id);
  if (t) t.verified = approve;
  const p = providerOfUser(u.id);
  if (p) p.verification_status = approve ? 'verified' : 'rejected';
  notify(u.id, approve ? 'Akun Anda telah diverifikasi. Selamat bergabung di Bringit!' : `Verifikasi ditolak: ${body.reason}`, '/');
  save();
  return { message: approve ? 'Akun diverifikasi.' : 'Verifikasi ditolak dan alasan dikirim ke pengguna.' };
});
on('GET', '/admin/reports', ({ user }) => {
  adminOnly(user);
  return D().reports.filter((r) => r.status === 'open');
});
on('PATCH', '/admin/reports/:id', ({ user, params, body }) => {
  adminOnly(user);
  const r = D().reports.find((x) => x.id === Number(params.id)) || fail(404, 'Laporan tidak ditemukan.');
  r.status = body.action === 'remove' ? 'removed' : 'dismissed';
  r.decided_by = user.id;
  save();
  return { message: body.action === 'remove' ? 'Konten dihapus. Keputusan dicatat di log moderasi.' : 'Laporan diabaikan.' };
});
on('GET', '/admin/disputes', ({ user }) => {
  adminOnly(user);
  return D().disputes.filter((d) => d.status === 'open').map((d) => {
    const m = D().matches.find((x) => x.id === d.match_id);
    const res = D().matchResults.find((x) => x.match_id === d.match_id);
    return { ...d, match: { code: m.code, date: m.match_date, sport: sportName(m.sport_id), team_a: teamById(m.team_a_id).team_name, team_b: teamById(m.team_b_id).team_name }, report_a: res?.report_a || null, report_b: res?.report_b || null };
  });
});
on('PATCH', '/admin/disputes/:id', ({ user, params, body }) => {
  adminOnly(user);
  const d = D().disputes.find((x) => x.id === Number(params.id)) || fail(404, 'Sengketa tidak ditemukan.');
  const m = D().matches.find((x) => x.id === d.match_id);
  let res = D().matchResults.find((x) => x.match_id === d.match_id);
  if (body.action === 'request_info') {
    notifyTeam(m.team_a_id, `Admin meminta bukti tambahan untuk sengketa ${m.code}.`, '/tim/pertandingan');
    notifyTeam(m.team_b_id, `Admin meminta bukti tambahan untuk sengketa ${m.code}.`, '/tim/pertandingan');
    save();
    return { message: 'Permintaan data tambahan dikirim ke kedua tim.' };
  }
  const sa = Number(body.score_a);
  const sb = Number(body.score_b);
  if (!Number.isInteger(sa) || !Number.isInteger(sb) || sa < 0 || sb < 0) fail(422, 'Skor keputusan tidak valid.');
  if (!res) {
    res = { match_id: m.id };
    D().matchResults.push(res);
  }
  Object.assign(res, { score_a: sa, score_b: sb, confirmed_by_a: true, confirmed_by_b: true });
  d.status = 'resolved';
  d.resolved_by_admin_id = user.id;
  finalizeMatch(m, res);
  save();
  return { message: `Sengketa ${d.code} diputuskan ${sa}–${sb}.` };
});
on('GET', '/admin/plans', ({ user }) => {
  adminOnly(user);
  return D().plans;
});
on('PUT', '/admin/plans/:id', ({ user, params, body }) => {
  adminOnly(user);
  const p = D().plans.find((x) => x.id === Number(params.id)) || fail(404, 'Paket tidak ditemukan.');
  if (!body.name?.trim() || !(Number(body.price) > 0) || !(Number(body.duration_days) > 0)) fail(422, 'Nama, harga, dan durasi wajib valid.');
  Object.assign(p, { name: body.name.trim(), price: Number(body.price), duration_days: Number(body.duration_days), active: !!body.active, features: body.features ?? p.features });
  save();
  return { message: 'Paket langganan disimpan.' };
});
on('PUT', '/admin/commission', ({ user, body }) => {
  adminOnly(user);
  const pc = Number(body.provider_commission);
  const tf = Number(body.team_fee);
  if (!(pc >= 0 && pc <= 50) || !(tf >= 0 && tf <= 50)) fail(422, 'Persentase harus 0–50%.');
  Object.assign(D().settings, { provider_commission: pc, team_fee: tf });
  save();
  return { message: 'Komisi disimpan. Berlaku untuk pesanan baru.' };
});
on('POST', '/admin/sports', ({ user, body }) => {
  adminOnly(user);
  const name = body.name?.trim();
  if (!name) fail(422, 'Nama cabang wajib diisi.');
  if (D().sports.some((s) => s.name.toLowerCase() === name.toLowerCase())) fail(409, 'Cabang olahraga sudah ada.');
  D().sports.push({ id: nextId(), name, active: true });
  save();
  return { message: `${name} ditambahkan.` };
});
on('PATCH', '/admin/sports/:id', ({ user, params, body }) => {
  adminOnly(user);
  const s = D().sports.find((x) => x.id === Number(params.id)) || fail(404, 'Cabang tidak ditemukan.');
  s.active = !!body.active;
  save();
  return { message: `${s.name} ${s.active ? 'diaktifkan' : 'dinonaktifkan'}.` };
});
on('GET', '/admin/transactions', ({ user, query }) => {
  adminOnly(user);
  let list = D().payments;
  if (query.type) list = list.filter((p) => (query.type === 'subscription' ? p.booking_type === 'subscription' : p.booking_type !== 'subscription'));
  if (query.status) list = list.filter((p) => p.status === query.status);
  return list.map((p) => ({ ...p, type_label: payTypeLabel(p), status_label: payStatusLabel[p.status] || p.status })).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
});

/* ---------- Notifikasi (FR-20) ---------- */
on('GET', '/notifications', ({ user }) => D().notifications.filter((n) => n.user_id === user.id).slice(0, 20));
on('PATCH', '/notifications/:id/read', ({ user, params }) => {
  const n = D().notifications.find((x) => x.id === Number(params.id) && x.user_id === user.id);
  if (n) n.is_read = true;
  save();
  return { ok: true };
});
on('POST', '/notifications/read-all', ({ user }) => {
  D().notifications.filter((n) => n.user_id === user.id).forEach((n) => (n.is_read = true));
  save();
  return { ok: true };
});

/* ------------------------------------------------------------------ dispatcher */
const PUBLIC = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/resend-verification', '/sports'];

export async function mockRequest(method, url, body, token) {
  await wait(LATENCY);
  const [path, qs = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const user = PUBLIC.includes(path) ? null : auth(token);
    const out = r.handler({ params, query, body: body || {}, user });
    return JSON.parse(JSON.stringify(out ?? null));
  }
  throw new ApiError(404, `Endpoint ${method} ${path} tidak ditemukan (mock).`);
}
