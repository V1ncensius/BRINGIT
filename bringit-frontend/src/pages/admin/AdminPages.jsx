import PageHeader from '../../components/ui/PageHeader';
import { CommissionForm, DisputePanel, ModerationPanel, PlanForm, SportsPanel, TransactionsTable, VerificationPanel } from './sections';

export function AdminVerification() {
  return (
    <>
      <PageHeader title="Verifikasi akun" subtitle="Tinjau dokumen tim, wasit, dan fotografer sebelum tampil di pencarian." />
      <div className="max-w-5xl">
        <VerificationPanel />
      </div>
    </>
  );
}

export function AdminModeration() {
  return (
    <>
      <PageHeader title="Moderasi konten" subtitle="Tindak laporan pelanggaran dan selesaikan sengketa hasil pertandingan." />
      <div className="grid items-start gap-6 xl:grid-cols-[400px_1fr]">
        <ModerationPanel />
        <DisputePanel />
      </div>
    </>
  );
}

export function AdminPlans() {
  return (
    <>
      <PageHeader title="Paket & komisi" subtitle="Atur harga langganan premium dan persentase komisi transaksi add-on." />
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:max-w-5xl">
        <PlanForm />
        <CommissionForm />
      </div>
    </>
  );
}

export function AdminSports() {
  return (
    <>
      <PageHeader title="Cabang olahraga" subtitle="Master data cabang olahraga. Cabang nonaktif tidak bisa dipilih tim baru." />
      <div className="max-w-xl">
        <SportsPanel />
      </div>
    </>
  );
}

export function AdminTransactions() {
  return (
    <>
      <PageHeader title="Laporan transaksi" subtitle="Langganan premium dan pemesanan jasa yang diproses payment gateway." />
      <TransactionsTable />
    </>
  );
}
