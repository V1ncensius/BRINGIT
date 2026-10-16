import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Search } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { teamService } from '../../services/teamService';
import { matchService } from '../../services/matchService';
import { IS_PROGRESS30 } from '../../config/features';
import { dateDay, dateDayShort, dateShort, dayMonth, num, timeRange, todayISO } from '../../lib/format';

const STATUS_BADGE = {
  proposed: ['badge-brand', 'Perlu konfirmasi'],
  scheduled: ['badge-ok', 'Terjadwal'],
  result_pending: ['badge-warn', 'Menunggu hasil'],
  disputed: ['badge-danger', 'Sengketa'],
};

function NextMatch({ match, team, onConfirm, busy }) {
  const nav = useNavigate();
  if (!match) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Belum ada pertandingan terjadwal"
        text="Kirim undangan sparring ke tim selevel di kotamu."
        action={<Link to="/tim/cari-lawan" className="btn-primary">Cari lawan</Link>}
      />
    );
  }
  const p = match.proposal;
  const date = p?.date || match.match_date;
  const time = p?.time || match.time;
  const [cls, label] = STATUS_BADGE[match.status] || ['badge-neutral', match.status];
  const needsMyConfirm = match.status === 'proposed' && match.proposal_from_opponent;
  return (
    <>
      <div className="flex items-center justify-between">
        <span className={cls}>{needsMyConfirm ? 'Perlu konfirmasi' : label}</span>
        <span className="text-[13px] text-muted">{match.code}</span>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Avatar name={team.team_name} src={team.logo} tone="brand" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-white sm:text-xl">
            {match.team_a.name} vs {match.team_b.name}
          </p>
          <p className="mt-1 text-[15px] text-muted">
            {match.sport} · {match.level} · {team.city}
          </p>
        </div>
        <Avatar initials={match.opponent.initials} className="hidden sm:grid" />
      </div>
      <p className="mt-5 text-[15px] text-zinc-100">
        {dateDayShort(date)} · {timeRange(time, p?.duration || match.duration)} WIB
      </p>
      <p className="mt-2 text-[15px] text-muted">{p?.location || match.location}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {needsMyConfirm && (
          <Button onClick={onConfirm} loading={busy}>
            Konfirmasi jadwal
          </Button>
        )}
        <button onClick={() => nav('/tim/pertandingan')} className="btn-secondary">
          Lihat detail
        </button>
      </div>
    </>
  );
}

