import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ROLE_HOME } from './config/constants';
import { IS_PROGRESS30 } from './config/features';
import ProtectedRoute, { GuestRoute } from './components/routing/ProtectedRoute';
import AuthLayout from './components/layout/AuthLayout';
import AppShell from './components/layout/AppShell';
import { LoadingBlock } from './components/ui/States';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import NotFound from './pages/NotFound';

// Halaman per peran dimuat terpisah (code splitting) agar bundle awal ringan.
const TeamDashboard = lazy(() => import('./pages/team/Dashboard'));
const TeamProfile = lazy(() => import('./pages/team/TeamProfile'));
const FindOpponent = lazy(() => import('./pages/team/FindOpponent'));
const Matches = lazy(() => import('./pages/team/Matches'));
const PremiumElo = lazy(() => import('./pages/team/PremiumElo'));
const Services = lazy(() => import('./pages/team/Services'));
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderProfile = lazy(() => import('./pages/provider/ProviderProfile'));
const ProviderSchedule = lazy(() => import('./pages/provider/ProviderSchedule'));
const ProviderOrders = lazy(() => import('./pages/provider/ProviderOrders'));
const ProviderEarnings = lazy(() => import('./pages/provider/ProviderEarnings'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPages = () => import('./pages/admin/AdminPages');
const AdminVerification = lazy(() => AdminPages().then((m) => ({ default: m.AdminVerification })));
const AdminModeration = lazy(() => AdminPages().then((m) => ({ default: m.AdminModeration })));
const AdminPlans = lazy(() => AdminPages().then((m) => ({ default: m.AdminPlans })));
const AdminSports = lazy(() => AdminPages().then((m) => ({ default: m.AdminSports })));
const AdminTransactions = lazy(() => AdminPages().then((m) => ({ default: m.AdminTransactions })));

function Home() {
  const { user, booting } = useAuth();
  if (booting) return null;
  return <Navigate to={user ? ROLE_HOME[user.role] : '/masuk'} replace />;
}

const page = (el) => <Suspense fallback={<LoadingBlock rows={4} />}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/masuk" element={<Login />} />
          <Route path="/daftar" element={<Register />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['team']} />}>
        <Route path="/tim" element={<AppShell />}>
          <Route index element={page(<TeamDashboard />)} />
          <Route path="profil" element={page(<TeamProfile />)} />
          <Route path="cari-lawan" element={page(<FindOpponent />)} />
          <Route path="pertandingan" element={page(<Matches />)} />
          <Route path="premium" element={IS_PROGRESS30 ? <NotFound /> : page(<PremiumElo />)} />
          <Route path="jasa" element={IS_PROGRESS30 ? <NotFound /> : page(<Services />)} />
        </Route>
      </Route>

      {IS_PROGRESS30 ? (
        <>
          <Route path="/penyedia/*" element={<NotFound />} />
          <Route path="/admin/*" element={<NotFound />} />
        </>
      ) : (
      <>
      <Route element={<ProtectedRoute roles={['referee', 'photographer']} />}>
        <Route path="/penyedia" element={<AppShell />}>
          <Route index element={page(<ProviderDashboard />)} />
          <Route path="profil" element={page(<ProviderProfile />)} />
          <Route path="jadwal" element={page(<ProviderSchedule />)} />
          <Route path="pesanan" element={page(<ProviderOrders />)} />
          <Route path="riwayat" element={page(<ProviderEarnings />)} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AppShell />}>
          <Route index element={page(<AdminDashboard />)} />
          <Route path="verifikasi" element={page(<AdminVerification />)} />
          <Route path="moderasi" element={page(<AdminModeration />)} />
          <Route path="paket" element={page(<AdminPlans />)} />
          <Route path="cabang" element={page(<AdminSports />)} />
          <Route path="transaksi" element={page(<AdminTransactions />)} />
        </Route>
      </Route>
      </>
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
