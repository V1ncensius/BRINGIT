import { Link } from 'react-router-dom';

export default function Logo({ to = '/', size = 'md', className = '' }) {
  const s = size === 'lg' ? { img: 'h-7', text: 'text-[28px]' } : { img: 'h-6', text: 'text-[26px]' };
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Bringit — beranda">
      <img src="/images/logo-mark.svg" alt="" className={`${s.img} w-auto`} />
      <span className={`${s.text} font-extrabold leading-none tracking-tight text-white`}>bringit</span>
    </Link>
  );
}
