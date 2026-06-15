import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// Palet warna - tema gelap premium
const COLORS = {
  cyan: 'rgba(0, 229, 255, 1)',
  cyanAlpha: 'rgba(0, 229, 255, 0.3)',
  teal: 'rgba(0, 191, 165, 1)',
  tealAlpha: 'rgba(0, 191, 165, 0.3)',
  purple: 'rgba(156, 39, 176, 1)',
  purpleAlpha: 'rgba(156, 39, 176, 0.3)',
  amber: 'rgba(255, 193, 7, 1)',
  amberAlpha: 'rgba(255, 193, 7, 0.3)',
  pink: 'rgba(233, 30, 99, 1)',
  pinkAlpha: 'rgba(233, 30, 99, 0.3)',
  green: 'rgba(76, 175, 80, 1)',
  greenAlpha: 'rgba(76, 175, 80, 0.3)',
  red: 'rgba(244, 67, 54, 1)',
  redAlpha: 'rgba(244, 67, 54, 0.3)',
  white: 'rgba(255, 255, 255, 0.9)',
  grid: 'rgba(255, 255, 255, 0.1)',
  gridBorder: 'rgba(255, 255, 255, 0.2)'
};

const PALETTE = [
  COLORS.cyan, COLORS.teal, COLORS.purple, COLORS.amber, COLORS.pink, COLORS.green
];
const PALETTE_ALPHA = [
  COLORS.cyanAlpha, COLORS.tealAlpha, COLORS.purpleAlpha, COLORS.amberAlpha, COLORS.pinkAlpha, COLORS.greenAlpha
];

// Opsi chart umum untuk tema gelap
const darkThemeDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: COLORS.white, font: { family: 'Inter', size: 12 } }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: COLORS.cyan,
      bodyColor: COLORS.white,
      borderColor: 'rgba(0, 229, 255, 0.3)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' },
      callbacks: {
        label: function(context) {
          let value = context.parsed.y || context.parsed;
          if (typeof value === 'number' && value > 10000) {
            return context.dataset.label + ': Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(value));
          }
          return context.dataset.label + ': ' + (typeof value === 'number' ? value.toFixed(1) : value);
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: COLORS.white, font: { family: 'Inter', size: 11 } },
      grid: { color: COLORS.grid, borderColor: COLORS.gridBorder }
    },
    y: {
      ticks: { color: COLORS.white, font: { family: 'Inter', size: 11 } },
      grid: { color: COLORS.grid, borderColor: COLORS.gridBorder }
    }
  },
  animation: {
    duration: 1000,
    easing: 'easeOutQuart'
  }
};

// 1. Bar chart: Perbandingan Biaya Listrik Tahunan (AC baru vs AC lama)
export function createCostComparisonChart(canvasId, acNames, biayaBaru, biayaLama = null, labelBaru = 'Biaya Listrik AC Baru (Rp/tahun)', labelLama = 'Biaya Listrik AC Lama (Rp/tahun)') {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  
  const datasets = [
    {
      label: labelBaru,
      data: biayaBaru,
      backgroundColor: PALETTE_ALPHA.slice(0, biayaBaru.length),
      borderColor: PALETTE.slice(0, biayaBaru.length),
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false
    }
  ];
  
  // Tambahkan dataset AC lama jika tersedia
  if (biayaLama !== null) {
    datasets.push({
      label: labelLama,
      data: Array(acNames.length).fill(biayaLama),
      backgroundColor: COLORS.redAlpha,
      borderColor: COLORS.red,
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false
    });
  }
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels: acNames, datasets },
    options: {
      ...darkThemeDefaults,
      plugins: {
        ...darkThemeDefaults.plugins,
        title: { display: true, text: 'Perbandingan Biaya Listrik Tahunan', color: COLORS.white, font: { family: 'Inter', size: 16, weight: '600' } }
      }
    }
  });
  return chartInstances[canvasId];
}

// 2. Bar chart: Perbandingan NPV
export function createNPVComparisonChart(canvasId, acNames, npvValues) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  
  // Warna hijau untuk NPV positif, merah untuk negatif
  const bgColors = npvValues.map(v => v >= 0 ? COLORS.greenAlpha : COLORS.redAlpha);
  const borderColors = npvValues.map(v => v >= 0 ? COLORS.green : COLORS.red);
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: acNames,
      datasets: [{
        label: 'NPV (Rp)',
        data: npvValues,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      ...darkThemeDefaults,
      plugins: {
        ...darkThemeDefaults.plugins,
        title: { display: true, text: 'Perbandingan Net Present Value (NPV)', color: COLORS.white, font: { family: 'Inter', size: 16, weight: '600' } }
      }
    }
  });
  return chartInstances[canvasId];
}

