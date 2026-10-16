import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleHelp, LogOut, Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import Avatar from '../ui/Avatar';
import NotificationBell from './NotificationBell';
import ErrorBoundary from '../ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { navFor } from '../../config/navigation';
import { IS_PROGRESS30, filterNavItems } from '../../config/features';
import { cx } from '../../lib/format';

function identity(user) {
  if (user.role === 'team') return { name: user.team_name, sub: 'Akun tim', chip: user.city };
  if (user.role === 'admin') return { name: `${user.name} · Admin`, sub: 'Administrator', chip: 'Terverifikasi', initials: 'NA' };
  const role = user.role === 'referee' ? 'Wasit' : 'Fotografer';
  const verified = user.status === 'verified';
  return { name: user.name, sub: `${role} ${verified ? 'terverifikasi' : '· menunggu verifikasi'}`, chip: verified ? 'Terverifikasi' : 'Menunggu verifikasi' };
}

function SideLink({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-3 text-[14.5px] font-medium transition-colors',
          isActive ? 'bg-brand-soft text-brand' : 'text-zinc-300 hover:bg-ink-700 hover:text-white',
        )
      }
    >
      <Icon size={20} strokeWidth={1.8} />
      {item.label}
    </NavLink>
  );
}

function PremiumPromo() {
  return (
    <div className="mt-6 rounded-lg border border-ink-600 p-3.5">
      <p className="text-sm font-semibold text-white">Main serius. Naik level.</p>
      <p className="mt-1.5 text-[13px] text-muted">Ranking ELO &amp; statistik tim.</p>
      <Link to="/tim/premium" className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        Jelajahi Premium <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const base = navFor(user.role);
  // Mode progres 30%: menu tim hanya berisi alur inti (panduan 6.3).
  const nav = user.role === 'team' && IS_PROGRESS30
    ? { ...base, items: filterNavItems(base.items) }
    : base;
  const id = identity(user);
  const loc = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [loc.pathname]);

  const current =
    nav.items.find((i) => (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to))) ||
    nav.items.find((i) => loc.pathname === i.to) ||
    nav.items[0];
  const showPromo = user.role === 'team' && !user.is_premium && !IS_PROGRESS30;

  const doLogout = () => {
    logout();
    navigate('/masuk', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-900 lg:pl-[232px]">
      {/* ---------- Sidebar desktop ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-ink-600 bg-ink-850 px-5 pb-5 pt-8 lg:flex">
        <Logo to={nav.items[0].to} />
        <p className="mb-2.5 mt-11 text-xs font-semibold uppercase tracking-wide text-zinc-300">{nav.section}</p>
        <nav className="space-y-1" aria-label="Menu utama">
          {nav.items.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
        {showPromo && <PremiumPromo />}
        <div className="mt-auto">
          <a href="mailto:bantuan@bringit.id" className="flex items-center gap-3 px-0 py-2 text-[15px] text-zinc-300 hover:text-white">
            <CircleHelp size={19} strokeWidth={1.8} /> Bantuan
          </a>
          <div className="divider my-4" />
          <div className="flex items-center gap-3">
            <Avatar initials={id.initials} name={id.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{id.name}</p>
              <p className="truncate text-xs text-muted">{id.sub}</p>
            </div>
            <button onClick={doLogout} className="rounded p-1.5 text-zinc-300 hover:bg-ink-700 hover:text-white" aria-label="Keluar" title="Keluar">
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Topbar ---------- */}
      <header className="sticky top-0 z-20 border-b border-ink-600 bg-ink-950/95 backdrop-blur">
        <div className="flex h-[68px] items-center gap-3 px-5 lg:h-[72px] lg:px-8">
          <div className="lg:hidden">
            <Logo to={nav.items[0].to} />
          </div>
          <nav aria-label="Breadcrumb" className="hidden text-[15px] lg:block">
            <span className="text-muted">{nav.crumb}</span>
            <span className="mx-3 text-subtle">/</span>
            <span className="text-white">{current.label}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="badge-neutral hidden px-2.5 py-1.5 text-[13px] lg:inline-flex">{id.chip}</span>
            <NotificationBell />
            <Link to={user.role === 'team' ? '/tim/profil' : user.role === 'admin' ? '/admin' : '/penyedia/profil'} aria-label="Profil">
              <Avatar initials={id.initials} name={id.name} size="sm" className="h-10 w-10" />
            </Link>
            <button onClick={() => setDrawer(true)} className="grid h-10 w-10 place-items-center rounded-lg text-zinc-200 hover:bg-ink-700 lg:hidden" aria-label="Buka menu">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Konten ---------- */}
      <main className="mx-auto max-w-[1480px] px-5 pb-32 pt-6 lg:px-8 lg:pb-14 lg:pt-10">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="text-[15px] text-muted">
            {nav.crumb} / {current.label}
          </p>
          <span className="badge-neutral px-2.5 py-1.5 text-[13px]">{id.chip}</span>
        </div>
        <ErrorBoundary resetKey={loc.pathname}>
          <Outlet />
        </ErrorBoundary>
        <div className="mt-10 border-t border-ink-600 pt-5 text-[15px] text-muted lg:hidden">
          <p>
            {id.name} · {id.sub}
          </p>
          <p className="mt-3">
            <a href="mailto:bantuan@bringit.id" className="hover:text-white">Bantuan</a>
            <span className="mx-2">·</span>
            <button onClick={doLogout} className="hover:text-white">Keluar</button>
          </p>
        </div>
      </main>

      {/* ---------- Bottom nav mobile ---------- */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-600 bg-ink-800 lg:hidden" aria-label="Navigasi bawah">
        <div className="grid grid-cols-4">
          {nav.mobileOrder.map((to) => {
            const item = nav.items.find((i) => i.to === to);
            const Icon = item.icon;
            return (
              <NavLink
                key={to}
                to={to}
                end={item.end}
                className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2.5 text-xs font-medium', isActive ? 'text-brand' : 'text-muted')}
              >
                <Icon size={22} strokeWidth={1.8} />
                {item.mobile || item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ---------- Drawer mobile ---------- */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[84%] max-w-[320px] flex-col bg-ink-850 p-5">
            <div className="flex items-center justify-between">
              <Logo to={nav.items[0].to} />
              <button onClick={() => setDrawer(false)} className="rounded p-1.5 text-zinc-300 hover:bg-ink-700" aria-label="Tutup menu">
                <X size={22} />
              </button>
            </div>
            <p className="mb-2.5 mt-8 text-xs font-semibold uppercase tracking-wide text-zinc-300">{nav.section}</p>
            <nav className="space-y-1">
              {nav.items.map((item) => (
                <SideLink key={item.to} item={item} />
              ))}
            </nav>
            {showPromo && <PremiumPromo />}
            <button onClick={doLogout} className="mt-auto flex items-center gap-3 py-3 text-[15px] text-zinc-300 hover:text-white">
              <LogOut size={19} /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
