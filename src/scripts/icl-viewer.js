// Actual historical demonstration inputs, packaged independently of authoring prompts.
let iclPackagesPromise;
let iclRequest = 0;
const iclView = { packages: [], overviews: [], task: 'install_gear', frame: 0, tab: 'overview' };
const iclEscape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const iclTaskName = (task) => task.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
const iclNumber = (value) =>
  JSON.stringify(value, (_, v) => (typeof v === 'number' ? Number(v.toFixed(5)) : v)) ?? '—';
function iclOverview(pkg) {
  return iclView.overviews.find((item) => item.task === pkg.task);
}
function iclFrames(pkg) {
  const annotations = new Map(iclOverview(pkg).frames.map((f) => [f.path, f]));
  return pkg.inputs
    .filter((input) => input.type === 'localImage')
    .map((input) => ({ ...input, ...annotations.get(input.path) }));
}
function iclText(text) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        const value = JSON.parse(line);
        if (value && typeof value === 'object')
          // Keep the original numeric spelling (including signed zero) in raw evidence.
          return `<details class="icl-numeric-detail"><summary>Recorded data${value.frame !== undefined ? ' · frame ' + iclEscape(value.frame) : ''}</summary><pre class="icl-json">${iclEscape(line)}</pre></details>`;
      } catch {}
      return `<p>${iclEscape(line)}</p>`;
    })
    .join('');
}
function iclRecords(pkg) {
  return pkg.inputs
    .filter((x) => x.type === 'text')
    .flatMap((x) =>
      x.text.split('\n').flatMap((line) => {
        try {
          const value = JSON.parse(line);
          return typeof value === 'object' && value !== null ? [{ value, source: line }] : [];
        } catch {
          return [];
        }
      }),
    );
}
async function openICLPackage(task = 'install_gear') {
  const request = ++iclRequest,
    dialog = document.querySelector('#appendix-dialog'),
    body = document.querySelector('#appendix-body');
  dialog.dataset.content = 'icl';
  dialog.classList.add('icl-dialog');
  body.innerHTML =
    '<h2 id="appendix-title">Inside a single-shot ICL package</h2><p role="status">Loading the recorded demonstration…</p>';
  if (!dialog.open) dialog.showModal();
  body.scrollTop = 0;
  try {
    if (!iclPackagesPromise)
      iclPackagesPromise = Promise.all(
        ['icl-packages', 'icl-overviews'].map((name) =>
          fetch('data/' + name + '.json').then((r) => {
            if (!r.ok) throw Error('ICL data');
            return r.json();
          }),
        ),
      ).catch((error) => {
        iclPackagesPromise = null;
        throw error;
      });
    const [packages, overviews] = await iclPackagesPromise;
    if (request !== iclRequest || dialog.dataset.content !== 'icl' || !dialog.open) return;
    iclView.packages = packages;
    iclView.overviews = overviews;
    iclView.task = packages.some((p) => p.task === task) ? task : packages[0].task;
    iclView.frame = 0;
    iclView.tab = 'overview';
    renderICLPackage();
  } catch {
    if (request === iclRequest && dialog.dataset.content === 'icl' && dialog.open)
      body.innerHTML =
        '<h2 id="appendix-title">Demonstration data unavailable</h2><p>Please reload and open the package again.</p>';
  }
}
function renderICLPackage() {
  const pkg = iclView.packages.find((p) => p.task === iclView.task),
    frames = iclFrames(pkg),
    body = document.querySelector('#appendix-body');
  const tabs = [
    ['overview', 'Overview'],
    ['frames', 'Keyframes'],
    ['inputs', 'Full prompt'],
  ];
  body.innerHTML = `<h2 id="appendix-title">Single-shot ICL</h2>
    <p class="icl-intro">One training demonstration, annotated by a separate GPT-6-Astra instance at <code>high</code> reasoning effort.</p>
    <div class="icl-toolbar">
      <label for="icl-task">Task<select id="icl-task">${iclView.packages.map((p) => `<option value="${iclEscape(p.task)}" ${p.task === pkg.task ? 'selected' : ''}>${iclEscape(iclTaskName(p.task))}</option>`).join('')}</select></label>
      <span aria-live="polite">${frames.length} keyframes</span>
    </div>
    <div class="icl-tabs" role="tablist" aria-label="Demonstration presentation">${tabs.map(([key, label]) => `<button type="button" id="icl-tab-${key}" role="tab" aria-controls="icl-panel" aria-selected="${iclView.tab === key}" tabindex="${iclView.tab === key ? 0 : -1}" data-icl-view="${key}">${label}</button>`).join('')}</div>
    <div id="icl-panel" role="tabpanel" tabindex="0" aria-labelledby="icl-tab-${iclView.tab}"></div>`;
  renderICLPanel();
}
function renderICLPanel() {
  const pkg = iclView.packages.find((p) => p.task === iclView.task),
    overview = iclOverview(pkg),
    frames = iclFrames(pkg),
    panel = document.querySelector('#icl-panel');
  if (iclView.tab === 'overview') {
    panel.innerHTML = `<div class="icl-overview-copy"><h3>${iclEscape(iclTaskName(pkg.task))}</h3><p>${iclEscape(overview.description)}</p></div>
      <figure class="icl-overview-sheet">
        <a href="${iclEscape(overview.overview)}" target="_blank" rel="noopener" aria-label="Open ${iclEscape(iclTaskName(pkg.task))} keyframe overview at full size"><img src="${iclEscape(overview.overview)}" alt="${iclEscape(iclTaskName(pkg.task))}: annotated keyframe overview"/></a>
      </figure>`;
    return;
  }
  if (iclView.tab === 'inputs') {
    panel.innerHTML = `<div class="icl-input-heading">
      <p>The complete demonstration prompt and images, in their original order.</p>
      <button type="button" class="supplement-action" data-icl-download>${reportIcon('download')}<span>Download original input</span></button>
    </div><div class="icl-input-sequence">${pkg.inputs.map((input) => `<section class="icl-input-block">${input.type === 'text' ? iclText(input.text) : `<img src="${iclEscape(input.path)}" loading="lazy" alt="${iclEscape(frames.find((f) => f.path === input.path).phase)}"/>`}</section>`).join('')}</div>`;
    return;
  }
  const frame = frames[iclView.frame],
    record = iclRecords(pkg).find((r) => Number(r.value.frame) === frame.frame);
  panel.innerHTML = `<div class="icl-album" tabindex="0" role="group" aria-label="Keyframe album; use left and right arrow keys">
    <div class="icl-frame-pair">
      <figure class="icl-frame-view"><div class="icl-image-stage"><img src="${iclEscape(frame.path)}" alt="${iclEscape(frame.phase)}" aria-describedby="icl-frame-prompt"/></div></figure>
      <aside class="icl-frame-prompt" aria-label="Annotation for this keyframe">
        <span class="icl-prompt-label">KEYFRAME ${iclView.frame + 1} / ${frames.length}</span>
        <h3>${iclEscape(iclTaskName(pkg.task))}</h3>
        <blockquote id="icl-frame-prompt" aria-live="polite">${iclEscape(frame.phase)}</blockquote>
        <p class="icl-prompt-note">Frame ${frame.frame} · ${iclEscape(frame.camera)} camera</p>
      </aside>
    </div>
    <div class="icl-album-navigation">
      <button type="button" class="icl-album-arrow" data-icl-step="-1" ${iclView.frame === 0 ? 'disabled' : ''} aria-label="Previous keyframe">${reportIcon('chevron-left')}<span>Previous</span></button>
      <a class="supplement-action" href="${iclEscape(frame.path)}" target="_blank" rel="noopener">${reportIcon('external-link')}<span>Original image</span></a>
      <button type="button" class="icl-album-arrow" data-icl-step="1" ${iclView.frame === frames.length - 1 ? 'disabled' : ''} aria-label="Next keyframe"><span>Next</span>${reportIcon('chevron-right')}</button>
    </div>
  </div>
  <div class="icl-frame-controls"><label>Keyframe <output>${iclView.frame + 1} / ${frames.length}</output><input aria-label="Select demonstration keyframe" type="range" min="0" max="${frames.length - 1}" value="${iclView.frame}" id="icl-frame-range"/></label></div>
  <div class="icl-filmstrip" aria-label="All demonstration keyframes">${frames.map((f, i) => `<button type="button" data-icl-frame="${i}" aria-label="Keyframe ${i + 1}: ${iclEscape(f.phase)}" aria-pressed="${i === iclView.frame}"><img src="${iclEscape(f.path)}" loading="lazy" alt=""/><span>${i + 1}</span></button>`).join('')}</div>
  <details class="icl-context"><summary>Recorded state and action</summary>${record ? iclRecordTable(record.value, record.source) : '<p>No numeric excerpt for this frame.</p>'}</details>
  <details class="icl-context"><summary>Original image caption</summary><p>${iclEscape(frame.label)}</p></details>`;
}

