/**
 * AC Smart Consultant — Main Entry Point
 * Menghubungkan semua modul dan mengelola state aplikasi
 */

import './style.css';
import { loadDatabase, getDatabase, getBrands, filterByBTURange, filterByBrand, filterByType, getACById } from './js/database.js';
import { hitungBTU, konversiKePK, estimasiHarga, hitungPenghematan, getBTURange } from './js/calculator.js';
import { hitungCicilanAnuitas, generateAmortisasi, formatRupiah } from './js/financing.js';
import { fullAnalysis } from './js/financial-analysis.js';
import {
  createCostComparisonChart,
  createNPVComparisonChart,
  createIRRComparisonChart,
  createRadarChart,
  createFinancingPieChart,
  createPaybackChart,
  destroyAllCharts
} from './js/charts.js';
import {
  animateCounter,
  initScrollAnimations,
  createACCard,
  showToast,
  scrollToSection,
  initTabs,
  initNavScroll,
  formatShort
} from './js/ui.js';

// ========================
// STATE
// ========================
const state = {
  btu: 0,
  pk: '',
  rekomendasi: [],       // Filtered AC list
  selectedACs: [],       // ACs selected for comparison (array of row objects)
  currentPage: 1,
  perPage: 12,
  existingAC: null,      // Selected existing AC object
  biayaLama: 0,          // Biaya listrik AC lama per tahun
  hasExisting: false,
};

// ========================
// INITIALIZATION
// ========================
async function init() {
  try {
    await loadDatabase();
    const db = getDatabase();
    const brands = getBrands();

    // Update hero stats
    const statTotal = document.getElementById('stat-total');
    const statBrands = document.getElementById('stat-brands');
    const statInverter = document.getElementById('stat-inverter');
    const dbCount = document.getElementById('db-count');

    const inverterCount = db.filter(ac => {
      const tipe = (ac['Tipe'] || '').toLowerCase();
      return tipe.includes('inverter') && !tipe.includes('non');
    }).length;

    animateCounter(statTotal, db.length, 1200);
    animateCounter(statBrands, brands.length, 1000);
    animateCounter(statInverter, inverterCount, 1100);
    if (dbCount) dbCount.textContent = db.length + '+';

    // Populate brand selects
    populateBrandSelect('select-existing-brand', brands);
    populateBrandSelect('filter-brand', brands);

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
    }, 800);

    // Init UI
    initScrollAnimations();
    initNavScroll();
    initTabs();
    bindEvents();
    updateCalculation();

  } catch (err) {
    console.error('Initialization error:', err);
    document.getElementById('loading-screen').classList.add('hidden');
    showToast('Gagal memuat database: ' + err.message, 'error', 5000);
  }
}

