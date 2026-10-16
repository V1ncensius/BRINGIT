import { Clock } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import { rupiah } from '../../lib/format';
import { Earnings, IncomingOrders, ProfileForm, ScheduleManager } from './sections';

/** Dashboard penyedia jasa — wasit & fotografer (UC-12..UC-17) */
export default function ProviderDashboard() {
  const sum = useAsync(() => providerService.summary(), []);
  const s = sum.data;
  return (
    <>
      <PageHeader title="Dashboard penyedia jasa" subtitle="Kelola layanan, jadwal, dan pesanan tanpa kehilangan fokus." />
      {s && (
        <div className="mb-6 flex gap-7 border-b border-ink-600">
          <span className="-mb-px border-b-2 border-brand pb-3 text-[15px] font-medium text-white">
            {s.type === 'referee' ? 'Wasit' : 'Fotografer'} · {s.name}
          </span>
        </div>
      )}
      {s && !s.verified && (
        <div className="notice mb-6">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <span>Akun Anda menunggu verifikasi admin. Lengkapi profil &amp; tarif — Anda baru tampil di pencarian tim setelah terverifikasi.</span>
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard loading={!s} label="Pendapatan bersih bulan ini" value={s && rupiah(s.net_month)} note={s && `${s.done_month} ${s.type === 'referee' ? 'laga' : 'sesi'} selesai · Setelah komisi ${s.commission}%`} />
        <StatCard loading={!s} label="Pesanan baru" value={s?.new_orders} note="Perlu respons dalam 24 jam" />
        <StatCard loading={!s} label="Rating jasa" value={s && `${String(s.rating).replace('.', ',')} / 5`} note={s && `${s.review_count} ulasan dari tim`} />
      </section>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <IncomingOrders onChanged={sum.reload} />
          <ScheduleManager />
          <Earnings compact />
        </div>
        <div className="space-y-6 xl:sticky xl:top-[96px]">
          <ProfileForm onSaved={sum.reload} />
        </div>
      </div>
    </>
  );
}
