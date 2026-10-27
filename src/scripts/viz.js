/* Interactive figure shared across the report: per-task bars of GPT-6-Astra against the field.
   It reads the same data files as the tables; nothing here changes a reported value. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const taskTitle = (task) => title(task);
  const fmtSR = (v) => (v * 100).toFixed(1) + '%';
  const fmtScore = (v) => v.toFixed(3);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- shared model registry (labels and colors come from charts.js) ---------- */
  const palette = () =>
    (typeof chartModels !== 'undefined' ? chartModels : []).map(([id, label, color]) => ({
      id,
      label,
      color,
    }));
  const ASTRA = 'Astra (ICL)';

  /* ---------- one floating tooltip for every figure ---------- */
  let tip;
  let tipContent;
  function tooltip() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.setAttribute('role', 'status');
    tip.hidden = true;
    document.body.append(tip);
    return tip;
  }
  function showTip(html, x, y) {
    const el = tooltip();
    const parent = document.querySelector('dialog[open]') || document.body;
    if (el.parentElement !== parent) parent.append(el);
    if (html !== tipContent) {
      el.innerHTML = html;
      // Measure after KaTeX replaces model names, not one frame before.
      if (typeof typesetModelNames === 'function') typesetModelNames(el);
      tipContent = html;
    }
    el.hidden = false;
    const pad = 14,
      w = el.offsetWidth,
      h = el.offsetHeight;
    let left = x + pad,
      top = y + pad;
    if (left + w > window.innerWidth - 8) left = x - w - pad;
    if (top + h > window.innerHeight - 8) top = y - h - pad;
    el.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  }
  function hideTip() {
    if (tip) tip.hidden = true;
  }
  function bindTips(root) {
    if (root.dataset?.tipsBound) return;
    if (root.dataset) root.dataset.tipsBound = 'true';
    root.addEventListener('pointermove', (e) => {
      const mark = e.target.closest('[data-tip]');
      if (!mark) {
        hideTip();
        return;
      }
      showTip(mark.dataset.tip, e.clientX, e.clientY);
    });
    root.addEventListener('pointerleave', hideTip);
    root.addEventListener('focusin', (e) => {
      const mark = e.target.closest('[data-tip]');
      if (!mark) return;
      const box = mark.getBoundingClientRect();
      showTip(mark.dataset.tip, box.left + box.width / 2, box.top + box.height / 2);
    });
    root.addEventListener('focusout', hideTip);
  }

  /* ---------- linked model focus: hovering a model anywhere highlights it everywhere ---------- */
  let focused = null;
  function setFocus(id) {
    focused = id;
    document.querySelectorAll('[data-viz-linked]').forEach((fig) => {
      fig.dataset.focus = id || '';
      fig
        .querySelectorAll('[data-model]')
        .forEach((el) => el.classList.toggle('is-dim', !!id && el.dataset.model !== id));
    });
  }
  document.addEventListener('pointerover', (e) => {
    const m = e.target.closest('[data-model]');
    if (m && m.closest('[data-viz-linked]')) setFocus(m.dataset.model);
  });
  document.addEventListener('focusin', (e) => {
    const m = e.target.closest('[data-model]');
    if (m?.closest('[data-viz-linked]')) setFocus(m.dataset.model);
  });
  document.addEventListener('focusout', () => setFocus(null));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTip();
  });
  document.addEventListener('close', hideTip, true);
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest('[data-model]') && !e.relatedTarget?.closest?.('[data-model]'))
      setFocus(null);
  });

  /* ---------- svg helpers ---------- */
  function el(name, attrs = {}, children = []) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs))
      if (v !== undefined && v !== null) node.setAttribute(k, v);
    for (const child of [].concat(children))
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return node;
  }
  function svgRoot(width, height, label) {
    return el('svg', {
      xmlns: NS,
      viewBox: `0 0 ${width} ${height}`,
      width: '100%',
      role: 'img',
      'aria-label': label,
      class: 'viz-svg',
      style: `max-width:${width}px`,
    });
  }
  /* =====================================================================================
    Astra versus the strongest other system, task by task (diverging bars).
    ===================================================================================== */
  function astraVersusField(host, { tasks, metric = 'sr', reference = 'best', order = 'gap' }) {
    const models = palette();
    const key = (m) => `${m.id}_${metric}`;
    const rows = tasks
      .map((t) => {
        const others = models
          .filter((m) => m.id !== ASTRA)
          .map((m) => ({ ...m, value: Number(t[key(m)]) }));
        const sorted = others.slice().sort((a, b) => b.value - a.value);
        const ref =
          reference === 'best'
            ? {
                ...sorted[0],
                label: sorted
                  .filter((m) => Math.abs(m.value - sorted[0].value) < 1e-9)
                  .map((m) => m.label)
                  .join(', '),
              }
            : reference === 'median'
              ? { label: 'median of others', value: sorted[Math.floor(sorted.length / 2)].value }
              : others.find((m) => m.id === reference);
        const astra = Number(t[key({ id: ASTRA })]);
        return { task: t, astra, ref, others: sorted, delta: astra - ref.value };
      })
      .sort((a, b) =>
        order === 'task'
          ? a.task.task.localeCompare(b.task.task)
          : b.delta - a.delta || b.astra - a.astra,
      );
    const width = Math.max(340, Math.min(1000, host.clientWidth || 760));
    const narrow = width < 560,
      labelW = narrow ? 128 : 200,
      rowH = narrow ? 24 : 27,
      top = 40;
    const height = top + rows.length * rowH + 30;
    const referenceLabel =
      reference === 'best'
        ? 'best other model'
        : reference === 'median'
          ? 'median of others'
          : models.find((m) => m.id === reference).label;
    const svg = svgRoot(width, height, `GPT-6-Astra minus ${referenceLabel}, per task`);
    const plotL = labelW + 8,
      plotR = width - 60,
      mid = (plotL + plotR) / 2,
      half = (plotR - plotL) / 2;
    const scale = (d) => mid + d * half;
    for (const tickVal of narrow ? [-1, -0.5, 0, 0.5, 1] : [-1, -0.5, 0, 0.5, 1]) {
      const x = scale(tickVal),
        labelled = !narrow || tickVal === 0 || Math.abs(tickVal) === 1;
      svg.append(
        el('line', {
          x1: x,
          x2: x,
          y1: top - 8,
          y2: height - 22,
          class: tickVal === 0 ? 'viz-zero' : 'viz-grid',
        }),
      );
      if (labelled)
        svg.append(
          el(
            'text',
            { x, y: top - 14, 'text-anchor': 'middle', class: 'viz-axis' },
            metric === 'sr'
              ? `${tickVal > 0 ? '+' : ''}${tickVal * 100}${narrow ? '' : ' pp'}`
              : `${tickVal > 0 ? '+' : ''}${tickVal.toFixed(1)}`,
          ),
        );
    }
    svg.append(
      el('text', { x: plotL, y: height - 6, class: 'viz-axis-note' }, '← Comparator ahead'),
    );
    svg.append(
      el(
        'text',
        { x: plotR, y: height - 6, 'text-anchor': 'end', class: 'viz-axis-note' },
        'GPT-6-Astra ahead →',
      ),
    );
    rows.forEach((r, i) => {
      const y = top + i * rowH + rowH / 2,
        w = Math.abs(r.delta) * half,
        positive = r.delta > 0,
        zero = Math.abs(r.delta) < 1e-9;
      const fmt = (v) => (metric === 'sr' ? fmtSR(v) : fmtScore(v));
      const values = [{ label: 'GPT-6-Astra', value: r.astra, id: ASTRA }, ...r.others];
      const list = values
        .map(
          (model) =>
            `<div class="viz-tip-row${model.id === ASTRA ? ' is-highlighted' : ''}"><dt>${esc(model.label)}</dt><dd>${fmt(model.value)}</dd></div>`,
        )
        .join('');
      const delta = `${r.delta > 0 ? '+' : ''}${metric === 'sr' ? (r.delta * 100).toFixed(1) + ' pp' : r.delta.toFixed(3)}`;
      const g = el('g', {
        class: `viz-diverge ${positive ? 'is-pos' : zero ? 'is-zero' : 'is-neg'}`,
        tabindex: 0,
        'data-task': r.task.task,
        'data-task-video': r.task.task,
        role: 'button',
        'aria-label': `${taskTitle(r.task.task)}: open the selected episode`,
        'data-tip': `<b>${esc(taskTitle(r.task.task))}</b><span class="viz-tip-metric">${metric === 'sr' ? 'Success rate' : 'Score'}</span><dl class="viz-tip-values">${list}</dl><div class="viz-tip-delta"><span>Δ vs. ${esc(r.ref.label)}</span><strong>${delta}</strong></div>`,
      });
      g.append(
        el('rect', {
          x: plotL - 4,
          y: y - rowH / 2,
          width: plotR - plotL + 64,
          height: rowH,
          class: 'viz-rowhit',
        }),
      );
      g.append(
        el(
          'text',
          { x: labelW, y: y + 4, 'text-anchor': 'end', class: 'viz-label' },
          narrow && taskTitle(r.task.task).length > 18
            ? taskTitle(r.task.task).slice(0, 17) + '…'
            : taskTitle(r.task.task),
        ),
      );
      if (zero) g.append(el('circle', { cx: mid, cy: y, r: 3.5, class: 'viz-tie' }));
      else
        g.append(
          el('rect', {
            x: positive ? mid : mid - w,
            y: y - 8,
            width: Math.max(w, 1),
            height: 16,
            rx: 4,
            class: 'viz-bar',
          }),
        );
      g.append(
        el(
          'text',
          { x: width - 8, y: y + 4, 'text-anchor': 'end', class: 'viz-value' },
          metric === 'sr'
            ? `${r.delta > 0 ? '+' : ''}${(r.delta * 100).toFixed(1)}`
            : `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(3)}`,
        ),
      );
      svg.append(g);
    });
    host.replaceChildren(svg);
    return rows;
  }

  /* ---------- small widgets ---------- */
  function readingProgress() {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.append(bar);
    let queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    addEventListener(
      'scroll',
      () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    addEventListener('resize', update);
    update();
  }
  function sectionAnchors() {
    document.querySelectorAll('main section[id] h2').forEach((h) => {
      const section = h.closest('section');
      if (!section || h.querySelector('.anchor-link')) return;
      const a = document.createElement('a');
      a.className = 'anchor-link';
      a.href = '#' + section.id;
      a.setAttribute('aria-label', 'Link to this section');
      a.textContent = '#';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        history.replaceState(null, '', '#' + section.id);
        section.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
      h.append(a);
    });
  }
  function resizeRedraw(host, draw) {
    let last = host.clientWidth;
    const ro = new ResizeObserver(() => {
      if (!host.isConnected) {
        ro.disconnect();
        return;
      }
      if (Math.abs(host.clientWidth - last) > 24) {
        last = host.clientWidth;
        draw();
      }
    });
    ro.observe(host);
  }

  window.viz = {
    esc,
    taskTitle,
    fmtSR,
    fmtScore,
    bindTips,
    hideTip,
    setFocus,
    astraVersusField,
    readingProgress,
    sectionAnchors,
    resizeRedraw,
    ASTRA,
  };
})();
