import {
  BadgeCheck, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, ClipboardList, CreditCard, House, LayoutGrid,
  List, Search, Shield, Trophy, User, Users, Wallet,
} from 'lucide-react';

/**
 * Menu per peran (SRS 3.1: "setiap pengguna memperoleh tampilan dan menu
 * yang disesuaikan dengan perannya"). `mobile` = urutan item di bottom nav.
 */
export const NAV = {
  team: {
    section: 'Ruang tim',
    crumb: 'Tim',
    items: [
      { to: '/tim', label: 'Beranda', icon: House, end: true, mobile: 'Beranda' },
      { to: '/tim/profil', label: 'Profil tim', icon: Users, mobile: 'Profil' },
      { to: '/tim/cari-lawan', label: 'Cari lawan', icon: Search, mobile: 'Cari lawan' },
      { to: '/tim/pertandingan', label: 'Pertandingan', icon: CalendarDays, mobile: 'Laga' },
      { to: '/tim/premium', label: 'Premium & ELO', icon: Trophy },
      { to: '/tim/jasa', label: 'Jasa olahraga', icon: BriefcaseBusiness },
    ],
    mobileOrder: ['/tim', '/tim/cari-lawan', '/tim/pertandingan', '/tim/profil'],
  },
  provider: {
    section: 'Ruang penyedia',
    crumb: 'Penyedia jasa',
    items: [
      { to: '/penyedia', label: 'Dashboard jasa', icon: LayoutGrid, end: true, mobile: 'Dashboard' },
      { to: '/penyedia/profil', label: 'Profil & tarif', icon: User },
      { to: '/penyedia/jadwal', label: 'Jadwal', icon: CalendarDays, mobile: 'Jadwal' },
      { to: '/penyedia/pesanan', label: 'Pesanan', icon: ClipboardList, mobile: 'Pesanan' },
      { to: '/penyedia/riwayat', label: 'Riwayat & pendapatan', icon: Wallet, mobile: 'Pendapatan' },
    ],
    mobileOrder: ['/penyedia', '/penyedia/jadwal', '/penyedia/pesanan', '/penyedia/riwayat'],
  },
  admin: {
    section: 'Administrasi',
    crumb: 'Admin',
    items: [
      { to: '/admin', label: 'Ringkasan admin', icon: LayoutGrid, end: true, mobile: 'Ringkasan' },
      { to: '/admin/verifikasi', label: 'Verifikasi akun', icon: BadgeCheck, mobile: 'Verifikasi' },
      { to: '/admin/moderasi', label: 'Moderasi konten', icon: Shield },
      { to: '/admin/paket', label: 'Paket & komisi', icon: CreditCard, mobile: 'Konfigurasi' },
      { to: '/admin/cabang', label: 'Cabang olahraga', icon: List },
      { to: '/admin/transaksi', label: 'Laporan transaksi', icon: ChartNoAxesCombined, mobile: 'Transaksi' },
    ],
    mobileOrder: ['/admin', '/admin/verifikasi', '/admin/paket', '/admin/transaksi'],
  },
};

export const navFor = (role) => (role === 'team' ? NAV.team : role === 'admin' ? NAV.admin : NAV.provider);
