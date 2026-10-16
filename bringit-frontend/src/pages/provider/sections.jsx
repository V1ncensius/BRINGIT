import { useEffect, useState } from 'react';
import { AlertTriangle, Inbox, Plus, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { providerService } from '../../services/providerService';
import { sportService } from '../../services/sportService';
import { BOOKING_STATUS_LABEL, CITIES, TIME_SLOTS } from '../../config/constants';
import { cx, dateShort, dayMonth, rupiah, timeRange, todayISO } from '../../lib/format';

/* ---------------- Pesanan masuk (UC-13 / UC-16) ---------------- */
export function OrderItem({ b, onAction, busy, showActions = true }) {
  const tone = { pending: 'badge-brand', accepted: 'badge-ok', rejected: 'badge-danger', done: 'badge-neutral', paid_out: 'badge-neutral' };
  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{b.match_label}</p>
          <p className="mt-1 text-[13px] text-muted">
            {b.code} · {b.sport} · {dayMonth(b.date)} · {timeRange(b.time, b.duration)}
          </p>
        </div>
        <span className={tone[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="text-[15px]">
          <p className="text-muted">{b.location}</p>
          <p className="mt-1 text-zinc-100">
            {rupiah(b.price)} · Bersih {rupiah(b.net)}
          </p>
        </div>
        {showActions && b.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" className="px-4 py-2" onClick={() => onAction(b, 'accept')} loading={busy === `${b.id}-accept`} disabled={!!busy}>
              Terima
            </Button>
            <Button size="sm" variant="secondary" className="px-4 py-2" onClick={() => onAction(b, 'reject')} loading={busy === `${b.id}-reject`} disabled={!!busy}>
              Tolak
            </Button>
          </div>
        )}
        {showActions && b.status === 'accepted' && (
          <Button size="sm" variant="secondary" onClick={() => onAction(b, 'complete')} loading={busy === `${b.id}-complete`}>
            Tandai selesai
          </Button>
        )}
      </div>
    </li>
  );
}

export function useOrderActions(onChanged) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const [confirmReject, setConfirmReject] = useState(null);
  const [clash, setClash] = useState(null);

  const doAction = async (b, action, force = false) => {
    if (action === 'reject' && !confirmReject) return setConfirmReject(b);
    const res = await run(`${b.id}-${action}`, () => providerService.respond(b.id, action, force), {
      onError: (e) => e.errors?.code === 'CLASH' && setClash({ b, message: e.message }),
    });
    setConfirmReject(null);
    if (res) onChanged();
  };

  const modals = (
    <>
      <Modal
        open={!!confirmReject}
        onClose={() => setConfirmReject(null)}
        title="Tolak pesanan?"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmReject(null)}>Batal</button>
            <Button onClick={() => doAction(confirmReject, 'reject')} loading={!!busy}>Ya, tolak pesanan</Button>
          </>
        }
      >
        <p className="text-[15px] text-muted">Penolakan memicu pengembalian dana otomatis ke tim pemesan dan slot kembali tersedia.</p>
      </Modal>
      <Modal open={!!clash} onClose={() => setClash(null)} title="Jadwal bentrok">
        <div className="flex gap-3 text-[15px] text-warn">
          <AlertTriangle size={20} className="shrink-0" /> {clash?.message} Tolak salah satu pesanan atau hubungi tim pemesan.
        </div>
      </Modal>
    </>
  );
  return { busy, doAction, modals };
}

