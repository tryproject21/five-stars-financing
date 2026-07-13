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
  formatShort,
  createLampuCard
} from './js/ui.js';

import { loadDatabaseLampu, getDatabaseLampu, getBrandsLampu, filterByBrandLampu, getLampuById } from './js/database-lampu.js';
import { estimasiHargaLampu, hitungPenghematanLampu, hitungDampakLingkungan, hitungNPV, hitungIRR, hitungKapasitasLampu } from './js/calculator-lampu.js';

import { loadDatabaseKulkas, getDatabaseKulkas, getBrandsKulkas, filterByBrandKulkas, getKulkasById } from './js/database-kulkas.js';
import { estimasiHargaKulkas, hitungPenghematanKulkas, hitungDampakLingkunganKulkas } from './js/calculator-kulkas.js';
import { createKulkasCard } from './js/ui.js';

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
  jamPerHari: 8,
  tarifListrik: 1444,    // Tarif non-subsidi rata-rata
  manualPrices: {},      // Harga inputan manual khusus untuk antar-AC
  customPrices: {},      // Simpan harga custom per AC { [no]: harga }
};

const stateCompare = {
  rekomendasi: [],
  selectedACs: [],
  currentPage: 1,
  perPage: 15,
  customPrices: {},
  baselineNo: null
};

const stateLampu = {
  allRecommendationsLampu: [],
  rekomendasi: [],
  selectedLampu: [],
  currentPage: 1,
  perPage: 12,
  dayaLama: 40,
  biayaLama: 150000,
  umurEkonomis: 3,
  bunga: 0.06,
  tarifListrik: 1444
};

const stateKulkas = {
  rekomendasi: [],
  selectedKulkas: [],
  currentPage: 1,
  perPage: 12,
  biayaLama: 800000,
  umurEkonomis: 5,
  bunga: 0.06,
  tarifListrik: 1444
};

// ========================
// INITIALIZATION
// ========================
// Initialize Theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
      window.dispatchEvent(new Event('themeChanged'));
    });
  }
}

