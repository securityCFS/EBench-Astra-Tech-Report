(() => {
  const toc = document.querySelector('.report-toc'),
    toggle = document.querySelector('.toc-toggle'),
    nav = document.querySelector('#report-toc-links');
  if (!toc || !toggle || !nav) return;
  const compact = matchMedia('(max-width:85rem)');
  const header = document.querySelector('.header');
  const fitHeader = () =>
    document.documentElement.style.setProperty(
      '--header-height',
      header.getBoundingClientRect().height + 'px',
    );
  new ResizeObserver(fitHeader).observe(header);
  compact.addEventListener('change', () => setOpen(!compact.matches));
  nav.addEventListener('click', (event) => {
    if (compact.matches && event.target.closest('a')) setOpen(false);
  });
  document.fonts.ready.then(fitHeader);
  const links = [...nav.querySelectorAll('a')],
    sections = links.map((a) => document.querySelector(a.hash)).filter(Boolean);
  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.hidden = !open;
    toc.inert = !open;
    document.body.dataset.tocOpen = String(open);
  }
  toggle.addEventListener('click', () => setOpen(nav.hidden));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nav.hidden && !document.querySelector('dialog[open]')) {
      setOpen(false);
      toggle.focus();
    }
  });
  let queued = false;
  function markCurrent() {
    queued = false;
    const threshold = document.querySelector('.header').getBoundingClientRect().bottom + 90;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) active = section;
      else break;
    }
    for (const link of [...links, ...document.querySelectorAll('.header nav a')]) {
      if (link.hash === '#' + active.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(markCurrent);
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', markCurrent);
  window.addEventListener('hashchange', markCurrent);
  setOpen(!compact.matches);
  fitHeader();
  markCurrent();
})();
