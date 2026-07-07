import Papa from 'papaparse';

let kulkasDatabase = [];
let uniqueBrandsKulkas = [];

const KOLOM_NUMERIK = [
  'Adjusted Volume (liter)*',
  'Daya (watt)',
  'Rating Bintang (1-5)',
  'Konsumsi Energi Tahunan (kWh)*',
  'Biaya Listrik Tahunan (Rp)'
];

export async function loadDatabaseKulkas() {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const timestamp = new Date().getTime();
    const response = await fetch(`${base}data/database_lemaripendingin.csv?v=${timestamp}`);
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

    kulkasDatabase = hasil.data.map(row => {
      const barisClean = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.replace(/<br>/gi, '').replace(/\s+/g, ' ').trim();
        const cleanVal = typeof value === 'string' ? value.trim() : value;
        barisClean[cleanKey] = cleanVal;
      }
      return barisClean;
    });

    kulkasDatabase = kulkasDatabase.map(row => {
      for (const kolom of KOLOM_NUMERIK) {
        if (row[kolom] !== undefined && row[kolom] !== '') {
          let nilaiStr = String(row[kolom]).replace(/[^\d.,-]/g, '');
          if (nilaiStr) {
            const lastDot = nilaiStr.lastIndexOf('.');
            const lastComma = nilaiStr.lastIndexOf(',');
            if (lastComma > -1 && lastDot > -1) {
              if (lastComma > lastDot) {
                nilaiStr = nilaiStr.replace(/\./g, '').replace(/,/g, '.');
              } else {
                nilaiStr = nilaiStr.replace(/,/g, '');
              }
            } else if (lastComma > -1) {
              const parts = nilaiStr.split(',');
              if (parts.length > 2 || parts[parts.length - 1].length === 3) {
                nilaiStr = nilaiStr.replace(/,/g, '');
              } else {
                nilaiStr = nilaiStr.replace(/,/g, '.');
              }
            }
          }
          const nilai = parseFloat(nilaiStr);
          row[kolom] = isNaN(nilai) ? 0 : nilai;
        } else {
          row[kolom] = 0;
        }
      }
      return row;
    });

    // Filter valid data
    kulkasDatabase = kulkasDatabase.filter(row => {
      const vol = row['Adjusted Volume (liter)*'];
      const daya = row['Daya (watt)'];
      return vol > 0 && daya > 0;
    });

    const merekSet = new Set(
      kulkasDatabase
        .map(row => row['Merek'])
        .filter(m => m && m.length > 0)
    );
    uniqueBrandsKulkas = Array.from(merekSet).sort();

    console.log(`[Database Kulkas] Berhasil memuat ${kulkasDatabase.length} data Lemari Pendingin dari ${uniqueBrandsKulkas.length} merek.`);
    return kulkasDatabase;
  } catch (error) {
    console.error('[Database Kulkas] Gagal memuat database Kulkas:', error);
    throw error;
  }
}

export function getDatabaseKulkas() {
  return kulkasDatabase;
}

export function getBrandsKulkas() {
  return uniqueBrandsKulkas;
}

export function filterByBrandKulkas(brand) {
  return kulkasDatabase.filter(row => {
    return row['Merek'] && row['Merek'].toLowerCase() === brand.toLowerCase();
  });
}

export function getKulkasById(no) {
  return kulkasDatabase.find(row => String(row['No']) === String(no));
}
