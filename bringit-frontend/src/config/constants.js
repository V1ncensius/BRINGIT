// Konstanta domain BRINGIT (lihat SRS 1.3 & FR-02).

/** Peran pengguna — sama dengan kolom users.role pada ERD. */
export const ROLES = {
  TEAM: 'team',
  REFEREE: 'referee',
  PHOTOGRAPHER: 'photographer',
  ADMIN: 'admin',
};

export const ROLE_LABEL = {
  team: 'Tim',
  referee: 'Wasit',
  photographer: 'Fotografer',
  admin: 'Admin',
};

/** Halaman awal setelah login per peran. */
export const ROLE_HOME = {
  team: '/tim',
  referee: '/penyedia',
  photographer: '/penyedia',
  admin: '/admin',
};

/**
 * Cabang olahraga versi awal (SRS 1.3). Data sebenarnya diambil dari
 * master `sport_categories` (FR-26) sehingga admin bisa menambah/menonaktifkan.
 */
export const DEFAULT_SPORTS = ['Futsal', 'Basket', 'Tenis', 'Padel', 'Bulu Tangkis', 'Mini Soccer'];

export const LEVELS = ['Pemula', 'Menengah', 'Mahir'];

export const CITIES = ['Bandung', 'Jakarta', 'Balikpapan', 'Surabaya', 'Yogyakarta', 'Cimahi'];

export const PAYMENT_METHODS = ['QRIS', 'Virtual Account BCA', 'Virtual Account Mandiri', 'GoPay', 'OVO'];

export const DURATIONS = [60, 90, 120];

export const TIME_SLOTS = ['08.00', '10.00', '13.00', '16.00', '18.00', '19.00', '20.00'];

/** Status permintaan sparring (opponent_requests.status). */
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

/** Status pertandingan (matches.status). */
export const MATCH_STATUS = {
  PROPOSED: 'proposed', // jadwal diusulkan, menunggu persetujuan lawan
  SCHEDULED: 'scheduled', // jadwal disepakati
  RESULT_PENDING: 'result_pending', // skor diinput, menunggu konfirmasi
  FINAL: 'final',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
};

/** Status pesanan jasa (referee_bookings / photographer_bookings). */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  DONE: 'done',
  PAID_OUT: 'paid_out',
};

export const BOOKING_STATUS_LABEL = {
  pending: 'Pesanan baru',
  accepted: 'Diterima',
  rejected: 'Ditolak · dana kembali',
  done: 'Selesai',
  paid_out: 'Dibayarkan',
};

export const ELO_DEFAULT = 1000;