// 3. Bar chart: Perbandingan IRR dengan garis discount rate
export function createIRRComparisonChart(canvasId, acNames, irrValues, discountRate) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  
  // Warna teal jika IRR >= discount rate, merah jika di bawah
  const bgColors = irrValues.map(v => v >= discountRate ? COLORS.tealAlpha : COLORS.redAlpha);
  const borderColors = irrValues.map(v => v >= discountRate ? COLORS.teal : COLORS.red);
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: acNames,
      datasets: [
        {
          label: 'IRR (%)',
          data: irrValues.map(v => (v * 100)),
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        },
        {
          label: 'Discount Rate (%)',
          data: Array(acNames.length).fill(discountRate * 100),
          type: 'line',
          borderColor: COLORS.amber,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      ...darkThemeDefaults,
      plugins: {
        ...darkThemeDefaults.plugins,
        title: { display: true, text: 'Perbandingan Internal Rate of Return (IRR)', color: COLORS.white, font: { family: 'Inter', size: 16, weight: '600' } }
      }
    }
  });
  return chartInstances[canvasId];
}

// 4. Radar chart: Perbandingan multi-dimensi
export function createRadarChart(canvasId, acNames, datasets) {
  // datasets = array dari { label, data: [efisiensi, rating, hemat, payback_inverse, daya_inverse] }
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  
  const chartDatasets = datasets.map((ds, i) => ({
    label: ds.label,
    data: ds.data,
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE_ALPHA[i % PALETTE_ALPHA.length],
    borderWidth: 2,
    pointBackgroundColor: PALETTE[i % PALETTE.length],
    pointBorderColor: '#fff',
    pointBorderWidth: 1,
    pointRadius: 4
  }));
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Efisiensi', 'Rating Bintang', 'Penghematan', 'Payback (cepat)', 'Hemat Daya'],
      datasets: chartDatasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: COLORS.white, font: { family: 'Inter', size: 12 } } },
        title: { display: true, text: 'Analisis Multi-Dimensi', color: COLORS.white, font: { family: 'Inter', size: 16, weight: '600' } }
      },
      scales: {
        r: {
          ticks: { color: COLORS.white, backdropColor: 'transparent', font: { size: 10 } },
          grid: { color: COLORS.grid },
          angleLines: { color: COLORS.grid },
          pointLabels: { color: COLORS.white, font: { family: 'Inter', size: 12 } },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      animation: { duration: 1200, easing: 'easeOutQuart' }
    }
  });
  return chartInstances[canvasId];
}

// 5. Pie chart (doughnut): Proporsi pokok vs bunga (pembiayaan)
export function createFinancingPieChart(canvasId, dp, totalPokok, totalBunga) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Uang Muka (DP)', 'Pokok Pinjaman', 'Total Bunga'],
      datasets: [{
        data: [dp, totalPokok, totalBunga],
        backgroundColor: [COLORS.cyanAlpha, COLORS.tealAlpha, COLORS.pinkAlpha],
        borderColor: [COLORS.cyan, COLORS.teal, COLORS.pink],
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'bottom', labels: { color: COLORS.white, font: { family: 'Inter', size: 12 }, padding: 20 } },
        title: { display: true, text: 'Komposisi Pembayaran', color: COLORS.white, font: { family: 'Inter', size: 16, weight: '600' } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: COLORS.cyan,
          bodyColor: COLORS.white,
          callbacks: {
            label: function(context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((value / total) * 100).toFixed(1);
              return context.label + ': Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(value)) + ' (' + pct + '%)';
            }
          }
        }
      },
      animation: { animateRotate: true, duration: 1000, easing: 'easeOutQuart' }
    }
  });
  return chartInstances[canvasId];
}

// 6. Bar chart: Perbandingan Payback Period
export function createPaybackChart(canvasId, acNames, paybackValues, umurEkonomis) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  
  // Warna hijau jika payback <= umur ekonomis, merah jika melebihi
  const bgColors = paybackValues.map(v => v <= umurEkonomis ? COLORS.greenAlpha : COLORS.redAlpha);
  const borderColors = paybackValues.map(v => v <= umurEkonomis ? COLORS.green : COLORS.red);
  
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: acNames,
      datasets: [
        {
          label: 'Payback Period (Tahun)',
          data: paybackValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        },
        {
          label: 'Umur Ekonomis (Tahun)',
          data: Array(acNames.length).fill(umurEkonomis),
          type: 'line',
          borderColor: COLORS.amber,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      ...darkThemeDefaults,
      plugins: {
        ...darkThemeDefaults.plugins,
        title: { display: true, text: 'Perbandingan Simple Payback Period', color: COLORS.white, font: { family: 'Inter', size: 16, weight: '600' } }
      }
    }
  });
  return chartInstances[canvasId];
}

// Menghancurkan semua instance chart yang ada
export function destroyAllCharts() {
  Object.keys(chartInstances).forEach(id => destroyChart(id));
}

export { COLORS, PALETTE, PALETTE_ALPHA };
