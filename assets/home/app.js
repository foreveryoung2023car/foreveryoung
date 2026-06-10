// ====== Search bar interactions ======
  (function () {

  const lazyBackgrounds = document.querySelectorAll('[data-bg^="assets/home/images/"]:not(.hero-bg)');
  const loadBackground = (element) => {
    const image = 'url("' + element.dataset.bg + '")';
    element.style.backgroundImage = element.classList.contains('section-theme')
      ? 'linear-gradient(135deg, rgba(13,32,80,0.6), rgba(13,32,80,0.2)), ' + image
      : image;
    element.removeAttribute('data-bg');
  };
  const loadHeroBackground = (index) => {
    const background = document.querySelectorAll('.hero-bg')[index];
    if (background?.dataset.bg) loadBackground(background);
  };
  if ('IntersectionObserver' in window) {
    const backgroundObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadBackground(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '400px 0px' });
    lazyBackgrounds.forEach((element) => backgroundObserver.observe(element));
  } else {
    lazyBackgrounds.forEach(loadBackground);
  }

    const cells = document.querySelectorAll('.search-cell');
    cells.forEach(cell => {
      const text = cell.querySelector('.search-cell-text');
      const ic = cell.querySelector('.ic');
      [text, ic].forEach(el => el && el.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = cell.classList.contains('open');
        cells.forEach(c => c.classList.remove('open'));
        if (!wasOpen) cell.classList.add('open');
      }));
      cell.querySelectorAll('.search-cell-option').forEach(opt => {
        opt.addEventListener('click', e => {
          e.stopPropagation();
          const key = cell.dataset.key;
          const val = opt.dataset.val;
          const target = document.getElementById('val-' + key);
          if (target) target.textContent = val;
          cell.classList.remove('open');
        });
      });
    });
    document.addEventListener('click', () => cells.forEach(c => c.classList.remove('open')));
    // Date range
    const rngDate = document.getElementById('rng-date');
    rngDate && rngDate.addEventListener('input', e => {
      const v = e.target.value;
      document.getElementById('rng-date-val').textContent = v + ' 天';
      document.getElementById('val-date').textContent = '0 Days - ' + v + ' Days';
    });
    // Date range (re-bound for v2 wording)
    rngDate && rngDate.addEventListener('input', e => {
      const v = e.target.value;
      document.getElementById('val-date').textContent = v + ' 天 ' + Math.max(0, v-1) + ' 夜';
    });
    // Pax range
    const rngPax = document.getElementById('rng-pax');
    rngPax && rngPax.addEventListener('input', e => {
      const v = e.target.value;
      document.getElementById('rng-pax-val').textContent = v + ' 大人';
      document.getElementById('val-pax').textContent = v + ' 大人 0 兒童';
    });
    // Itinerary tabs
    document.querySelectorAll('.itin-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.itin-tab').forEach(x => x.classList.remove('on'));
        t.classList.add('on');
      });
    });
    // Services horizontal scroll arrows
    const svcGrid = document.getElementById('svcGrid');
    document.querySelectorAll('.svc-arr').forEach(b => {
      b.addEventListener('click', () => {
        if (!svcGrid) return;
        const card = svcGrid.querySelector('.svc');
        const step = (card ? card.offsetWidth + 18 : 280) * 1.5;
        svcGrid.scrollBy({ left: step * Number(b.dataset.dir), behavior: 'smooth' });
      });
    });
    // Fleet horizontal scroll arrows
    const fleetTrack = document.getElementById('fleetTrack');
    document.querySelectorAll('.fleet-arr').forEach(b => {
      b.addEventListener('click', () => {
        if (!fleetTrack) return;
        const card = fleetTrack.querySelector('.fleet-card');
        const step = (card ? card.offsetWidth + 22 : 340);
        fleetTrack.scrollBy({ left: step * Number(b.dataset.dir), behavior: 'smooth' });
      });
    });
    // Dest cards horizontal scroll
    const destCards = document.getElementById('destCards');
    document.querySelectorAll('.dest-arrows .a, .dest-arrows-inline .a').forEach(b => {
      b.addEventListener('click', () => {
        if (!destCards) return;
        const card = destCards.querySelector('.dest-card');
        const step = (card ? card.offsetWidth + 24 : 320);
        destCards.scrollBy({ left: step * Number(b.dataset.dir || 1), behavior: 'smooth' });
      });
    });

    // Hero auto-play (5s, pause on hover)
    let heroTimer;
    function startHeroAuto() {
      clearInterval(heroTimer);
      heroTimer = setInterval(() => goHero(curIdx + 1), 5000);
    }
    const heroEl = document.querySelector('.hero-v3');
    if (heroEl && typeof goHero === 'function') {
      startHeroAuto();
      heroEl.addEventListener('mouseenter', () => clearInterval(heroTimer));
      heroEl.addEventListener('mouseleave', startHeroAuto);
    }
    // Back to top
    const bt = document.getElementById('backToTop');
    bt && bt.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({top: 0, behavior: 'smooth'});
    });
    // Promo code copy
    const pcBtn = document.querySelector('.pc-btn');
    pcBtn && pcBtn.addEventListener('click', () => {
      const code = 'JAPAN2025';
      navigator.clipboard && navigator.clipboard.writeText(code);
      const orig = pcBtn.innerHTML;
      pcBtn.innerHTML = '<i class="fa-solid fa-check"></i>已複製';
      setTimeout(() => pcBtn.innerHTML = orig, 1600);
    });

    // ====== v3: Hero carousel ======
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dots .hd');
    const subEl = document.getElementById('heroSub');
    const titleEl = document.getElementById('heroTitle');
    let curIdx = 0;
    function goHero(i) {
      curIdx = (i + slides.length) % slides.length;
      loadHeroBackground(curIdx);
      slides.forEach((s, k) => s.classList.toggle('is-active', k === curIdx));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === curIdx));
      const slide = slides[curIdx];
      if (subEl) subEl.textContent = slide.dataset.sub;
      if (titleEl) titleEl.textContent = slide.dataset.title;
    }
    dots.forEach(d => d.addEventListener('click', () => goHero(+d.dataset.i)));
    setTimeout(() => loadHeroBackground(1), 2500);
    document.querySelectorAll('.hero-arrows .a').forEach(a => {
      a.addEventListener('click', () => goHero(curIdx + Number(a.dataset.dir || 1)));
    });

    // ====== v3: Scroll reveal ======
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('rv-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('section').forEach(s => {
      s.classList.add('rv');
      io.observe(s);
    });

    // ====== v3: Sticky quick-quote on scroll past hero ======
    const stickyCta = document.getElementById('stickyQuote');
    if (stickyCta) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        stickyCta.classList.toggle('on', y > 700);
      }, { passive: true });
    }
  })();
