import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <Logo />
        <p className="mt-10 text-6xl font-extrabold text-brand">404</p>
        <h1 className="mt-4 text-2xl font-bold">Lapangan ini kosong.</h1>
        <p className="mt-2 text-muted">Halaman yang Anda cari tidak ditemukan.</p>
        <Link to="/" className="btn-primary mt-8">Kembali ke beranda</Link>
      </div>
    </div>
  );
}
