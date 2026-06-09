/**
 * database.js — Modul Database AC
 * Modul ini bertanggung jawab untuk memuat, mem-parsing, dan
 * melakukan query terhadap database AC dari file CSV.
 */

import Papa from 'papaparse';

// Variabel internal untuk menyimpan data AC dan daftar merek
let acDatabase = [];
let uniqueBrands = [];

// Daftar kolom yang seharusnya bernilai numerik
const KOLOM_NUMERIK = [
  'Daya (watt)',
  'Kapasitas Pendinginan (BTU/h)',
  'Nilai Efisiensi (EER/CSPF)',
  'Rating Bintang (1-5)',
  'Konsumsi Energi Tahunan <br>(kWh)*',
  'Biaya Listrik Tahunan (Rp)',
  'Harga (Rp)'
];

/**
 * Memuat dan mem-parsing file CSV database AC.
 * CSV diambil dari /data/ac-database.csv dengan delimiter ';'.
 * Data dibersihkan: spasi dihapus, kolom numerik dikonversi,
 * dan baris dengan BTU atau Daya tidak valid dibuang.
 */
export async function loadDatabase() {
  try {
    // Ambil file CSV dari server
    // Gunakan base URL dari Vite agar kompatibel saat deploy (misal GitHub Pages)
    // Tambahkan parameter ?v=timestamp agar browser tidak menggunakan cache lama
    const base = import.meta.env.BASE_URL || '/';
    const timestamp = new Date().getTime();
    const response = await fetch(`${base}data/ac-database.csv?v=${timestamp}`);
    const csvText = await response.text();

    // Bersihkan entitas HTML yang mungkin ada di header
    // Contoh: &lt;br&gt; harus menjadi <br>
    const cleanedCsv = csvText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Parse CSV menggunakan PapaParse dengan delimiter ';'
    const hasil = Papa.parse(cleanedCsv, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true
    });

    // Bersihkan data: hapus spasi di nama kolom dan nilai
    acDatabase = hasil.data.map(row => {
      const barisClean = {};
      for (const [key, value] of Object.entries(row)) {
        // Bersihkan nama kolom dari spasi berlebih
        const cleanKey = key.trim();
        // Bersihkan nilai dari spasi berlebih
        const cleanVal = typeof value === 'string' ? value.trim() : value;
        barisClean[cleanKey] = cleanVal;
      }
      return barisClean;
    });

    // Konversi kolom numerik ke tipe Number
    acDatabase = acDatabase.map(row => {
      for (const kolom of KOLOM_NUMERIK) {
        if (row[kolom] !== undefined && row[kolom] !== '') {
          // Hapus karakter non-numerik kecuali titik dan koma untuk parsing
          const nilaiStr = String(row[kolom])
            .replace(/[^\d.,-]/g, '')  // Hapus selain digit, titik, koma, minus
            .replace(/\./g, '')         // Hapus titik pemisah ribuan (format Indonesia)
            .replace(/,/g, '.');        // Ganti koma desimal ke titik
          const nilai = parseFloat(nilaiStr);
          row[kolom] = isNaN(nilai) ? 0 : nilai;
        } else {
          row[kolom] = 0;
        }
      }
      return row;
    });

    // Filter baris yang BTU atau Daya-nya tidak valid (NaN atau 0)
    acDatabase = acDatabase.filter(row => {
      const btu = row['Kapasitas Pendinginan (BTU/h)'];
      const daya = row['Daya (watt)'];
      return btu > 0 && daya > 0;
    });

    // Ekstrak daftar merek unik dari kolom 'Merek'
    const merekSet = new Set(
      acDatabase
        .map(row => row['Merek'])
        .filter(m => m && m.length > 0)
    );
    uniqueBrands = Array.from(merekSet).sort();

    console.log(`[Database] Berhasil memuat ${acDatabase.length} data AC dari ${uniqueBrands.length} merek.`);
    return acDatabase;
  } catch (error) {
    console.error('[Database] Gagal memuat database AC:', error);
    throw error;
  }
}

/**
 * Mengembalikan seluruh data AC yang sudah dimuat.
 * @returns {Array} Array objek data AC
 */
export function getDatabase() {
  return acDatabase;
}

/**
 * Mengembalikan daftar merek AC unik.
 * @returns {Array} Array string nama merek
 */
export function getBrands() {
  return uniqueBrands;
}

/**
 * Filter data AC berdasarkan rentang BTU.
 * @param {number} btuMin - Batas bawah BTU
 * @param {number} btuMax - Batas atas BTU
 * @returns {Array} Data AC yang kapasitas BTU-nya dalam rentang
 */
export function filterByBTURange(btuMin, btuMax) {
  return acDatabase.filter(row => {
    const btu = row['Kapasitas Pendinginan (BTU/h)'];
    return btu >= btuMin && btu <= btuMax;
  });
}

/**
 * Filter data AC berdasarkan nama merek.
 * @param {string} brand - Nama merek AC
 * @returns {Array} Data AC dari merek tersebut
 */
export function filterByBrand(brand) {
  return acDatabase.filter(row => {
    return row['Merek'] && row['Merek'].toLowerCase() === brand.toLowerCase();
  });
}

/**
 * Filter data AC berdasarkan tipe: 'Inverter' atau 'Non-Inverter'.
 * @param {string} type - Tipe AC ('Inverter' atau 'Non-Inverter')
 * @returns {Array} Data AC dengan tipe yang sesuai
 */
export function filterByType(type) {
  return acDatabase.filter(row => {
    return row['Tipe'] && row['Tipe'].toLowerCase() === type.toLowerCase();
  });
}

/**
 * Cari AC berdasarkan kata kunci di kolom Merek, Model, atau Famili.
 * Pencarian bersifat case-insensitive.
 * @param {string} query - Kata kunci pencarian
 * @returns {Array} Data AC yang cocok dengan pencarian
 */
export function searchAC(query) {
  const q = query.toLowerCase();
  return acDatabase.filter(row => {
    const merek = (row['Merek'] || '').toLowerCase();
    const model = (row['Model'] || '').toLowerCase();
    const famili = (row['Famili'] || '').toLowerCase();
    return merek.includes(q) || model.includes(q) || famili.includes(q);
  });
}

/**
 * Mendapatkan data AC berdasarkan nomor (kolom 'No').
 * @param {number|string} no - Nomor identitas AC
 * @returns {Object|undefined} Data AC jika ditemukan
 */
export function getACById(no) {
  return acDatabase.find(row => String(row['No']) === String(no));
}

/**
 * Helper untuk mendapatkan nilai kolom yang sudah bersih.
 * Mengembalikan nilai numerik untuk kolom yang dikenal sebagai numerik,
 * atau string untuk kolom lainnya.
 * @param {Object} row - Baris data AC
 * @param {string} key - Nama kolom
 * @returns {number|string} Nilai kolom
 */
export function getVal(row, key) {
  const nilai = row[key];

  // Jika kolom termasuk dalam daftar kolom numerik, kembalikan sebagai angka
  if (KOLOM_NUMERIK.includes(key)) {
    const angka = parseFloat(nilai);
    return isNaN(angka) ? 0 : angka;
  }

  // Untuk kolom non-numerik, kembalikan sebagai string
  return nilai !== undefined && nilai !== null ? String(nilai) : '';
}
