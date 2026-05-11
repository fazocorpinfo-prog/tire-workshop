// Scroll animations + count-up
(function () {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visible');
      // count up
      e.target.querySelectorAll('.count[data-target]').forEach(animateCount);
      if (e.target.matches('.count[data-target]')) animateCount(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  function animateCount(el) {
    if (el.dataset.animated) return;
    el.dataset.animated = '1';
    const target = parseFloat(el.dataset.target);
    const dur = 1400;
    const start = performance.now();
    const isInt = Number.isInteger(target);
    function step(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = isInt ? Math.round(val).toLocaleString('en-US') : val.toFixed(1);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function observeAll() {
    document.querySelectorAll('.fade-up:not(.visible), .fade-in:not(.visible), .stagger:not(.visible), .count[data-target]:not([data-animated])').forEach(el => io.observe(el));
  }

  observeAll();
  window.__reobserve = observeAll;

  // Sticky nav
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const toggle = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    }));
  }
})();
