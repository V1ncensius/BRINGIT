import { useState } from 'react';
import { Inbox } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import { OrderItem, useOrderActions } from './sections';

const GROUPS = {
  baru: 'pending',
  diterima: 'accepted',
  selesai: 'done,paid_out,rejected',
};

/** UC-13 / UC-16 Menerima atau menolak pesanan (FR-16) */
export default function ProviderOrders() {
  const [tab, setTab] = useState('baru');
  const all = useAsync(() => providerService.bookings(), []);
  const { busy, doAction, modals } = useOrderActions(all.reload);
  const list = (all.data || []).filter((b) => GROUPS[tab].split(',').includes(b.status));
  const count = (k) => (all.data || []).filter((b) => GROUPS[k].split(',').includes(b.status)).length;

  return (
    <>
      <PageHeader title="Pesanan" subtitle="Tanggapi pesanan dalam 24 jam. Pesanan tanpa respons dibatalkan otomatis dan dana dikembalikan." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'baru', label: `Baru (${count('baru')})` },
          { value: 'diterima', label: `Diterima (${count('diterima')})` },
          { value: 'selesai', label: 'Selesai & ditolak' },
        ]}
      />
      <section className="card card-pad mt-6 max-w-4xl">
        {all.loading ? (
          <LoadingBlock rows={3} />
        ) : all.error ? (
          <ErrorState error={all.error} onRetry={all.reload} />
        ) : !list.length ? (
          <EmptyState icon={Inbox} title="Tidak ada pesanan" text="Belum ada pesanan pada kategori ini." />
        ) : (
          <ul className="divide-y divide-ink-600">
            {list.map((b) => (
              <OrderItem key={b.id} b={b} onAction={doAction} busy={busy} />
            ))}
          </ul>
        )}
      </section>
      {modals}
    </>
  );
}
