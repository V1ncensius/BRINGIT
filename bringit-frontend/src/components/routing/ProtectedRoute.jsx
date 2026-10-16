import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../config/constants';
import { Spinner } from '../ui/States';

/** Membatasi halaman berdasarkan login & peran (SRS 1.3 "Hak akses pengguna"). */
export default function ProtectedRoute({ roles }) {
  const { user, booting } = useAuth();
  const loc = useLocation();
  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        <Spinner size={28} />
      </div>
    );
  }
  if (!user) return <Navigate to="/masuk" replace state={{ from: loc.pathname + loc.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  return <Outlet />;
}

/** Halaman tamu (masuk/daftar) — pengguna yang sudah login diarahkan ke dashboard. */
export function GuestRoute() {
  const { user, booting } = useAuth();
  if (booting) return null;
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  return <Outlet />;
}
