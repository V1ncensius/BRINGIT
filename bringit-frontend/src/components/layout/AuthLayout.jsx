import { Outlet } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Logo from '../ui/Logo';

const TAGS = ['Futsal', 'Basket', 'Bulu Tangkis'];

function Hero({ compact = false }) {
  return (
    <>
      <p className="eyebrow">Bukan sekadar main.</p>
      <h2 className={compact ? 'mt-4 text-[34px] font-bold leading-[1.12]' : 'mt-4 text-[44px] font-bold leading-[1.12] xl:text-[52px]'}>
        Lawan seimbang.
        <br />
        Permainan lebih seru.
      </h2>
      <p className={compact ? 'mt-4 text-[15px] text-muted' : 'mt-5 text-[17px] text-zinc-300'}>Temukan tim, atur sparring, dan buktikan kemampuanmu di lapangan.</p>
    </>
  );
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-ink-900 lg:grid lg:grid-cols-[44.4%_1fr]">
      {/* Panel foto (desktop) */}
      <aside className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <img src="/images/hero-sports.jpg" alt="Pemain futsal, bulu tangkis, dan basket beraksi" className="absolute inset-x-0 top-0 h-[76%] w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-transparent via-[22%] to-ink-950 to-[80%]" />
        <div className="relative flex h-full min-h-screen flex-col px-14 pb-14 pt-12">
          <Logo size="lg" />
          <div className="mt-auto max-w-[560px]">
            <Hero />
            <div className="mt-7 flex flex-wrap gap-3">
              {TAGS.map((t) => (
                <span key={t} className="badge-neutral px-2.5 py-1.5 text-[13px]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Panel form */}
      <div className="flex min-h-screen flex-col px-5 pb-8 pt-7 sm:px-10 lg:px-[100px] lg:pt-11">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="hidden text-sm text-muted lg:block">Olahraga nyata. Tantangan nyata.</p>
          <button className="inline-flex items-center gap-1 text-sm text-zinc-200" aria-label="Bahasa: Indonesia">
            ID <ChevronDown size={14} />
          </button>
        </div>

        {/* Hero mobile */}
        <div className="relative mt-8 grid grid-cols-[1fr_46%] items-center gap-2 lg:hidden">
          <div className="relative z-10">
            <Hero compact />
            <p className="mt-5 text-sm text-zinc-200">{TAGS.join(' · ')}</p>
          </div>
          <div className="relative -mr-5 self-stretch">
            <img src="/images/hero-sports.jpg" alt="" className="h-full max-h-[300px] w-full object-cover object-left-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
          </div>
        </div>

        <main className="mx-auto my-auto w-full max-w-[600px] py-10 lg:py-12">
          <Outlet />
        </main>

        <footer className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Bringit</p>
          <p>
            <a href="#privasi" className="hover:text-white">Privasi</a> <span className="mx-1">·</span>{' '}
            <a href="#ketentuan" className="hover:text-white">Ketentuan</a> <span className="mx-1">·</span>{' '}
            <a href="mailto:bantuan@bringit.id" className="hover:text-white">Bantuan</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
