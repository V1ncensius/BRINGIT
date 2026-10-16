import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Gavel, Info, Send } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { matchService } from '../../services/matchService';
import { matchmakingService } from '../../services/matchmakingService';
import { TIME_SLOTS } from '../../config/constants';
import { IS_PROGRESS30 } from '../../config/features';
import { dateDay, dateShort, dayMonth, timeRange, todayISO } from '../../lib/format';
import { Invitations } from './FindOpponent';

const isPast = (m) => new Date(`${m.match_date}T${m.time.replace('.', ':')}:00`).getTime() + m.duration * 6e4 <= Date.now();

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className="text-right text-zinc-100">{value}</span>
    </div>
  );
}

function VsRow({ match, team }) {
  return (
    <div className="mt-5 flex items-center gap-4">
      <Avatar name={team.team_name} src={team.logo} tone="brand" />
      <p className="flex-1 text-lg font-semibold text-white sm:text-xl">
        {match.team_a.name} vs {match.team_b.name}
      </p>
      <Avatar initials={match.opponent.initials} />
    </div>
  );
}

function AlternativeForm({ match, onDone }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const [f, setF] = useState({ date: match.proposal?.date || match.match_date, time: match.proposal?.time || match.time, location: match.proposal?.location || match.location, note: '' });
  const [err, setErr] = useState({});
  const submit = async () => {
    const e = {};
    if (!f.date || f.date < todayISO()) e.date = 'Pilih tanggal hari ini atau setelahnya.';
    if (f.location.trim().length < 4) e.location = 'Lengkapi lokasi pertandingan.';
    setErr(e);
    if (Object.keys(e).length) return;
    const ok = await run('alt', () => matchService.proposeSchedule(match.id, { ...f, duration: match.duration }));
    if (ok) onDone();
  };
  return (
    <>
      <h3 className="mb-4 text-lg font-semibold">Ajukan jadwal alternatif</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tanggal" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} error={err.date} />
        <Select label="Waktu" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}>
          {TIME_SLOTS.map((t) => (
            <option key={t} value={t}>
              {t} WIB
            </option>
          ))}
        </Select>
        <Input label="Lokasi" wrapClass="sm:col-span-2" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} error={err.location} />
        <Textarea label="Catatan untuk lawan" wrapClass="sm:col-span-2" rows={1} placeholder="Bisa pindah ke Minggu dengan jam yang sama?" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>
      <Button variant="secondary" className="mt-5" onClick={submit} loading={busy === 'alt'}>
        <Send size={17} /> Kirim usulan baru
      </Button>
    </>
  );
}

