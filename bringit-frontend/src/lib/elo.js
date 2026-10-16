/**
 * Perhitungan rating ELO (FR-11). Dipakai mock API; di produksi
 * perhitungan dilakukan backend setelah hasil dikonfirmasi (NFR-02).
 *
 *   E_a = 1 / (1 + 10^((R_b - R_a) / 400))
 *   R_a' = R_a + K * (S_a - E_a)    S = 1 menang, 0.5 seri, 0 kalah
 */
export const K_FACTOR = 32;

export const expectedScore = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / 400));

export function calcElo(ra, rb, scoreA, scoreB, k = K_FACTOR) {
  const sa = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
  const ea = expectedScore(ra, rb);
  const delta = Math.round(k * (sa - ea));
  return { newA: ra + delta, newB: rb - delta, deltaA: delta, deltaB: -delta };
}

/** Label kecocokan lawan berdasarkan selisih ELO. */
export function eloGapLabel(gap) {
  const g = Math.abs(gap);
  if (g <= 50) return { text: 'Seimbang', tone: 'ok' };
  if (g <= 120) return { text: 'Menantang', tone: 'warn' };
  return { text: 'Jauh berbeda', tone: 'danger' };
}
