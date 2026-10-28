(() => {
  const toc = document.querySelector('.report-toc');
  const toggle = document.querySelector('.toc-toggle');
  const nav = document.querySelector('#report-toc-links');
  const header = document.querySelector('.header');
  const toolbar = document.querySelector('.contents-toolbar');
  if (!toc || !toggle || !nav || !header || !toolbar) return;

  const compact = matchMedia('(max-width: 85rem)');
  let open = !compact.matches;
  const fitHeader = () => {
    document.documentElement.style.setProperty(
      '--header-offset',
      `${header.getBoundingClientRect().height}px`,
    );
  };
  new ResizeObserver(fitHeader).observe(header);
  document.fonts.ready.then(fitHeader);

  function setOpen(next) {
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toc.inert = !open;
    toc.setAttribute('aria-hidden', String(!open));
    document.body.dataset.tocOpen = String(open);
    // Keep the links rendered so the drawer can animate; inert removes closed links
    // from keyboard navigation immediately, before visibility finishes transitioning.
  }

  toggle.addEventListener('click', () => setOpen(!open));
  compact.addEventListener('change', () => setOpen(!compact.matches));
  nav.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    // This anchor opens the shared source dialog, not a reading destination.
    if (link.hash === '#model-references') event.preventDefault();
    if (compact.matches) {
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
    // Ordinary anchors retain native history and use CSS smooth scrolling.
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open && !document.querySelector('dialog[open]')) {
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
  });

  const links = [...nav.querySelectorAll('a')];
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  let queued = false;
  function markCurrent() {
    queued = false;
    const threshold = header.getBoundingClientRect().bottom + toolbar.offsetHeight + 24;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) active = section;
      else break;
    }
    for (const link of [...links, ...header.querySelectorAll('nav a')]) {
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

  setOpen(open);
  fitHeader();
  document.body.dataset.tocReady = 'true';
  markCurrent();
})();