function ScheduleCard({ match, team, onChange }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const [showAlt, setShowAlt] = useState(match.status === 'proposed');
  const p = match.proposal;
  const fromOpp = match.proposal_from_opponent;
  const confirm = async () => (await run('ok', () => matchService.confirmSchedule(match.id))) && onChange();
  const cancel = async () => (await run('no', () => matchService.cancel(match.id))) && onChange();

  const date = p?.date || match.match_date;
  const time = p?.time || match.time;
  const location = p?.location || match.location;

  return (
    <article className="card card-pad">
      <div className="flex items-baseline justify-between">
        <h2 className="card-title">{match.status === 'proposed' ? 'Konfirmasi jadwal' : 'Jadwal terkonfirmasi'}</h2>
        <span className="text-[13px] text-muted">{match.code}</span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        {match.status === 'proposed' ? (
          <span className="badge-brand">{fromOpp ? `Usulan dari ${match.opponent.name}` : `Menunggu ${match.opponent.name}`}</span>
        ) : (
          <span className="badge-ok">Terjadwal</span>
        )}
        <span className="badge-neutral">{match.sport}</span>
      </div>
      <VsRow match={match} team={team} />
      {match.status === 'proposed' && (
        <div className="notice mt-5">
          <Info size={18} className="mt-0.5 shrink-0" />
          <span>{fromOpp ? `Usulan diterima ${dayMonth(p.created_at)} · Konfirmasi sebelum ${p.deadline}.` : 'Usulan Anda terkirim. Menunggu persetujuan lawan.'}</span>
        </div>
      )}
      <div className="mt-4">
        <Detail label="Tanggal" value={dateDay(date)} />
        <Detail label="Waktu" value={`${timeRange(time, p?.duration || match.duration)} WIB`} />
        <Detail label="Tempat" value={location} />
        {p?.note && <Detail label="Catatan" value={`“${p.note}”`} />}
      </div>

      {match.status === 'proposed' && fromOpp && (
        <div className="mt-5 flex gap-3">
          <Button onClick={confirm} loading={busy === 'ok'} disabled={!!busy}>
            Konfirmasi jadwal
          </Button>
          <Button variant="secondary" onClick={cancel} loading={busy === 'no'} disabled={!!busy}>
            Tolak
          </Button>
        </div>
      )}
      {match.status === 'scheduled' && (
        <div className="mt-5 flex flex-wrap gap-3">
          {!IS_PROGRESS30 && <Link to={`/tim/jasa?match=${match.id}`} className="btn-primary">Pesan wasit / fotografer</Link>}
          <button onClick={() => setShowAlt((s) => !s)} className="btn-secondary">Ajukan perubahan</button>
          <Button variant="ghost" onClick={cancel} loading={busy === 'no'}>Batalkan</Button>
        </div>
      )}
      {showAlt && (
        <>
          <div className="divider my-6" />
          <AlternativeForm match={match} onDone={onChange} />
        </>
      )}
    </article>
  );
}

