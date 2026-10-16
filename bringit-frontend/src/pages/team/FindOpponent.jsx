import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Inbox, Send, SlidersHorizontal, SearchX } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { matchmakingService } from '../../services/matchmakingService';
import { teamService } from '../../services/teamService';
import { CITIES, DURATIONS, LEVELS, TIME_SLOTS } from '../../config/constants';
import { cx, dateDayShort, num, timeRange, todayISO } from '../../lib/format';
import { eloGapLabel } from '../../lib/elo';

const PAGE = 4;
const TONE = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger' };
const SORTS = [
  ['elo_nearest', 'ELO terdekat'],
  ['elo_desc', 'ELO tertinggi'],
  ['wins', 'Kemenangan terbanyak'],
];

const nextSaturday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

function TeamRow({ team, selected, onPick }) {
  return (
    <article className={cx('card flex flex-wrap items-center gap-4 p-5 transition-colors', selected ? 'border-brand bg-brand-soft' : 'hover:border-ink-500')}>
      <Avatar initials={team.initials} src={team.logo} />
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold text-white">{team.team_name}</h3>
        <p className="mt-1 text-[15px] text-muted">
          {team.city} · {team.sport} · {team.level}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {team.area} · {team.wins} menang / {team.played} laga
        </p>
      </div>
      <div className="flex w-full items-center justify-between gap-6 sm:w-auto">
        <div className="sm:text-center">
          <p className="text-xl font-bold text-white">{num(team.elo)}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">ELO {team.sport}</p>
        </div>
        <button onClick={() => onPick(team)} className={selected ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} aria-pressed={selected}>
          {selected ? 'Dipilih' : 'Pilih lawan'}
        </button>
      </div>
    </article>
  );
}

function ProposePanel({ team, sport, onSent }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const [f, setF] = useState({ date: nextSaturday(), time: '19.00', duration: 60, location: '', note: '' });
  const [err, setErr] = useState({});
  const gap = eloGapLabel(team.elo_gap);

  useEffect(() => setErr({}), [team.id]);

  const send = async () => {
    const e = {};
    if (!f.date || f.date < todayISO()) e.date = 'Pilih tanggal hari ini atau setelahnya.';
    if (f.location.trim().length < 4) e.location = 'Lengkapi nama lapangan / lokasi.';
    setErr(e);
    if (Object.keys(e).length) return;
    const res = await run('send', () => matchmakingService.sendRequest({ to_team_id: team.id, sport, ...f }), { onError: (x) => setErr(x.errors || {}) });
    if (res) onSent();
  };

  return (
    <div className="card card-pad">
      <h2 className="card-title">{team.team_name}</h2>
      <div className="mt-5 flex items-center gap-3">
        <Avatar initials={team.initials} src={team.logo} />
        <div>
          {team.verified && <span className="badge-ok">Terverifikasi</span>}
          <p className="mt-1 text-[15px] text-muted">Kapten: {team.captain}</p>
        </div>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{team.about}</p>
      <div className="divider my-5" />
      <dl className="space-y-3 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Selisih ELO</dt>
          <dd className={TONE[gap.tone]}>
            {Math.abs(team.elo_gap)} poin · {gap.text}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Waktu tersedia</dt>
          <dd className="text-right text-zinc-100">{team.availability}</dd>
        </div>
      </dl>
      <div className="divider my-5" />
      <h3 className="mb-4 font-semibold text-white">Ajukan sparring</h3>
      <div className="space-y-4">
        <Input label="Tanggal" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} error={err.date} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Mulai" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}>
            {TIME_SLOTS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select label="Durasi" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} menit
              </option>
            ))}
          </Select>
        </div>
        <Input label="Lokasi" placeholder="GOR C-Tra Arena · Lap. 2" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} error={err.location} />
        <Textarea label="Catatan (opsional)" rows={1} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Contoh: rompi disediakan" />
      </div>
      <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={send} loading={busy === 'send'}>
        <Send size={18} /> Kirim undangan
      </Button>
      <p className="mt-3 text-[13px] text-muted">Lawan akan menerima usulan jadwal untuk dikonfirmasi.</p>
    </div>
  );
}

export function Invitations({ box, onChanged }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const list = useAsync(() => matchmakingService.listRequests(box), [box]);
  const act = async (id, action) => {
    const ok = await run(`${id}-${action}`, () => matchmakingService.respond(id, action));
    if (ok) {
      list.reload();
      onChanged?.();
    }
  };
  if (list.loading) return <LoadingBlock />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  const rows = list.data.filter((r) => (box === 'incoming' ? r.status === 'pending' : true));
  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState icon={Inbox} title={box === 'incoming' ? 'Belum ada undangan masuk' : 'Belum ada undangan terkirim'} text="Undangan sparring akan muncul di sini." />
      </div>
    );
  }
  const STATUS = { pending: ['badge-warn', 'Menunggu'], accepted: ['badge-ok', 'Diterima'], rejected: ['badge-danger', 'Ditolak'], expired: ['badge-neutral', 'Kedaluwarsa'], cancelled: ['badge-neutral', 'Dibatalkan'] };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((r) => (
        <article key={r.id} className="card card-pad">
          <div className="flex items-start gap-4">
            <Avatar initials={r.team.initials} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{r.team.team_name}</h3>
                <span className={STATUS[r.status]?.[0]}>{STATUS[r.status]?.[1]}</span>
              </div>
              <p className="mt-1 text-[15px] text-muted">
                {r.sport} · {r.team.level} · ELO {num(r.team.elo)}
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-2 text-[15px]">
            <div className="flex justify-between gap-4"><dt className="text-muted">Tanggal</dt><dd>{dateDayShort(r.date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Waktu</dt><dd>{timeRange(r.time, r.duration)} WIB</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Tempat</dt><dd className="text-right">{r.location}</dd></div>
          </dl>
          {r.note && <p className="mt-4 rounded-md bg-ink-750 px-3.5 py-2.5 text-sm text-zinc-300">“{r.note}”</p>}
          {box === 'incoming' && r.status === 'pending' && (
            <div className="mt-5 flex gap-3">
              <Button onClick={() => act(r.id, 'accept')} loading={busy === `${r.id}-accept`} disabled={!!busy}>Terima</Button>
              <Button variant="secondary" onClick={() => act(r.id, 'reject')} loading={busy === `${r.id}-reject`} disabled={!!busy}>Tolak</Button>
            </div>
          )}
          {box === 'outgoing' && r.status === 'pending' && (
            <Button variant="secondary" size="sm" className="mt-5" onClick={() => act(r.id, 'cancel')} loading={busy === `${r.id}-cancel`}>Batalkan undangan</Button>
          )}
        </article>
      ))}
    </div>
  );
}

