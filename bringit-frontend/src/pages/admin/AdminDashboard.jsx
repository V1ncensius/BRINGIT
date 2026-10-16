import { useState } from 'react';
import { Download } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services/adminService';
import { AdminStats, CommissionForm, DisputePanel, ModerationPanel, PlanForm, SportsPanel, TransactionsTable, VerificationPanel, downloadCSV } from './sections';

/** Ringkasan admin — UC-18 & UC-19 (FR-21..FR-26) */
export default function AdminDashboard() {
  const [tab, setTab] = useState('ringkasan');
  const summary = useAsync(() => adminService.summary(), []);
  const exportAll = async () => downloadCSV(await adminService.transactions({}));

  return (
    <>
      <PageHeader
        title="Ringkasan admin"
        subtitle="Verifikasi komunitas, kelola layanan, dan pantau transaksi Bringit."
        actions={
          <button onClick={exportAll} className="btn-secondary btn-lg">
            <Download size={18} /> Ekspor laporan
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'ringkasan', label: 'Ringkasan' },
          { value: 'akun', label: 'Akun & moderasi' },
          { value: 'konfigurasi', label: 'Konfigurasi' },
          { value: 'transaksi', label: 'Transaksi' },
        ]}
      />
      <div className="mt-6 space-y-6">
        {(tab === 'ringkasan' || tab === 'akun') && (
          <>
            {tab === 'ringkasan' && <AdminStats data={summary.data} />}
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
              <VerificationPanel onChanged={summary.reload} />
              <ModerationPanel onChanged={summary.reload} />
            </div>
            {tab === 'akun' && <DisputePanel onChanged={summary.reload} />}
          </>
        )}
        {(tab === 'ringkasan' || tab === 'konfigurasi') && (
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <PlanForm />
            <CommissionForm />
            <SportsPanel />
          </div>
        )}
        {(tab === 'ringkasan' || tab === 'transaksi') && <TransactionsTable limit={tab === 'ringkasan' ? 4 : undefined} />}
      </div>
    </>
  );
}
