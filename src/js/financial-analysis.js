/**
 * financial-analysis.js — Modul Analisis Keuangan (Capital Budgeting)
 * Modul ini menyediakan fungsi-fungsi analisis kelayakan investasi AC
 * menggunakan metode NPV (Net Present Value), IRR (Internal Rate of Return),
 * dan Payback Period.
 */

/**
 * Hitung Net Present Value (Nilai Sekarang Bersih).
 * NPV menghitung nilai sekarang dari seluruh arus kas masa depan
 * yang didiskontokan dengan tingkat bunga tertentu.
 * 
 * @param {number} rate - Tingkat diskonto dalam desimal (misal: 0.06 untuk 6%)
 * @param {Array<number>} cashFlows - Array arus kas, cashFlows[0] = investasi awal (negatif),
 *                                    cashFlows[1..n] = penghematan tahunan (positif)
 * @returns {number} Nilai NPV
 */
export function hitungNPV(rate, cashFlows) {
  // Rumus NPV: Σ CF_t / (1 + r)^t, dimulai dari t=0
  return cashFlows.reduce((npv, cf, i) => npv + cf / Math.pow(1 + rate, i), 0);
}

/**
 * Hitung Internal Rate of Return menggunakan metode Secant.
 * IRR adalah tingkat diskonto yang membuat NPV = 0.
 * Metode Secant dipilih karena konvergensinya yang cepat
 * tanpa memerlukan turunan fungsi (berbeda dengan Newton-Raphson).
 * 
 * @param {Array<number>} cashFlows - Array arus kas
 * @param {number} tolerance - Toleransi konvergensi (default: 0.0001)
 * @param {number} maxIterations - Jumlah iterasi maksimum (default: 100)
 * @returns {number} Nilai IRR dalam desimal
 */
export function hitungIRR(cashFlows, tolerance = 0.0001, maxIterations = 100) {
  // Dua tebakan awal untuk metode Secant
  let rate1 = 0.0;
  let rate2 = 0.1;
  let npv1 = hitungNPV(rate1, cashFlows);
  let npv2 = hitungNPV(rate2, cashFlows);

  for (let i = 0; i < maxIterations; i++) {
    // Cek apakah NPV sudah cukup mendekati nol
    if (Math.abs(npv2) < tolerance) return rate2;

    // Hindari pembagian dengan nol jika selisih NPV sama
    if (npv2 - npv1 === 0) break;

    // Rumus Secant: r_baru = r2 - NPV2 × (r2 - r1) / (NPV2 - NPV1)
    const rateNew = rate2 - npv2 * (rate2 - rate1) / (npv2 - npv1);

    // Geser nilai untuk iterasi berikutnya
    rate1 = rate2;
    rate2 = rateNew;
    npv1 = npv2;
    npv2 = hitungNPV(rate2, cashFlows);
  }

  // Kembalikan hasil terbaik meskipun belum konvergen sempurna
  return rate2;
}

/**
 * Hitung Simple Payback Period (Periode Pengembalian Sederhana).
 * Menghitung berapa tahun yang dibutuhkan untuk mengembalikan
 * investasi awal melalui penghematan tahunan.
 * 
 * @param {number} investasi - Nilai investasi awal (Rp)
 * @param {number} penghematanPerTahun - Penghematan biaya listrik per tahun (Rp)
 * @returns {number} Jumlah tahun untuk balik modal (Infinity jika tidak ada penghematan)
 */
export function hitungPaybackPeriod(investasi, penghematanPerTahun) {
  // Jika tidak ada penghematan, investasi tidak pernah kembali
  if (penghematanPerTahun <= 0) return Infinity;
  return investasi / penghematanPerTahun;
}

/**
 * Analisis kelayakan investasi berdasarkan NPV dan IRR.
 * Keputusan Go/No-Go ditentukan dari dua kriteria:
 * - NPV > 0 (investasi menguntungkan)
 * - IRR > discount rate (imbal hasil melebihi biaya modal)
 * 
 * @param {number} npv - Nilai NPV hasil perhitungan
 * @param {number} irr - Nilai IRR hasil perhitungan (desimal)
 * @param {number} discountRate - Tingkat diskonto / biaya modal (desimal)
 * @returns {Object} Hasil analisis kelayakan
 */
export function analisisKelayakan(npv, irr, discountRate) {
  return {
    npvLayak: npv > 0,                          // Apakah NPV positif?
    irrLayak: irr > discountRate,                // Apakah IRR melebihi discount rate?
    keputusan: (npv > 0 && irr > discountRate)
      ? 'LAYAK (Go)'
      : 'TIDAK LAYAK (No-Go)',                   // Keputusan akhir
    status: (npv > 0 && irr > discountRate)
      ? 'go'
      : 'nogo'                                    // Status singkat untuk UI
  };
}

/**
 * Generate array arus kas untuk analisis capital budgeting.
 * Elemen pertama adalah investasi awal (negatif), diikuti
 * penghematan tahunan selama umur ekonomis AC.
 * 
 * @param {number} investasi - Nilai investasi awal (angka positif, akan di-negatifkan)
 * @param {number} penghematanPerTahun - Penghematan biaya listrik per tahun (Rp)
 * @param {number} umurEkonomis - Estimasi umur ekonomis AC dalam tahun
 * @returns {Array<number>} Array arus kas [-investasi, +hemat, +hemat, ...]
 */
export function generateCashFlows(investasi, penghematanPerTahun, umurEkonomis) {
  // Investasi awal sebagai arus kas keluar (negatif)
  const cashFlows = [-investasi];

  // Penghematan tahunan sebagai arus kas masuk (positif)
  for (let i = 0; i < umurEkonomis; i++) {
    cashFlows.push(penghematanPerTahun);
  }

  return cashFlows;
}

/**
 * Analisis lengkap kelayakan investasi untuk satu unit AC.
 * Menggabungkan semua perhitungan: NPV, IRR, Payback Period,
 * dan keputusan kelayakan.
 * 
 * @param {number} investasi - Harga AC / nilai investasi (Rp)
 * @param {number} penghematanPerTahun - Estimasi penghematan listrik per tahun (Rp)
 * @param {number} umurEkonomis - Umur ekonomis AC dalam tahun
 * @param {number} discountRate - Tingkat diskonto / biaya modal (desimal, misal: 0.06)
 * @returns {Object} Hasil analisis lengkap: cashFlows, npv, irr, paybackPeriod, kelayakan
 */
export function fullAnalysis(investasi, penghematanPerTahun, umurEkonomis, discountRate) {
  // Kasus khusus: tidak ada penghematan sama sekali
  if (penghematanPerTahun <= 0) {
    return {
      cashFlows: [-investasi],
      npv: -investasi,
      irr: 0,
      paybackPeriod: Infinity,
      kelayakan: analisisKelayakan(-investasi, 0, discountRate)
    };
  }

  // Generate arus kas selama umur ekonomis
  const cashFlows = generateCashFlows(investasi, penghematanPerTahun, umurEkonomis);

  // Hitung semua metrik keuangan
  const npv = hitungNPV(discountRate, cashFlows);
  const irr = hitungIRR(cashFlows);
  const paybackPeriod = hitungPaybackPeriod(investasi, penghematanPerTahun);
  const kelayakan = analisisKelayakan(npv, irr, discountRate);

  return {
    cashFlows,
    npv,
    irr,
    paybackPeriod,
    kelayakan
  };
}