function iclRecordTable(record, source) {
  let measured = record.measured,
    action = record.exported_action;
  if (!measured && record.measured_left_xyz_wxyz) {
    measured = {
      left_xyz_wxyz: record.measured_left_xyz_wxyz,
      left_total_gap_m: record.measured_left_total_gap_m,
    };
    action = {
      left_xyz_wxyz: record.exported_action_left_xyz_wxyz,
      left_total_gap_m: record.command_left_total_gap_m,
    };
  }
  const raw = `<details class="icl-raw"><summary>Original numeric record · frame ${iclEscape(record.frame)}</summary><pre class="icl-json">${iclEscape(source)}</pre></details>`;
  const tableStart =
    '<div class="icl-data-scroll" tabindex="0" role="region" aria-label="Recorded state and action values"><table class="report-table report-table--plain icl-data-table">';
  if (measured && action) {
    const fields = [...new Set([...Object.keys(measured), ...Object.keys(action)])];
    return `${tableStart}<thead><tr><th scope="col">Source field</th><th scope="col">Measured state</th><th scope="col">Exported action target</th></tr></thead><tbody>${fields.map((field) => `<tr><th scope="row">${iclEscape(field)}</th><td>${iclEscape(iclNumber(measured[field]))}</td><td>${iclEscape(iclNumber(action[field]))}</td></tr>`).join('')}</tbody></table></div>${raw}`;
  }
  return `${tableStart}<thead><tr><th scope="col">Source field</th><th scope="col">Recorded value</th></tr></thead><tbody>${Object.entries(
    record,
  )
    .map(
      ([field, value]) =>
        `<tr><th scope="row">${iclEscape(field)}</th><td>${iclEscape(iclNumber(value))}</td></tr>`,
    )
    .join('')}</tbody></table></div>${raw}`;
}
function selectICLFrame(index) {
  const strip = document.querySelector('.icl-filmstrip'),
    offset = strip?.scrollLeft || 0;
  iclView.frame = index;
  renderICLPanel();
  document.querySelector('.icl-filmstrip').scrollLeft = offset;
}
document.addEventListener('change', (e) => {
  if (e.target.id === 'icl-task') {
    iclView.task = e.target.value;
    iclView.frame = 0;
    renderICLPanel();
    const pkg = iclView.packages.find((p) => p.task === iclView.task);
    document.querySelector('.icl-toolbar>span').textContent = `${iclFrames(pkg).length} keyframes`;
  }
  if (e.target.id === 'icl-frame-range') {
    selectICLFrame(Number(e.target.value));
    document.querySelector('#icl-frame-range').focus({ preventScroll: true });
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'icl-frame-range')
    e.target.parentElement.querySelector('output').textContent =
      `${Number(e.target.value) + 1} / ${Number(e.target.max) + 1}`;
});
document.addEventListener('click', (e) => {
  let button = e.target.closest('[data-icl-package]');
  if (button) {
    openICLPackage(button.dataset.iclPackage || 'install_gear');
    return;
  }
  button = e.target.closest('[data-icl-view]');
  if (button) {
    iclView.tab = button.dataset.iclView;
    renderICLPackage();
    document.querySelector('#icl-tab-' + iclView.tab).focus({ preventScroll: true });
    return;
  }
  button = e.target.closest('[data-icl-frame]');
  if (button) {
    selectICLFrame(Number(button.dataset.iclFrame));
    document.querySelector(`[data-icl-frame="${iclView.frame}"]`).focus({ preventScroll: true });
    return;
  }
  button = e.target.closest('[data-icl-step]');
  if (button) {
    const step = button.dataset.iclStep;
    selectICLFrame(iclView.frame + Number(step));
    const next = document.querySelector(`[data-icl-step="${step}"]`);
    (next.disabled ? document.querySelector('.icl-album') : next).focus({ preventScroll: true });
    return;
  }
  if (e.target.closest('[data-icl-download]')) {
    const pkg = iclView.packages.find((p) => p.task === iclView.task),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' }),
      ),
      link = document.createElement('a');
    link.href = url;
    link.download = pkg.task + '-icl.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
document.addEventListener('keydown', (e) => {
  if (
    !e.target.matches('[data-icl-view]') ||
    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)
  )
    return;
  e.preventDefault();
  const tabs = ['overview', 'frames', 'inputs'],
    index = tabs.indexOf(iclView.tab);
  iclView.tab =
    tabs[
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? tabs.length - 1
          : (index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
    ];
  renderICLPackage();
  document.querySelector('#icl-tab-' + iclView.tab).focus({ preventScroll: true });
});

function pairedICLContent() {
  const groups = ablations.groups.filter((g) => g.experiment === 'frame_gear_fresh'),
    pairs = ablations.pairs.filter((p) => p.experiment === 'frame_gear_fresh');
  const rows = (ps) =>
    ps
      .map(
        (p) =>
          `<tr><th>${title(p.task)} / ${p.seed}</th><td>${p.zero_shot_sr}</td><td>${p.zero_shot_score.toFixed(4)}</td><td>${p.icl_sr}</td><td>${p.icl_score.toFixed(4)}</td><td>${p.delta_score > 0 ? '+' : ''}${p.delta_score.toFixed(4)}</td></tr>`,
      )
      .join('');
  const table = (ps) =>
    `<div class="table-scroll" tabindex="0" role="region" aria-label="All eight paired ICL results"><table class="report-table report-table--plain paired-detail-table"><thead><tr><th rowspan="2">Task / seed</th><th colspan="2">Zero-shot</th><th colspan="2">Single-shot ICL</th><th rowspan="2">Δ Score</th></tr><tr><th>SR</th><th>Score</th><th>SR</th><th>Score</th></tr></thead><tbody>${rows(ps)}</tbody></table></div>`;
  return [
    'Zero-shot vs. ICL: gains and regressions',
    `<p><strong>We test eight matched pairs on the photo-frame and gear installation tasks.</strong> Both conditions share execution guidance; only the annotated demonstration is switched on or off.</p><div class="icl-pair-findings">${groups.map((g) => `<section><h3>${title(g.task)}</h3><p><strong>${g.zero_shot_successes}/${g.pairs} → ${g.icl_successes}/${g.pairs}</strong> complete successes</p><p>Mean Score ${g.zero_shot_score.toFixed(4)} → ${g.icl_score.toFixed(4)}</p><p>${g.score_better} pairs improve · ${g.score_worse} worsen · ${g.score_tied} tie</p><button type="button" class="supplement-action" data-icl-package="${g.task}"><span>Inspect this task’s demonstration</span>${reportIcon('book-open')}</button></section>`).join('')}</div><h3>All eight pairs</h3>${table(pairs)}`,
  ];
}

document.addEventListener('keydown', (e) => {
  if (
    !e.target.closest('.icl-album') ||
    !['ArrowLeft', 'ArrowRight'].includes(e.key) ||
    e.target.matches('input,select,textarea')
  )
    return;
  e.preventDefault();
  const pkg = iclView.packages.find((p) => p.task === iclView.task),
    next = Math.max(
      0,
      Math.min(iclFrames(pkg).length - 1, iclView.frame + (e.key === 'ArrowRight' ? 1 : -1)),
    );
  if (next !== iclView.frame) selectICLFrame(next);
  document.querySelector('.icl-album').focus({ preventScroll: true });
});
