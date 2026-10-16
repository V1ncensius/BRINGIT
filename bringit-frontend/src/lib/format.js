const nf = new Intl.NumberFormat('id-ID');

/** 1264 -> "1.264" */
export const num = (n) => nf.format(Math.round(Number(n) || 0));

/** 49000 -> "Rp49.000" (gaya penulisan pada desain) */
export const rupiah = (n) => `Rp${nf.format(Math.round(Number(n) || 0))}`;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const toDate = (d) => (d instanceof Date ? d : new Date(`${d}`.length === 10 ? `${d}T00:00:00` : d));

/** "2026-10-17" -> "17 Oktober 2026" */
export const dateLong = (d) => {
  const x = toDate(d);
  return `${x.getDate()} ${BULAN[x.getMonth()]} ${x.getFullYear()}`;
};
/** "2026-10-17" -> "Sabtu, 17 Oktober 2026" */
export const dateDay = (d) => `${HARI[toDate(d).getDay()]}, ${dateLong(d)}`;
/** "2026-10-17" -> "17 Okt 2026" */
export const dateShort = (d) => {
  const x = toDate(d);
  return `${x.getDate()} ${BLN[x.getMonth()]} ${x.getFullYear()}`;
};
/** "2026-10-17" -> "17 Okt" */
export const dayMonth = (d) => {
  const x = toDate(d);
  return `${x.getDate()} ${BLN[x.getMonth()]}`;
};

/** "19.00" + 60 -> "19.00–20.00" */
export const timeRange = (start, minutes = 60) => {
  const [h, m] = `${start}`.split(/[.:]/).map(Number);
  const end = h * 60 + (m || 0) + Number(minutes);
  const pad = (v) => String(v).padStart(2, '0');
  return `${start}–${pad(Math.floor(end / 60) % 24)}.${pad(end % 60)}`;
};

/** "Garuda United" -> "GU" */
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

export const cx = (...c) => c.filter(Boolean).join(' ');

/** "2026-10-17" -> "Sabtu, 17 Okt 2026" */
export const dateDayShort = (d) => `${HARI[toDate(d).getDay()]}, ${dateShort(d)}`;
