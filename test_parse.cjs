const fs = require('fs');
const Papa = require('papaparse');
const csvText = fs.readFileSync('public/data/ac-database.csv', 'utf8');
const hasil = Papa.parse(csvText, { header: true, delimiter: ';' });
const row = hasil.data.find(r => r.Model && r.Model.includes('RKC20TVM4'));
console.log('Raw string from PapaParse:', row['Daya (watt)']);

const KOLOM_NUMERIK = ['Daya (watt)', 'Kapasitas Pendinginan (BTU/h)', 'Nilai Efisiensi (EER/CSPF)', 'Rating Bintang (1-5)', 'Konsumsi Energi Tahunan (kWh)*', 'Biaya Listrik Tahunan (Rp)'];

let cleanVal = String(row['Daya (watt)'])
            .replace(/[^\d.,-]/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '.');
console.log('Cleaned string:', cleanVal);
console.log('Parsed float:', parseFloat(cleanVal));

let cleanValCost = String(row['Biaya Listrik Tahunan (Rp)'])
            .replace(/[^\d.,-]/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '.');
console.log('Cleaned Cost string:', cleanValCost);
console.log('Parsed Cost float:', parseFloat(cleanValCost));
