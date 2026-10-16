import { useEffect, useState } from 'react';
import { Lock, QrCode } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import SummaryRow from './ui/SummaryRow';
import { rupiah } from '../lib/format';
import { paymentService } from '../services/paymentService';
import { USE_MOCK } from '../services/apiClient';

/**
 * Langkah pembayaran melalui payment gateway pihak ketiga (NFR-06, NFR-13).
 * - Mode backend: browser diarahkan ke `redirect_url` (mis. Midtrans Snap).
 * - Mode mock: ditampilkan halaman sandbox untuk mensimulasikan hasil transaksi.
 */
export default function PaymentModal({ checkout, onClose, onResult }) {
  const [busy, setBusy] = useState(null);
  const payment = checkout?.payment;

  useEffect(() => {
    if (checkout && !USE_MOCK) window.location.assign(checkout.redirect_url);
  }, [checkout]);
  if (!USE_MOCK) return null;

  const simulate = async (status) => {
    setBusy(status);
    try {
      const res = await paymentService.simulate(payment.id, status);
      onResult(res.status === 'failed' ? 'failed' : 'success', res);
    } catch (e) {
      onResult('error', e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={!!checkout}
      onClose={() => onResult('pending')}
      title="Pembayaran"
      footer={
        <>
          <Button variant="secondary" onClick={() => simulate('failed')} loading={busy === 'failed'} disabled={!!busy}>
            Batalkan pembayaran
          </Button>
          <Button onClick={() => simulate('success')} loading={busy === 'success'} disabled={!!busy}>
            Bayar {payment ? rupiah(payment.amount) : ''}
          </Button>
        </>
      }
    >
      {payment && (
        <div className="space-y-5">
          <div className="notice">
            <Lock size={18} className="mt-0.5 shrink-0" />
            <span className="text-sm">
              Mode sandbox — di produksi Anda diarahkan ke halaman payment gateway (Midtrans/Xendit). Bringit tidak menyimpan data kartu atau rekening.
            </span>
          </div>
          <div className="grid place-items-center rounded-lg border border-ink-600 bg-ink-900 py-6">
            <QrCode size={96} className="text-zinc-200" />
            <p className="mt-3 text-sm text-muted">{payment.method} · {payment.code}</p>
          </div>
          <div>
            <SummaryRow label="Untuk" value={payment.booking_code} />
            <SummaryRow label="Metode" value={payment.method} />
            <div className="divider my-2" />
            <SummaryRow label="Total" value={rupiah(payment.amount)} strong />
          </div>
          <p className="text-[13px] text-muted">Menutup jendela ini menyimpan transaksi sebagai “menunggu pembayaran” dan dapat dilanjutkan nanti.</p>
        </div>
      )}
    </Modal>
  );
}
