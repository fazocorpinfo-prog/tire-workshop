// Theme switcher - persists in localStorage. Handles both .theme-btn and .a-theme-btn.
(function () {
  const KEY = 'tm-theme';
  const root = document.documentElement;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn, .a-theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.set === theme);
    });
    localStorage.setItem(KEY, theme);
  }

  const saved = localStorage.getItem(KEY) || 'light';
  apply(saved);

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.theme-btn, .a-theme-btn');
    if (!btn) return;
    apply(btn.dataset.set);
  });

  window.__applyTheme = apply;
})();