// ========================
// EVENT BINDINGS
// ========================
function bindEvents() {
  // --- Navbar scroll effect ---
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // --- Mobile menu ---
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  mobileBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => mobileNav.classList.remove('open'));
  });

  // --- Room dimension inputs ---
  const panjangInput = document.getElementById('input-panjang');
  const lebarInput = document.getElementById('input-lebar');
  const okupansiInput = document.getElementById('input-okupansi');
  const rangePanjang = document.getElementById('range-panjang');
  const rangeLebar = document.getElementById('range-lebar');

  [panjangInput, lebarInput, okupansiInput].forEach(el => {
    el.addEventListener('input', updateCalculation);
  });

  // Sync range sliders
  rangePanjang.addEventListener('input', () => {
    panjangInput.value = rangePanjang.value;
    updateCalculation();
  });
  panjangInput.addEventListener('input', () => {
    rangePanjang.value = panjangInput.value;
  });

  rangeLebar.addEventListener('input', () => {
    lebarInput.value = rangeLebar.value;
    updateCalculation();
  });
  lebarInput.addEventListener('input', () => {
    rangeLebar.value = lebarInput.value;
  });

  // Stepper buttons
  document.querySelectorAll('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      const step = parseFloat(target.step) || 1;
      const min = parseFloat(target.min) || 0;
      const max = parseFloat(target.max) || 100;
      let val = parseFloat(target.value) || 0;
      if (btn.dataset.action === 'increment') val = Math.min(val + step, max);
      else val = Math.max(val - step, min);
      target.value = val;
      updateCalculation();
    });
  });

  // --- AC Existing toggle ---
  const toggleExisting = document.getElementById('toggle-existing');
  toggleExisting.addEventListener('change', () => {
    const panel = document.getElementById('existing-panel');
    state.hasExisting = toggleExisting.checked;
    panel.style.display = toggleExisting.checked ? 'block' : 'none';
    if (!toggleExisting.checked) {
      state.existingAC = null;
      state.biayaLama = 0;
    }
  });

  // --- Existing AC brand/model select ---
  const brandSelect = document.getElementById('select-existing-brand');
  const modelSelect = document.getElementById('select-existing-model');

  brandSelect.addEventListener('change', () => {
    const brand = brandSelect.value;
    modelSelect.innerHTML = '<option value="">-- Pilih Model --</option>';
    document.getElementById('existing-info').style.display = 'none';
    state.existingAC = null;

    if (brand) {
      const db = getDatabase();
      const models = db.filter(ac => ac['Merek'] === brand);
      models.forEach(ac => {
        const opt = document.createElement('option');
        opt.value = ac['No'];
        const modelName = ac['Model'] || ac['Famili'] || '-';
        opt.textContent = modelName.length > 60 ? modelName.substring(0, 60) + '...' : modelName;
        modelSelect.appendChild(opt);
      });
    }
  });

  modelSelect.addEventListener('change', () => {
    const no = parseInt(modelSelect.value);
    if (no) {
      const ac = getACById(no);
      if (ac) {
        state.existingAC = ac;
        const biaya = ac['Biaya Listrik Tahunan (Rp)'] || 0;
        state.biayaLama = biaya;
        document.getElementById('input-biaya-lama').value = Math.round(biaya);

        document.getElementById('existing-tipe').textContent = ac['Tipe'] || '-';
        document.getElementById('existing-btu').textContent = formatNum(ac['Kapasitas Pendinginan (BTU/h)']) + ' BTU/h';
        document.getElementById('existing-daya').textContent = formatNum(ac['Daya (watt)']) + ' W';
        document.getElementById('existing-biaya').textContent = formatRupiah(biaya);
        document.getElementById('existing-info').style.display = 'block';
      }
    } else {
      document.getElementById('existing-info').style.display = 'none';
      state.existingAC = null;
    }
  });

  // Manual biaya lama input
  document.getElementById('input-biaya-lama').addEventListener('input', (e) => {
    state.biayaLama = parseFloat(e.target.value) || 0;
  });

  // --- Cari Rekomendasi ---
  document.getElementById('btn-cari-rekomendasi').addEventListener('click', () => {
    findRecommendations();
    scrollToSection('rekomendasi');
  });

  // --- Filter controls ---
  ['filter-brand', 'filter-type', 'filter-rating', 'filter-sort'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });

  // --- Compare buttons ---
  document.getElementById('btn-compare').addEventListener('click', runComparison);
  document.getElementById('btn-clear-compare').addEventListener('click', clearComparison);

  // --- Pagination ---
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderACGrid();
    }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    const totalPages = Math.ceil(state.rekomendasi.length / state.perPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderACGrid();
    }
  });

  // --- Financing controls ---
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tab-group');
      const targetId = btn.dataset.tab;
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabGroup.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      btn.classList.add('active');
      const content = document.getElementById(targetId);
      if (content) {
        content.style.display = 'block';
        requestAnimationFrame(() => content.classList.add('active'));
      }
    });
  });

  // Tenor buttons
  document.querySelectorAll('.tenor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tenor-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('input-tenor').value = btn.dataset.tenor;
    });
  });

  // DP range sync
  const dpInput = document.getElementById('input-dp');
  const dpRange = document.getElementById('range-dp');
  dpRange.addEventListener('input', () => { dpInput.value = dpRange.value; });
  dpInput.addEventListener('input', () => { dpRange.value = dpInput.value; });

  // Finance AC select
  document.getElementById('finance-ac-select').addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    if (!isNaN(idx) && state.selectedACs[idx]) {
      showFinanceACInfo(state.selectedACs[idx]);
    } else {
      document.getElementById('finance-ac-info').style.display = 'none';
    }
  });

  // Hitung kredit
  document.getElementById('btn-hitung-kredit').addEventListener('click', calculateCredit);

  // Amortisasi toggle
  document.getElementById('btn-toggle-amortisasi').addEventListener('click', () => {
    const wrapper = document.getElementById('amortisasi-wrapper');
    const btn = document.getElementById('btn-toggle-amortisasi');
    if (wrapper.style.display === 'none') {
      wrapper.style.display = 'block';
      btn.textContent = 'Sembunyikan';
    } else {
      wrapper.style.display = 'none';
      btn.textContent = 'Tampilkan';
    }
  });
}

