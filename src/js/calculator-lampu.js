/**
 * calculator-lampu.js — Modul Kalkulasi Finansial & Lingkungan untuk Lampu
 */

/**
 * Estimasi harga lampu LED berdasarkan daya (Watt).
 * Asumsi: Rp 3.000 per Watt dengan harga minimum Rp 15.000.
 * @param {number} daya - Daya lampu dalam Watt.
 * @returns {number} Estimasi harga dalam Rupiah.
 */
export function estimasiHargaLampu(daya) {
  const harga = daya * 3000;
  return Math.max(15000, harga);
}

/**
 * Menghitung kapasitas cahaya (Lumen) dan estimasi daya (Watt) berdasarkan ruangan.
 * Rumus: Φ = (E * A) / (CU * LLF) dimana CU * LLF = 0.6
 * Estimasi LED: 100 Lumen / Watt
 * @param {number} lux - Target pencahayaan (Lux) berdasarkan SNI.
 * @param {number} panjang - Panjang ruangan (m).
 * @param {number} lebar - Lebar ruangan (m).
 * @returns {Object} Objek berisi kebutuhanLumen dan kebutuhanWatt.
 */
export function hitungKapasitasLampu(lux, panjang, lebar) {
  const luas = panjang * lebar;
  const faktor = 0.6; // CU * LLF
  const kebutuhanLumen = (lux * luas) / faktor;
  const kebutuhanWatt = Math.round(kebutuhanLumen / 100);
  return {
    kebutuhanLumen: Math.round(kebutuhanLumen),
    kebutuhanWatt: kebutuhanWatt > 0 ? kebutuhanWatt : 1
  };
}

/**
 * Menghitung penghematan tahunan jika mengganti lampu lama dengan LED baru.
 * @param {number} biayaLama - Biaya listrik lampu lama per tahun.
 * @param {number} biayaBaru - Biaya listrik lampu LED baru per tahun.
 * @returns {number} Total penghematan (Rp) per tahun. Mengembalikan 0 jika biayaBaru > biayaLama.
 */
export function hitungPenghematanLampu(biayaLama, biayaBaru) {
  const hemat = biayaLama - biayaBaru;
  return hemat > 0 ? hemat : 0;
}

/**
 * Menghitung reduksi emisi karbon berdasarkan penghematan biaya.
 * @param {number} hematRp - Penghematan biaya tahunan (Rp).
 * @param {number} tarifKwh - Tarif listrik per kWh (Rp).
 * @returns {Object} Objek berisi hematKwh dan reduksiCO2 (kg).
 */
export function hitungDampakLingkungan(hematRp, tarifKwh = 1444) {
  if (hematRp <= 0 || tarifKwh <= 0) {
    return { hematKwh: 0, reduksiCO2: 0 };
  }
  const hematKwh = hematRp / tarifKwh;
  // Faktor emisi karbon rata-rata Indonesia: 0.87 kg CO2 / kWh
  const reduksiCO2 = hematKwh * 0.87;
  return { hematKwh, reduksiCO2 };
}

/**
 * Menghitung Net Present Value (NPV).
 * @param {number} rate - Suku bunga diskonto (desimal, misal 0.06).
 * @param {Array<number>} cashFlows - Array arus kas [Tahun 0, Tahun 1, ..., Tahun n].
 * @returns {number} Nilai NPV.
 */
export function hitungNPV(rate, cashFlows) {
  return cashFlows.reduce((acc, cf, i) => acc + (cf / Math.pow(1 + rate, i)), 0);
}

/**
 * Menghitung Internal Rate of Return (IRR) menggunakan metode Secant.
 * @param {Array<number>} cashFlows - Array arus kas [Tahun 0, Tahun 1, ..., Tahun n].
 * @param {number} iterations - Maksimum iterasi (default: 100).
 * @returns {number} Nilai IRR dalam bentuk desimal (misal 0.15 untuk 15%).
 */
export function hitungIRR(cashFlows, iterations = 100) {
  const totalCF = cashFlows.reduce((a, b) => a + b, 0);
  if (totalCF <= 0) return 0;

  let rate1 = 0.0;
  let rate2 = 0.1;
  let npv1 = hitungNPV(rate1, cashFlows);
  let npv2 = hitungNPV(rate2, cashFlows);

  for (let i = 0; i < iterations; i++) {
    if (Math.abs(npv2 - npv1) < 1e-6) break;
    const rateNew = rate2 - npv2 * (rate2 - rate1) / (npv2 - npv1);
    rate1 = rate2;
    rate2 = rateNew;
    npv1 = npv2;
    npv2 = hitungNPV(rate2, cashFlows);
    
    // Cegah angka IRR yang gila akibat divergen
    if (!isFinite(rate2) || Math.abs(rate2) > 100) return 0;
  }
  return rate2;
}