async function init() {
  initTheme();
  try {
    await Promise.all([loadDatabase(), loadDatabaseLampu(), loadDatabaseKulkas()]);
    const db = getDatabase();
    const brands = getBrands();
    const dbLampu = getDatabaseLampu();
    const brandsLampu = getBrandsLampu();
    const dbKulkas = getDatabaseKulkas();
    const brandsKulkas = getBrandsKulkas();

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

    // Update hero stats lampu
    const statTotalLampu = document.getElementById('stat-total-lampu');
    const statBrandsLampu = document.getElementById('stat-brands-lampu');
    if (statTotalLampu) animateCounter(statTotalLampu, dbLampu.length, 1200);
    if (statBrandsLampu) animateCounter(statBrandsLampu, brandsLampu.length, 1000);

    // Populate brand selects
    populateBrandSelect('select-existing-brand', brands);
    populateBrandSelect('filter-brand', brands);
    
    const filterBrandLampu = document.getElementById('filter-brand-lampu');
    if (filterBrandLampu) {
      brandsLampu.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        filterBrandLampu.appendChild(opt);
      });
    }

    const filterTypeLampu = document.getElementById('filter-type-lampu');
    if (filterTypeLampu && dbLampu.length > 0) {
      const types = [...new Set(dbLampu.map(l => l['Tipe'] || l['Jenis']).filter(Boolean))].sort();
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        filterTypeLampu.appendChild(opt);
      });
    }

    populateBrandSelect('select-existing-brand-lampu', brandsLampu);

    // Populate Kulkas UI
    const statTotalKulkas = document.getElementById('stat-total-kulkas');
    const statBrandsKulkas = document.getElementById('stat-brands-kulkas');
    if (statTotalKulkas) animateCounter(statTotalKulkas, dbKulkas.length, 1200);
    if (statBrandsKulkas) animateCounter(statBrandsKulkas, brandsKulkas.length, 1000);

    const filterBrandKulkas = document.getElementById('filter-brand-kulkas');
    if (filterBrandKulkas) {
      brandsKulkas.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        filterBrandKulkas.appendChild(opt);
      });
    }

    const filterTypeKulkas = document.getElementById('filter-type-kulkas');
    if (filterTypeKulkas && dbKulkas.length > 0) {
      const types = [...new Set(dbKulkas.map(k => k['Tipe']).filter(Boolean))].sort();
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        filterTypeKulkas.appendChild(opt);
      });
    }
    
    populateBrandSelect('select-existing-brand-kulkas', brandsKulkas);

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
    }, 800);

    // Init UI
    initScrollAnimations();
    initNavScroll();
    initTabs();
    bindEvents();
    bindEventsLampu();
    bindEventsKulkas();
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

  // --- Top App Nav ---
  document.querySelectorAll('.top-nav-link[data-app]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const app = link.dataset.app;
      
      // Update active class on nav links
      document.querySelectorAll('.top-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`.top-nav-link[data-app="${app}"]`).forEach(l => l.classList.add('active'));
      
      // Switch views
      document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
      });
      
      const targetView = document.getElementById(`view-${app}`);
      if (targetView) {
        targetView.classList.add('active');
      } else {
        document.getElementById('view-coming-soon').classList.add('active');
      }
      
      // Close mobile nav if open
      document.getElementById('mobile-nav').classList.remove('open');
    });
  });

  // --- AC Dropdown Nav ---
  document.querySelectorAll('[data-ac-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewType = link.dataset.acView;

      // Set active in dropdown
      document.querySelectorAll('[data-ac-view]').forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`[data-ac-view="${viewType}"]`).forEach(l => l.classList.add('active'));

      // Switch app views
      document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
      if (viewType === 'kalkulasi') {
        document.getElementById('view-ac').classList.add('active');
      } else {
        document.getElementById('view-ac-compare').classList.add('active');
        if (stateCompare.rekomendasi.length === 0) {
          findRecommendationsCompare();
        }
      }
      
      // Close mobile nav if open
      document.getElementById('mobile-nav').classList.remove('open');
    });
  });

  // --- Room dimension inputs ---
  const panjangInput = document.getElementById('input-panjang');
  const lebarInput = document.getElementById('input-lebar');
  const tinggiInput = document.getElementById('input-tinggi');
  const okupansiInput = document.getElementById('input-okupansi');
  const rangePanjang = document.getElementById('range-panjang');
  const rangeLebar = document.getElementById('range-lebar');
  const rangeTinggi = document.getElementById('range-tinggi');

  [panjangInput, lebarInput, tinggiInput, okupansiInput].forEach(el => {
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

  rangeTinggi.addEventListener('input', () => {
    tinggiInput.value = rangeTinggi.value;
    updateCalculation();
  });
  tinggiInput.addEventListener('input', () => {
    rangeTinggi.value = tinggiInput.value;
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
        
        const bintang = ac['Rating Bintang (1-5)'];
        document.getElementById('existing-bintang').textContent = bintang ? '⭐'.repeat(bintang) : '-';
        
        document.getElementById('existing-efisiensi-label').textContent = 'Efisiensi:';
        const efisiensi = ac['Nilai Efisiensi (EER/CSPF)'];
        const baseline = ac['Baseline'] || '';
        document.getElementById('existing-efisiensi-value').textContent = efisiensi ? `${efisiensi.toLocaleString('id-ID', {maximumFractionDigits: 2})} ${baseline}`.trim() : '-';
        
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

  // --- Filter controls (Kalkulasi) ---
  ['filter-brand', 'filter-type', 'filter-rating', 'filter-sort'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });

  // --- Filter controls (Compare) ---
  ['filter-brand-compare', 'filter-type-compare', 'filter-rating-compare', 'filter-sort-compare'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFiltersCompare);
  });

  // --- Compare buttons (Kalkulasi) ---
  document.getElementById('btn-compare').addEventListener('click', runComparison);
  document.getElementById('btn-clear-compare').addEventListener('click', clearComparison);

  // --- Compare buttons (Compare View) ---
  document.getElementById('btn-compare-inter').addEventListener('click', runInterACComparison);
  document.getElementById('btn-recalc-inter').addEventListener('click', runInterACComparison);
  document.getElementById('btn-clear-compare-inter').addEventListener('click', clearComparisonCompare);

  // --- Pagination (Kalkulasi) ---
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderACGrid();
    }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    const db = state.rekomendasi;
    const totalPages = Math.ceil(db.length / state.perPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderACGrid();
    }
  });

  // --- Pagination (Compare) ---
  document.getElementById('btn-prev-compare').addEventListener('click', () => {
    if (stateCompare.currentPage > 1) {
      stateCompare.currentPage--;
      renderACGridCompare();
    }
  });
  document.getElementById('btn-next-compare').addEventListener('click', () => {
    const totalPages = Math.ceil(stateCompare.rekomendasi.length / stateCompare.perPage);
    if (stateCompare.currentPage < totalPages) {
      stateCompare.currentPage++;
      renderACGridCompare();
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
      document.getElementById('finance-harga-aktual-container').style.display = 'none';
    }
  });

  // Manual Price Input
  document.getElementById('input-harga-ac').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const selectEl = document.getElementById('finance-ac-select');
    const idx = parseInt(selectEl.value);
    if (!isNaN(idx) && state.selectedACs[idx] && !isNaN(val) && val > 0) {
      const ac = state.selectedACs[idx];
      state.customPrices[ac['No']] = val;
      document.getElementById('cash-price').textContent = formatRupiah(val);
      // recalculate if credit is shown
      if (document.getElementById('credit-results').style.display !== 'none') {
        calculateCredit();
      }
      // recalculate investment analysis
      runInvestmentAnalysis();
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
  const tinggi = parseFloat(document.getElementById('input-tinggi').value) || 3;
  const okupansi = parseInt(document.getElementById('input-okupansi').value) || 1;

  const luas = panjang * lebar;
  const volume = panjang * lebar * tinggi;
  const btu = hitungBTU(panjang, lebar, tinggi, okupansi);
  const pkInfo = konversiKePK(btu);

  state.btu = btu;
  state.pk = pkInfo.pk;

  document.getElementById('display-luas').textContent = formatNum(luas) + ' m² / ' + formatNum(volume) + ' m³';
  document.getElementById('display-btu').textContent = formatNum(btu);
  document.getElementById('display-pk').textContent = pkInfo.pk;
  document.getElementById('display-beban-ruangan').textContent = formatNum(Math.round(volume * 200)) + ' BTU';
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
  const noStr = String(no);
  const idx = state.selectedACs.findIndex(ac => String(ac['No']) === noStr);
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
  const btnInter = document.getElementById('btn-compare-inter');
  
  if (state.selectedACs.length > 0) {
    bar.style.display = 'flex';
    count.textContent = state.selectedACs.length;
    
    // Tampilkan tombol Antar AC Baru jika lebih dari 1 AC dipilih
    if (btnInter) {
      btnInter.style.display = state.selectedACs.length >= 2 ? 'inline-flex' : 'none';
    }
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
  document.getElementById('analisis-inter-ac').style.display = 'none';
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

  document.getElementById('analisis-inter-ac').style.display = 'none';

  updateFinancingSection();
  runInvestmentAnalysis();
  scrollToSection('pembiayaan');
  showToast('Analisis perbandingan siap!', 'success');
}

function hitungBiayaTahunanAC(btu, efisiensi, dayaWatt, jamPerHari, tarif) {
  return (dayaWatt / 1000) * jamPerHari * 365 * tarif;
}

function getInterParams() {
  return {
    jamPerHari: parseInt(document.getElementById('inter-jam-per-hari').value) || 8,
    tarif: parseFloat(document.getElementById('inter-tarif-listrik').value) || 1444,
    umurEkonomis: parseInt(document.getElementById('inter-umur-ekonomis').value) || 5,
    discountRate: (parseFloat(document.getElementById('inter-discount-rate').value) || 6) / 100
  };
}

function getHargaAC(ac) {
  return stateCompare.customPrices[ac['No']] || estimasiHarga(ac['Kapasitas Pendinginan (BTU/h)'], ac['Tipe'], ac['Harga (Rp)']);
}

function runInterACComparison() {
  if (stateCompare.selectedACs.length < 2) {
    showToast('Pilih minimal 2 AC untuk perbandingan antar AC', 'warning');
    return;
  }
  
  const interSection = document.getElementById('analisis-inter-ac');
  interSection.style.display = 'block';

  const params = getInterParams();

  // Use selected baseline, fallback to cheapest
  let baseAC = stateCompare.selectedACs.find(ac => String(ac['No']) === String(stateCompare.baselineNo));
  if (!baseAC) {
    baseAC = [...stateCompare.selectedACs].sort((a, b) => getHargaAC(a) - getHargaAC(b))[0];
    stateCompare.baselineNo = baseAC['No'];
  }
  const otherACs = stateCompare.selectedACs.filter(ac => String(ac['No']) !== String(baseAC['No']));
  const sortedACs = [baseAC, ...otherACs];

  const baseHarga = getHargaAC(baseAC);
  const baseBiaya = hitungBiayaTahunanAC(baseAC['Kapasitas Pendinginan (BTU/h)'], baseAC['Nilai Efisiensi (EER/CSPF)'], baseAC['Daya (watt)'], params.jamPerHari, params.tarif);

  // Store prices
  sortedACs.forEach(ac => {
    if (!stateCompare.customPrices[ac['No']]) {
      stateCompare.customPrices[ac['No']] = getHargaAC(ac);
    }
  });

  // Render price inputs
  const inputContainer = document.getElementById('inter-ac-price-inputs');
  inputContainer.innerHTML = sortedACs.map((ac, idx) => {
    const harga = getHargaAC(ac);
    stateCompare.customPrices[ac['No']] = harga;
    const isBase = idx === 0;
    return `
      <div class="input-group">
        <label style="${isBase ? 'color: var(--accent-cyan); font-weight: 700;' : ''}">${isBase ? '🏷️ BASELINE — ' : ''}${ac['Merek']} — ${ac['Model'] || ac['Famili'] || '-'}</label>
        <div class="input-with-unit">
          <span class="unit">Rp</span>
          <input type="number" class="manual-price-input" data-no="${ac['No']}" value="${harga}" min="0" step="100000">
        </div>
      </div>
    `;
  }).join('');

  inputContainer.querySelectorAll('.manual-price-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        stateCompare.customPrices[e.target.dataset.no] = val;
      }
    });
  });

  // === BUILD SUMMARY TABLE ===
  const summaryData = sortedACs.map((ac, idx) => {
    const harga = getHargaAC(ac);
    const btu = ac['Kapasitas Pendinginan (BTU/h)'];
    const daya = ac['Daya (watt)'];
    const efisiensi = ac['Nilai Efisiensi (EER/CSPF)'] || 0;
    const baseline = ac['Baseline'] || '';
    const rating = ac['Rating Bintang (1-5)'] || 0;
    const tipe = ac['Tipe'] || '-';
    const biayaTahunan = hitungBiayaTahunanAC(btu, efisiensi, daya, params.jamPerHari, params.tarif);
    const isBase = idx === 0;

    // vs baseline
    const selisihHarga = harga - baseHarga;
    const penghematan = baseBiaya - biayaTahunan;

    let payback = '-';
    let npv = 0;
    let irr = 0;
    let keputusan = '-';
    let statusClass = '';

    if (!isBase && selisihHarga > 0 && penghematan > 0) {
      const analysis = fullAnalysis(selisihHarga, penghematan, params.umurEkonomis, params.discountRate);
      payback = analysis.paybackPeriod === Infinity || analysis.paybackPeriod < 0 ? '∞' : analysis.paybackPeriod.toFixed(1);
      npv = analysis.npv;
      irr = analysis.irr;
      keputusan = analysis.kelayakan.keputusan;
      statusClass = analysis.kelayakan.status === 'go' ? 'positive' : 'negative';
    } else if (!isBase && selisihHarga <= 0 && penghematan >= 0) {
      keputusan = 'NO-BRAINER ✓';
      statusClass = 'positive';
    } else if (!isBase) {
      keputusan = 'TIDAK LAYAK';
      statusClass = 'negative';
    }

    return { ac, harga, btu, daya, efisiensi, baseline, rating, tipe, biayaTahunan, isBase, selisihHarga, penghematan, payback, npv, irr, keputusan, statusClass };
  });

  // Render Summary Table
  const summaryContainer = document.getElementById('inter-ac-summary-table');
  summaryContainer.innerHTML = `
    <h3 style="margin-bottom: 1rem; font-size: 1.1rem; color: var(--text-primary);">📊 Ringkasan Perbandingan</h3>
    <div style="overflow-x: auto;">
      <table class="comparison-table">
        <thead>
          <tr>
            <th style="text-align:left; min-width: 140px;">Spesifikasi</th>
            ${sortedACs.map((ac, i) => `
              <th style="min-width: 150px;">
                <div style="font-size: 0.75rem; color: var(--accent-cyan); text-transform: uppercase;">${ac['Merek']}</div>
                <div style="font-size: 0.8rem; margin-top: 0.2rem;">${ac['Model'] || ac['Famili'] || '-'}</div>
                ${i === 0 ? '<div style="font-size: 0.65rem; margin-top: 0.3rem; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-teal)); color: #000; padding: 0.15rem 0.5rem; border-radius: 20px; display: inline-block; font-weight: 700;">BASELINE</div>' : ''}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Tipe</strong></td>
            ${summaryData.map(d => `<td>${d.tipe}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Rating</strong></td>
            ${summaryData.map(d => `<td>${'⭐'.repeat(d.rating)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Kapasitas</strong></td>
            ${summaryData.map(d => `<td>${typeof d.btu === 'number' ? new Intl.NumberFormat('id-ID').format(d.btu) : d.btu} BTU/h</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Daya</strong></td>
            ${summaryData.map(d => `<td>${typeof d.daya === 'number' ? new Intl.NumberFormat('id-ID').format(d.daya) : d.daya} W</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Efisiensi</strong></td>
            ${summaryData.map(d => `<td>${typeof d.efisiensi === 'number' ? d.efisiensi.toFixed(2) : d.efisiensi} ${d.baseline}</td>`).join('')}
          </tr>
          <tr class="highlight-row">
            <td><strong>Harga</strong></td>
            ${summaryData.map(d => `<td style="font-weight: 700;">Rp ${new Intl.NumberFormat('id-ID').format(d.harga)}</td>`).join('')}
          </tr>
          <tr class="highlight-row">
            <td><strong>Biaya Listrik/Thn</strong></td>
            ${summaryData.map(d => `<td>Rp ${new Intl.NumberFormat('id-ID').format(Math.round(d.biayaTahunan))}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Biaya Listrik/Bln</strong></td>
            ${summaryData.map(d => `<td>Rp ${new Intl.NumberFormat('id-ID').format(Math.round(d.biayaTahunan / 12))}</td>`).join('')}
          </tr>
          <tr class="separator-row">
            <td colspan="${sortedACs.length + 1}" style="padding: 0.25rem;"></td>
          </tr>
          <tr>
            <td><strong>Selisih Harga vs Baseline</strong></td>
            ${summaryData.map(d => `<td>${d.isBase ? '-' : 'Rp ' + new Intl.NumberFormat('id-ID').format(d.selisihHarga)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Penghematan Listrik/Thn</strong></td>
            ${summaryData.map(d => `<td class="${d.isBase ? '' : d.penghematan > 0 ? 'positive' : 'negative'}">${d.isBase ? '-' : 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(d.penghematan))}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Payback Period</strong></td>
            ${summaryData.map(d => `<td>${d.isBase ? '-' : d.payback + ' thn'}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>NPV</strong></td>
            ${summaryData.map(d => `<td class="${d.isBase ? '' : d.npv >= 0 ? 'positive' : 'negative'}">${d.isBase ? '-' : 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(d.npv))}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>IRR</strong></td>
            ${summaryData.map(d => `<td class="${d.isBase ? '' : d.statusClass}">${d.isBase ? '-' : (d.irr * 100).toFixed(1) + '%'}</td>`).join('')}
          </tr>
          <tr class="verdict-row">
            <td><strong>Keputusan Upgrade</strong></td>
            ${summaryData.map(d => `<td><span class="verdict-badge-inline ${d.statusClass}" style="font-size: 0.75rem;">${d.isBase ? 'BASELINE' : d.keputusan}</span></td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // === BUILD DETAILED ANALYSIS CARDS ===
  const resultsContainer = document.getElementById('inter-ac-results');
  
  const cardsHTML = summaryData.filter(d => !d.isBase).map(d => {
    const { ac, harga, btu, daya, efisiensi, baseline, rating, tipe, biayaTahunan, selisihHarga, penghematan, payback, npv, irr, keputusan, statusClass } = d;

    const biayaBulanan = Math.round(biayaTahunan / 12);
    const baseBulanan = Math.round(baseBiaya / 12);
    const hematBulanan = baseBulanan - biayaBulanan;
    
    const isLayak = statusClass === 'positive';
    const cardBorder = isLayak ? 'rgba(0, 191, 165, 0.4)' : 'rgba(255, 82, 82, 0.4)';
    const cardGlow = isLayak ? 'rgba(0, 191, 165, 0.1)' : 'rgba(255, 82, 82, 0.1)';

    return `
      <div class="glass-card mb-2 animate-in" style="border-color: ${cardBorder}; box-shadow: 0 8px 32px ${cardGlow};">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--accent-cyan); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${ac['Merek']}</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">${ac['Model'] || ac['Famili'] || '-'}</div>
            <div style="margin-top: 0.35rem;">${'⭐'.repeat(rating)} <span style="font-size: 0.8rem; color: var(--text-muted);">${tipe}</span></div>
          </div>
          <span class="verdict-badge ${isLayak ? 'layak' : 'tidak-layak'}" style="font-size: 0.8rem; padding: 0.35rem 1rem;">${keputusan}</span>
        </div>

        <!-- Kinerja -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;">📐 Kinerja & Spesifikasi</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
            <div class="metric-mini">
              <span class="metric-mini-label">Kapasitas</span>
              <span class="metric-mini-value">${typeof btu === 'number' ? new Intl.NumberFormat('id-ID').format(btu) : btu} BTU/h</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Daya Listrik</span>
              <span class="metric-mini-value">${typeof daya === 'number' ? new Intl.NumberFormat('id-ID').format(daya) : daya} W</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Efisiensi</span>
              <span class="metric-mini-value">${typeof efisiensi === 'number' ? efisiensi.toFixed(2) : efisiensi} ${baseline}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Listrik/Bulan</span>
              <span class="metric-mini-value">Rp ${new Intl.NumberFormat('id-ID').format(biayaBulanan)}</span>
            </div>
          </div>
        </div>

        <!-- Investasi -->
        <div>
          <h4 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;">💰 Analisis Investasi vs Baseline</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
            <div class="metric-mini">
              <span class="metric-mini-label">Harga AC</span>
              <span class="metric-mini-value" style="color: var(--text-primary);">Rp ${new Intl.NumberFormat('id-ID').format(harga)}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Selisih Harga</span>
              <span class="metric-mini-value ${selisihHarga <= 0 ? 'positive' : ''}" style="color: ${selisihHarga <= 0 ? 'var(--accent-teal)' : 'var(--text-primary)'};">Rp ${new Intl.NumberFormat('id-ID').format(selisihHarga)}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Hemat Listrik/Thn</span>
              <span class="metric-mini-value ${penghematan > 0 ? 'positive' : 'negative'}">${penghematan > 0 ? '+' : ''}Rp ${new Intl.NumberFormat('id-ID').format(Math.round(penghematan))}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Hemat Listrik/Bln</span>
              <span class="metric-mini-value ${hematBulanan > 0 ? 'positive' : 'negative'}">${hematBulanan > 0 ? '+' : ''}Rp ${new Intl.NumberFormat('id-ID').format(hematBulanan)}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">Simple Payback</span>
              <span class="metric-mini-value">${payback === '-' ? '-' : payback + ' tahun'}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">NPV</span>
              <span class="metric-mini-value ${npv >= 0 ? 'positive' : 'negative'}">Rp ${new Intl.NumberFormat('id-ID').format(Math.round(npv))}</span>
            </div>
            <div class="metric-mini">
              <span class="metric-mini-label">IRR</span>
              <span class="metric-mini-value ${statusClass}">${(irr * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Baseline card
  const baseData = summaryData[0];
  const baseBiayaBulanan = Math.round(baseBiaya / 12);
  
  resultsContainer.innerHTML = `
    <div class="glass-card mb-2 animate-in" style="border-color: rgba(0, 229, 255, 0.4); box-shadow: 0 8px 32px rgba(0, 229, 255, 0.1);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="font-size: 0.75rem; color: var(--accent-cyan); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${baseAC['Merek']}</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">${baseAC['Model'] || baseAC['Famili'] || '-'}</div>
          <div style="margin-top: 0.35rem;">${'⭐'.repeat(baseData.rating)} <span style="font-size: 0.8rem; color: var(--text-muted);">${baseData.tipe}</span></div>
        </div>
        <span style="font-size: 0.8rem; padding: 0.35rem 1rem; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-teal)); color: #000; border-radius: 20px; font-weight: 700;">🏷️ BASELINE (Termurah)</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
        <div class="metric-mini">
          <span class="metric-mini-label">Harga</span>
          <span class="metric-mini-value">Rp ${new Intl.NumberFormat('id-ID').format(baseHarga)}</span>
        </div>
        <div class="metric-mini">
          <span class="metric-mini-label">Kapasitas</span>
          <span class="metric-mini-value">${typeof baseData.btu === 'number' ? new Intl.NumberFormat('id-ID').format(baseData.btu) : baseData.btu} BTU/h</span>
        </div>
        <div class="metric-mini">
          <span class="metric-mini-label">Daya</span>
          <span class="metric-mini-value">${typeof baseData.daya === 'number' ? new Intl.NumberFormat('id-ID').format(baseData.daya) : baseData.daya} W</span>
        </div>
        <div class="metric-mini">
          <span class="metric-mini-label">Efisiensi</span>
          <span class="metric-mini-value">${typeof baseData.efisiensi === 'number' ? baseData.efisiensi.toFixed(2) : baseData.efisiensi} ${baseData.baseline}</span>
        </div>
        <div class="metric-mini">
          <span class="metric-mini-label">Listrik/Bulan</span>
          <span class="metric-mini-value">Rp ${new Intl.NumberFormat('id-ID').format(baseBiayaBulanan)}</span>
        </div>
        <div class="metric-mini">
          <span class="metric-mini-label">Listrik/Tahun</span>
          <span class="metric-mini-value">Rp ${new Intl.NumberFormat('id-ID').format(Math.round(baseBiaya))}</span>
        </div>
      </div>
    </div>
    ${cardsHTML}
  `;

  // Animate in
  requestAnimationFrame(() => {
    document.querySelectorAll('#analisis-inter-ac .animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  });

  scrollToSection('analisis-inter-ac');
  showToast('Analisis Perbandingan Produk AC Siap!', 'success');
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
  
  let harga = estimasiHarga(btu, tipe, hargaAktual);
  if (state.customPrices[ac['No']]) {
    harga = state.customPrices[ac['No']];
  } else {
    // Save the default estimation to customPrices so it's ready for editing
    state.customPrices[ac['No']] = harga;
  }

  const infoDiv = document.getElementById('finance-ac-info');
  infoDiv.style.display = 'block';
  infoDiv.innerHTML = `
    <div class="info-row"><span>Merek:</span><span>${ac['Merek']}</span></div>
    <div class="info-row"><span>Tipe:</span><span>${tipe}</span></div>
    <div class="info-row"><span>Kapasitas:</span><span>${formatNum(btu)} BTU/h</span></div>
  `;

  const hargaContainer = document.getElementById('finance-harga-aktual-container');
  hargaContainer.style.display = 'block';
  document.getElementById('input-harga-ac').value = harga;

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
  
  let harga = estimasiHarga(btu, tipe, hargaAktual);
  if (state.customPrices[ac['No']]) {
    harga = state.customPrices[ac['No']];
  }

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
    let harga = estimasiHarga(btu, tipe, hargaAktual);
    if (state.customPrices[ac['No']]) {
      harga = state.customPrices[ac['No']];
    }
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
// LAMPU LOGIC
// ========================

function bindEventsLampu() {
  // --- Sinkronisasi Input & Slider Ruangan Lampu ---
  const syncInputLampu = (inputId, rangeId) => {
    const input = document.getElementById(inputId);
    const range = document.getElementById(rangeId);
    if (!input || !range) return;
    input.addEventListener('input', (e) => range.value = e.target.value);
    range.addEventListener('input', (e) => input.value = e.target.value);
  };
  syncInputLampu('input-panjang-lampu-ruang', 'range-panjang-lampu-ruang');
  syncInputLampu('input-lebar-lampu-ruang', 'range-lebar-lampu-ruang');

  // --- Hitung Kapasitas ---
  document.getElementById('btn-hitung-kapasitas-lampu').addEventListener('click', () => {
    const lux = parseFloat(document.getElementById('input-tipe-ruangan-lampu').value);
    const panjang = parseFloat(document.getElementById('input-panjang-lampu-ruang').value);
    const lebar = parseFloat(document.getElementById('input-lebar-lampu-ruang').value);
    
    if (!lux || !panjang || !lebar) {
      showToast('Harap isi semua dimensi ruangan dengan benar', 'warning');
      return;
    }
    
    const { kebutuhanLumen, kebutuhanWatt } = hitungKapasitasLampu(lux, panjang, lebar);
    
    document.getElementById('hasil-kapasitas-lampu').style.display = 'block';
    document.getElementById('val-kapasitas-lumen').textContent = formatShort(kebutuhanLumen) + ' Lumen';
    document.getElementById('val-kapasitas-watt').textContent = kebutuhanWatt + ' W';
    
    // Set state target daya
    stateLampu.dayaLama = kebutuhanWatt;
    document.getElementById('input-daya-lampu').value = kebutuhanWatt; // Update UI manual override

    showToast('Kapasitas berhasil dihitung! Lanjut cari rekomendasi.', 'success');
  });
  document.getElementById('input-daya-lampu').addEventListener('input', (e) => {
    stateLampu.dayaLama = parseFloat(e.target.value) || 0;
  });
  document.getElementById('input-biaya-lampu-lama').addEventListener('input', (e) => {
    stateLampu.biayaLama = parseFloat(e.target.value) || 0;
  });
  document.getElementById('input-umur-lampu').addEventListener('input', (e) => {
    stateLampu.umurEkonomis = parseFloat(e.target.value) || 3;
  });
  document.getElementById('input-bunga-lampu').addEventListener('input', (e) => {
    stateLampu.bunga = (parseFloat(e.target.value) || 0) / 100;
  });
  document.getElementById('input-tarif-lampu').addEventListener('input', (e) => {
    stateLampu.tarifListrik = parseFloat(e.target.value) || 1444;
  });

  document.getElementById('btn-cari-rekomendasi-lampu').addEventListener('click', () => {
    findRecommendationsLampu();
    scrollToSection('rekomendasi-lampu');
  });

  document.getElementById('filter-brand-lampu').addEventListener('change', applyFiltersLampu);
  document.getElementById('filter-type-lampu').addEventListener('change', applyFiltersLampu);
  document.getElementById('filter-rating-lampu').addEventListener('change', applyFiltersLampu);
  document.getElementById('filter-sort-lampu').addEventListener('change', applyFiltersLampu);

  document.getElementById('btn-compare-lampu').addEventListener('click', runComparisonLampu);
  document.getElementById('btn-clear-compare-lampu').addEventListener('click', clearComparisonLampu);

  // --- Lampu Existing toggle ---
  const toggleLampu = document.getElementById('toggle-existing-lampu');
  toggleLampu.addEventListener('change', () => {
    const panel = document.getElementById('existing-panel-lampu');
    panel.style.display = toggleLampu.checked ? 'block' : 'none';
  });

  // --- Select Lampu Lama Brand ---
  document.getElementById('select-existing-brand-lampu').addEventListener('change', (e) => {
    const brand = e.target.value;
    const modelSelect = document.getElementById('select-existing-model-lampu');
    const infoBox = document.getElementById('existing-info-lampu');
    
    // Reset
    modelSelect.innerHTML = '<option value="">-- Pilih Model --</option>';
    infoBox.style.display = 'none';
    
    if (brand) {
      const db = getDatabaseLampu();
      const models = db.filter(l => l['Merek'] === brand);
      models.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l['No'];
        opt.textContent = `${l['Model'] || l['Famili'] || 'Unknown'} (${l['Daya (Watt)']}W)`;
        modelSelect.appendChild(opt);
      });
    }
  });

  // --- Select Lampu Lama Model ---
  document.getElementById('select-existing-model-lampu').addEventListener('change', (e) => {
    const no = e.target.value;
    const infoBox = document.getElementById('existing-info-lampu');
    if (!no) {
      infoBox.style.display = 'none';
      return;
    }

    const lampu = getLampuById(no);
    if (lampu) {
      infoBox.style.display = 'block';
      const tipeVal = lampu['Tipe'] || lampu['Famili'] || '-';
      const dayaVal = lampu['Daya (Watt)'] || 0;
      const efikasiVal = lampu['Efikasi (Lumen/watt)'] || 0;

      document.getElementById('existing-tipe-lampu').textContent = tipeVal;
      document.getElementById('existing-daya-lampu').textContent = (typeof dayaVal === 'number' ? dayaVal.toLocaleString('id-ID', {maximumFractionDigits: 2}) : dayaVal) + ' Watt';
      document.getElementById('existing-efikasi-lampu').textContent = (typeof efikasiVal === 'number' ? efikasiVal.toLocaleString('id-ID', {maximumFractionDigits: 1}) : efikasiVal) + ' lm/W';
      document.getElementById('existing-biaya-lampu').textContent = formatRupiah(lampu['Biaya Listrik Tahunan (Rp)'] || 0);

      // Auto-fill manual inputs
      const manualDaya = document.getElementById('input-daya-lampu');
      const manualBiaya = document.getElementById('input-biaya-lampu-lama');
      manualDaya.value = lampu['Daya (Watt)'] || 0;
      manualBiaya.value = lampu['Biaya Listrik Tahunan (Rp)'] || 0;

      // Update state
      stateLampu.dayaLama = parseFloat(manualDaya.value) || 0;
      stateLampu.biayaLama = parseFloat(manualBiaya.value) || 0;
    }
  });
}

function findRecommendationsLampu() {
  const db = getDatabaseLampu();
  stateLampu.allRecommendationsLampu = db;
  
  if (db.length === 0) {
    showToast('Tidak ada lampu yang tersedia di database', 'warning');
    stateLampu.rekomendasi = [];
  } else {
    showToast(`Ditemukan ${db.length} lampu`, 'success');
  }

  stateLampu.selectedLampu = [];
  updateCompareBarLampu();
  
  // Set default sort to "rekomendasi"
  document.getElementById('filter-sort-lampu').value = 'rekomendasi';
  
  applyFiltersLampu();
}

function applyFiltersLampu() {
  let data = [...stateLampu.allRecommendationsLampu];
  
  // 1. Filter Brand
  const brand = document.getElementById('filter-brand-lampu').value;
  if (brand) data = data.filter(l => l['Merek'] === brand);

  // 2. Filter Tipe
  const tipe = document.getElementById('filter-type-lampu').value;
  if (tipe) data = data.filter(l => (l['Tipe'] || l['Jenis'] || '').toLowerCase().includes(tipe.toLowerCase()));

  // 3. Filter Min Rating
  const minRating = parseInt(document.getElementById('filter-rating-lampu').value);
  if (minRating) data = data.filter(l => Math.round(l['Tingkat Bintang (1-5)'] || 0) >= minRating);

  // 4. Sort
  const sort = document.getElementById('filter-sort-lampu').value;
  const targetDaya = stateLampu.dayaLama || 40;

  data.sort((a, b) => {
    if (sort === 'rekomendasi') {
      // Prioritas 1: Bintang tertinggi (Prioritas Bintang 5)
      const starA = Math.round(a['Tingkat Bintang (1-5)'] || 0);
      const starB = Math.round(b['Tingkat Bintang (1-5)'] || 0);
      if (starA !== starB) {
        return starB - starA; // Bintang 5 di atas
      }
      
      // Prioritas 2: Selisih daya terkecil
      const diffA = Math.abs((a['Daya (Watt)'] || 0) - targetDaya);
      const diffB = Math.abs((b['Daya (Watt)'] || 0) - targetDaya);
      return diffA - diffB;
    } 
    else if (sort === 'efikasi-desc') {
      return (b['Efikasi (Lumen/watt)'] || 0) - (a['Efikasi (Lumen/watt)'] || 0);
    } 
    else if (sort === 'rating-desc') {
      return (b['Tingkat Bintang (1-5)'] || 0) - (a['Tingkat Bintang (1-5)'] || 0);
    } 
    else if (sort === 'daya-asc') {
      return (a['Daya (Watt)'] || Infinity) - (b['Daya (Watt)'] || Infinity);
    }
    return 0;
  });

  stateLampu.rekomendasi = data;
  document.getElementById('result-count-lampu').textContent = data.length + ' hasil';
  renderLampuGrid();
}

function renderLampuGrid() {
  const grid = document.getElementById('lampu-grid');
  const data = stateLampu.rekomendasi.slice(0, 50); // Show max 50 for simplicity

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Tidak Ada Hasil</h3>
        <p>Coba ubah filter pencarian Anda.</p>
      </div>
    `;
    return;
  }

  const selectedNos = stateLampu.selectedLampu.map(l => l['No']);
  grid.innerHTML = data.map((lampu, i) => {
    const isSelected = selectedNos.includes(lampu['No']);
    return createLampuCard(lampu, i, isSelected);
  }).join('');

  grid.querySelectorAll('.btn-compare-lampu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const no = btn.dataset.lampuNo;
      toggleSelectLampu(no);
    });
  });
  
  // Animate new cards
  requestAnimationFrame(() => {
    grid.querySelectorAll('.animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 50);
    });
  });
}

function toggleSelectLampu(no) {
  const idx = stateLampu.selectedLampu.findIndex(l => String(l['No']) === String(no));
  if (idx >= 0) {
    stateLampu.selectedLampu.splice(idx, 1);
  } else {
    if (stateLampu.selectedLampu.length >= 4) {
      showToast('Maksimal 4 lampu untuk analisis', 'warning');
      return;
    }
    const lampu = getLampuById(no);
    if (lampu) stateLampu.selectedLampu.push(lampu);
  }
  updateCompareBarLampu();
  renderLampuGrid();
}

function updateCompareBarLampu() {
  const bar = document.getElementById('compare-bar-lampu');
  const count = document.getElementById('compare-count-lampu');
  if (stateLampu.selectedLampu.length > 0) {
    bar.style.display = 'flex';
    count.textContent = stateLampu.selectedLampu.length;
  } else {
    bar.style.display = 'none';
  }
}

function clearComparisonLampu() {
  stateLampu.selectedLampu = [];
  updateCompareBarLampu();
  renderLampuGrid();

  document.getElementById('analysis-active-lampu').style.display = 'none';
  document.getElementById('analysis-content-lampu').style.display = 'block';
}

function runComparisonLampu() {
  if (stateLampu.selectedLampu.length < 1) {
    showToast('Pilih minimal 1 lampu untuk dianalisis', 'warning');
    return;
  }

  document.getElementById('analysis-content-lampu').style.display = 'none';
  document.getElementById('analysis-active-lampu').style.display = 'block';

  runInvestmentAnalysisLampu();
  scrollToSection('analisis-lampu');
  showToast('Analisis lampu siap!', 'success');
}

function runInvestmentAnalysisLampu() {
  const acNames = [];
  const npvValues = [];
  const irrValues = [];
  const paybackValues = [];
  const biayaBaruArr = [];

  const cardsHtml = stateLampu.selectedLampu.map((lampu, index) => {
    const dayaLampu = lampu['Daya (Watt)'] || 0;
    const biayaBaru = lampu['Biaya Listrik Tahunan (Rp)'] || 0;
    const harga = estimasiHargaLampu(dayaLampu);
    
    const hemat = hitungPenghematanLampu(stateLampu.biayaLama, biayaBaru);

    let cashFlows = [-harga];
    for(let i = 0; i < stateLampu.umurEkonomis; i++){
      cashFlows.push(hemat);
    }

    const npv = hitungNPV(stateLampu.bunga, cashFlows);
    let irr = 0;
    let paybackPeriod = Infinity;

    if (hemat > 0) {
      irr = hitungIRR(cashFlows);
      paybackPeriod = harga / hemat;
    }

    let cardStatus = 'layak';
    let keputusan = 'LAYAK (GO)';
    if (npv < 0 || paybackPeriod > stateLampu.umurEkonomis) {
      cardStatus = 'tidak-layak';
      keputusan = 'TIDAK LAYAK (NO GO)';
    }

    const npvClass = npv >= 0 ? 'positive' : 'negative';
    const irrClass = irr > stateLampu.bunga ? 'positive' : 'negative';
    const ppClass = paybackPeriod <= stateLampu.umurEkonomis ? 'positive' : 'negative';

    const name = `Lampu ${index + 1}`;
    acNames.push(name);
    npvValues.push(npv);
    irrValues.push(irr);
    paybackValues.push(paybackPeriod === Infinity ? stateLampu.umurEkonomis * 2 : paybackPeriod);
    biayaBaruArr.push(biayaBaru);

    return `
      <div class="analysis-card ${cardStatus} animate-in">
        <div class="analysis-card-header">
          <h4 title="${lampu['Merek']} — ${lampu['Model'] || '-'}">${name}: ${lampu['Merek']} — ${(lampu['Model'] || '-').substring(0, 25)}...</h4>
          <span class="verdict-badge ${cardStatus}">${keputusan}</span>
        </div>
        <div class="analysis-metrics">
          <div class="analysis-metric">
            <div class="m-label">Simple Payback</div>
            <div class="m-value ${ppClass}">
              ${paybackPeriod === Infinity ? '∞' : paybackPeriod.toFixed(1)} thn
            </div>
          </div>
          <div class="analysis-metric">
            <div class="m-label">NPV</div>
            <div class="m-value ${npvClass}">
              ${formatShort(Math.round(npv))}
            </div>
          </div>
          <div class="analysis-metric">
            <div class="m-label">IRR</div>
            <div class="m-value ${irrClass}">
              ${(irr * 100).toFixed(1)}%
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

  document.getElementById('analysis-cards-lampu').innerHTML = cardsHtml;
  
  // Create charts
  createCostComparisonChart('chart-cost-comparison-lampu', acNames, biayaBaruArr, stateLampu.biayaLama, 'Biaya Listrik Lampu Baru (Rp/tahun)', 'Biaya Listrik Lampu Lama (Rp/tahun)');
  createNPVComparisonChart('chart-npv-lampu', acNames, npvValues);
  createIRRComparisonChart('chart-irr-lampu', acNames, irrValues, stateLampu.bunga);
  createPaybackChart('chart-payback-lampu', acNames, paybackValues, stateLampu.umurEkonomis);
  
  // Animate cards
  requestAnimationFrame(() => {
    document.querySelectorAll('#analysis-cards-lampu .animate-in, #analysis-active-lampu .charts-grid .animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  });
}

// ========================
// EVENTS KULKAS
// ========================
function bindEventsKulkas() {
  const toggleExistingKulkas = document.getElementById('toggle-existing-kulkas');
  if (toggleExistingKulkas) {
    toggleExistingKulkas.addEventListener('change', () => {
      const panel = document.getElementById('existing-panel-kulkas');
      panel.style.display = toggleExistingKulkas.checked ? 'block' : 'none';
      if (!toggleExistingKulkas.checked) {
        stateKulkas.biayaLama = 0;
      }
    });
  }

  const brandSelect = document.getElementById('select-existing-brand-kulkas');
  const modelSelect = document.getElementById('select-existing-model-kulkas');

  if (brandSelect && modelSelect) {
    brandSelect.addEventListener('change', () => {
      const brand = brandSelect.value;
      modelSelect.innerHTML = '<option value="">-- Pilih Model --</option>';
      document.getElementById('existing-info-kulkas').style.display = 'none';

      if (brand) {
        const db = getDatabaseKulkas();
        const models = db.filter(k => k['Merek'] === brand);
        models.forEach(k => {
          const opt = document.createElement('option');
          opt.value = k['No'];
          const modelName = k['Model'] || '-';
          opt.textContent = modelName.length > 60 ? modelName.substring(0, 60) + '...' : modelName;
          modelSelect.appendChild(opt);
        });
      }
    });

    modelSelect.addEventListener('change', () => {
      const no = modelSelect.value;
      if (no) {
        const k = getKulkasById(no);
        if (k) {
          const biaya = k['Biaya Listrik Tahunan (Rp)'] || 0;
          stateKulkas.biayaLama = biaya;
          document.getElementById('input-biaya-kulkas-lama').value = Math.round(biaya);

          document.getElementById('existing-tipe-kulkas').textContent = k['Tipe'] || '-';
          document.getElementById('existing-volume-kulkas').textContent = k['Adjusted Volume (liter)*'] + ' L';
          document.getElementById('existing-daya-kulkas').textContent = k['Daya (watt)'] + ' W';
          document.getElementById('existing-biaya-kulkas').textContent = new Intl.NumberFormat('id-ID').format(biaya);
          document.getElementById('existing-info-kulkas').style.display = 'block';
        }
      } else {
        document.getElementById('existing-info-kulkas').style.display = 'none';
      }
    });
  }

  const inputBiayaLama = document.getElementById('input-biaya-kulkas-lama');
  if (inputBiayaLama) {
    inputBiayaLama.addEventListener('input', (e) => {
      stateKulkas.biayaLama = parseFloat(e.target.value) || 0;
    });
  }

  ['input-umur-kulkas', 'input-bunga-kulkas', 'input-tarif-kulkas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        if (id === 'input-umur-kulkas') stateKulkas.umurEkonomis = parseInt(e.target.value) || 5;
        if (id === 'input-bunga-kulkas') stateKulkas.bunga = (parseFloat(e.target.value) || 6) / 100;
        if (id === 'input-tarif-kulkas') stateKulkas.tarifListrik = parseFloat(e.target.value) || 1444;
      });
    }
  });

  const btnCari = document.getElementById('btn-cari-rekomendasi-kulkas');
  if (btnCari) {
    btnCari.addEventListener('click', () => {
      findRecommendationsKulkas();
      scrollToSection('rekomendasi-kulkas');
    });
  }

  ['filter-brand-kulkas', 'filter-type-kulkas', 'filter-rating-kulkas', 'filter-sort-kulkas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFiltersKulkas);
  });

  const btnCompare = document.getElementById('btn-compare-kulkas');
  if (btnCompare) btnCompare.addEventListener('click', runInvestmentAnalysisKulkas);

  const btnClear = document.getElementById('btn-clear-compare-kulkas');
  if (btnClear) btnClear.addEventListener('click', () => {
    stateKulkas.selectedKulkas = [];
    updateCompareBarKulkas();
    renderKulkasGrid();
    updateFinancingSectionKulkas();
    document.getElementById('analysis-active-kulkas').style.display = 'none';
    document.getElementById('analysis-empty-kulkas').style.display = 'block';
  });

  // --- Financing controls Kulkas ---
  document.querySelectorAll('#view-lemari-pendingin .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tab-group');
      const targetId = btn.dataset.tab;
      if (!targetId.includes('kulkas')) return;
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

  document.querySelectorAll('.tenor-btn-kulkas').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tenor-btn-kulkas').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('input-tenor-kulkas').value = btn.dataset.tenor;
    });
  });

  const dpInputKulkas = document.getElementById('input-dp-kulkas');
  const dpRangeKulkas = document.getElementById('range-dp-kulkas');
  if (dpInputKulkas && dpRangeKulkas) {
    dpRangeKulkas.addEventListener('input', () => { dpInputKulkas.value = dpRangeKulkas.value; });
    dpInputKulkas.addEventListener('input', () => { dpRangeKulkas.value = dpInputKulkas.value; });
  }

  const financeSelectKulkas = document.getElementById('finance-kulkas-select');
  if (financeSelectKulkas) {
    financeSelectKulkas.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value);
      if (!isNaN(idx) && stateKulkas.selectedKulkas[idx]) {
        showFinanceKulkasInfo(stateKulkas.selectedKulkas[idx]);
      } else {
        document.getElementById('finance-kulkas-info').style.display = 'none';
      }
    });
  }

  const btnHitungKreditKulkas = document.getElementById('btn-hitung-kredit-kulkas');
  if (btnHitungKreditKulkas) btnHitungKreditKulkas.addEventListener('click', calculateCreditKulkas);

  const btnToggleAmortisasiKulkas = document.getElementById('btn-toggle-amortisasi-kulkas');
  if (btnToggleAmortisasiKulkas) {
    btnToggleAmortisasiKulkas.addEventListener('click', () => {
      const wrapper = document.getElementById('amortisasi-wrapper-kulkas');
      if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
        btnToggleAmortisasiKulkas.textContent = 'Sembunyikan';
      } else {
        wrapper.style.display = 'none';
        btnToggleAmortisasiKulkas.textContent = 'Tampilkan';
      }
    });
  }
}

function findRecommendationsKulkas() {
  const db = getDatabaseKulkas();
  stateKulkas.rekomendasi = [...db];
  stateKulkas.currentPage = 1;
  stateKulkas.selectedKulkas = [];
  updateCompareBarKulkas();
  applyFiltersKulkas();
}

function applyFiltersKulkas() {
  let data = [...getDatabaseKulkas()];

  const brand = document.getElementById('filter-brand-kulkas').value;
  if (brand) data = data.filter(k => k['Merek'] === brand);

  const type = document.getElementById('filter-type-kulkas').value;
  if (type) data = data.filter(k => k['Tipe'] === type);

  const minRating = parseInt(document.getElementById('filter-rating-kulkas').value);
  if (minRating) data = data.filter(k => (k['Rating Bintang (1-5)'] || 0) >= minRating);

  const sort = document.getElementById('filter-sort-kulkas').value;
  data.sort((a, b) => {
    switch (sort) {
      case 'rating-desc':
        return (b['Rating Bintang (1-5)'] || 0) - (a['Rating Bintang (1-5)'] || 0);
      case 'biaya-asc':
        return (a['Biaya Listrik Tahunan (Rp)'] || Infinity) - (b['Biaya Listrik Tahunan (Rp)'] || Infinity);
      case 'volume-desc':
        return (b['Adjusted Volume (liter)*'] || 0) - (a['Adjusted Volume (liter)*'] || 0);
      default:
        return 0;
    }
  });

  stateKulkas.rekomendasi = data;
  stateKulkas.currentPage = 1;
  document.getElementById('result-count-kulkas').textContent = data.length + ' hasil';
  renderKulkasGrid();
}

function renderKulkasGrid() {
  const grid = document.getElementById('kulkas-grid');
  const data = stateKulkas.rekomendasi;
  const start = (stateKulkas.currentPage - 1) * stateKulkas.perPage;
  const pageData = data.slice(start, start + stateKulkas.perPage);

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Tidak Ada Hasil</h3>
        <p>Coba ubah filter pencarian Anda.</p>
      </div>
    `;
    return;
  }

  const selectedNos = stateKulkas.selectedKulkas.map(k => k['No']);
  grid.innerHTML = pageData.map((k, i) => {
    const isSelected = selectedNos.includes(k['No']);
    return createKulkasCard(k, start + i, isSelected);
  }).join('');

  grid.querySelectorAll('.btn-compare-kulkas').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSelectKulkas(btn.dataset.kulkasNo);
    });
  });

  requestAnimationFrame(() => {
    grid.querySelectorAll('.animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 50);
    });
  });
}

function toggleSelectKulkas(no) {
  const idx = stateKulkas.selectedKulkas.findIndex(k => String(k['No']) === String(no));
  if (idx >= 0) {
    stateKulkas.selectedKulkas.splice(idx, 1);
  } else {
    if (stateKulkas.selectedKulkas.length >= 6) {
      showToast('Maksimal 6 Kulkas untuk perbandingan', 'warning');
      return;
    }
    const k = getKulkasById(no);
    if (k) stateKulkas.selectedKulkas.push(k);
  }
  updateCompareBarKulkas();
  renderKulkasGrid();
  updateFinancingSectionKulkas();
}

function updateCompareBarKulkas() {
  const bar = document.getElementById('compare-bar-kulkas');
  const count = document.getElementById('compare-count-kulkas');
  if (stateKulkas.selectedKulkas.length > 0) {
    bar.style.display = 'flex';
    count.textContent = stateKulkas.selectedKulkas.length;
  } else {
    bar.style.display = 'none';
  }
}

function updateFinancingSectionKulkas() {
  const content = document.getElementById('financing-content-kulkas');
  const active = document.getElementById('financing-active-kulkas');
  if (!content || !active) return;

  if (stateKulkas.selectedKulkas.length === 0) {
    content.style.display = 'block';
    active.style.display = 'none';
    return;
  }

  content.style.display = 'none';
  active.style.display = 'block';

  const select = document.getElementById('finance-kulkas-select');
  select.innerHTML = '<option value="">-- Pilih Kulkas --</option>';
  stateKulkas.selectedKulkas.forEach((k, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${k['Merek']} - ${(k['Model'] || '-').substring(0, 50)}`;
    select.appendChild(opt);
  });

  if (stateKulkas.selectedKulkas.length > 0) {
    select.value = '0';
    showFinanceKulkasInfo(stateKulkas.selectedKulkas[0]);
  }
}

function showFinanceKulkasInfo(kulkas) {
  const vol = kulkas['Adjusted Volume (liter)*'] || 0;
  const tipe = kulkas['Tipe'] || '-';
  const harga = estimasiHargaKulkas(vol, tipe);

  const infoDiv = document.getElementById('finance-kulkas-info');
  infoDiv.style.display = 'block';
  infoDiv.innerHTML = `
    <div class="info-row"><span>Merek:</span><span>${kulkas['Merek']}</span></div>
    <div class="info-row"><span>Tipe:</span><span>${tipe}</span></div>
    <div class="info-row"><span>Volume:</span><span>${vol} L</span></div>
    <div class="info-row"><span>Estimasi Harga:</span><span>${formatRupiah(harga)}</span></div>
  `;

  const cashPrice = document.getElementById('cash-price-kulkas');
  if (cashPrice) cashPrice.textContent = formatRupiah(harga);

  const creditResults = document.getElementById('credit-results-kulkas');
  if (creditResults) creditResults.style.display = 'none';
}

function calculateCreditKulkas() {
  const selectEl = document.getElementById('finance-kulkas-select');
  const idx = parseInt(selectEl.value);
  if (isNaN(idx) || !stateKulkas.selectedKulkas[idx]) {
    showToast('Pilih Kulkas terlebih dahulu', 'warning');
    return;
  }

  const kulkas = stateKulkas.selectedKulkas[idx];
  const vol = kulkas['Adjusted Volume (liter)*'] || 0;
  const tipe = kulkas['Tipe'] || '-';
  const harga = estimasiHargaKulkas(vol, tipe);

  const dpPersen = parseFloat(document.getElementById('input-dp-kulkas').value) || 0;
  const bunga = parseFloat(document.getElementById('input-bunga-kredit-kulkas').value) || 0;
  const tenor = parseInt(document.getElementById('input-tenor-kulkas').value) || 18;

  const result = hitungCicilanAnuitas(harga, dpPersen, bunga, tenor);
  const amortisasi = generateAmortisasi(harga, dpPersen, bunga, tenor);

  const creditResults = document.getElementById('credit-results-kulkas');
  if (creditResults) creditResults.style.display = 'block';
  
  document.getElementById('credit-dp-kulkas').textContent = formatRupiah(result.dp);
  document.getElementById('credit-cicilan-kulkas').textContent = formatRupiah(result.cicilanPerBulan);
  document.getElementById('credit-total-kulkas').textContent = formatRupiah(result.totalPembayaran);
  document.getElementById('credit-bunga-kulkas').textContent = formatRupiah(result.bungaTotal);

  createFinancingPieChart('chart-financing-pie-kulkas', result.dp, result.pokokPinjaman, result.bungaTotal);

  const tbody = document.querySelector('#table-amortisasi-kulkas tbody');
  if (tbody) {
    tbody.innerHTML = amortisasi.map(row => `
      <tr>
        <td>${row.bulan}</td>
        <td>${formatRupiah(row.cicilan)}</td>
        <td>${formatRupiah(row.pokok)}</td>
        <td>${formatRupiah(row.bunga)}</td>
        <td>${formatRupiah(row.sisaPinjaman)}</td>
      </tr>
    `).join('');
  }

  requestAnimationFrame(() => {
    document.querySelectorAll('#credit-results-kulkas .animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  });

  showToast('Perhitungan kredit kulkas selesai', 'success');
}

function runInvestmentAnalysisKulkas() {
  if (stateKulkas.selectedKulkas.length === 0) {
    showToast('Pilih minimal 1 Kulkas', 'warning');
    return;
  }
  scrollToSection('analisis-kulkas');
  document.getElementById('analysis-empty-kulkas').style.display = 'none';
  document.getElementById('analysis-active-kulkas').style.display = 'block';

  const acNames = [];
  const npvValues = [];
  const irrValues = [];
  const paybackValues = [];
  const biayaBaruArr = [];

  const cardsHtml = stateKulkas.selectedKulkas.map((kulkas, index) => {
    const vol = kulkas['Adjusted Volume (liter)*'] || 0;
    const tipe = kulkas['Tipe'] || '';
    const harga = estimasiHargaKulkas(vol, tipe);
    const biayaBaru = kulkas['Biaya Listrik Tahunan (Rp)'] || 0;
    const hemat = hitungPenghematanKulkas(stateKulkas.biayaLama, biayaBaru);

    const cashFlows = [-harga];
    for (let y = 0; y < stateKulkas.umurEkonomis; y++) {
      cashFlows.push(hemat);
    }

    const { npv } = fullAnalysis(harga, hemat, stateKulkas.umurEkonomis, stateKulkas.bunga);
    
    let irr = 0;
    let paybackPeriod = Infinity;

    if (hemat > 0) {
      irr = hitungIRR(cashFlows);
      paybackPeriod = harga / hemat;
    }

    let cardStatus = 'layak';
    let keputusan = 'LAYAK (GO)';
    if (npv < 0 || paybackPeriod > stateKulkas.umurEkonomis) {
      cardStatus = 'tidak-layak';
      keputusan = 'TIDAK LAYAK (NO GO)';
    }

    const npvClass = npv >= 0 ? 'positive' : 'negative';
    const irrClass = irr > stateKulkas.bunga ? 'positive' : 'negative';
    const ppClass = paybackPeriod <= stateKulkas.umurEkonomis ? 'positive' : 'negative';

    const name = `Kulkas ${index + 1}`;
    acNames.push(name);
    npvValues.push(npv);
    irrValues.push(irr);
    paybackValues.push(paybackPeriod === Infinity ? stateKulkas.umurEkonomis * 2 : paybackPeriod);
    biayaBaruArr.push(biayaBaru);

    return `
      <div class="analysis-card ${cardStatus} animate-in">
        <div class="analysis-card-header">
          <h4 title="${kulkas['Merek']} — ${kulkas['Model'] || '-'}">${name}: ${kulkas['Merek']}</h4>
          <span class="verdict-badge ${cardStatus}">${keputusan}</span>
        </div>
        <div class="analysis-metrics">
          <div class="analysis-metric">
            <div class="m-label">Payback Period</div>
            <div class="m-value ${ppClass}">
              ${paybackPeriod === Infinity ? '∞' : paybackPeriod.toFixed(1)} thn
            </div>
          </div>
          <div class="analysis-metric">
            <div class="m-label">NPV</div>
            <div class="m-value ${npvClass}">
              ${formatShort(Math.round(npv))}
            </div>
          </div>
          <div class="analysis-metric">
            <div class="m-label">IRR</div>
            <div class="m-value ${irrClass}">
              ${(irr * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div class="analysis-saving">
          <span>Penghematan / Tahun</span>
          <span>${hemat > 0 ? new Intl.NumberFormat('id-ID').format(Math.round(hemat)) : 'Tidak ada'}</span>
        </div>
        <div class="analysis-saving" style="margin-top:0.35rem;">
          <span>Investasi Awal</span>
          <span>${new Intl.NumberFormat('id-ID').format(Math.round(harga))}</span>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('analysis-cards-kulkas').innerHTML = cardsHtml;
  
  createCostComparisonChart('chart-cost-comparison-kulkas', acNames, biayaBaruArr, stateKulkas.biayaLama, 'Biaya Kulkas Baru', 'Biaya Kulkas Lama');
  createNPVComparisonChart('chart-npv-kulkas', acNames, npvValues);
  createIRRComparisonChart('chart-irr-kulkas', acNames, irrValues, stateKulkas.bunga);
  createPaybackChart('chart-payback-kulkas', acNames, paybackValues, stateKulkas.umurEkonomis);
  
  requestAnimationFrame(() => {
    document.querySelectorAll('#analysis-cards-kulkas .animate-in, #analysis-active-kulkas .charts-grid .animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  });
}

// ========================
// COMPARE AC VIEW LOGIC
// ========================
function findRecommendationsCompare() {
  const db = getDatabase();
  if (db.length === 0) {
    // Tunggu sampai database dimuat
    document.getElementById('ac-grid-compare').innerHTML = `
      <div class="empty-state">
        <div class="loader"></div>
        <p>Memuat database AC...</p>
      </div>
    `;
    setTimeout(findRecommendationsCompare, 500);
    return;
  }
  
  stateCompare.rekomendasi = [...db];
  stateCompare.currentPage = 1;
  stateCompare.selectedACs = [];
  
  populateCompareFilters();
  updateCompareBarCompare();
  applyFiltersCompare();
}

function populateCompareFilters() {
  const db = getDatabase();
  const brands = [...new Set(db.map(ac => ac['Merek']).filter(Boolean))].sort();
  const filterBrand = document.getElementById('filter-brand-compare');
  if (filterBrand) {
    filterBrand.innerHTML = '<option value="">Semua Merek</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');
  }
}

function applyFiltersCompare() {
  let data = [...getDatabase()];

  const brand = document.getElementById('filter-brand-compare').value;
  if (brand) data = data.filter(ac => ac['Merek'] === brand);

  const type = document.getElementById('filter-type-compare').value;
  if (type) {
    if (type === 'Inverter') {
      data = data.filter(ac => (ac['Tipe'] || '').toLowerCase().includes('inverter') && !(ac['Tipe'] || '').toLowerCase().includes('non'));
    } else {
      data = data.filter(ac => (ac['Tipe'] || '').toLowerCase().includes('non'));
    }
  }

  const rating = document.getElementById('filter-rating-compare').value;
  if (rating) {
    data = data.filter(ac => (ac['Rating Bintang (1-5)'] || 0) >= parseInt(rating));
  }

  const sort = document.getElementById('filter-sort-compare').value;
  data.sort((a, b) => {
    if (sort === 'rating-desc') return (b['Rating Bintang (1-5)'] || 0) - (a['Rating Bintang (1-5)'] || 0);
    if (sort === 'efisiensi-desc') return (b['Nilai Efisiensi (EER/CSPF)'] || 0) - (a['Nilai Efisiensi (EER/CSPF)'] || 0);
    if (sort === 'biaya-asc') {
      let hargaA = estimasiHarga(a['Kapasitas Pendinginan (BTU/h)'], a['Tipe'], a['Harga (Rp)']);
      let hargaB = estimasiHarga(b['Kapasitas Pendinginan (BTU/h)'], b['Tipe'], b['Harga (Rp)']);
      return hargaA - hargaB;
    }
    return 0;
  });

  stateCompare.rekomendasi = data;
  stateCompare.currentPage = 1;
  
  document.getElementById('result-count-compare').textContent = `${data.length} hasil`;
  
  renderACGridCompare();
}

function renderACGridCompare() {
  const grid = document.getElementById('ac-grid-compare');
  const pagination = document.getElementById('pagination-compare');
  const pageInfo = document.getElementById('page-info-compare');

  const start = (stateCompare.currentPage - 1) * stateCompare.perPage;
  const end = start + stateCompare.perPage;
  const currentData = stateCompare.rekomendasi.slice(start, end);

  if (currentData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😔</div>
        <h3>Tidak ada AC yang sesuai</h3>
        <p>Coba ubah filter pencarian Anda.</p>
      </div>
    `;
    pagination.style.display = 'none';
    return;
  }

  grid.innerHTML = currentData.map((ac, index) => {
    const isSelected = stateCompare.selectedACs.some(s => String(s['No']) === String(ac['No']));
    const isBaseline = String(stateCompare.baselineNo) === String(ac['No']);
    const merek = ac['Merek'] || '-';
    const model = ac['Model'] || ac['Famili'] || '-';
    const tipe = ac['Tipe'] || '-';
    const efisiensi = ac['Nilai Efisiensi (EER/CSPF)'] || '-';
    const baseline = ac['Baseline'] || '';
    const no = ac['No'] || index;
    const btu = ac['Kapasitas Pendinginan (BTU/h)'];
    const daya = ac['Daya (watt)'];
    const harga = estimasiHarga(btu, tipe, ac['Harga (Rp)']);
    
    return `
      <div class="ac-card animate-in ${isSelected ? 'selected' : ''} ${isBaseline ? 'is-baseline' : ''}" data-ac-no="${no}" data-index="${index}">
        ${isBaseline ? '<div class="baseline-ribbon">🏷️ BASELINE</div>' : ''}
        <div class="ac-card-header">
          <div class="ac-brand">${merek}</div>
          <div class="ac-type-badge ${tipe.toLowerCase().includes('inverter') && !tipe.toLowerCase().includes('non') ? 'inverter' : 'non-inverter'}">
            ${tipe.toLowerCase().includes('inverter') && !tipe.toLowerCase().includes('non') ? 'Inverter' : 'Non-Inverter'}
          </div>
        </div>
        <div class="ac-card-body">
          <h3 class="ac-model" title="${model}">${model.length > 50 ? model.substring(0, 50) + '...' : model}</h3>
          <div class="ac-stars">
            ${'⭐'.repeat(ac['Rating Bintang (1-5)'] || 0)}
          </div>
          <div class="ac-specs">
            <div class="spec">
              <span class="spec-label">Kapasitas</span>
              <span class="spec-value">${typeof btu === 'number' ? new Intl.NumberFormat('id-ID').format(btu) : btu} BTU/h</span>
            </div>
            <div class="spec">
              <span class="spec-label">Daya</span>
              <span class="spec-value">${typeof daya === 'number' ? new Intl.NumberFormat('id-ID').format(daya) : daya} W</span>
            </div>
            <div class="spec" style="grid-column: 1 / -1; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--glass-border);">
              <span class="spec-label">Efisiensi & Harga</span>
              <span class="spec-value">
                <span style="color:var(--text-primary)">${typeof efisiensi === 'number' ? efisiensi.toFixed(2) : efisiensi} ${baseline}</span>
                <span style="float:right; color:var(--accent-teal)">Rp ${new Intl.NumberFormat('id-ID').format(harga)}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="ac-card-footer">
          <button class="btn btn-compare-compare" data-ac-no="${no}">
            ${isSelected ? '✓ Dipilih' : '+ Bandingkan'}
          </button>
          ${isSelected && !isBaseline ? `<button class="btn btn-set-baseline" data-ac-no="${no}">🏷️ Jadikan Baseline</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Bind compare buttons
  grid.querySelectorAll('.btn-compare-compare').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSelectACCompare(parseInt(btn.dataset.acNo));
    });
  });

  // Bind baseline buttons
  grid.querySelectorAll('.btn-set-baseline').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setBaselineCompare(parseInt(btn.dataset.acNo));
    });
  });

  const totalPages = Math.ceil(stateCompare.rekomendasi.length / stateCompare.perPage);
  if (totalPages > 1) {
    pagination.style.display = 'flex';
    pageInfo.textContent = `Halaman ${stateCompare.currentPage} / ${totalPages}`;
    document.getElementById('btn-prev-compare').disabled = stateCompare.currentPage === 1;
    document.getElementById('btn-next-compare').disabled = stateCompare.currentPage === totalPages;
  } else {
    pagination.style.display = 'none';
  }

  requestAnimationFrame(() => {
    grid.querySelectorAll('.animate-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 50);
    });
  });
}

function toggleSelectACCompare(no) {
  const noStr = String(no);
  const index = stateCompare.selectedACs.findIndex(ac => String(ac['No']) === noStr);
  if (index >= 0) {
    stateCompare.selectedACs.splice(index, 1);
    // If removed AC was baseline, pick first remaining as baseline
    if (String(stateCompare.baselineNo) === noStr) {
      stateCompare.baselineNo = stateCompare.selectedACs.length > 0 ? String(stateCompare.selectedACs[0]['No']) : null;
    }
  } else {
    if (stateCompare.selectedACs.length >= 3) {
      showToast('Maksimal membandingkan 3 AC', 'warning');
      return;
    }
    const ac = getACById(no);
    if (ac) {
      stateCompare.selectedACs.push(ac);
      // First selected AC auto-becomes baseline
      if (stateCompare.selectedACs.length === 1) {
        stateCompare.baselineNo = noStr;
      }
    }
  }
  updateCompareBarCompare();
  renderACGridCompare();
  
  // Auto-update summary table if it's already visible
  const interSection = document.getElementById('analisis-inter-ac');
  if (interSection && interSection.style.display === 'block') {
    if (stateCompare.selectedACs.length >= 2) {
      runInterACComparison();
    } else {
      interSection.style.display = 'none';
    }
  }
}

function setBaselineCompare(no) {
  const noStr = String(no);
  stateCompare.baselineNo = noStr;
  const ac = stateCompare.selectedACs.find(a => String(a['No']) === noStr);
  if (ac) {
    showToast(`${ac['Merek']} — ${ac['Model'] || ac['Famili'] || ''} dijadikan Baseline!`, 'success');
  }
  updateCompareBarCompare();
  renderACGridCompare();
  
  // Auto-update summary table if it's already visible
  const interSection = document.getElementById('analisis-inter-ac');
  if (interSection && interSection.style.display === 'block') {
    runInterACComparison();
  }
}

function updateCompareBarCompare() {
  const bar = document.getElementById('compare-bar-inter');
  const count = document.getElementById('compare-count-inter');
  const baselineInfo = document.getElementById('compare-baseline-info');
  
  if (stateCompare.selectedACs.length > 0) {
    bar.style.display = 'flex';
    count.textContent = stateCompare.selectedACs.length;
    // Show baseline info
    if (baselineInfo) {
      const baseAC = stateCompare.selectedACs.find(ac => String(ac['No']) === String(stateCompare.baselineNo));
      baselineInfo.textContent = baseAC ? `Baseline: ${baseAC['Merek']} ${baseAC['Model'] || baseAC['Famili'] || ''}` : '';
      baselineInfo.style.display = baseAC ? 'block' : 'none';
    }
  } else {
    bar.style.display = 'none';
  }
}

function clearComparisonCompare() {
  stateCompare.selectedACs = [];
  stateCompare.baselineNo = null;
  stateCompare.customPrices = {};
  updateCompareBarCompare();
  renderACGridCompare();
  document.getElementById('analisis-inter-ac').style.display = 'none';
}

// ========================
// START
// ========================
document.addEventListener('DOMContentLoaded', init);