function ResultCard({ match, team, onChange }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const r = match.result;
  const mine = r?.my_report;
  const opp = r?.opponent_report;
  const myKey = match.i_am_a ? 'score_a' : 'score_b';
  const oppKey = match.i_am_a ? 'score_b' : 'score_a';
  const [score, setScore] = useState({ a: mine?.score_a ?? '', b: mine?.score_b ?? '' });
  const [note, setNote] = useState(mine?.note || '');
  const [err, setErr] = useState(null);
  const [dispute, setDispute] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setScore({ a: mine?.score_a ?? '', b: mine?.score_b ?? '' });
  }, [mine?.score_a, mine?.score_b]);

  const submit = async () => {
    const valid = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;
    if (!valid(score.a) || !valid(score.b)) {
      setErr('Skor harus bilangan bulat 0 atau lebih.');
      return;
    }
    setErr(null);
    const ok = await run('send', () =>
      matchService.submitResult(match.id, { my_score: Number(match.i_am_a ? score.a : score.b), opponent_score: Number(match.i_am_a ? score.b : score.a), note }),
    );
    if (ok) onChange();
  };
  const confirm = async () => (await run('confirm', () => matchService.confirmResult(match.id))) && onChange();
  const sendDispute = async () => {
    if (!reason.trim()) return toast('Jelaskan alasan keberatan.', 'error');
    const ok = await run('dispute', () => matchService.disputeResult(match.id, reason));
    if (ok) {
      setDispute(false);
      onChange();
    }
  };

  const mismatch = mine && opp && !r.reports_match;
  const statusBadge = match.status === 'disputed' ? ['badge-danger', 'Sengketa · ditinjau admin'] : r?.i_confirmed ? ['badge-ok', 'Menunggu lawan'] : ['badge-brand', 'Menunggu konfirmasi'];

  return (
    <article className="card card-pad">
      <div className="flex items-baseline justify-between">
        <h2 className="card-title">Input &amp; konfirmasi hasil</h2>
        <span className="text-[13px] text-muted">{match.code}</span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <span className={statusBadge[0]}>{statusBadge[1]}</span>
        <span className="text-[13px] text-muted">{dateShort(match.match_date)}</span>
      </div>
      <p className="mt-5 text-lg font-semibold text-white sm:text-xl">
        {match.team_a.name} vs {match.team_b.name}
      </p>
      <p className="mt-4 text-[15px] text-muted">
        {match.sport} · {match.location} · Pertandingan selesai
      </p>

      {match.status === 'disputed' ? (
        <div className="notice mt-5">
          <Gavel size={18} className="mt-0.5 shrink-0" />
          <span>Skor kedua tim berbeda dan kasus diteruskan ke admin. Keputusan admin akan menjadi hasil resmi.</span>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-4">
            <Input label={match.team_a.name} inputMode="numeric" value={score.a} onChange={(e) => setScore({ ...score, a: e.target.value.replace(/\D/g, '') })} aria-label={`Skor ${match.team_a.name}`} />
            <span className="pb-3 text-xl font-bold text-muted">:</span>
            <Input label={match.team_b.name} inputMode="numeric" value={score.b} onChange={(e) => setScore({ ...score, b: e.target.value.replace(/\D/g, '') })} aria-label={`Skor ${match.team_b.name}`} />
          </div>
          {err && <p className="field-error">{err}</p>}
          <Textarea label="Catatan pertandingan" wrapClass="mt-4" rows={1} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Laga selesai sesuai jadwal." />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="secondary" onClick={submit} loading={busy === 'send'}>
              Kirim / perbarui hasil
            </Button>
            {mine && <span className="text-[13px] text-muted">Laporan Anda terkirim {mine.at}.</span>}
          </div>

          <div className="divider my-6" />
          <h3 className="text-lg font-semibold">Laporan dari lawan</h3>
          {opp ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[15px] text-zinc-100">
                {match.team_a.name} {opp.score_a}–{opp.score_b} {match.team_b.name}
              </p>
              {mine && <span className={r.reports_match ? 'badge-ok' : 'badge-danger'}>{r.reports_match ? 'Skor cocok' : 'Skor berbeda'}</span>}
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-muted">{match.opponent.name} belum mengirim laporan skor.</p>
          )}

          {r?.opponent_confirmed && !r.i_confirmed && (
            <div className="notice mt-4">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>{match.opponent.name} sudah mengonfirmasi. Selesaikan konfirmasi tim Anda.</span>
            </div>
          )}
          {mismatch && (
            <div className="mt-4 flex items-start gap-3 rounded-md bg-danger-soft px-4 py-3 text-[15px] text-danger">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>Skor berbeda. Perbarui hasil bila Anda keliru, atau laporkan selisih ke admin.</span>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={confirm} loading={busy === 'confirm'} disabled={r?.i_confirmed || mismatch || (!mine && !opp)}>
              {r?.i_confirmed ? 'Sudah dikonfirmasi' : 'Konfirmasi hasil'}
            </Button>
            <Button variant="secondary" onClick={() => setDispute(true)} disabled={!opp && !mine}>
              Laporkan selisih
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-muted">Hasil resmi setelah kedua tim setuju. ELO baru dihitung jika Premium aktif.</p>
        </>
      )}

      <Modal
        open={dispute}
        onClose={() => setDispute(false)}
        title="Laporkan selisih hasil"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDispute(false)}>Batal</button>
            <Button onClick={sendDispute} loading={busy === 'dispute'}>Kirim ke admin</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted">Admin akan meninjau laporan kedua tim dan menetapkan hasil akhir (UC-18). Sertakan alasan yang jelas.</p>
        <Textarea label="Alasan keberatan" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: gol kedua lawan terjadi setelah waktu habis." />
        <p className="hint">Skor menurut tim Anda: {mine ? `${mine[myKey]}–${mine[oppKey]}` : 'belum diisi'}</p>
      </Modal>
    </article>
  );
}

