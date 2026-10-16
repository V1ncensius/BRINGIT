import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronDown, Gavel, ShieldCheck } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import { Input, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { adminService } from '../../services/adminService';
import { ROLE_LABEL } from '../../config/constants';
import { cx, dateShort, dayMonth, rupiah } from '../../lib/format';

/* ---------------- Ringkasan (FR-24) ---------------- */
export function AdminStats({ data }) {
  const s = data;
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard
        loading={!s}
        label="Menunggu verifikasi"
        value={s && `${s.pending_count} akun`}
        note={s && `${s.pending_breakdown.team} tim · ${s.pending_breakdown.referee} wasit · ${s.pending_breakdown.photographer} fotografer`}
      />
      <StatCard loading={!s} label="Laporan konten" value={s?.report_count} note={s && `${s.high_priority} laporan prioritas tinggi · ${s.dispute_count} sengketa`} />
      <StatCard loading={!s} label="Volume transaksi Oktober" value={s && rupiah(s.volume_month)} note="Langganan premium & pemesanan jasa" />
    </section>
  );
}

/* ---------------- Verifikasi akun (FR-21) ---------------- */
export function VerificationPanel({ onChanged }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const list = useAsync(() => adminService.verifications(), []);
  const [sel, setSel] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (list.data && (!sel || !list.data.some((x) => x.id === sel.id))) setSel(list.data[0] || null);
  }, [list.data, sel]);

  const decide = async (action) => {
    if (action === 'reject' && !reason.trim()) return toast('Tuliskan alasan penolakan.', 'error');
    const ok = await run(action, () => adminService.verify(sel.id, action, reason));
    if (ok) {
      setRejecting(false);
      setReason('');
      list.reload();
      onChanged?.();
    }
  };

  return (
    <section className="card card-pad">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="card-title">Verifikasi akun</h2>
        <span className="text-[15px] text-muted">{list.data?.length ?? 0} menunggu</span>
      </div>
      {list.loading ? (
        <LoadingBlock rows={3} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data.length ? (
        <EmptyState icon={BadgeCheck} title="Semua akun sudah ditinjau" text="Pendaftar baru akan muncul di sini." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                  <th>Dokumen</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((u) => (
                  <tr key={u.id} className={sel?.id === u.id ? 'bg-ink-750/60' : ''}>
                    <td className="font-semibold text-white">{u.name}</td>
                    <td>{ROLE_LABEL[u.role]}</td>
                    <td>{u.document}</td>
                    <td>
                      <button onClick={() => setSel(u)} className="inline-flex items-center gap-1 text-brand hover:underline">
                        Tinjau <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sel && (
            <div className="mt-5 flex flex-col gap-4 border-t border-ink-600 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  {sel.name} · {ROLE_LABEL[sel.role]}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {sel.note || sel.document} · {sel.city} · Diajukan {dayMonth(sel.created_at)}
                </p>
                <p className="mt-1 text-[13px] text-muted">{sel.email}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="px-4 py-2.5" onClick={() => decide('approve')} loading={busy === 'approve'} disabled={!!busy}>
                  Verifikasi
                </Button>
                <Button size="sm" variant="secondary" className="px-4 py-2.5" onClick={() => setRejecting(true)} disabled={!!busy}>
                  Tolak
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={`Tolak verifikasi ${sel?.name || ''}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRejecting(false)}>Batal</button>
            <Button onClick={() => decide('reject')} loading={busy === 'reject'}>Kirim penolakan</Button>
          </>
        }
      >
        <Textarea label="Alasan penolakan" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: foto lisensi tidak terbaca, mohon unggah ulang." hint="Alasan dikirim ke pengguna melalui notifikasi & email." />
      </Modal>
    </section>
  );
}

/* ---------------- Moderasi konten (FR-22) ---------------- */
export function ModerationPanel({ onChanged }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const list = useAsync(() => adminService.reports(), []);
  const [idx, setIdx] = useState(0);
  const items = list.data || [];
  const r = items[Math.min(idx, items.length - 1)];

  const act = async (action) => {
    const ok = await run(action, () => adminService.moderate(r.id, action));
    if (ok) {
      setIdx(0);
      list.reload();
      onChanged?.();
    }
  };

  return (
    <section className="card card-pad">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="card-title">Moderasi konten</h2>
        {items.length > 1 && (
          <span className="text-[13px] text-muted">
            {Math.min(idx, items.length - 1) + 1} / {items.length}
          </span>
        )}
      </div>
      {list.loading ? (
        <div className="mt-5"><LoadingBlock rows={2} /></div>
      ) : !r ? (
        <EmptyState icon={ShieldCheck} title="Tidak ada laporan terbuka" />
      ) : (
        <>
          <span className={cx('mt-5', r.priority === 'high' ? 'badge-brand' : 'badge-neutral')}>{r.priority === 'high' ? 'Prioritas tinggi' : 'Prioritas normal'}</span>
          <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
          <p className="mt-3 text-[15px] text-muted">
            Laporan {r.code} · {r.reason}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-100">“{r.excerpt}”</p>
          <p className="mt-4 text-[13px] text-muted">
            Pelapor: {r.reporter} · {r.created_at}
          </p>
          <div className="divider my-5" />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => act('remove')} loading={busy === 'remove'} disabled={!!busy}>
              Hapus konten
            </Button>
            <Button variant="secondary" onClick={() => act('dismiss')} loading={busy === 'dismiss'} disabled={!!busy}>
              Abaikan
            </Button>
            {items.length > 1 && (
              <button className="btn-ghost" onClick={() => setIdx((i) => (i + 1) % items.length)}>
                Berikutnya
              </button>
            )}
          </div>
          <p className="mt-4 text-[13px] text-muted">Keputusan dicatat dalam log moderasi.</p>
        </>
      )}
    </section>
  );
}

/* ---------------- Sengketa hasil (FR-25) ---------------- */
export function DisputePanel({ onChanged }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const list = useAsync(() => adminService.disputes(), []);
  const [scores, setScores] = useState({});

  const resolve = async (d) => {
    const s = scores[d.id] || { a: d.report_a?.score_a ?? '', b: d.report_a?.score_b ?? '' };
    if (s.a === '' || s.b === '') return toast('Isi skor keputusan.', 'error');
    const ok = await run(`r-${d.id}`, () => adminService.resolveDispute(d.id, { score_a: Number(s.a), score_b: Number(s.b) }));
    if (ok) {
      list.reload();
      onChanged?.();
    }
  };
  const askInfo = (d) => run(`i-${d.id}`, () => adminService.resolveDispute(d.id, { action: 'request_info' }));

  return (
    <section className="card card-pad">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="card-title">Sengketa hasil pertandingan</h2>
        <span className="text-[15px] text-muted">{list.data?.length ?? 0} terbuka</span>
      </div>
      {list.loading ? (
        <LoadingBlock rows={2} />
      ) : !list.data?.length ? (
        <EmptyState icon={Gavel} title="Tidak ada sengketa terbuka" />
      ) : (
        <ul className="divide-y divide-ink-600">
          {list.data.map((d) => {
            const s = scores[d.id] || { a: d.report_a?.score_a ?? '', b: d.report_a?.score_b ?? '' };
            return (
              <li key={d.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-semibold text-white">
                    {d.match.team_a} vs {d.match.team_b}
                  </p>
                  <span className="text-[13px] text-muted">
                    {d.code} · {d.match.code} · {dateShort(d.match.date)}
                  </span>
                </div>
                <p className="mt-2 text-[15px] text-muted">{d.description}</p>
                <div className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
                  <p className="rounded-md bg-ink-750 px-3 py-2">
                    Laporan {d.match.team_a}: <b className="text-white">{d.report_a ? `${d.report_a.score_a}–${d.report_a.score_b}` : '—'}</b>
                  </p>
                  <p className="rounded-md bg-ink-750 px-3 py-2">
                    Laporan {d.match.team_b}: <b className="text-white">{d.report_b ? `${d.report_b.score_a}–${d.report_b.score_b}` : '—'}</b>
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="flex items-end gap-2">
                    <Input label="Skor A" inputMode="numeric" className="w-20" value={s.a} onChange={(e) => setScores({ ...scores, [d.id]: { ...s, a: e.target.value.replace(/\D/g, '') } })} />
                    <span className="pb-3 font-bold text-muted">:</span>
                    <Input label="Skor B" inputMode="numeric" className="w-20" value={s.b} onChange={(e) => setScores({ ...scores, [d.id]: { ...s, b: e.target.value.replace(/\D/g, '') } })} />
                  </div>
                  <Button onClick={() => resolve(d)} loading={busy === `r-${d.id}`} disabled={!!busy}>
                    Tetapkan hasil
                  </Button>
                  <Button variant="secondary" onClick={() => askInfo(d)} loading={busy === `i-${d.id}`} disabled={!!busy}>
                    Minta data tambahan
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Paket langganan (FR-23) ---------------- */
export function PlanForm() {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const plans = useAsync(() => adminService.plans(), []);
  const [id, setId] = useState(null);
  const [f, setF] = useState(null);

  useEffect(() => {
    if (plans.data?.length) {
      const p = plans.data.find((x) => x.id === id) || plans.data[0];
      setId(p.id);
      setF({ name: p.name, price: String(p.price), duration_days: String(p.duration_days), active: p.active, features: p.features });
    }
  }, [plans.data, id]);

  if (!f) return <section className="card card-pad"><LoadingBlock rows={3} /></section>;
  const save = async () => (await run('plan', () => adminService.savePlan(id, { ...f, price: Number(f.price), duration_days: Number(f.duration_days) }))) && plans.reload();

  return (
    <section className="card card-pad">
      <div className="flex items-center justify-between gap-3">
        <h2 className="card-title">Paket langganan</h2>
        {plans.data.length > 1 && (
          <label className="relative inline-flex items-center text-sm text-muted">
            <select value={id} onChange={(e) => setId(Number(e.target.value))} className="cursor-pointer appearance-none bg-transparent pr-5 hover:text-white focus:outline-none" aria-label="Pilih paket">
              {plans.data.map((p) => (
                <option key={p.id} value={p.id} className="bg-ink-800">{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-0" />
          </label>
        )}
      </div>
      <div className="mt-5 space-y-4">
        <Input label="Nama paket" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Harga" inputMode="numeric" value={f.price ? rupiah(f.price) : ''} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} />
          <Input label="Durasi" inputMode="numeric" value={f.duration_days ? `${f.duration_days} hari` : ''} onChange={(e) => setF({ ...f, duration_days: e.target.value.replace(/\D/g, '') })} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[15px] text-muted">Status paket</span>
        <button onClick={() => setF({ ...f, active: !f.active })} className={f.active ? 'badge-ok px-2.5 py-1.5 text-[13px]' : 'badge-neutral px-2.5 py-1.5 text-[13px]'} aria-pressed={f.active}>
          {f.active ? 'Aktif' : 'Nonaktif'}
        </button>
      </div>
      <p className="mt-4 text-[13px] text-muted">{f.features}</p>
      <Button variant="secondary" className="mt-5" onClick={save} loading={busy === 'plan'}>
        Simpan paket
      </Button>
    </section>
  );
}

/* ---------------- Komisi & biaya (FR-23) ---------------- */
export function CommissionForm() {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const data = useAsync(() => adminService.commission(), []);
  const [f, setF] = useState(null);
  useEffect(() => {
    if (data.data) setF({ provider_commission: String(data.data.provider_commission), team_fee: String(data.data.team_fee) });
  }, [data.data]);
  if (!f) return <section className="card card-pad"><LoadingBlock rows={3} /></section>;
  const pc = Number(f.provider_commission) || 0;
  const tf = Number(f.team_fee) || 0;
  const ex = 350000;
  const save = () => run('com', () => adminService.saveCommission({ provider_commission: pc, team_fee: tf }));
  return (
    <section className="card card-pad">
      <h2 className="card-title">Komisi &amp; biaya</h2>
      <div className="mt-5 space-y-4">
        <Input label="Komisi penyedia jasa (%)" inputMode="numeric" value={f.provider_commission} onChange={(e) => setF({ ...f, provider_commission: e.target.value.replace(/[^\d.]/g, '') })} hint={`${pc}% dari tarif jasa`} />
        <Input label="Biaya layanan tim (%)" inputMode="numeric" value={f.team_fee} onChange={(e) => setF({ ...f, team_fee: e.target.value.replace(/[^\d.]/g, '') })} hint={`${tf}% dari tarif jasa`} />
      </div>
      <p className="mt-4 text-[13px] text-muted">
        Contoh tarif {rupiah(ex)}: penyedia menerima {rupiah(ex - (ex * pc) / 100)}; tim membayar {rupiah(ex + (ex * tf) / 100)}.
      </p>
      <p className="mt-3 text-[13px] text-muted">Perubahan berlaku hanya untuk pesanan baru.</p>
      <Button variant="secondary" className="mt-5" onClick={save} loading={busy === 'com'}>
        Simpan komisi
      </Button>
    </section>
  );
}

/* ---------------- Cabang olahraga (FR-26, NFR-14) ---------------- */
export function SportsPanel() {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const sports = useAsync(() => adminService.sports(), []);
  const [name, setName] = useState('');
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast('Nama cabang wajib diisi.', 'error');
    const ok = await run('add', () => adminService.addSport(name));
    if (ok) {
      setName('');
      sports.reload();
    }
  };
  const toggle = async (s) => (await run(`t-${s.id}`, () => adminService.toggleSport(s.id, !s.active))) && sports.reload();
  return (
    <section className="card card-pad">
      <h2 className="card-title">Cabang olahraga</h2>
      {sports.loading ? (
        <div className="mt-4"><LoadingBlock rows={3} /></div>
      ) : (
        <ul className="mt-2 divide-y divide-ink-600">
          {sports.data.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3.5">
              <span className={s.active ? 'text-zinc-100' : 'text-muted line-through'}>{s.name}</span>
              <button onClick={() => toggle(s)} disabled={!!busy} className={s.active ? 'badge-ok px-2.5 py-1.5 text-[13px] hover:opacity-80' : 'badge-neutral px-2.5 py-1.5 text-[13px] hover:opacity-80'} title={s.active ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}>
                {s.active ? 'Aktif' : 'Nonaktif'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-2 flex items-end gap-3">
        <Input label="Cabang baru" wrapClass="flex-1" placeholder="Nama olahraga" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="secondary" loading={busy === 'add'} className="mb-[3px]">
          Tambah
        </Button>
      </form>
    </section>
  );
}

/* ---------------- Laporan transaksi (FR-24) ---------------- */
export function downloadCSV(rows, filename = 'laporan-transaksi-bringit.csv') {
  const head = ['ID transaksi', 'Pengguna', 'Jenis', 'Metode', 'Total', 'Status', 'Tanggal'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((r) => [r.code, r.user_label, r.type_label, r.method, r.amount, r.status_label, r.created_at].map(esc).join(','));
  const blob = new Blob([`﻿${[head.map(esc).join(','), ...body].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STATUS_OPTS = [
  ['', 'Semua status'],
  ['held', 'Dana ditahan'],
  ['success', 'Berhasil'],
  ['done', 'Selesai'],
  ['paid_out', 'Dibayarkan'],
  ['refunded', 'Dikembalikan'],
  ['failed', 'Gagal'],
  ['pending', 'Menunggu'],
];

export function TransactionsTable({ limit }) {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const tx = useAsync(() => adminService.transactions({ type, status }), [type, status]);
  const rows = tx.data || [];
  const shown = limit ? rows.slice(0, limit) : rows;
  const tone = (s) => (s === 'failed' ? 'text-danger' : s === 'refunded' || s === 'pending' ? 'text-muted' : 'text-brand');

  const chip = 'relative inline-flex items-center rounded bg-ink-700 text-[13px] font-semibold text-zinc-200';
  return (
    <section className="card card-pad">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="card-title">Laporan transaksi</h2>
        <span className="text-[15px] text-muted">Oktober 2026</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className={chip}>
            <select value={type} onChange={(e) => setType(e.target.value)} className="cursor-pointer appearance-none bg-transparent py-1.5 pl-2.5 pr-7 focus:outline-none" aria-label="Jenis transaksi">
              <option value="" className="bg-ink-800">Semua jenis</option>
              <option value="subscription" className="bg-ink-800">Langganan premium</option>
              <option value="booking" className="bg-ink-800">Pemesanan jasa</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2" />
          </label>
          <label className={chip}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="cursor-pointer appearance-none bg-transparent py-1.5 pl-2.5 pr-7 focus:outline-none" aria-label="Status transaksi">
              {STATUS_OPTS.map(([v, l]) => (
                <option key={v} value={v} className="bg-ink-800">{l}</option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2" />
          </label>
        </div>
        <button onClick={() => downloadCSV(rows)} className="inline-flex items-center gap-1 text-[15px] text-brand hover:underline" disabled={!rows.length}>
          Unduh CSV <ArrowRight size={15} />
        </button>
      </div>
      <div className="mt-5">
        {tx.loading ? (
          <LoadingBlock rows={4} />
        ) : tx.error ? (
          <ErrorState error={tx.error} onRetry={tx.reload} />
        ) : !rows.length ? (
          <p className="py-6 text-center text-muted">Tidak ada transaksi untuk filter ini.</p>
        ) : (
          <div className="table-wrap">
            <table className="table min-w-[680px]">
              <thead>
                <tr>
                  <th>ID transaksi</th>
                  <th>Pengguna</th>
                  <th>Jenis</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold text-white">{t.code}</td>
                    <td>{t.user_label}</td>
                    <td>{t.type_label}</td>
                    <td>{rupiah(t.amount)}</td>
                    <td className={tone(t.status)}>{t.status_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-5 text-[13px] text-muted">
        Pembayaran direkonsiliasi melalui payment gateway{limit && rows.length > limit ? ` · Menampilkan ${limit} dari ${rows.length} transaksi` : ''}.
      </p>
    </section>
  );
}

