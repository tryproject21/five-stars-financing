/**
 * financing.js — Modul Simulasi Pembiayaan AC
 * Modul ini menyediakan fungsi-fungsi untuk menghitung cicilan kredit
 * dengan metode flat dan anuitas, serta generate tabel amortisasi.
 * Mode pembiayaan: Cash atau Kredit.
 */

/**
 * Hitung cicilan bulanan dengan metode bunga flat (tetap).
 * Pada metode flat, bunga dihitung dari pokok pinjaman awal
 * sehingga cicilan per bulan selalu sama.
 * 
 * @param {number} harga - Harga total AC dalam Rupiah
 * @param {number} dpPersen - Persentase uang muka (down payment), contoh: 20 untuk 20%
 * @param {number} bungaPerTahun - Suku bunga per tahun dalam persen, contoh: 12 untuk 12%
 * @param {number} tenorBulan - Jangka waktu kredit dalam bulan
 * @returns {Object} Rincian cicilan: dp, pokokPinjaman, bungaTotal, totalPembayaran, cicilanPerBulan, tenorBulan
 */
export function hitungCicilanFlat(harga, dpPersen, bungaPerTahun, tenorBulan) {
  // Hitung uang muka berdasarkan persentase
  const dp = harga * (dpPersen / 100);

  // Pokok pinjaman = harga dikurangi uang muka
  const pokokPinjaman = harga - dp;

  // Total bunga flat = pokok × suku bunga × (tenor dalam tahun)
  const bungaTotal = pokokPinjaman * (bungaPerTahun / 100) * (tenorBulan / 12);

  // Total yang harus dibayar (pokok + bunga, belum termasuk DP)
  const totalPembayaran = pokokPinjaman + bungaTotal;

  // Cicilan per bulan = total pembayaran dibagi tenor
  const cicilanPerBulan = totalPembayaran / tenorBulan;

  return {
    dp,
    pokokPinjaman,
    bungaTotal,
    totalPembayaran: dp + totalPembayaran, // Total keseluruhan termasuk DP
    cicilanPerBulan,
    tenorBulan
  };
}

/**
 * Hitung cicilan bulanan dengan metode anuitas (bunga efektif).
 * Pada metode anuitas, cicilan per bulan tetap, tetapi komposisi
 * pokok dan bunga berubah setiap bulan.
 * 
 * @param {number} harga - Harga total AC dalam Rupiah
 * @param {number} dpPersen - Persentase uang muka (down payment)
 * @param {number} bungaPerTahun - Suku bunga per tahun dalam persen
 * @param {number} tenorBulan - Jangka waktu kredit dalam bulan
 * @returns {Object} Rincian cicilan: dp, pokokPinjaman, bungaTotal, totalPembayaran, cicilanPerBulan, tenorBulan
 */
export function hitungCicilanAnuitas(harga, dpPersen, bungaPerTahun, tenorBulan) {
  // Hitung uang muka
  const dp = harga * (dpPersen / 100);
  const pokokPinjaman = harga - dp;

  // Konversi bunga tahunan ke bulanan (dalam desimal)
  const bungaBulanan = (bungaPerTahun / 100) / 12;

  // Kasus khusus: bunga 0% (tanpa bunga)
  if (bungaBulanan === 0) {
    return {
      dp,
      pokokPinjaman,
      bungaTotal: 0,
      totalPembayaran: harga,
      cicilanPerBulan: pokokPinjaman / tenorBulan,
      tenorBulan
    };
  }

  // Rumus anuitas: M = P × [r(1+r)^n] / [(1+r)^n - 1]
  // di mana P = pokok, r = bunga bulanan, n = tenor
  const cicilanPerBulan = pokokPinjaman *
    (bungaBulanan * Math.pow(1 + bungaBulanan, tenorBulan)) /
    (Math.pow(1 + bungaBulanan, tenorBulan) - 1);

  // Total pembayaran = DP + (cicilan × tenor)
  const totalPembayaran = dp + (cicilanPerBulan * tenorBulan);

  // Total bunga = total pembayaran - harga asli
  const bungaTotal = totalPembayaran - harga;

  return {
    dp,
    pokokPinjaman,
    bungaTotal,
    totalPembayaran,
    cicilanPerBulan,
    tenorBulan
  };
}

/**
 * Generate tabel amortisasi kredit dengan metode anuitas.
 * Tabel menunjukkan rincian pembayaran pokok dan bunga setiap bulan
 * beserta sisa pinjaman.
 * 
 * @param {number} harga - Harga total AC dalam Rupiah
 * @param {number} dpPersen - Persentase uang muka
 * @param {number} bungaPerTahun - Suku bunga per tahun dalam persen
 * @param {number} tenorBulan - Jangka waktu kredit dalam bulan
 * @returns {Array<Object>} Array tabel amortisasi per bulan
 */
export function generateAmortisasi(harga, dpPersen, bungaPerTahun, tenorBulan) {
  const dp = harga * (dpPersen / 100);
  const pokokPinjaman = harga - dp;
  const bungaBulanan = (bungaPerTahun / 100) / 12;

  // Hitung cicilan bulanan menggunakan fungsi anuitas
  const result = hitungCicilanAnuitas(harga, dpPersen, bungaPerTahun, tenorBulan);
  const cicilanPerBulan = result.cicilanPerBulan;

  const tabel = [];
  let sisaPinjaman = pokokPinjaman;

  // Iterasi setiap bulan untuk menghitung komposisi pembayaran
  for (let i = 1; i <= tenorBulan; i++) {
    // Bunga bulan ini dihitung dari sisa pinjaman
    const bungaBulanIni = sisaPinjaman * bungaBulanan;

    // Pokok bulan ini = cicilan dikurangi bunga
    const pokokBulanIni = cicilanPerBulan - bungaBulanIni;

    // Kurangi sisa pinjaman dengan pokok yang dibayar
    sisaPinjaman -= pokokBulanIni;

    tabel.push({
      bulan: i,
      cicilan: cicilanPerBulan,
      pokok: pokokBulanIni,
      bunga: bungaBulanIni,
      sisaPinjaman: Math.max(0, sisaPinjaman) // Pastikan tidak negatif karena pembulatan
    });
  }

  return tabel;
}

/**
 * Format angka ke format mata uang Rupiah Indonesia.
 * Contoh: 3500000 → "Rp3.500.000"
 * 
 * @param {number} angka - Angka yang akan diformat
 * @returns {string} String dalam format Rupiah
 */
export function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka);
}
