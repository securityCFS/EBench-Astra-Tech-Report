/* Shared, persistent selected pill. Selection remains owned by the caller. */
const reportSegmentedControls = new WeakMap();
function initSegmentedControl(
  el,
  selectedSelector = '[aria-pressed="true"]',
  { variant = 'pill', keyboard = true } = {},
) {
  if (!el) return null;
  const existing = reportSegmentedControls.get(el);
  if (existing) {
    existing.update();
    return existing;
  }
  el.classList.add('segmented-control');
  el.dataset.indicator = variant;
  if (!el.hasAttribute('role')) el.setAttribute('role', 'group');
  const indicator = document.createElement('span');
  indicator.className = 'segmented-control__indicator';
  indicator.setAttribute('aria-hidden', 'true');
  el.prepend(indicator);
  let frame = 0;
  let destroyed = false;
  const update = () => {
    if (destroyed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!el.isConnected) {
        destroy();
        return;
      }
      const selected = el.querySelector(selectedSelector);
      if (!selected || !selected.offsetWidth || !el.offsetWidth) return;
      indicator.style.width = `${selected.offsetWidth}px`;
      const underline = variant === 'underline';
      indicator.style.height = `${underline ? 2 : selected.offsetHeight}px`;
      indicator.style.transform = `translate(${selected.offsetLeft}px, ${selected.offsetTop + (underline ? selected.offsetHeight - 2 : 0)}px)`;
      if (!el.hasAttribute('data-segmented-ready')) {
        // Establish the first position without animating in from the origin.
        indicator.getBoundingClientRect();
        el.setAttribute('data-segmented-ready', '');
      }
    });
  };
  const resize = new ResizeObserver(update);
  resize.observe(el);
  el.querySelectorAll('button').forEach((button) => resize.observe(button));
  const mutations = new MutationObserver(update);
  mutations.observe(el, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'aria-selected'],
  });
  const onKeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...el.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
    buttons[next].click();
    buttons[next].focus();
  };
  if (keyboard) el.addEventListener('keydown', onKeydown);
  function destroy() {
    destroyed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    mutations.disconnect();
    el.removeEventListener('keydown', onKeydown);
    indicator.remove();
    el.removeAttribute('data-segmented-ready');
    reportSegmentedControls.delete(el);
  }
  const control = { update, destroy };
  reportSegmentedControls.set(el, control);
  document.fonts?.ready.then(update);
  update();
  return control;
}