// ========================
// CALCULATION
// ========================
function updateCalculation() {
  const panjang = parseFloat(document.getElementById('input-panjang').value) || 1;
  const lebar = parseFloat(document.getElementById('input-lebar').value) || 1;
  const okupansi = parseInt(document.getElementById('input-okupansi').value) || 1;

  const luas = panjang * lebar;
  const btu = hitungBTU(panjang, lebar, okupansi);
  const pkInfo = konversiKePK(btu);

  state.btu = btu;
  state.pk = pkInfo.pk;

  document.getElementById('display-luas').textContent = formatNum(luas) + ' m²';
  document.getElementById('display-btu').textContent = formatNum(btu);
  document.getElementById('display-pk').textContent = pkInfo.pk;
  document.getElementById('display-beban-ruangan').textContent = formatNum(panjang * lebar * 500) + ' BTU';
  document.getElementById('display-beban-orang').textContent = formatNum(okupansi * 400) + ' BTU';
}

// ========================
// RECOMMENDATIONS
// ========================
function findRecommendations() {
  const db = getDatabase();
  const range = getBTURange(state.btu);

  const results = filterByBTURange(range.min, range.max);

  if (results.length === 0) {
    showToast('Tidak ada AC yang sesuai dengan kebutuhan BTU Anda', 'warning');
    state.rekomendasi = [];
  } else {
    state.rekomendasi = results;
    showToast(`Ditemukan ${results.length} AC yang sesuai`, 'success');
  }

  state.currentPage = 1;
  state.selectedACs = [];
  updateCompareBar();
  applyFilters();
}

function applyFilters() {
  let data = [...state.rekomendasi];

  // Filter brand
  const brand = document.getElementById('filter-brand').value;
  if (brand) data = data.filter(ac => ac['Merek'] === brand);

  // Filter type
  const type = document.getElementById('filter-type').value;
  if (type) {
    if (type === 'Inverter') {
      data = data.filter(ac => {
        const t = (ac['Tipe'] || '').toLowerCase();
        return t.includes('inverter') && !t.includes('non');
      });
    } else {
      data = data.filter(ac => (ac['Tipe'] || '').toLowerCase().includes('non'));
    }
  }

  // Filter rating
  const minRating = parseInt(document.getElementById('filter-rating').value);
  if (minRating) data = data.filter(ac => (ac['Rating Bintang (1-5)'] || 0) >= minRating);

  // Sort
  const sort = document.getElementById('filter-sort').value;
  data.sort((a, b) => {
    switch (sort) {
      case 'rating-desc':
        return (b['Rating Bintang (1-5)'] || 0) - (a['Rating Bintang (1-5)'] || 0);
      case 'biaya-asc':
        return (a['Biaya Listrik Tahunan (Rp)'] || Infinity) - (b['Biaya Listrik Tahunan (Rp)'] || Infinity);
      case 'efisiensi-desc':
        return (b['Nilai Efisiensi (EER/CSPF)'] || 0) - (a['Nilai Efisiensi (EER/CSPF)'] || 0);
      case 'daya-asc':
        return (a['Daya (watt)'] || Infinity) - (b['Daya (watt)'] || Infinity);
      default:
        return 0;
    }
  });

  state.rekomendasi = data;
  state.currentPage = 1;
  document.getElementById('result-count').textContent = data.length + ' hasil';
  renderACGrid();
}