/** UC-04 Mencari dan memilih lawan sparring (FR-04, FR-05) */
export default function FindOpponent() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'cari';
  const team = useAsync(() => teamService.getMine(), []);
  const incoming = useAsync(() => matchmakingService.listRequests('incoming'), []);
  const [draft, setDraft] = useState(null);
  const [filter, setFilter] = useState(null);
  const [sort, setSort] = useState('elo_nearest');
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (team.data && !filter) {
      const f = { city: team.data.city, sport: team.data.primary_sport_name, level: team.data.level };
      setDraft(f);
      setFilter(f);
    }
  }, [team.data, filter]);

  const result = useAsync(() => (filter ? matchmakingService.searchTeams({ ...filter, sort }) : Promise.resolve(null)), [filter, sort]);

  useEffect(() => {
    setShown(PAGE);
    setPicked(null);
  }, [filter, sort]);
  useEffect(() => {
    if (result.data?.items?.length && !picked) setPicked(result.data.items[0]);
  }, [result.data, picked]);

  const pendingCount = useMemo(() => (incoming.data || []).filter((r) => r.status === 'pending').length, [incoming.data]);

  const pick = (t) => {
    setPicked(t);
    if (window.innerWidth < 1280) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const items = result.data?.items || [];

  return (
    <>
      <PageHeader title="Cari lawan sparring" subtitle="Pertandingan lebih seru ketika levelnya seimbang." />
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'cari' ? {} : { tab: v })}
        items={[
          { value: 'cari', label: 'Temukan lawan' },
          { value: 'masuk', label: `Undangan masuk${pendingCount ? ` (${pendingCount})` : ''}` },
          { value: 'terkirim', label: 'Undangan terkirim' },
        ]}
      />

      <div className="mt-6">
        {tab === 'masuk' && <Invitations box="incoming" onChanged={incoming.reload} />}
        {tab === 'terkirim' && <Invitations box="outgoing" />}
        {tab === 'cari' && (
          <>
            {!draft ? (
              <LoadingBlock rows={2} />
            ) : (
              <form
                className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  setFilter({ ...draft });
                }}
              >
                <Select label="Kota" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Select label="Cabang olahraga" value={draft.sport} onChange={(e) => setDraft({ ...draft, sport: e.target.value })} hint={undefined}>
                  {(team.data?.sport_names || []).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <Select label="Level" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                  <option value="">Semua level</option>
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
                <div>
                  <p className="mb-2 hidden text-sm text-muted lg:block">Filter pertandingan</p>
                  <Button type="submit" size="lg" className="w-full">
                    <SlidersHorizontal size={18} /> Terapkan filter
                  </Button>
                </div>
              </form>
            )}
            <p className="mt-3 text-[13px] text-muted">Hanya tim dengan cabang olahraga yang sama yang dapat diundang.</p>

            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_350px]">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{result.loading ? 'Mencari…' : `${items.length} tim sesuai preferensimu`}</p>
                  <label className="relative inline-flex items-center text-sm text-muted">
                    <span className="sr-only">Urutkan</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="cursor-pointer appearance-none bg-transparent pr-5 text-right hover:text-white focus:outline-none">
                      {SORTS.map(([v, l]) => (
                        <option key={v} value={v} className="bg-ink-800">
                          {l}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-0" />
                  </label>
                </div>
                {result.loading ? (
                  <LoadingBlock rows={4} />
                ) : result.error ? (
                  <ErrorState error={result.error} onRetry={result.reload} />
                ) : !items.length ? (
                  <div className="card">
                    <EmptyState icon={SearchX} title="Tidak ditemukan lawan yang sesuai" text="Coba ubah level atau kota untuk memperluas pencarian." />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {items.slice(0, shown).map((t) => (
                        <TeamRow key={t.id} team={t} selected={picked?.id === t.id} onPick={pick} />
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-[15px] text-muted">
                        Menampilkan {Math.min(shown, items.length)} dari {items.length} tim
                      </p>
                      {shown < items.length && (
                        <button onClick={() => setShown((s) => s + PAGE)} className="btn-secondary btn-sm">
                          Muat lebih banyak
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div ref={panelRef} className="scroll-mt-24 xl:sticky xl:top-[96px]">
                {picked && <ProposePanel team={picked} sport={filter.sport} onSent={() => setParams({ tab: 'terkirim' })} />}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
