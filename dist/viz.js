/* Interactive figures shared across the report: dot-strip profiles, per-task outcome rows,
   Astra-versus-field bars, perturbation slopes, paired-ICL dumbbells and execution timing.
   Every figure reads the same data files as the tables; nothing here changes a reported value. */
(() => {
 const NS = 'http://www.w3.org/2000/svg';
 const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const taskTitle = task => task.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
 const fmtSR = v => (v * 100).toFixed(2) + '%';
 const fmtScore = v => v.toFixed(4);
 const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

 /* ---------- shared model registry (labels and colors come from charts.js) ---------- */
 const palette = () => (typeof chartModels !== 'undefined' ? chartModels : []).map(([id, label, color]) => ({id, label, color}));
 const modelOf = id => palette().find(m => m.id === id) || {id, label: id, color: '#9aa8bd'};
 const ASTRA = 'Astra (ICL)';

 /* ---------- one floating tooltip for every figure ---------- */
 let tip;
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
  el.innerHTML = html;
  el.hidden = false;
  const pad = 14, w = el.offsetWidth, h = el.offsetHeight;
  let left = x + pad, top = y + pad;
  if (left + w > window.innerWidth - 8) left = x - w - pad;
  if (top + h > window.innerHeight - 8) top = y - h - pad;
  el.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
 }
 function hideTip() { if (tip) tip.hidden = true; }
 function bindTips(root) {
  if (root.dataset?.tipsBound) return;
  if (root.dataset) root.dataset.tipsBound = 'true';
  root.addEventListener('pointermove', e => {
   const mark = e.target.closest('[data-tip]');
   if (!mark) { hideTip(); return; }
   showTip(mark.dataset.tip, e.clientX, e.clientY);
  });
  root.addEventListener('pointerleave', hideTip);
  root.addEventListener('focusin', e => {
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
  if (focused === id) return;
  focused = id;
  document.querySelectorAll('[data-viz-linked]').forEach(fig => {
   fig.dataset.focus = id || '';
   fig.querySelectorAll('[data-model]').forEach(el => el.classList.toggle('is-dim', !!id && el.dataset.model !== id));
  });
 }
 document.addEventListener('pointerover', e => { const m = e.target.closest('[data-model]'); if (m && m.closest('[data-viz-linked]')) setFocus(m.dataset.model); });
 document.addEventListener('pointerout', e => { if (e.target.closest('[data-model]') && !e.relatedTarget?.closest?.('[data-model]')) setFocus(null); });

 /* ---------- statistics helpers ---------- */
 function wilson(p, n, z = 1.96) {
  const denom = 1 + z * z / n, centre = (p + z * z / (2 * n)) / denom;
  const half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
 }

 /* ---------- svg helpers ---------- */
 function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, v);
  for (const child of [].concat(children)) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
 }
 function svgRoot(width, height, label) {
  return el('svg', {xmlns: NS, viewBox: `0 0 ${width} ${height}`, width: '100%', role: 'img', 'aria-label': label, class: 'viz-svg', style: `max-width:${width}px`});
 }
 function axisTicks(svg, x0, x1, y0, y1, metric, count = 4) {
  for (let i = 0; i <= count; i++) {
   const x = x0 + (x1 - x0) * i / count;
   svg.append(el('line', {x1: x, x2: x, y1: y0, y2: y1, class: 'viz-grid'}));
   svg.append(el('text', {x, y: y0 - 8, 'text-anchor': 'middle', class: 'viz-axis'}, metric === 'sr' ? String(i * 100 / count) : (i / count).toFixed(2)));
  }
 }
 function modelLabelNode(label, x, y, cls = 'viz-label') {
  if (typeof chartModelLabel === 'function' && /π/.test(label)) {
   const wrap = el('foreignObject', {x: 0, y: y - 12, width: x - 10, height: 22});
   const div = document.createElement('div');
   div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
   div.className = 'chart-model-math viz-math';
   div.innerHTML = modelMathHTML(label);
   wrap.append(div);
   return wrap;
  }
  return el('text', {x: x - 10, y, 'text-anchor': 'end', class: cls}, label);
 }

 /* =====================================================================================
    1. Dot-strip capability profile: every system on one line per task group.
    ===================================================================================== */
 function dotStrip(host, {groups, metric = 'sr', highlight = [ASTRA, 'OpenWAM-Alpha'], title}) {
  const models = palette();
  const width = Math.max(320, Math.min(760, host.clientWidth || 640));
  const left = 14, right = 30, rowH = 82, top = 30;
  const height = top + groups.length * rowH + 4;
  const svg = svgRoot(width, height, title);
  const x0 = left, x1 = width - right, scale = v => x0 + (x1 - x0) * v;
  axisTicks(svg, x0, x1, top - 6, height - 4, metric);
  groups.forEach((group, gi) => {
   const yTitle = top + gi * rowH + 18, y = top + gi * rowH + 52;
   const values = models.map(m => ({...m, value: group.values[m.id]})).filter(m => m.value !== undefined);
   const sorted = [...values].sort((a, b) => b.value - a.value);
   const best = sorted[0], worst = sorted[sorted.length - 1];
   const titleNode = el('text', {x: x0, y: yTitle, class: 'viz-row-title'}, group.label);
   titleNode.append(el('tspan', {class: 'viz-row-sub', dx: 8}, group.sub || ''));
   svg.append(titleNode);
   svg.append(el('line', {x1: scale(worst.value), x2: scale(best.value), y1: y, y2: y, class: 'viz-range'}));
   /* stack dots that would overlap: walk from the lowest value and alternate above/below the line */
   const placed = [];
   const byValue = [...sorted].reverse();
   for (const m of byValue) {
    const cx = scale(m.value);
    const clashes = placed.filter(q => Math.abs(q.cx - cx) < 13);
    let cy = y;
    if (clashes.length) { const level = Math.ceil(clashes.length / 2), sign = clashes.length % 2 ? -1 : 1; cy = y + sign * level * 12; }
    placed.push({cx, cy});
    const isAstra = m.id === ASTRA, rank = sorted.indexOf(m) + 1, strong = highlight.includes(m.id);
    const g = el('g', {class: `viz-dot ${strong ? 'is-strong' : ''} ${isAstra ? 'is-astra' : ''}`, 'data-model': m.id, tabindex: 0,
     'data-tip': `<b>${esc(m.label)}</b><span>${group.label}</span><em>${metric === 'sr' ? fmtSR(m.value) : fmtScore(m.value)}</em><small>rank ${rank} of ${sorted.length}${rank === 1 ? ' · best' : ''}</small>`});
    if (cy !== y) g.append(el('line', {x1: cx, x2: cx, y1: y, y2: cy, class: 'viz-stem'}));
    g.append(el('circle', {cx, cy, r: isAstra ? 8 : strong ? 6.5 : 5, fill: m.color, stroke: '#fff', 'stroke-width': isAstra ? 2 : 1.5}));
    if (rank === 1) g.append(el('circle', {cx, cy, r: 11.5, class: 'viz-best-ring'}));
    m.cx = cx; m.cy = cy;
    svg.append(g);
   }
   const astra = values.find(m => m.id === ASTRA);
   if (astra) {
    const label = metric === 'sr' ? fmtSR(astra.value) : fmtScore(astra.value);
    const above = astra.cy <= y;
    svg.append(el('text', {x: astra.cx, y: astra.cy + (above ? -16 : 22), 'text-anchor': 'middle', class: 'viz-astra-label'}, label));
   }
  });
  host.replaceChildren(svg);
 }

 /* =====================================================================================
    2. Per-task outcome rows: one square per episode, sorted and filterable.
    ===================================================================================== */
 function outcomeRows(host, {episodes, tasks, order = 'success', group = 'all', filter = null, onTask}) {
  const classes = [
   {id: 'success', name: 'Complete success', test: e => e.sr === 1},
   {id: 'partial', name: 'Incomplete · positive score', test: e => e.sr === 0 && e.score > 0},
   {id: 'zero', name: 'Incomplete · zero score', test: e => e.sr === 0 && e.score === 0}
  ];
  const kind = e => classes.find(c => c.test(e)).id;
  const byTask = new Map();
  for (const e of episodes) { if (!byTask.has(e.task)) byTask.set(e.task, []); byTask.get(e.task).push(e); }
  let rows = tasks.filter(t => typeof matchesTaskGroup !== 'function' || matchesTaskGroup(t, group)).map(t => {
   const list = (byTask.get(t.task) || []).slice().sort((a, b) => a.seed.localeCompare(b.seed));
   const counts = {success: 0, partial: 0, zero: 0};
   list.forEach(e => counts[kind(e)]++);
   return {task: t, list, counts};
  });
  const sorters = {
   success: (a, b) => b.counts.success - a.counts.success || a.counts.zero - b.counts.zero || a.task.task.localeCompare(b.task.task),
   zero: (a, b) => b.counts.zero - a.counts.zero || a.task.task.localeCompare(b.task.task),
   task: (a, b) => a.task.task.localeCompare(b.task.task)
  };
  rows.sort(sorters[order] || sorters.success);
  const attr = t => `${t.mobility === 'Mobile' ? 'Mobile' : 'Tabletop'} · ${t.precision.toLowerCase()} precision · ${t.horizon === 'Long Horizon' ? 'long' : 'short'} horizon`;
  host.innerHTML = rows.map(({task, list, counts}) => `
   <div class="outcome-row" data-task="${esc(task.task)}" data-filter="${filter || ''}">
    <button class="outcome-task" data-task-video="${esc(task.task)}" title="Watch the selected ${esc(taskTitle(task.task))} episode"><strong>${esc(taskTitle(task.task))}</strong><span>${esc(attr(task))}</span></button>
    <div class="outcome-cells" role="img" aria-label="${esc(taskTitle(task.task))}: ${counts.success} successes, ${counts.partial} incomplete with positive score, ${counts.zero} zero-score, of ${list.length} episodes">
     ${list.map(e => `<i class="cell is-${kind(e)}${filter && kind(e) !== filter ? ' is-muted' : ''}" data-tip="<b>${esc(taskTitle(e.task))} / ${esc(e.seed)}</b><em>${e.sr ? 'Success' : 'Incomplete'}</em><span>Score ${e.score.toFixed(2)}</span>"></i>`).join('')}
    </div>
    <div class="outcome-counts"><b class="c-success">${counts.success}</b><b class="c-partial">${counts.partial}</b><b class="c-zero">${counts.zero}</b><small>/ ${list.length}</small></div>
   </div>`).join('') || '<p class="fineprint">No tasks match this filter.</p>';
  return rows;
 }

 /* =====================================================================================
    3. Astra versus the strongest other system, task by task (diverging bars).
    ===================================================================================== */
 function astraVersusField(host, {tasks, metric = 'sr', reference = 'best'}) {
  const models = palette();
  const key = m => `${m.id}_${metric}`;
  const rows = tasks.map(t => {
   const others = models.filter(m => m.id !== ASTRA).map(m => ({...m, value: Number(t[key(m)])}));
   const sorted = others.slice().sort((a, b) => b.value - a.value);
   const ref = reference === 'best' ? sorted[0] : {label: 'median of others', value: sorted[Math.floor(sorted.length / 2)].value};
   const astra = Number(t[key({id: ASTRA})]);
   return {task: t, astra, ref, others: sorted, delta: astra - ref.value};
  }).sort((a, b) => b.delta - a.delta || b.astra - a.astra);
  const width = Math.max(340, Math.min(1000, host.clientWidth || 760));
  const narrow = width < 560, labelW = narrow ? 128 : 200, rowH = narrow ? 24 : 27, top = 40;
  const height = top + rows.length * rowH + 30;
  const svg = svgRoot(width, height, `GPT-6-Astra minus the ${reference === 'best' ? 'best other system' : 'median other system'}, per task`);
  const plotL = labelW + 8, plotR = width - 60, mid = (plotL + plotR) / 2, half = (plotR - plotL) / 2;
  const scale = d => mid + d * half;
  for (const tickVal of (narrow ? [-1, -0.5, 0, 0.5, 1] : [-1, -0.5, 0, 0.5, 1])) {
   const x = scale(tickVal), labelled = !narrow || tickVal === 0 || Math.abs(tickVal) === 1;
   svg.append(el('line', {x1: x, x2: x, y1: top - 8, y2: height - 22, class: tickVal === 0 ? 'viz-zero' : 'viz-grid'}));
   if (labelled) svg.append(el('text', {x, y: top - 14, 'text-anchor': 'middle', class: 'viz-axis'}, metric === 'sr' ? `${tickVal > 0 ? '+' : ''}${tickVal * 100}${narrow ? '' : ' pp'}` : `${tickVal > 0 ? '+' : ''}${tickVal.toFixed(1)}`));
  }
  svg.append(el('text', {x: plotL, y: height - 6, class: 'viz-axis-note'}, `← ${reference === 'best' ? 'best other system' : 'median other'} ahead`));
  svg.append(el('text', {x: plotR, y: height - 6, 'text-anchor': 'end', class: 'viz-axis-note'}, 'GPT-6-Astra ahead →'));
  rows.forEach((r, i) => {
   const y = top + i * rowH + rowH / 2, w = Math.abs(r.delta) * half, positive = r.delta > 0, zero = Math.abs(r.delta) < 1e-9;
   const fmt = v => metric === 'sr' ? fmtSR(v) : fmtScore(v);
   const list = r.others.map(o => `${esc(o.label)} ${fmt(o.value)}`).join('<br>');
   const g = el('g', {class: `viz-diverge ${positive ? 'is-pos' : zero ? 'is-zero' : 'is-neg'}`, tabindex: 0, 'data-task': r.task.task, 'data-task-video': r.task.task, role: 'button', 'aria-label': `${taskTitle(r.task.task)}: open the selected episode`,
    'data-tip': `<b>${esc(taskTitle(r.task.task))}</b><em>GPT-6-Astra ${fmt(r.astra)} · ${esc(r.ref.label)} ${fmt(r.ref.value)}</em><span>Δ ${metric === 'sr' ? (r.delta * 100).toFixed(1) + ' pp' : r.delta.toFixed(4)}</span><small>${list}</small>`});
   g.append(el('rect', {x: plotL - 4, y: y - rowH / 2, width: plotR - plotL + 64, height: rowH, class: 'viz-rowhit'}));
   g.append(el('text', {x: labelW, y: y + 4, 'text-anchor': 'end', class: 'viz-label'}, narrow && taskTitle(r.task.task).length > 18 ? taskTitle(r.task.task).slice(0, 17) + '…' : taskTitle(r.task.task)));
   if (zero) g.append(el('circle', {cx: mid, cy: y, r: 3.5, class: 'viz-tie'}));
   else g.append(el('rect', {x: positive ? mid : mid - w, y: y - 8, width: Math.max(w, 1), height: 16, rx: 4, class: 'viz-bar'}));
   g.append(el('text', {x: positive ? mid + w + 6 : zero ? mid + 10 : mid - w - 6, y: y + 4, 'text-anchor': positive || zero ? 'start' : 'end', class: 'viz-value'}, metric === 'sr' ? `${r.delta > 0 ? '+' : ''}${Math.round(r.delta * 100)}` : `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(2)}`));
   svg.append(g);
  });
  host.replaceChildren(svg);
  return rows;
 }

 /* =====================================================================================
    4. Perturbation slope chart: four controlled conditions, eight systems.
    ===================================================================================== */
 function perturbationSlopes(host, {models, metric = 'sr', highlight = [ASTRA, 'OpenWAM-Alpha']}) {
  const conditions = [['object', 'Object'], ['background', 'Background'], ['instruction', 'Instruction'], ['mix', 'Mixed']];
  const width = Math.max(320, Math.min(760, host.clientWidth || 640));
  const narrow = width < 520, left = 48, right = narrow ? 84 : 150, top = 30, bottom = 34;
  const height = narrow ? 300 : 340;
  const svg = svgRoot(width, height, 'Success rate across the four perturbation conditions');
  const x = i => left + (width - left - right) * i / (conditions.length - 1);
  const domain = metric === 'sr' ? [0.15, 0.7] : [0.25, 0.8];
  const y = v => top + (height - top - bottom) * (1 - (v - domain[0]) / (domain[1] - domain[0]));
  for (let v = domain[0]; v <= domain[1] + 1e-9; v += 0.1) {
   svg.append(el('line', {x1: left, x2: width - right, y1: y(v), y2: y(v), class: 'viz-grid'}));
   svg.append(el('text', {x: left - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'viz-axis'}, metric === 'sr' ? Math.round(v * 100) : v.toFixed(1)));
  }
  conditions.forEach(([, label], i) => svg.append(el('text', {x: x(i), y: height - 10, 'text-anchor': 'middle', class: 'viz-axis'}, label)));
  const series = models.map(m => ({...modelOf(m.id), points: conditions.map(([key], i) => ({x: x(i), y: y(m.generalization[key][metric]), value: m.generalization[key][metric], key}))}));
  const labelY = new Map();
  const wanted = series.filter(s => highlight.includes(s.id) || !narrow).map(s => ({id: s.id, y: s.points[s.points.length - 1].y})).sort((a, b) => a.y - b.y);
  for (let i = 0; i < wanted.length; i++) { if (i && wanted[i].y < wanted[i - 1].y + 13) wanted[i].y = wanted[i - 1].y + 13; labelY.set(wanted[i].id, wanted[i].y); }
  const draw = (s, strong) => {
   const g = el('g', {class: `viz-slope ${strong ? 'is-strong' : ''} ${s.id === ASTRA ? 'is-astra' : ''}`, 'data-model': s.id, tabindex: 0,
    'data-tip': `<b>${esc(s.label)}</b>${s.points.map(p => `<span>${conditions.find(c => c[0] === p.key)[1]} · ${metric === 'sr' ? fmtSR(p.value) : fmtScore(p.value)}</span>`).join('')}<small>range ${metric === 'sr' ? ((Math.max(...s.points.map(p => p.value)) - Math.min(...s.points.map(p => p.value))) * 100).toFixed(1) + ' pp' : (Math.max(...s.points.map(p => p.value)) - Math.min(...s.points.map(p => p.value))).toFixed(3)}</small>`});
   g.append(el('path', {d: s.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '), stroke: s.color, class: 'viz-slope-line'}));
   s.points.forEach(p => g.append(el('circle', {cx: p.x, cy: p.y, r: strong ? 4.5 : 3, fill: s.color, stroke: '#fff', 'stroke-width': 1.5})));
   if (labelY.has(s.id)) {
    const last = s.points[s.points.length - 1];
    g.append(el('text', {x: last.x + 10, y: labelY.get(s.id) + 4, class: 'viz-slope-label'}, narrow ? s.label.replace('GPT-6-Astra · ICL', 'Astra') : s.label));
   }
   svg.append(g);
  };
  series.filter(s => !highlight.includes(s.id)).forEach(s => draw(s, false));
  series.filter(s => highlight.includes(s.id)).forEach(s => draw(s, true));
  host.replaceChildren(svg);
 }

 /* =====================================================================================
    5. Paired ICL dumbbells: zero-shot → single-shot ICL, seed by seed.
    ===================================================================================== */
 function pairedDumbbells(host, {pairs, compact = false}) {
  const width = Math.max(300, Math.min(720, host.clientWidth || 600));
  const left = compact ? 118 : 206, right = 92, rowH = compact ? 28 : 32, top = 30;
  const height = top + pairs.length * rowH + 10;
  const svg = svgRoot(width, height, 'Paired zero-shot and single-shot ICL scores by seed');
  const x = v => left + (width - left - right) * v;
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
   svg.append(el('line', {x1: x(v), x2: x(v), y1: top - 6, y2: height - 6, class: 'viz-grid'}));
   svg.append(el('text', {x: x(v), y: top - 12, 'text-anchor': 'middle', class: 'viz-axis'}, v.toFixed(2)));
  });
  pairs.forEach((p, i) => {
   const y = top + i * rowH + rowH / 2, up = p.delta_score > 1e-9, down = p.delta_score < -1e-9;
   const g = el('g', {class: `viz-pair ${up ? 'is-up' : down ? 'is-down' : 'is-tie'}`, tabindex: 0,
    'data-tip': `<b>${esc(taskTitle(p.task))} / ${esc(p.seed)}</b><span>Zero-shot: Score ${p.zero_shot_score.toFixed(4)} · SR ${p.zero_shot_sr}</span><span>Single-shot ICL: Score ${p.icl_score.toFixed(4)} · SR ${p.icl_sr}</span><em>Δ Score ${p.delta_score > 0 ? '+' : ''}${p.delta_score.toFixed(4)}</em>`});
   g.append(el('text', {x: left - 10, y: y + 4, 'text-anchor': 'end', class: 'viz-label'}, `${compact ? taskTitle(p.task).split(' ')[0] : taskTitle(p.task)} · ${p.seed}`));
   g.append(el('line', {x1: x(p.zero_shot_score), x2: x(p.icl_score), y1: y, y2: y, class: 'viz-pair-line'}));
   g.append(el('circle', {cx: x(p.zero_shot_score), cy: y, r: 5.5, class: 'viz-pair-zero'}));
   g.append(el('circle', {cx: x(p.icl_score), cy: y, r: 5.5, class: 'viz-pair-icl'}));
   if (p.icl_sr === 1) g.append(el('text', {x: x(p.icl_score) + 10, y: y + 4, class: 'viz-pair-success'}, '✓ success'));
   svg.append(g);
  });
  host.replaceChildren(svg);
 }

 /* =====================================================================================
    6. Execution timing: simulated versus wall-clock seconds on a log axis.
    ===================================================================================== */
 function timingBars(host, {episodes}) {
  const width = Math.max(320, Math.min(760, host.clientWidth || 640));
  const left = width < 520 ? 120 : 190, right = 70, rowH = 52, top = 34;
  const height = top + episodes.length * rowH + 12;
  const svg = svgRoot(width, height, 'Simulated seconds versus policy wall-clock seconds for three episodes');
  const lo = Math.log10(10), hi = Math.log10(10000);
  const x = v => left + (width - left - right) * (Math.log10(v) - lo) / (hi - lo);
  [10, 100, 1000, 10000].forEach(v => {
   svg.append(el('line', {x1: x(v), x2: x(v), y1: top - 6, y2: height - 8, class: 'viz-grid'}));
   svg.append(el('text', {x: x(v), y: top - 12, 'text-anchor': 'middle', class: 'viz-axis'}, v >= 1000 ? `${v / 1000}k s` : `${v} s`));
  });
  episodes.forEach((e, i) => {
   const y = top + i * rowH, name = taskTitle(e.episode.replace(/_\d+$/, '')) + ' · ' + e.episode.slice(-3);
   svg.append(el('text', {x: left - 12, y: y + 22, 'text-anchor': 'end', class: 'viz-label'}, name));
   const sim = el('g', {tabindex: 0, 'data-tip': `<b>${esc(name)}</b><span>${e.policy_physics_steps.toLocaleString()} physics steps at 30 Hz</span><em>${e.simulated_execution_s.toFixed(2)} s simulated</em>`});
   sim.append(el('rect', {x: left, y: y + 6, width: x(e.simulated_execution_s) - left, height: 12, rx: 3, class: 'viz-time-sim'}));
   sim.append(el('text', {x: x(e.simulated_execution_s) + 6, y: y + 16, class: 'viz-value'}, `${e.simulated_execution_s.toFixed(1)} s sim`));
   const wall = el('g', {tabindex: 0, 'data-tip': `<b>${esc(name)}</b><span>Policy wall time includes model and execution system</span><em>${e.policy_elapsed_s.toFixed(0)} s wall · ${e.wall_to_sim_ratio.toFixed(1)}× simulated</em>`});
   wall.append(el('rect', {x: left, y: y + 22, width: x(e.policy_elapsed_s) - left, height: 12, rx: 3, class: 'viz-time-wall'}));
   wall.append(el('text', {x: x(e.policy_elapsed_s) + 6, y: y + 32, class: 'viz-value'}, `${Math.round(e.policy_elapsed_s)} s wall · ${e.wall_to_sim_ratio.toFixed(0)}×`));
   svg.append(sim, wall);
  });
  host.replaceChildren(svg);
 }

 /* ---------- small widgets ---------- */
 function countUp(node, value, {decimals = 2, suffix = '', duration = 1100} = {}) {
  if (reduceMotion.matches) { node.textContent = value.toFixed(decimals) + suffix; return; }
  const start = performance.now();
  const step = now => {
   const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
   node.textContent = (value * eased).toFixed(decimals) + suffix;
   if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
 }
 function revealOnScroll(selector = '.viz-reveal') {
  if (reduceMotion.matches || !('IntersectionObserver' in window)) { document.querySelectorAll(selector).forEach(n => n.classList.add('is-in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => { if (isIntersecting) { target.classList.add('is-in'); io.unobserve(target); } }), {rootMargin: '0px 0px -8% 0px'});
  document.querySelectorAll(selector).forEach(n => io.observe(n));
  return io;
 }
 function readingProgress() {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  let queued = false;
  const update = () => { queued = false; const max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`; };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, {passive: true});
  addEventListener('resize', update);
  update();
 }
 function backToTop() {
  const button = document.createElement('button');
  button.className = 'back-to-top';
  button.type = 'button';
  button.setAttribute('aria-label', 'Back to top');
  button.innerHTML = '<span aria-hidden="true">↑</span>';
  button.addEventListener('click', () => scrollTo({top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth'}));
  document.body.append(button);
  const toggle = () => button.classList.toggle('is-visible', scrollY > innerHeight * 1.2);
  addEventListener('scroll', toggle, {passive: true});
  toggle();
 }
 function sectionAnchors() {
  document.querySelectorAll('main section[id] h2').forEach(h => {
   const section = h.closest('section');
   if (!section || h.querySelector('.anchor-link')) return;
   const a = document.createElement('a');
   a.className = 'anchor-link';
   a.href = '#' + section.id;
   a.setAttribute('aria-label', 'Link to this section');
   a.textContent = '#';
   a.addEventListener('click', e => { e.preventDefault(); history.replaceState(null, '', '#' + section.id); section.scrollIntoView({behavior: reduceMotion.matches ? 'auto' : 'smooth'}); navigator.clipboard?.writeText(location.href).catch(() => {}); a.classList.add('is-copied'); setTimeout(() => a.classList.remove('is-copied'), 1400); });
   h.append(a);
  });
 }
 function resizeRedraw(host, draw) {
  let last = host.clientWidth;
  const ro = new ResizeObserver(() => { if (!host.isConnected) { ro.disconnect(); return; } if (Math.abs(host.clientWidth - last) > 24) { last = host.clientWidth; draw(); } });
  ro.observe(host);
 }

 window.viz = {esc, taskTitle, fmtSR, fmtScore, wilson, bindTips, hideTip, setFocus, dotStrip, outcomeRows, astraVersusField, perturbationSlopes, pairedDumbbells, timingBars, countUp, revealOnScroll, readingProgress, backToTop, sectionAnchors, resizeRedraw, ASTRA};
})();
