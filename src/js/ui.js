// Animasi penghitung angka secara bertahap
export function animateCounter(element, targetValue, duration = 1000, prefix = '', suffix = '') {
  const startValue = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Fungsi easing: easeOutQuart
    const eased = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.round(startValue + (targetValue - startValue) * eased);
    element.textContent = prefix + new Intl.NumberFormat('id-ID').format(currentValue) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Intersection Observer untuk animasi fade-in saat scroll
export function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Delay animasi bertahap (staggered)
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

// Membuat HTML rating bintang
export function createStarRating(rating) {
  const max = 5;
  let html = '<div class="star-rating">';
  for (let i = 1; i <= max; i++) {
    html += i <= rating 
      ? '<span class="star filled">★</span>' 
      : '<span class="star">☆</span>';
  }
  html += '</div>';
  return html;
}

// Menampilkan notifikasi toast
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  
  // Memicu animasi masuk
  requestAnimationFrame(() => toast.classList.add('show'));
  
  // Menghapus toast setelah durasi tertentu
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Membuat kontainer toast jika belum ada
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Scroll halus ke bagian tertentu
export function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Inisialisasi perpindahan tab
export function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tab-group');
      const targetId = btn.dataset.tab;
      
      // Nonaktifkan semua tab dalam grup ini
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabGroup.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      
      // Aktifkan tab yang diklik
      btn.classList.add('active');
      const content = document.getElementById(targetId);
      if (content) {
        content.style.display = 'block';
        requestAnimationFrame(() => content.classList.add('active'));
      }
    });
  });
}

// Membuat HTML kartu AC
export function createACCard(ac, index, isSelected = false) {
  const btu = ac['Kapasitas Pendinginan (BTU/h)'];
  const daya = ac['Daya (watt)'];
  const rating = ac['Rating Bintang (1-5)'] || 0;
  const biaya = ac['Biaya Listrik Tahunan (Rp)'];
  const merek = ac['Merek'] || '-';
  const model = ac['Model'] || ac['Famili'] || '-';
  const tipe = ac['Tipe'] || '-';
  const efisiensi = ac['Nilai Efisiensi (EER/CSPF)'] || '-';
  const no = ac['No'] || index;
  
  return `
    <div class="ac-card animate-in ${isSelected ? 'selected' : ''}" data-ac-no="${no}" data-index="${index}">
      <div class="ac-card-header">
        <div class="ac-brand">${merek}</div>
        <div class="ac-type-badge ${tipe.toLowerCase().includes('inverter') && !tipe.toLowerCase().includes('non') ? 'inverter' : 'non-inverter'}">
          ${tipe}
        </div>
      </div>
      <div class="ac-card-body">
        <h3 class="ac-model" title="${model}">${model.length > 50 ? model.substring(0, 50) + '...' : model}</h3>
        ${createStarRating(Math.round(rating))}
        <div class="ac-specs">
          <div class="spec">
            <span class="spec-label">Kapasitas</span>
            <span class="spec-value">${typeof btu === 'number' ? new Intl.NumberFormat('id-ID').format(Math.round(btu)) : btu} BTU/h</span>
          </div>
          <div class="spec">
            <span class="spec-label">Daya</span>
            <span class="spec-value">${typeof daya === 'number' ? new Intl.NumberFormat('id-ID').format(Math.round(daya)) : daya} W</span>
          </div>
          <div class="spec">
            <span class="spec-label">Efisiensi</span>
            <span class="spec-value">${typeof efisiensi === 'number' ? efisiensi.toFixed(2) : efisiensi}</span>
          </div>
          <div class="spec">
            <span class="spec-label">Biaya Listrik/Thn</span>
            <span class="spec-value biaya">Rp ${typeof biaya === 'number' ? new Intl.NumberFormat('id-ID').format(Math.round(biaya)) : biaya}</span>
          </div>
        </div>
      </div>
      <div class="ac-card-footer">
        <button class="btn btn-compare" data-ac-no="${no}">
          ${isSelected ? '✓ Dipilih' : '+ Bandingkan'}
        </button>
      </div>
    </div>
  `;
}

// Memformat angka besar ke bentuk singkat (misal: 1.2 Jt)
export function formatShort(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + ' M';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + ' Jt';
  if (num >= 1000) return (num / 1000).toFixed(1) + ' Rb';
  return num.toString();
}

// Memperbarui state aktif navigasi berdasarkan posisi scroll
export function initNavScroll() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  });
}