function renderACGrid() {
  const grid = document.getElementById('ac-grid');
  const data = state.rekomendasi;
  const totalPages = Math.ceil(data.length / state.perPage);
  const start = (state.currentPage - 1) * state.perPage;
  const end = start + state.perPage;
  const pageData = data.slice(start, end);

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Tidak Ada Hasil</h3>
        <p>Coba ubah filter atau parameter pencarian Anda.</p>
      </div>
    `;
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  const selectedNos = state.selectedACs.map(ac => ac['No']);
  grid.innerHTML = pageData.map((ac, i) => {
    const isSelected = selectedNos.includes(ac['No']);
    return createACCard(ac, start + i, isSelected);
  }).join('');

  // Bind compare buttons
  grid.querySelectorAll('.btn-compare').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const no = parseInt(btn.dataset.acNo);
      toggleSelectAC(no);
    });
  });

  // Pagination
  const pagination = document.getElementById('pagination');
  if (totalPages > 1) {
    pagination.style.display = 'flex';
    document.getElementById('page-info').textContent = `Halaman ${state.currentPage} dari ${totalPages}`;
    document.getElementById('btn-prev').disabled = state.currentPage <= 1;
    document.getElementById('btn-next').disabled = state.currentPage >= totalPages;
  } else {
    pagination.style.display = 'none';
  }

  // Animate new cards
  requestAnimationFrame(() => {
    grid.querySelectorAll('.animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 50);
    });
  });
}

// ========================
// COMPARE / SELECT
// ========================
function toggleSelectAC(no) {
  const idx = state.selectedACs.findIndex(ac => ac['No'] === no);
  if (idx >= 0) {
    state.selectedACs.splice(idx, 1);
  } else {
    if (state.selectedACs.length >= 6) {
      showToast('Maksimal 6 AC untuk perbandingan', 'warning');
      return;
    }
    const ac = getACById(no);
    if (ac) state.selectedACs.push(ac);
  }
  updateCompareBar();
  renderACGrid();
  updateFinancingSection();
}

function updateCompareBar() {
  const bar = document.getElementById('compare-bar');
  const count = document.getElementById('compare-count');
  if (state.selectedACs.length > 0) {
    bar.style.display = 'flex';
    count.textContent = state.selectedACs.length;
  } else {
    bar.style.display = 'none';
  }
}

function clearComparison() {
  state.selectedACs = [];
  updateCompareBar();
  renderACGrid();
  updateFinancingSection();

  // Reset analysis
  document.getElementById('analysis-active').style.display = 'none';
  document.getElementById('analysis-content').style.display = 'block';
  destroyAllCharts();
}

// ========================
// COMPARISON / ANALYSIS
// ========================
function runComparison() {
  if (state.selectedACs.length < 1) {
    showToast('Pilih minimal 1 AC untuk perbandingan', 'warning');
    return;
  }

  updateFinancingSection();
  runInvestmentAnalysis();
  scrollToSection('pembiayaan');
  showToast('Analisis perbandingan siap!', 'success');
}

// ========================
// FINANCING
// ========================
function updateFinancingSection() {
  if (state.selectedACs.length === 0) {
    document.getElementById('financing-content').style.display = 'block';
    document.getElementById('financing-active').style.display = 'none';
    return;
  }

  document.getElementById('financing-content').style.display = 'none';
  document.getElementById('financing-active').style.display = 'block';

  // Populate finance AC select
  const select = document.getElementById('finance-ac-select');
  select.innerHTML = '<option value="">-- Pilih AC --</option>';
  state.selectedACs.forEach((ac, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${ac['Merek']} - ${(ac['Model'] || ac['Famili'] || '-').substring(0, 50)}`;
    select.appendChild(opt);
  });

  // Auto-select first
  if (state.selectedACs.length > 0) {
    select.value = '0';
    showFinanceACInfo(state.selectedACs[0]);
  }
}

