import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import LineChart from '../../components/ui/LineChart';
import SummaryRow from '../../components/ui/SummaryRow';
import PaymentModal from '../../components/PaymentModal';
import { Select } from '../../components/ui/Field';
import { ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { eloService } from '../../services/eloService';
import { paymentService } from '../../services/paymentService';
import { teamService } from '../../services/teamService';
import { CITIES, PAYMENT_METHODS } from '../../config/constants';
import { cx, dateLong, dayMonth, num, rupiah } from '../../lib/format';

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const season = (h) => (h.length ? `Musim ${BLN[new Date(h[0].date).getMonth()]}–${BLN[new Date(h.at(-1).date).getMonth()]} ${new Date(h.at(-1).date).getFullYear()}` : 'Belum ada data');

function Leaderboard({ sport, defaultCity }) {
  const [city, setCity] = useState(defaultCity);
  const [all, setAll] = useState(false);
  const board = useAsync(() => eloService.leaderboard(sport, city), [sport, city]);
  useEffect(() => setAll(false), [sport, city]);

  let rows = board.data || [];
  if (!all && rows.length > 6) {
    const me = rows.findIndex((r) => r.is_me);
    rows = rows.filter((r, i) => i < 3 || (me >= 0 && Math.abs(i - me) <= 1));
  }

  return (
    <section className="card card-pad">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="card-title">Ranking {sport.toLowerCase()}</h2>
        <label className="relative inline-flex items-center text-[15px] text-muted">
          <span className="sr-only">Kota</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="cursor-pointer appearance-none bg-transparent pr-5 hover:text-white focus:outline-none">
            {CITIES.map((c) => (
              <option key={c} className="bg-ink-800">
                {c}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0" />
        </label>
      </div>
      {board.loading ? (
        <LoadingBlock />
      ) : board.error ? (
        <ErrorState error={board.error} onRetry={board.reload} />
      ) : !rows.length ? (
        <p className="py-6 text-center text-muted">Belum ada tim {sport.toLowerCase()} di {city}.</p>
      ) : (
        <div className="table-wrap">
          <table className="table min-w-0">
            <thead>
              <tr>
                <th className="w-20">Peringkat</th>
                <th>Tim</th>
                <th className="w-16 sm:w-24">Main</th>
                <th className="w-20 sm:w-48">ELO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.is_me ? 'bg-brand-soft' : ''}>
                  <td className="font-semibold text-white">#{r.rank}</td>
                  <td className={r.is_me ? 'font-semibold text-white' : ''}>{r.team_name}</td>
                  <td className={r.is_me ? 'font-semibold text-white' : ''}>{r.played}</td>
                  <td className={r.is_me ? 'font-semibold text-white' : ''}>{num(r.elo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <span className="text-muted">Diperbarui otomatis setiap hasil dinyatakan final.</span>
        {(board.data?.length || 0) > 6 && (
          <button onClick={() => setAll((a) => !a)} className="inline-flex items-center gap-1 text-[15px] text-brand hover:underline">
            {all ? 'Ringkas' : 'Semua peringkat'} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </section>
  );
}

function PremiumCard({ elo, onActivated }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const plans = useAsync(() => paymentService.plans(), []);
  const [planId, setPlanId] = useState('');
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    if (plans.data?.length && !planId) setPlanId(String(plans.data[0].id));
  }, [plans.data, planId]);

  const plan = plans.data?.find((p) => String(p.id) === planId);
  const sub = elo?.subscription;

  const pay = async () => {
    const res = await run('pay', () => paymentService.checkoutSubscription(Number(planId), method), { success: null });
    if (res) setCheckout(res);
  };

  const onResult = (status) => {
    setCheckout(null);
    if (status === 'success') {
      toast('Pembayaran berhasil. Premium aktif — ELO kini diperbarui otomatis.', 'success');
      onActivated();
    } else if (status === 'failed') toast('Transaksi gagal atau dibatalkan. Premium belum diaktifkan.', 'error');
    else if (status === 'pending') toast('Transaksi disimpan dengan status menunggu pembayaran.', 'info');
    else toast('Payment gateway tidak merespons. Status akan diperiksa ulang.', 'error');
  };

  return (
    <aside className="card card-pad">
      <h2 className="card-title">Bringit Premium</h2>
      <div className="mt-5 flex items-center justify-between">
        <span className="badge-brand">{plan?.duration_days > 31 ? 'Musiman' : 'Bulanan'}</span>
        <span className={sub ? 'badge-ok' : 'badge-neutral'}>{sub ? 'Aktif' : 'Belum aktif'}</span>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-[38px] font-bold tracking-tight text-white">{plan ? rupiah(plan.price) : '—'}</span>
        <span className="text-[15px] text-muted">/ {plan?.duration_days > 31 ? `${plan.duration_days} hari` : 'bulan'}</span>
      </p>
      <ul className="mt-4 space-y-3 text-[15px] text-zinc-100">
        {['ELO terpisah per cabang olahraga', 'Ranking kota & nasional', 'Statistik dan riwayat progres', 'Rekomendasi lawan selevel'].map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check size={15} className="text-zinc-300" /> {f}
          </li>
        ))}
      </ul>
      <div className="divider my-6" />
      {sub ? (
        <>
          <h3 className="text-lg font-semibold">Langganan aktif</h3>
          <SummaryRow label="Paket" value={plans.data?.find((p) => p.id === sub.plan_id)?.name || 'Premium'} />
          <SummaryRow label="Berlaku hingga" value={dateLong(sub.end_date)} />
          <p className="mt-4 text-[13px] text-muted">Tanpa perpanjangan otomatis. Anda dapat memperpanjang setelah masa aktif berakhir.</p>
        </>
      ) : (
        <>
          <h3 className="mb-4 text-lg font-semibold">Aktivasi langganan</h3>
          <div className="space-y-4">
            <Select label="Paket" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {(plans.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.duration_days} hari
                </option>
              ))}
            </Select>
            <Select label="Metode pembayaran" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
          <div className="mt-5">
            <SummaryRow label="Harga langganan" value={plan ? rupiah(plan.price) : '—'} />
            <SummaryRow label="Biaya layanan" value="Rp0" />
            <div className="divider my-3" />
            <SummaryRow label="Total pembayaran" value={plan ? rupiah(plan.price) : '—'} strong />
          </div>
          <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={pay} loading={busy === 'pay'} disabled={!plan}>
            Aktifkan &amp; bayar <ArrowRight size={18} />
          </Button>
          <p className="mt-4 text-[13px] text-muted">Anda diarahkan ke payment gateway. Premium aktif otomatis setelah pembayaran berhasil.</p>
          <p className="mt-3 text-[13px] text-muted">Berlaku {plan?.duration_days || 30} hari · Tanpa perpanjangan otomatis.</p>
        </>
      )}
      <PaymentModal checkout={checkout} onResult={onResult} />
    </aside>
  );
}

/** UC-07 Mengaktifkan langganan premium & UC-08 Melihat ranking dan statistik ELO */
export default function PremiumElo() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [sport, setSport] = useState(null);
  const sports = useAsync(() => teamService.getMine(), []);
  useEffect(() => {
    if (sports.data && !sport) setSport(sports.data.primary_sport_name);
  }, [sports.data, sport]);
  const elo = useAsync(() => (sport ? eloService.getMine(sport) : Promise.resolve(null)), [sport]);

  if (elo.error) return <ErrorState error={elo.error} onRetry={elo.reload} />;
  if (!sport || !elo.data) return <LoadingBlock rows={5} />;
  const e = elo.data;
  const hist = e?.history || [];

  return (
    <>
      <PageHeader title="Premium & ranking ELO" subtitle="Pantau progres per cabang olahraga. Main lebih terarah, naik lebih jauh." />
      <Tabs value={sport} onChange={setSport} items={(sports.data?.sport_names || []).map((s) => ({ value: s, label: s }))} />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_370px]">
        <div className="space-y-6">
          <section className="card card-pad">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="card-title">Statistik {sport.toLowerCase()}</h2>
              <span className="text-[15px] text-muted">{user.team_name}</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted sm:text-[13px]">ELO saat ini</p>
                <p className="mt-1 text-[26px] font-bold text-white sm:text-[32px]">{num(e.rating)}</p>
                <p className={cx('mt-1 text-[13px]', e.last_delta >= 0 ? 'text-ok' : 'text-danger')}>
                  {hist.length > 1 ? `${e.last_delta >= 0 ? '+' : ''}${e.last_delta} pertandingan terakhir` : 'Rating awal'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted sm:text-[13px]">Ranking {e.city}</p>
                <p className="mt-1 text-[26px] font-bold text-white sm:text-[32px]">#{e.rank}</p>
                <p className="mt-1 text-[13px] text-muted">Dari {e.total_teams} tim</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted sm:text-[13px]">Tingkat menang</p>
                <p className="mt-1 text-[26px] font-bold text-white sm:text-[32px]">{e.win_rate}%</p>
                <p className="mt-1 text-[13px] text-muted">
                  {e.wins}M · {e.draws}S · {e.losses}K
                </p>
              </div>
            </div>
            <div className="divider my-6" />
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-white">Perjalanan ELO</h3>
              <span className="badge-neutral px-2.5 py-1.5 text-[13px]">{season(hist)}</span>
            </div>
            {hist.length > 1 ? (
              <LineChart data={hist} />
            ) : (
              <p className="py-10 text-center text-[15px] text-muted">Belum ada pertandingan final. Rating awal {num(e.rating)} — grafik muncul setelah hasil pertama.</p>
            )}
            <p className="mt-3 text-[13px] text-muted">
              {e.is_premium
                ? 'ELO diperbarui otomatis setelah hasil pertandingan dikonfirmasi kedua tim.'
                : `Data hingga ${e.last_update ? dayMonth(e.last_update) : '-'}. Aktifkan Premium untuk pembaruan ELO berikutnya.`}
            </p>
          </section>
          <Leaderboard sport={sport} defaultCity={e.city} />
        </div>

        <PremiumCard
          elo={e}
          onActivated={() => {
            elo.reload();
            refresh().catch(() => toast('Gagal memuat ulang profil.', 'error'));
          }}
        />
      </div>
    </>
  );
}
