// Saklar cakupan progres (lihat PANDUAN-PROGRES-30.md 6.3).
// VITE_SCOPE=progress30 -> hanya alur inti UC-01..UC-06 (Tim: Beranda, Profil, Cari lawan, Pertandingan).
// VITE_SCOPE=full      -> semua halaman (Premium, Jasa, Penyedia, Admin) untuk progres berikutnya.
const SCOPE = (import.meta.env?.VITE_SCOPE || 'full').toLowerCase();

export const IS_PROGRESS30 = SCOPE === 'progress30';

/** Filter item menu navigasi sesuai cakupan. */
export const filterNavItems = (items) => {
  if (!IS_PROGRESS30) return items;
  const allowed = ['/tim', '/tim/profil', '/tim/cari-lawan', '/tim/pertandingan'];
  return items.filter((i) => allowed.includes(i.to));
};
