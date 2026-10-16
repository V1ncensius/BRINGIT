import PageHeader from '../../components/ui/PageHeader';
import { RatingText } from '../../components/ui/StarRating';
import { LoadingBlock } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import { bookingService } from '../../services/bookingService';
import { dateShort } from '../../lib/format';
import { ProfileForm } from './sections';

/** FR-03: wasit & fotografer mengelola profil, tarif, dan portofolio */
export default function ProviderProfile() {
  const profile = useAsync(() => providerService.getProfile(), []);
  const reviews = useAsync(() => (profile.data ? bookingService.latestReviews(profile.data.id) : Promise.resolve([])), [profile.data?.id]);
  return (
    <>
      <PageHeader title="Profil & tarif" subtitle="Informasi ini tampil di halaman jasa olahraga untuk tim." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,560px)_1fr]">
        <ProfileForm onSaved={profile.reload} />
        <section className="card card-pad">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="card-title">Ulasan dari tim</h2>
            {profile.data && <RatingText rating={profile.data.rating} count={profile.data.review_count} />}
          </div>
          {reviews.loading ? (
            <LoadingBlock rows={2} />
          ) : !reviews.data?.length ? (
            <p className="py-6 text-center text-muted">Belum ada ulasan.</p>
          ) : (
            <ul className="divide-y divide-ink-600">
              {reviews.data.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold text-white">{r.author}</p>
                    <RatingText rating={r.rating.toFixed(1)} />
                  </div>
                  <p className="mt-2 text-[15px] text-zinc-300">“{r.comment || '—'}”</p>
                  <p className="mt-1.5 text-[13px] text-muted">{dateShort(r.created_at)} · {r.booking_code}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