function HistoryTable({ rows }) {
  if (!rows.length) return <p className="py-6 text-center text-muted">Belum ada riwayat pertandingan.</p>;
  const resultText = (m) => {
    if (m.status === 'cancelled') return 'Dibatalkan';
    const my = m.i_am_a ? m.result.score_a : m.result.score_b;
    const op = m.i_am_a ? m.result.score_b : m.result.score_a;
    return `${my}–${op} · ${m.result.outcome}`;
  };
  const statusText = (m) => (m.status === 'cancelled' ? 'Dibatalkan' : `Terkonfirmasi${m.result?.elo_delta != null ? ` · ${m.result.elo_delta >= 0 ? '+' : ''}${m.result.elo_delta} ELO` : ''}`);
  return (
    <>
      <div className="table-wrap hidden sm:block">
        <table className="table">
          <thead>
            <tr>
              <th>Pertandingan</th>
              <th>Jadwal</th>
              <th>Hasil</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold text-white">
                  {m.team_a.name} vs {m.team_b.name}
                </td>
                <td>
                  {dayMonth(m.match_date)} · {m.time}
                </td>
                <td>{resultText(m)}</td>
                <td className={m.status === 'cancelled' ? 'text-muted' : 'text-brand'}>{statusText(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-ink-600 sm:hidden">
        {rows.map((m) => (
          <li key={m.id} className="py-4 first:pt-0">
            <p className="font-semibold text-white">vs {m.opponent.name}</p>
            <p className="mt-1 text-[15px] text-muted">
              {dayMonth(m.match_date)} · {m.time} · {resultText(m)}
            </p>
            <p className="mt-1 text-[15px] text-brand">{statusText(m)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

/** UC-05 & UC-06 — jadwal dan hasil pertandingan (FR-06..FR-09) */
export default function Matches() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'aktif';
  const active = useAsync(() => matchService.list('active'), []);
  const history = useAsync(() => matchService.list('history'), []);
  const incoming = useAsync(() => matchmakingService.listRequests('incoming'), []);
  const team = { team_name: user.team_name, logo: null };

  const reload = () => {
    active.reload();
    history.reload();
    incoming.reload();
  };

  const act = active.data || [];
  const invCount = (incoming.data || []).filter((r) => r.status === 'pending').length;

  return (
    <>
      <PageHeader title="Pertandingan" subtitle="Satu tempat untuk jadwal, hasil, dan kesepakatan kedua tim." />
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'aktif' ? {} : { tab: v })}
        items={[
          { value: 'aktif', label: `Aktif (${act.length})` },
          { value: 'undangan', label: `Undangan (${invCount})` },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
      />
      <div className="mt-6">
        {tab === 'aktif' &&
          (active.loading ? (
            <LoadingBlock rows={4} />
          ) : active.error ? (
            <ErrorState error={active.error} onRetry={active.reload} />
          ) : (
            <>
              {act.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={CalendarDays}
                    title="Tidak ada pertandingan aktif"
                    text="Terima undangan atau kirim permintaan sparring untuk mulai."
                    action={<Link to="/tim/cari-lawan" className="btn-primary">Cari lawan</Link>}
                  />
                </div>
              ) : (
                <div className="grid items-start gap-6 xl:grid-cols-2">
                  {[...act].sort((a, b) => (a.status === 'proposed' || a.status === 'scheduled' ? 0 : 1) - (b.status === 'proposed' || b.status === 'scheduled' ? 0 : 1)).map((m) => {
                    const needsResult = ['result_pending', 'disputed'].includes(m.status) || (m.status === 'scheduled' && isPast(m));
                    return needsResult ? <ResultCard key={m.id} match={m} team={team} onChange={reload} /> : <ScheduleCard key={m.id} match={m} team={team} onChange={reload} />;
                  })}
                </div>
              )}
              <section className="card card-pad mt-6">
                <h2 className="card-title mb-5">Riwayat terakhir</h2>
                <HistoryTable rows={(history.data || []).slice(0, 3)} />
              </section>
            </>
          ))}
        {tab === 'undangan' && <Invitations box="incoming" onChanged={reload} />}
        {tab === 'riwayat' && (
          <section className="card card-pad">
            <h2 className="card-title mb-5">Riwayat pertandingan</h2>
            {history.loading ? <LoadingBlock /> : <HistoryTable rows={history.data || []} />}
          </section>
        )}
      </div>
    </>
  );
}