export function IncomingOrders({ onChanged }) {
  const list = useAsync(() => providerService.bookings('pending'), []);
  const { busy, doAction, modals } = useOrderActions(() => {
    list.reload();
    onChanged?.();
  });
  return (
    <section className="card card-pad">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="card-title">Pesanan masuk</h2>
        <span className="text-[15px] text-muted">Pembayaran ditahan aman</span>
      </div>
      {list.loading ? (
        <LoadingBlock rows={2} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data.length ? (
        <EmptyState icon={Inbox} title="Tidak ada pesanan baru" text="Pesanan dari tim akan muncul di sini." />
      ) : (
        <ul className="divide-y divide-ink-600">
          {list.data.map((b) => (
            <OrderItem key={b.id} b={b} onAction={doAction} busy={busy} />
          ))}
        </ul>
      )}
      <p className="mt-5 text-[13px] text-muted">Penolakan memicu pengembalian dana otomatis ke tim pemesan.</p>
      {modals}
    </section>
  );
}

/* ---------------- Jadwal & ketersediaan (FR-03) ---------------- */
export function ScheduleManager() {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const days = useAsync(() => providerService.slots(), []);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('19.00');
  const [editing, setEditing] = useState(null);

  const add = async () => {
    if (!date || date < todayISO()) return toast('Pilih tanggal hari ini atau setelahnya.', 'error');
    const ok = await run('add', () => providerService.addSlot({ date, time, duration: 60 }));
    if (ok) days.reload();
  };
  const remove = async (id) => (await run(`rm-${id}`, () => providerService.removeSlot(id))) && days.reload();

  return (
    <section className="card card-pad">
      <h2 className="card-title mb-5">Jadwal &amp; ketersediaan</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input label="Tanggal" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="Jam tersedia" value={time} onChange={(e) => setTime(e.target.value)}>
          {TIME_SLOTS.map((t) => (
            <option key={t} value={t}>
              {timeRange(t, 60)} WIB
            </option>
          ))}
        </Select>
        <Button onClick={add} loading={busy === 'add'} className="sm:mb-[3px]">
          <Plus size={16} /> Tambah slot
        </Button>
      </div>
      <div className="mt-6">
        {days.loading ? (
          <LoadingBlock rows={3} />
        ) : !days.data?.length ? (
          <p className="py-6 text-center text-muted">Belum ada slot. Tambahkan jadwal agar tim bisa memesan.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Slot waktu</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {days.data.map((d) => {
                  const held = d.slots.filter((s) => s.booking_code);
                  const free = d.slots.filter((s) => !s.booking_code);
                  return (
                    <tr key={d.date}>
                      <td className="whitespace-nowrap font-semibold text-white">{dateShort(d.date)}</td>
                      <td>
                        {editing === d.date ? (
                          <div className="flex flex-wrap gap-2">
                            {d.slots.map((s) => (
                              <span key={s.id} className={s.booking_code ? 'badge-brand' : 'badge-neutral'}>
                                {timeRange(s.time, s.duration)}
                                {!s.booking_code && (
                                  <button onClick={() => remove(s.id)} aria-label={`Hapus slot ${s.time}`} className="ml-1 hover:text-white">
                                    <X size={13} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          d.slots.map((s) => timeRange(s.time, s.duration)).join(' / ')
                        )}
                      </td>
                      <td className="whitespace-nowrap text-brand">
                        {held.length ? `Ditahan · ${held.map((s) => s.booking_code).join(', ')}` : 'Tersedia'}
                        {free.length > 0 && (
                          <>
                            {' · '}
                            <button onClick={() => setEditing(editing === d.date ? null : d.date)} className="hover:underline">
                              {editing === d.date ? 'Selesai' : 'Edit'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Riwayat & pendapatan (UC-14 / UC-17) ---------------- */
const PERIODS = [
  ['2026-10', 'Oktober 2026'],
  ['2026-09', 'September 2026'],
  ['all', 'Semua periode'],
];

export function Earnings({ compact = false }) {
  const [period, setPeriod] = useState('2026-10');
  const data = useAsync(() => providerService.earnings(period), [period]);
  const [showAll, setShowAll] = useState(!compact);
  const rows = data.data?.rows || [];
  const visible = showAll ? rows : rows.slice(0, 3);
  const STATUS = { done: 'Selesai', paid_out: 'Dibayarkan', accepted: 'Dijadwalkan' };

  return (
    <section className="card card-pad">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title">Riwayat &amp; pendapatan</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="cursor-pointer bg-transparent text-[15px] text-muted hover:text-white focus:outline-none" aria-label="Periode">
          {PERIODS.map(([v, l]) => (
            <option key={v} value={v} className="bg-ink-800">
              {l}
            </option>
          ))}
        </select>
      </div>
      {data.loading ? (
        <LoadingBlock rows={3} />
      ) : data.error ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : !rows.length ? (
        <p className="py-6 text-center text-muted">Data riwayat masih kosong untuk periode ini.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pesanan</th>
                  <th>Tim pemesan</th>
                  <th>Bersih</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.code}>
                    <td className="whitespace-nowrap font-semibold text-white">
                      {r.code} · {dayMonth(r.date)}
                    </td>
                    <td>{r.team_name}</td>
                    <td>{rupiah(r.net)}</td>
                    <td className="text-brand">{STATUS[r.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!compact && (
            <div className="mt-5 flex justify-between border-t border-ink-600 pt-4">
              <span className="font-semibold text-white">Total bersih diterima</span>
              <span className="text-lg font-bold text-white">{rupiah(data.data.total_net)}</span>
            </div>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">Rekening pencairan: {data.data?.payout_account || '-'}</span>
        {compact && rows.length > 3 && (
          <button onClick={() => setShowAll((s) => !s)} className="btn-secondary btn-sm">
            {showAll ? 'Ringkas' : 'Lihat laporan'}
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------------- Profil & tarif (UC-12 / UC-15, FR-03, FR-27) ---------------- */
export function ProfileForm({ onSaved }) {
  const toast = useToast();
  const { refresh } = useAuth();
  const [busy, run] = useAction(toast);
  const profile = useAsync(() => providerService.getProfile(), []);
  const sports = useAsync(() => sportService.listActive(), []);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const p = profile.data;
    if (p) setF({ name: p.name, city: p.city, rate: p.rate ? String(p.rate) : '', specialization: p.specialization || [], license: p.license || '', duration: p.duration || '60 menit / pertandingan', package: p.package || '', delivery: p.delivery || '', portfolio: p.portfolio || '', bio: p.bio || '' });
  }, [profile.data]);

  if (profile.loading || !f) return <section className="card card-pad"><LoadingBlock rows={4} /></section>;
  const p = profile.data;
  const isRef = p.type === 'referee';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rate = Number(f.rate.replace(/\D/g, '')) || 0;
  const commissionPct = 10;

  const toggleSport = (name) => setF((x) => ({ ...x, specialization: x.specialization.includes(name) ? x.specialization.filter((s) => s !== name) : [...x.specialization, name] }));

  const save = async () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Nama wajib diisi.';
    if (!rate) e.rate = 'Tarif harus lebih dari 0.';
    if (isRef && !f.specialization.length) e.specialization = 'Pilih minimal satu spesialisasi cabang.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const ok = await run('save', () => providerService.updateProfile({ ...f, rate }), { onError: (x) => setErrors(x.errors || {}) });
    if (ok) {
      profile.reload();
      refresh();
      onSaved?.();
    }
  };

  return (
    <section className="card card-pad">
      <h2 className="card-title">{isRef ? 'Profil & tarif wasit' : 'Profil & tarif fotografer'}</h2>
      <div className="mt-4">
        {p.verification_status === 'verified' ? (
          <span className="badge-ok px-2.5 py-1.5 text-[13px]">Akun terverifikasi</span>
        ) : p.verification_status === 'rejected' ? (
          <span className="badge-danger px-2.5 py-1.5 text-[13px]">Verifikasi ditolak</span>
        ) : (
          <span className="badge-warn px-2.5 py-1.5 text-[13px]">Menunggu verifikasi admin</span>
        )}
      </div>
      <div className="mt-5 space-y-5">
        <Input label="Nama penyedia" value={f.name} onChange={set('name')} error={errors.name} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Kota layanan" value={f.city} onChange={set('city')}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Input label={`Tarif / ${isRef ? 'laga' : 'sesi'}`} inputMode="numeric" value={rate ? rupiah(rate) : ''} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/\D/g, '') })} error={errors.rate} placeholder="Rp350.000" />
        </div>

        {isRef ? (
          <>
            <div>
              <p className="label">Spesialisasi wasit</p>
              <div className="flex flex-wrap gap-2">
                {(sports.data || []).map((s) => {
                  const on = f.specialization.includes(s.name);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSport(s.name)} aria-pressed={on} className={cx('rounded-md border px-3 py-2 text-sm font-medium transition-colors', on ? 'border-brand bg-brand-soft text-brand' : 'border-ink-600 bg-ink-900 text-zinc-300 hover:border-ink-500')}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
              {errors.specialization ? <p className="field-error">{errors.specialization}</p> : <p className="hint">Anda hanya tampil di pencarian tim untuk cabang yang dipilih.</p>}
            </div>
            <Input label="Lisensi / sertifikasi" value={f.license} onChange={set('license')} placeholder="Lisensi futsal level 2" />
            <Input label="Durasi layanan" value={f.duration} onChange={set('duration')} />
          </>
        ) : (
          <>
            <Input label="Paket fotografi" value={f.package} onChange={set('package')} placeholder="60 menit · 50 foto edit" />
            <Input label="Waktu pengiriman" value={f.delivery} onChange={set('delivery')} placeholder="3 hari setelah pertandingan" />
            <Input label="Portofolio" value={f.portfolio} onChange={set('portfolio')} placeholder="instagram.com/akunmu" />
          </>
        )}
        <Textarea label="Deskripsi singkat" rows={2} value={f.bio} onChange={set('bio')} />
      </div>
      <div className="mt-5 flex justify-between text-[15px]">
        <span className="text-muted">Komisi Bringit</span>
        <span className="text-zinc-100">
          {commissionPct}% · {rupiah((rate * commissionPct) / 100)}
        </span>
      </div>
      <Button className="mt-5" size="lg" onClick={save} loading={busy === 'save'}>
        Simpan profil {isRef ? 'wasit' : 'fotografer'}
      </Button>
      {p.verification_status !== 'verified' && <p className="mt-4 text-[13px] text-muted">Profil tampil di pencarian setelah admin memverifikasi dokumen Anda. Pesanan belum bisa diterima sebelum verifikasi selesai.</p>}
      {p.verification_status === 'verified' && p.slots?.[0] && (
        <p className="mt-4 text-[13px] text-muted">
          Tersedia {dayMonth(p.slots[0].date)} · {timeRange(p.slots[0].time, p.slots[0].duration)} WIB
        </p>
      )}
    </section>
  );
}
