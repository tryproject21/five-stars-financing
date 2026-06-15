import Papa from 'papaparse';

let lampuDatabase = [];
let uniqueBrands = [];

const KOLOM_NUMERIK = [
  'Daya (Watt)',
  'Efikasi (Lumen/watt)',
  'Tingkat Bintang (1-5)',
  'Konsumsi Energi Tahunan (kWh)*',
  'Biaya Listrik Tahunan (Rp)'
];

export async function loadDatabaseLampu() {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const timestamp = new Date().getTime();
    const response = await fetch(`${base}data/database_lampu.csv?v=${timestamp}`);
    const csvText = await response.text();

    const cleanedCsv = csvText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    const hasil = Papa.parse(cleanedCsv, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true
    });

    lampuDatabase = hasil.data.map(row => {
      const barisClean = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.replace(/<br>/gi, '').replace(/\s+/g, ' ').trim();
        const cleanVal = typeof value === 'string' ? value.trim() : value;
        barisClean[cleanKey] = cleanVal;
      }
      return barisClean;
    });

    lampuDatabase = lampuDatabase.map(row => {
      for (const kolom of KOLOM_NUMERIK) {
        if (row[kolom] !== undefined && row[kolom] !== '') {
          const nilaiStr = String(row[kolom])
            .replace(/[^\d.,-]/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '.');
          const nilai = parseFloat(nilaiStr);
          row[kolom] = isNaN(nilai) ? 0 : nilai;
        } else {
          row[kolom] = 0;
        }
      }
      return row;
    });

    lampuDatabase = lampuDatabase.filter(row => {
      const daya = row['Daya (Watt)'];
      const efikasi = row['Efikasi (Lumen/watt)'];
      return daya > 0 && efikasi > 0;
    });

    const merekSet = new Set(
      lampuDatabase
        .map(row => row['Merek'])
        .filter(m => m && m.length > 0)
    );
    uniqueBrands = Array.from(merekSet).sort();

    console.log(`[Database Lampu] Berhasil memuat ${lampuDatabase.length} data Lampu dari ${uniqueBrands.length} merek.`);
    return lampuDatabase;
  } catch (error) {
    console.error('[Database Lampu] Gagal memuat database Lampu:', error);
    throw error;
  }
}

export function getDatabaseLampu() {
  return lampuDatabase;
}

export function getBrandsLampu() {
  return uniqueBrands;
}

export function filterByBrandLampu(brand) {
  return lampuDatabase.filter(row => {
    return row['Merek'] && row['Merek'].toLowerCase() === brand.toLowerCase();
  });
}

export function getLampuById(no) {
  return lampuDatabase.find(row => String(row['No']) === String(no));
}
