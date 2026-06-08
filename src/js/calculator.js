/**
 * calculator.js — Modul Kalkulator BTU AC
 * Modul ini menyediakan fungsi-fungsi untuk menghitung kebutuhan BTU,
 * konversi ke satuan PK, estimasi harga, dan penghematan listrik.
 */

/**
 * Hitung kebutuhan BTU berdasarkan dimensi ruangan dan jumlah okupansi.
 * Formula: (panjang × lebar × 500) + (okupansi × 400)
 * 
 * @param {number} panjang - Panjang ruangan dalam meter
 * @param {number} lebar - Lebar ruangan dalam meter
 * @param {number} okupansi - Jumlah orang yang biasa berada di ruangan
 * @returns {number} Kebutuhan BTU yang dihitung
 */
export function hitungBTU(panjang, lebar, okupansi) {
  return (panjang * lebar * 500) + (okupansi * 400);
}

/**
 * Konversi nilai BTU ke satuan PK (Paardekracht / Horse Power).
 * Menggunakan standar umum konversi BTU ke PK untuk AC split.
 * 
 * @param {number} btu - Nilai BTU yang akan dikonversi
 * @returns {{ pk: string, value: number }} Objek berisi label PK dan nilai numerik
 */
export function konversiKePK(btu) {
  // Klasifikasi BTU ke PK berdasarkan rentang standar industri AC
  if (btu <= 5500) return { pk: '1/2 PK', value: 0.5 };
  if (btu <= 7500) return { pk: '3/4 PK', value: 0.75 };
  if (btu <= 10000) return { pk: '1 PK', value: 1 };
  if (btu <= 14000) return { pk: '1.5 PK', value: 1.5 };
  if (btu <= 20000) return { pk: '2 PK', value: 2 };
  return { pk: '> 2 PK', value: 2.5 };
}

/**
 * Estimasi harga AC berdasarkan BTU dan tipe.
 * Jika harga aktual tersedia (dari kolom 'Harga (Rp)' di database), gunakan itu.
 * Jika tidak, hitung estimasi berdasarkan formula internal.
 * 
 * @param {number} btu - Kapasitas BTU AC
 * @param {string} tipe - Tipe AC ('Inverter' atau 'Non-Inverter')
 * @param {number|null} hargaAktual - Harga aktual jika tersedia dari database
 * @returns {number} Estimasi harga dalam Rupiah
 */
export function estimasiHarga(btu, tipe, hargaAktual = null) {
  // Gunakan harga aktual jika tersedia dan valid
  if (hargaAktual && hargaAktual > 0) return hargaAktual;

  // Kalkulasi harga estimasi berdasarkan formula
  const basePrice = 3000000; // Harga dasar AC dalam Rupiah
  const pkMultiplier = btu / 5000; // Faktor pengali berdasarkan kapasitas

  // Tambahan harga untuk tipe Inverter (lebih hemat energi tapi lebih mahal)
  const inverterPremium =
    typeof tipe === 'string' &&
    tipe.toLowerCase().includes('inverter') &&
    !tipe.toLowerCase().includes('non')
      ? 1500000
      : 0;

  return Math.round(basePrice * (pkMultiplier * 0.7) + inverterPremium);
}

/**
 * Hitung potensi penghematan biaya listrik per tahun.
 * Selisih antara biaya listrik AC lama dan AC baru.
 * 
 * @param {number} biayaListrikLama - Biaya listrik tahunan AC lama (Rp)
 * @param {number} biayaListrikBaru - Biaya listrik tahunan AC baru (Rp)
 * @returns {number} Jumlah penghematan (minimal 0, tidak bisa negatif)
 */
export function hitungPenghematan(biayaListrikLama, biayaListrikBaru) {
  const hemat = biayaListrikLama - biayaListrikBaru;
  // Pastikan penghematan tidak negatif (AC baru tidak boleh lebih boros)
  return hemat > 0 ? hemat : 0;
}

/**
 * Dapatkan rentang BTU untuk filtering rekomendasi AC.
 * Menggunakan toleransi 90% (batas bawah) sampai 130% (batas atas)
 * dari nilai BTU yang dihitung, untuk memberikan fleksibilitas pilihan.
 * 
 * @param {number} btu - Nilai BTU yang dihitung
 * @returns {{ min: number, max: number }} Rentang BTU minimum dan maksimum
 */
export function getBTURange(btu) {
  return {
    min: btu * 0.90, // 90% dari BTU — batas bawah
    max: btu * 1.30  // 130% dari BTU — batas atas (headroom lebih)
  };
}
