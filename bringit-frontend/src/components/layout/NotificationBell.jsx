import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { cx } from '../../lib/format';

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 6e4;
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${Math.floor(diff)} mnt lalu`;
  if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

/** Notifikasi permintaan sparring, jadwal, booking, dan pengingat (FR-20). */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  const nav = useNavigate();

  const load = () => notificationService.list().then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    load();
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const unread = items.filter((n) => !n.is_read).length;

  const openItem = async (n) => {
    setOpen(false);
    if (!n.is_read) await notificationService.markRead(n.id).catch(() => {});
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    if (n.link) nav(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-lg text-zinc-300 hover:bg-ink-700 hover:text-white"
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}
        aria-expanded={open}
      >
        <Bell size={21} />
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-ink-950" />}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 rounded-xl border border-ink-600 bg-ink-800 shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-ink-600 px-4 py-3">
            <p className="font-semibold text-white">Notifikasi</p>
            {unread > 0 && (
              <button
                onClick={() => notificationService.markAllRead().then(() => setItems((xs) => xs.map((x) => ({ ...x, is_read: true }))))}
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                <CheckCheck size={15} /> Tandai dibaca
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Belum ada notifikasi.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-ink-750">
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-brand')} />
                  <span className="flex-1">
                    <span className={cx('block text-sm', n.is_read ? 'text-muted' : 'text-zinc-100')}>{n.message}</span>
                    <span className="mt-0.5 block text-xs text-subtle">{ago(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
