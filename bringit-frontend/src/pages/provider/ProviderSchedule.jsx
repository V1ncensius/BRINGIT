import PageHeader from '../../components/ui/PageHeader';
import { ScheduleManager } from './sections';

export default function ProviderSchedule() {
  return (
    <>
      <PageHeader title="Jadwal" subtitle="Atur slot ketersediaan. Slot yang dipesan otomatis ditahan hingga pesanan selesai." />
      <div className="max-w-4xl">
        <ScheduleManager />
      </div>
    </>
  );
}