function showFinanceACInfo(ac) {
  const btu = ac['Kapasitas Pendinginan (BTU/h)'] || 0;
  const tipe = ac['Tipe'] || '-';
  const hargaAktual = ac['Harga (Rp)'] || null;
  const harga = estimasiHarga(btu, tipe, hargaAktual);

  const infoDiv = document.getElementById('finance-ac-info');
  infoDiv.style.display = 'block';
  infoDiv.innerHTML = `
    <div class="info-row"><span>Merek:</span><span>${ac['Merek']}</span></div>
    <div class="info-row"><span>Tipe:</span><span>${tipe}</span></div>
    <div class="info-row"><span>Kapasitas:</span><span>${formatNum(btu)} BTU/h</span></div>
    <div class="info-row"><span>Estimasi Harga:</span><span>${formatRupiah(harga)}</span></div>
  `;

  // Update cash price
  document.getElementById('cash-price').textContent = formatRupiah(harga);

  // Reset credit results
  document.getElementById('credit-results').style.display = 'none';
}

function calculateCredit() {
  const selectEl = document.getElementById('finance-ac-select');
  const idx = parseInt(selectEl.value);
  if (isNaN(idx) || !state.selectedACs[idx]) {
    showToast('Pilih AC terlebih dahulu', 'warning');
    return;
  }

  const ac = state.selectedACs[idx];
  const btu = ac['Kapasitas Pendinginan (BTU/h)'] || 0;
  const tipe = ac['Tipe'] || '-';
  const hargaAktual = ac['Harga (Rp)'] || null;
  const harga = estimasiHarga(btu, tipe, hargaAktual);

  const dpPersen = parseFloat(document.getElementById('input-dp').value) || 0;
  const bunga = parseFloat(document.getElementById('input-bunga').value) || 0;
  const tenor = parseInt(document.getElementById('input-tenor').value) || 18;

  const result = hitungCicilanAnuitas(harga, dpPersen, bunga, tenor);
  const amortisasi = generateAmortisasi(harga, dpPersen, bunga, tenor);

  // Display results
  document.getElementById('credit-results').style.display = 'block';
  document.getElementById('credit-dp').textContent = formatRupiah(result.dp);
  document.getElementById('credit-cicilan').textContent = formatRupiah(result.cicilanPerBulan);
  document.getElementById('credit-total').textContent = formatRupiah(result.totalPembayaran);
  document.getElementById('credit-bunga').textContent = formatRupiah(result.bungaTotal);

  // Pie chart
  createFinancingPieChart('chart-financing-pie', result.dp, result.pokokPinjaman, result.bungaTotal);

  // Amortization table
  const tbody = document.querySelector('#table-amortisasi tbody');
  tbody.innerHTML = amortisasi.map(row => `
    <tr>
      <td>${row.bulan}</td>
      <td>${formatRupiah(row.cicilan)}</td>
      <td>${formatRupiah(row.pokok)}</td>
      <td>${formatRupiah(row.bunga)}</td>
      <td>${formatRupiah(row.sisaPinjaman)}</td>
    </tr>
  `).join('');

  // Animate in
  requestAnimationFrame(() => {
    document.querySelectorAll('#credit-results .animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  });

  showToast('Perhitungan kredit selesai', 'success');
}

// ========================
// INVESTMENT ANALYSIS
// ========================
function runInvestmentAnalysis() {
  const hasExisting = state.hasExisting && state.biayaLama > 0;
  const umurEkonomis = parseInt(document.getElementById('input-umur-ekonomis').value) || 5;
  const discountRate = (parseFloat(document.getElementById('input-discount-rate').value) || 6) / 100;

  if (!hasExisting) {
    // Still show cost comparison chart even without existing
    document.getElementById('analysis-content').style.display = 'none';
    document.getElementById('analysis-active').style.display = 'block';
    document.getElementById('analysis-cards').innerHTML = `
      <div class="glass-card" style="grid-column: 1/-1; text-align:center; padding:2rem;">
        <p style="color:var(--text-secondary);">💡 Aktifkan "Punya AC lama" dan pilih AC existing di bagian Kalkulasi untuk melihat analisis NPV, IRR, dan Payback Period.</p>
      </div>
    `;

    // Cost comparison chart only
    const acNames = state.selectedACs.map(ac => ac['Merek'] + '\n' + (ac['Tipe'] || ''));
    const biayaBaru = state.selectedACs.map(ac => ac['Biaya Listrik Tahunan (Rp)'] || 0);
    createCostComparisonChart('chart-cost-comparison', acNames, biayaBaru);
    
    // Hide other charts' canvases
    ['chart-npv', 'chart-irr', 'chart-payback', 'chart-radar'].forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) canvas.closest('.chart-card').style.display = 'none';
    });
    return;
  }

  // Full analysis
  document.getElementById('analysis-content').style.display = 'none';
  document.getElementById('analysis-active').style.display = 'block';

  // Show all chart cards
  ['chart-npv', 'chart-irr', 'chart-payback', 'chart-radar', 'chart-cost-comparison'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) canvas.closest('.chart-card').style.display = 'block';
  });

  const analyses = [];
  const acNames = [];
  const npvValues = [];
  const irrValues = [];
  const paybackValues = [];
  const biayaBaru = [];
  const radarDatasets = [];

  // Find max values for radar normalization
  let maxEfisiensi = 0, maxRating = 5, maxHemat = 0, maxDaya = 0;
  state.selectedACs.forEach(ac => {
    const ef = ac['Nilai Efisiensi (EER/CSPF)'] || 0;
    const daya = ac['Daya (watt)'] || 0;
    const biaya = ac['Biaya Listrik Tahunan (Rp)'] || 0;
    const hemat = hitungPenghematan(state.biayaLama, biaya);
    if (ef > maxEfisiensi) maxEfisiensi = ef;
    if (hemat > maxHemat) maxHemat = hemat;
    if (daya > maxDaya) maxDaya = daya;
  });

  state.selectedACs.forEach((ac, i) => {
    const btu = ac['Kapasitas Pendinginan (BTU/h)'] || 0;
    const tipe = ac['Tipe'] || '-';
    const biaya = ac['Biaya Listrik Tahunan (Rp)'] || 0;
    const hargaAktual = ac['Harga (Rp)'] || null;
    const harga = estimasiHarga(btu, tipe, hargaAktual);
    const hemat = hitungPenghematan(state.biayaLama, biaya);
    const efisiensi = ac['Nilai Efisiensi (EER/CSPF)'] || 0;
    const rating = ac['Rating Bintang (1-5)'] || 0;
    const daya = ac['Daya (watt)'] || 0;

    const analysis = fullAnalysis(harga, hemat, umurEkonomis, discountRate);

    const name = ac['Merek'] + ' (' + (tipe || '') + ')';
    acNames.push(name);
    npvValues.push(analysis.npv);
    irrValues.push(analysis.irr);
    paybackValues.push(analysis.paybackPeriod === Infinity ? umurEkonomis * 2 : analysis.paybackPeriod);
    biayaBaru.push(biaya);

    analyses.push({ ac, harga, hemat, analysis, name });

    // Radar data (normalized 0-100)
    radarDatasets.push({
      label: name,
      data: [
        maxEfisiensi > 0 ? (efisiensi / maxEfisiensi) * 100 : 0,
        (rating / maxRating) * 100,
        maxHemat > 0 ? (hemat / maxHemat) * 100 : 0,
        analysis.paybackPeriod > 0 && analysis.paybackPeriod !== Infinity
          ? Math.max(0, 100 - (analysis.paybackPeriod / umurEkonomis) * 100) : 0,
        maxDaya > 0 ? ((maxDaya - daya) / maxDaya) * 100 : 0
      ]
    });
  });

  // Render analysis cards
  const cardsHtml = analyses.map(({ ac, harga, hemat, analysis, name }) => {
    const status = analysis.kelayakan.status;
    const npvClass = analysis.npv >= 0 ? 'positive' : 'negative';
    const irrClass = analysis.irr > (parseFloat(document.getElementById('input-discount-rate').value) / 100) ? 'positive' : 'negative';
    const ppClass = analysis.paybackPeriod <= umurEkonomis ? 'positive' : 'negative';

    return `
      <div class="analysis-card ${status} animate-in">
        <div class="analysis-card-header">
          <h4>${ac['Merek']} — ${(ac['Model'] || ac['Famili'] || '-').substring(0, 40)}</h4>
          <span class="verdict-badge ${status}">${analysis.kelayakan.keputusan}</span>
        </div>
        <div class="analysis-metrics">
          <div class="analysis-metric">
            <div class="m-label">Simple Payback</div>
            <div class="m-value ${ppClass}">
              ${analysis.paybackPeriod === Infinity ? '∞' : analysis.paybackPeriod.toFixed(1)} thn
            </div>
          </div>
          <div class="analysis-metric">
            <div class="m-label">NPV</div>
            <div class="m-value ${npvClass}">
              ${formatShort(Math.round(analysis.npv))}
            </div>
          </div>
          <div class="analysis-metric">
            <div class="m-label">IRR</div>
            <div class="m-value ${irrClass}">
              ${(analysis.irr * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div class="analysis-saving">
          <span>Penghematan / Tahun</span>
          <span>${hemat > 0 ? formatRupiah(hemat) : 'Tidak ada'}</span>
        </div>
        <div class="analysis-saving" style="margin-top:0.35rem;">
          <span>Investasi Awal</span>
          <span>${formatRupiah(harga)}</span>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('analysis-cards').innerHTML = cardsHtml;

  // Create charts
  createCostComparisonChart('chart-cost-comparison', acNames, biayaBaru, state.biayaLama);
  createNPVComparisonChart('chart-npv', acNames, npvValues);
  createIRRComparisonChart('chart-irr', acNames, irrValues, discountRate);
  createPaybackChart('chart-payback', acNames, paybackValues, umurEkonomis);
  createRadarChart('chart-radar', acNames, radarDatasets);

  // Animate cards
  requestAnimationFrame(() => {
    document.querySelectorAll('#analysis-cards .animate-in, .charts-grid .animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  });
}

// ========================
// HELPERS
// ========================
function formatNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '-';
  return new Intl.NumberFormat('id-ID').format(Math.round(n));
}

function populateBrandSelect(selectId, brands) {
  const select = document.getElementById(selectId);
  if (!select) return;
  // Keep existing first option
  const firstOpt = select.querySelector('option');
  select.innerHTML = '';
  if (firstOpt) select.appendChild(firstOpt);
  brands.sort().forEach(brand => {
    const opt = document.createElement('option');
    opt.value = brand;
    opt.textContent = brand;
    select.appendChild(opt);
  });
}

// ========================
// START
// ========================
document.addEventListener('DOMContentLoaded', init);
