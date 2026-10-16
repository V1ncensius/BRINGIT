import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ClipboardList, UserSearch } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import SummaryRow from '../../components/ui/SummaryRow';
import PaymentModal from '../../components/PaymentModal';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { RatingText, StarInput } from '../../components/ui/StarRating';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { bookingService } from '../../services/bookingService';
import { matchService } from '../../services/matchService';
import { teamService } from '../../services/teamService';
import { paymentService } from '../../services/paymentService';
import { BOOKING_STATUS_LABEL, CITIES, PAYMENT_METHODS } from '../../config/constants';
import { cx, dateShort, dayMonth, rupiah, timeRange } from '../../lib/format';

const TYPE_LABEL = { referee: 'Wasit', photographer: 'Fotografer' };

function ProviderCard({ p, selected, onPick }) {
  return (
    <article className={cx('card p-5 transition-colors', selected ? 'border-brand bg-brand-soft' : 'hover:border-ink-500')}>
      <div className="flex items-start gap-4">
        <Avatar initials={p.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">{p.name}</h3>
            <RatingText rating={p.rating} count={p.review_count} />
          </div>
          <p className="mt-0.5 text-[15px] text-muted">
            {TYPE_LABEL[p.type]} · {p.city}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[15px] text-muted">{p.bio}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-white">
          {rupiah(p.rate)} <span className="font-semibold">/ {p.unit}</span>
        </p>
        <button onClick={() => onPick(p)} className={selected ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} aria-pressed={selected}>
          {selected ? 'Detail dipilih' : 'Lihat detail'}
        </button>
      </div>
    </article>
  );
}

function BookingPanel({ provider, matches, preselectMatch, commission, filterDate, onBooked }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const slotDates = useMemo(() => [...new Set(provider.slots.map((s) => s.date))], [provider]);
  const [f, setF] = useState({});
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    const m = matches.find((x) => String(x.id) === String(preselectMatch)) || matches[0];
    const mDate = m?.proposal?.date || m?.match_date;
    const date = slotDates.includes(filterDate) ? filterDate : slotDates.includes(mDate) ? mDate : slotDates[0] || '';
    const times = provider.slots.filter((s) => s.date === date);
    const mTime = m?.proposal?.time || m?.time;
    setF({
      match_id: m ? String(m.id) : '',
      date,
      time: times.find((s) => s.time === mTime)?.time || times[0]?.time || '',
      location: m?.proposal?.location || m?.location || '',
      method: PAYMENT_METHODS[0],
    });
  }, [provider.id, matches, preselectMatch, slotDates, filterDate, provider.slots]);

  const times = provider.slots.filter((s) => s.date === f.date);
  const fee = Math.round((provider.rate * (commission?.team_fee ?? 5)) / 100);
  const availableOn = slotDates.includes(filterDate) ? filterDate : null;

  const onMatch = (id) => {
    const m = matches.find((x) => String(x.id) === id);
    setF((s) => ({ ...s, match_id: id, location: m ? m.proposal?.location || m.location : s.location }));
  };

  const book = async () => {
    if (!f.date || !f.time) return toast(`Tidak ada ${TYPE_LABEL[provider.type].toLowerCase()} tersedia pada jadwal tersebut.`, 'error');
    if (!f.location.trim()) return toast('Lokasi wajib diisi.', 'error');
    const res = await run('book', () => bookingService.create({ provider_id: provider.id, ...f }), { success: null });
    if (res) setCheckout(res);
  };

  const onResult = (status) => {
    setCheckout(null);
    if (status === 'success') {
      toast(`Pembayaran berhasil. Pesanan dikirim ke ${provider.name} untuk dikonfirmasi.`, 'success');
      onBooked();
    } else if (status === 'failed') {
      toast('Pembayaran gagal. Pesanan dibatalkan dan tidak dikirim ke penyedia.', 'error');
      onBooked();
    } else toast('Pesanan menunggu pembayaran. Selesaikan pembayaran untuk mengirim pesanan.', 'info');
  };

  return (
    <div className="card card-pad">
      <h2 className="card-title">{provider.name}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="badge-ok px-2.5 py-1.5 text-[13px]">{TYPE_LABEL[provider.type]} terverifikasi</span>
        <RatingText rating={provider.rating} count={null} />
        <span className="-ml-2 text-[15px] text-warn">· {provider.review_count} ulasan</span>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{provider.bio}</p>
      {provider.type === 'referee' && <p className="mt-2 text-[13px] text-muted">Spesialisasi: {provider.specialization.join(', ')}</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-white">
          {rupiah(provider.rate)} / {provider.unit}
        </p>
        {availableOn ? <span className="badge-ok px-2.5 py-1.5 text-[13px]">Tersedia {dayMonth(availableOn)}</span> : <span className="badge-neutral">Cek slot</span>}
      </div>
      <p className="mt-4 text-[13px] text-muted">
        Slot tersedia:{' '}
        {provider.slots.length ? provider.slots.slice(0, 4).map((s) => `${dayMonth(s.date)} ${timeRange(s.time, s.duration)}`).join(' · ') : 'belum ada'}
      </p>

      <div className="divider my-6" />
      <h3 className="mb-4 text-lg font-semibold">Pesan untuk pertandingan</h3>
      {!provider.slots.length ? (
        <p className="text-[15px] text-muted">Tidak ada {TYPE_LABEL[provider.type].toLowerCase()} tersedia. Pilih penyedia lain.</p>
      ) : (
        <>
          <div className="space-y-4">
            <Select label="Pertandingan" value={f.match_id || ''} onChange={(e) => onMatch(e.target.value)}>
              {matches.length === 0 && <option value="">Tanpa pertandingan terjadwal</option>}
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.team_a.name} vs {m.team_b.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tanggal" value={f.date || ''} onChange={(e) => setF({ ...f, date: e.target.value, time: provider.slots.find((s) => s.date === e.target.value)?.time || '' })}>
                {slotDates.map((d) => (
                  <option key={d} value={d}>
                    {dateShort(d)}
                  </option>
                ))}
              </Select>
              <Select label="Waktu" value={f.time || ''} onChange={(e) => setF({ ...f, time: e.target.value })}>
                {times.map((s) => (
                  <option key={s.id} value={s.time}>
                    {timeRange(s.time, s.duration)}
                  </option>
                ))}
              </Select>
            </div>
            <Input label="Lokasi" value={f.location || ''} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <Select label="Metode pembayaran" value={f.method || ''} onChange={(e) => setF({ ...f, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
          <div className="divider my-5" />
          <SummaryRow label={`Jasa ${TYPE_LABEL[provider.type].toLowerCase()} · 1 ${provider.unit}`} value={rupiah(provider.rate)} />
          <SummaryRow label={`Biaya layanan · ${commission?.team_fee ?? 5}%`} value={rupiah(fee)} />
          <div className="mt-2">
            <SummaryRow label="Total" value={rupiah(provider.rate + fee)} strong />
          </div>
          <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={book} loading={busy === 'book'}>
            Pesan &amp; lanjut pembayaran <ArrowRight size={18} />
          </Button>
          <p className="mt-4 text-[13px] text-muted">Pembayaran melalui payment gateway. Dana dikembalikan jika pesanan ditolak penyedia.</p>
        </>
      )}
      <PaymentModal checkout={checkout} onResult={onResult} />
    </div>
  );
}

function ReviewCard({ booking, onDone }) {
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const [rating, setRating] = useState(booking.review?.rating || 0);
  const [comment, setComment] = useState(booking.review?.comment || '');
  useEffect(() => {
    setRating(booking.review?.rating || 0);
    setComment(booking.review?.comment || '');
  }, [booking.code, booking.review]);

  const send = async () => {
    if (!rating) return toast('Beri rating bintang sebelum mengirim.', 'error');
    const ok = await run('rev', () => bookingService.submitReview({ booking_code: booking.code, rating, comment }));
    if (ok) onDone();
  };

  return (
    <section className="card card-pad">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="card-title">{booking.review ? 'Edit ulasan Anda' : 'Ulasan setelah pertandingan'}</h2>
        <span className="text-[13px] text-muted">{booking.code}</span>
      </div>
      <p className="mt-4 text-[15px] text-muted">
        {booking.provider_name} · {booking.match_label} · {dayMonth(booking.date)}
      </p>
      <div className="mt-5 flex items-center justify-between">
        <StarInput value={rating} onChange={setRating} />
        <span className="text-[15px] text-zinc-200">{rating} / 5</span>
      </div>
      <Textarea label="Ulasan Anda" wrapClass="mt-5" rows={1} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tepat waktu dan tegas. Pertandingan berjalan sangat sportif." />
      <Button className="mt-5" onClick={send} loading={busy === 'rev'}>
        {booking.review ? 'Perbarui ulasan' : 'Kirim ulasan'}
      </Button>
      <p className="mt-4 text-[13px] text-muted">Ulasan tersedia untuk pesanan yang sudah selesai.</p>
    </section>
  );
}

function MyBookings({ list, onReview }) {
  if (!list.length) {
    return (
      <div className="card">
        <EmptyState icon={ClipboardList} title="Belum ada pesanan jasa" text="Pesan wasit atau fotografer untuk melengkapi pertandingan." />
      </div>
    );
  }
  const tone = { pending: 'badge-warn', accepted: 'badge-ok', rejected: 'badge-danger', done: 'badge-neutral', paid_out: 'badge-neutral' };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {list.map((b) => (
        <article key={b.code} className="card card-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] text-muted">{b.code}</p>
              <h3 className="mt-1 text-lg font-semibold">
                {TYPE_LABEL[b.provider_type]} · {b.provider_name}
              </h3>
            </div>
            <span className={tone[b.status]}>{b.status === 'pending' ? 'Menunggu konfirmasi' : BOOKING_STATUS_LABEL[b.status]}</span>
          </div>
          <p className="mt-3 text-[15px] text-muted">{b.match_label}</p>
          <p className="mt-1 text-[15px] text-muted">
            {dateShort(b.date)} · {timeRange(b.time, b.duration)} · {b.location}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-semibold text-white">{rupiah(b.total)}</span>
            {['done', 'paid_out'].includes(b.status) && (
              <button className="btn-secondary btn-sm" onClick={() => onReview(b)}>
                {b.review ? `Ulasan ${b.review.rating}/5 · Edit` : 'Beri ulasan'}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

/** UC-09 Memesan jasa wasit, UC-10 Memesan jasa fotografer, UC-11 Memberikan ulasan */
export default function Services() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'semua';
  const preMatch = params.get('match');
  const team = useAsync(() => teamService.getMine(), []);
  const active = useAsync(() => matchService.list('active'), []);
  const mine = useAsync(() => bookingService.myBookings(), []);
  const commission = useAsync(() => paymentService.commission(), []);
  const [filter, setFilter] = useState(null);
  const [picked, setPicked] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const panelRef = useRef(null);

  const matches = useMemo(() => (active.data || []).filter((m) => ['proposed', 'scheduled'].includes(m.status)), [active.data]);

  useEffect(() => {
    if (team.data && active.data && !filter) {
      const m = matches.find((x) => String(x.id) === preMatch) || matches[0];
      setFilter({ city: team.data.city, sport: m?.sport || team.data.primary_sport_name, date: m?.proposal?.date || m?.match_date || '' });
    }
  }, [team.data, active.data, filter, matches, preMatch]);

  const type = tab === 'wasit' ? 'referee' : tab === 'fotografer' ? 'photographer' : 'all';
  const providers = useAsync(() => (filter ? bookingService.searchProviders({ type, ...filter }) : Promise.resolve(null)), [filter, type]);
  const reviews = useAsync(() => (picked ? bookingService.latestReviews(picked.id) : Promise.resolve([])), [picked?.id]);

  useEffect(() => {
    const list = providers.data || [];
    if (list.length && (!picked || !list.some((p) => p.id === picked.id))) setPicked(list[0]);
    if (!list.length && providers.data) setPicked(null);
  }, [providers.data, picked]);

  const reviewable = (mine.data || []).filter((b) => ['done', 'paid_out'].includes(b.status));
  const toReview = reviewTarget || reviewable.find((b) => !b.review);

  const pick = (p) => {
    setPicked(p);
    if (window.innerWidth < 1280) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const pendingCount = (mine.data || []).filter((b) => ['pending', 'accepted'].includes(b.status)).length;
  const list = providers.data || [];

  return (
    <>
      <PageHeader title="Jasa wasit & fotografer" subtitle="Lengkapi pertandingan dengan penyedia jasa olahraga terpercaya." />
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'semua' ? {} : { tab: v })}
        items={[
          { value: 'semua', label: 'Semua jasa' },
          { value: 'wasit', label: 'Wasit' },
          { value: 'fotografer', label: 'Fotografer' },
          { value: 'pesanan', label: `Pesanan saya${pendingCount ? ` (${pendingCount})` : ''}` },
        ]}
      />

      {tab === 'pesanan' ? (
        <div className="mt-6 space-y-6">
          {mine.loading ? <LoadingBlock /> : <MyBookings list={mine.data || []} onReview={(b) => { setReviewTarget(b); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }} />}
          {toReview && <ReviewCard booking={toReview} onDone={() => { setReviewTarget(null); mine.reload(); }} />}
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_418px]">
          <div className="space-y-4">
            {filter && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Select label="Kota" value={filter.city} onChange={(e) => setFilter({ ...filter, city: e.target.value })}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Select label="Cabang" value={filter.sport} onChange={(e) => setFilter({ ...filter, sport: e.target.value })}>
                  {(team.data?.sport_names || []).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <Input label="Tanggal" type="date" value={filter.date} onChange={(e) => setFilter({ ...filter, date: e.target.value })} />
              </div>
            )}
            <p className="pt-1 text-[15px] text-muted">
              {list.length} penyedia tersedia · Urutkan: rating tertinggi
            </p>
            {providers.loading || !filter ? (
              <LoadingBlock rows={3} />
            ) : providers.error ? (
              <ErrorState error={providers.error} onRetry={providers.reload} />
            ) : !list.length ? (
              <div className="card">
                <EmptyState icon={UserSearch} title={type === 'photographer' ? 'Tidak ada fotografer tersedia' : 'Tidak ada wasit tersedia'} text="Coba ubah tanggal atau kota. Wasit hanya tampil jika spesialisasinya sesuai cabang olahraga." />
              </div>
            ) : (
              list.map((p) => <ProviderCard key={p.id} p={p} selected={picked?.id === p.id} onPick={pick} />)
            )}
            {toReview && tab === 'semua' && <ReviewCard booking={toReview} onDone={() => { setReviewTarget(null); mine.reload(); }} />}
          </div>

          <div ref={panelRef} className="scroll-mt-24 space-y-6">
            {picked && (
              <BookingPanel
                provider={picked}
                matches={matches}
                preselectMatch={preMatch}
                commission={commission.data}
                filterDate={filter?.date}
                onBooked={() => {
                  providers.reload();
                  mine.reload();
                }}
              />
            )}
            {picked && (reviews.data || []).length > 0 && (
              <section className="card card-pad">
                <h2 className="card-title mb-5">Ulasan terbaru</h2>
                <ul className="space-y-5">
                  {reviews.data.slice(0, 2).map((r) => (
                    <li key={r.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-semibold text-white">{r.author}</p>
                        <RatingText rating={r.rating.toFixed(1)} />
                      </div>
                      <p className="mt-3 text-[15px] leading-relaxed text-zinc-300">“{r.comment}”</p>
                      <p className="mt-2.5 text-[13px] text-muted">{dateShort(r.created_at)} · Pesanan terverifikasi</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
