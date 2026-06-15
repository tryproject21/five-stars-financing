export function estimasiHargaKulkas(volume, tipe) {
  let basePrice = 1500000;
  if (typeof tipe === 'string' && tipe.toLowerCase().includes('dua pintu')) {
    basePrice += 1000000;
  }
  try {
    if (volume && !isNaN(volume)) {
      basePrice += parseInt(volume * 5000);
    }
  } catch (e) {
    // Ignore
  }
  return basePrice;
}

export function hitungPenghematanKulkas(biayaLama, biayaBaru) {
  if (biayaLama <= 0) return 0;
  const hemat = biayaLama - biayaBaru;
  return hemat > 0 ? hemat : 0;
}

export function hitungDampakLingkunganKulkas(hematRp, tarifListrik) {
  if (hematRp <= 0 || tarifListrik <= 0) return { kwh: 0, co2: 0 };
  const hematKwh = hematRp / tarifListrik;
  const reduksiCo2 = hematKwh * 0.87; // Faktor emisi listrik Indonesia ~0.87 kgCO2/kWh
  return {
    kwh: hematKwh,
    co2: reduksiCo2
  };
}
