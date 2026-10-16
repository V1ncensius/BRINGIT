import PageHeader from '../../components/ui/PageHeader';
import { Earnings } from './sections';

/** UC-14 / UC-17 Melihat riwayat dan pendapatan (FR-19) */
export default function ProviderEarnings() {
  return (
    <>
      <PageHeader title="Riwayat & pendapatan" subtitle="Pendapatan bersih sudah dipotong komisi Bringit." />
      <div className="max-w-4xl">
        <Earnings />
      </div>
    </>
  );
}