export default function TeamDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, run] = useAction(toast);

  const team = useAsync(() => teamService.getMine(), []);
  const stats = useAsync(() => teamService.getStats(), []);
  const acts = useAsync(() => teamService.getActivities(), []);
  const matches = useAsync(() => matchService.list('active'), []);

  const upcoming = (matches.data || []).filter((m) => ['proposed', 'scheduled'].includes(m.status) && (m.proposal?.date || m.match_date) >= '2026-10-01');
  const next = upcoming[0];
  const pendingResult = (matches.data || []).find((m) => m.status === 'result_pending');

  // Saran wasit hanya di cakupan penuh (progres berikutnya); di progress30 endpoint booking belum ada.
  const freeRef = null;

  const confirm = async () => {
    const ok = await run('confirm', () => matchService.confirmSchedule(next.id));
    if (ok) {
      matches.reload();
      acts.reload();
    }
  };

  const s = stats.data;
  const t = team.data;

  return (
    <>
      <PageHeader
        title={`Halo, ${user.team_name}.`}
        subtitle={`${dateDay(todayISO())} · Siapkan tim untuk pertandingan berikutnya.`}
        actions={
          <Link to="/tim/cari-lawan" className="btn-primary btn-lg">
            <Search size={19} className="hidden sm:block" /> Cari lawan
          </Link>
        }
      />

      {/* Hero */}
      <section className="card flex flex-col-reverse overflow-hidden lg:flex-row">
        <div className="flex-1 p-6 sm:p-7">
          <p className="eyebrow">Waktunya sparring</p>
          <h2 className="mt-4 text-[26px] font-bold leading-tight sm:text-[28px]">Lawan baru. Tantangan berikutnya.</h2>
          <p className="mt-3 text-[15px] text-muted">
            Temukan tim {(t?.primary_sport_name || 'futsal').toLowerCase()} selevel di {t?.city || 'kotamu'}. Atur jadwal, lalu main.
          </p>
          <Link to="/tim/cari-lawan" className="btn-primary btn-lg mt-6 w-full sm:w-auto">
            Temukan pertandingan <ArrowRight size={18} />
          </Link>
        </div>
        <img src="/images/futsal-banner.jpg" alt="Pertandingan futsal di lapangan indoor" className="h-52 w-full object-cover sm:h-60 lg:h-auto lg:w-[37%]" />
      </section>

      {/* Statistik */}
      <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Statistik tim">
        <StatCard loading={!s} label="Pertandingan" value={s?.played} note={s && `Musim ini · ${s.sport}`} />
        <StatCard loading={!s} label="Kemenangan" value={s?.wins} note={s && `${s.wins} menang · ${s.draws} seri · ${s.losses} kalah`} />
        <StatCard
          loading={!s}
          label={`ELO ${s?.sport?.toLowerCase() || ''}`}
          value={s && num(s.elo)}
          note={s && (s.elo_last_delta ? `${s.elo_last_delta > 0 ? '+' : ''}${s.elo_last_delta} dari pertandingan terakhir` : 'Rating awal')}
        />
        <StatCard loading={!s} label={`Peringkat ${s?.city || ''}`} value={s && `#${s.rank}`} note={s && `Dari ${s.total_teams} tim ${s.sport.toLowerCase()}`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_356px]">
        <div className="card card-pad">
          <h2 className="card-title mb-5">Pertandingan berikutnya</h2>
          {matches.loading || team.loading ? (
            <LoadingBlock rows={2} />
          ) : matches.error ? (
            <ErrorState error={matches.error} onRetry={matches.reload} />
          ) : (
            <NextMatch match={next} team={t} onConfirm={confirm} busy={busy === 'confirm'} />
          )}
        </div>

        <div className="card card-pad">
          <h2 className="card-title mb-5">Perlu perhatian</h2>
          <ul className="space-y-6">
            {pendingResult && (
              <li>
                <p className="font-semibold text-white">Hasil perlu konfirmasi</p>
                <p className="mt-1.5 text-[15px] text-muted">
                  {pendingResult.team_a.name} {pendingResult.result?.score_a}–{pendingResult.result?.score_b} {pendingResult.team_b.name} · {dayMonth(pendingResult.match_date)}
                </p>
                <Link to="/tim/pertandingan" className="badge-neutral mt-2.5 px-2.5 py-1.5 hover:bg-ink-600">
                  {pendingResult.result?.i_confirmed ? 'Menunggu lawan' : 'Menunggu konfirmasi'}
                </Link>
              </li>
            )}
            {next && !IS_PROGRESS30 && (
              <li>
                <p className="font-semibold text-white">Lengkapi laga dengan wasit</p>
                <p className="mt-1.5 text-[15px] text-muted">
                  {freeRef ? `${freeRef.name} tersedia pada ${dayMonth(next.proposal?.date || next.match_date)}.` : 'Cari wasit terverifikasi untuk laga berikutnya.'}
                </p>
                <Link to="/tim/jasa" className="mt-2 inline-flex items-center gap-1 text-[15px] text-brand hover:underline">
                  Lihat jasa olahraga <ArrowRight size={15} />
                </Link>
              </li>
            )}
            {!IS_PROGRESS30 && t && !t.is_premium ? (
              <li>
                <p className="font-semibold text-white">Premium belum aktif</p>
                <p className="mt-1.5 text-[15px] text-muted">Aktifkan untuk mencatat progres ELO baru.</p>
                <Link to="/tim/premium" className="mt-2 inline-flex items-center gap-1 text-[15px] text-brand hover:underline">
                  Aktifkan Premium <ArrowRight size={15} />
                </Link>
              </li>
            ) : t ? (
              <li>
                <p className="font-semibold text-white">Premium aktif</p>
                <p className="mt-1.5 text-[15px] text-muted">ELO diperbarui otomatis setelah hasil dikonfirmasi.</p>
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="card card-pad mt-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="card-title">Aktivitas tim</h2>
          <span className="text-[15px] text-muted">7 hari terakhir</span>
        </div>
        {acts.loading ? (
          <LoadingBlock />
        ) : !acts.data?.length ? (
          <p className="py-6 text-center text-muted">Belum ada aktivitas.</p>
        ) : (
          <>
            <div className="table-wrap hidden sm:block">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[38%]">Aktivitas</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {acts.data.map((a, i) => (
                    <tr key={i}>
                      <td className="font-semibold text-white">{a.text}</td>
                      <td>{dateShort(a.date)}</td>
                      <td>
                        <Link to={a.link} className="text-brand hover:underline">
                          {a.status}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-ink-600 sm:hidden">
              {acts.data.map((a, i) => (
                <li key={i} className="py-4 first:pt-0">
                  <p className="font-semibold text-white">{a.text}</p>
                  <p className="mt-1.5 text-[15px] text-muted">{dateShort(a.date)}</p>
                  <Link to={a.link} className="mt-1.5 inline-block text-[15px] text-brand">
                    {a.status}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {!IS_PROGRESS30 && (
      <div className="mt-6 grid grid-cols-2 gap-4 lg:hidden">
        <Link to="/tim/premium" className="btn-secondary btn-lg">Premium &amp; ELO</Link>
        <Link to="/tim/jasa" className="btn-secondary btn-lg">Jasa olahraga</Link>
      </div>
      )}
    </>
  );
}
