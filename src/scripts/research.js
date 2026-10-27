/* Main-page data views and evidence. Values come from the supplied report data. */
function modelLabel(id) {
  return chartModels.find((m) => m[0] === id)?.[1] || id;
}
function matrixCell(value, metric, best = false) {
  const label = metric === 'sr' ? (value * 100).toFixed(1) : value.toFixed(3);
  return `<td class="heat-value${best ? ' is-best' : ''}" data-value="${value}" data-metric="${metric}" style="--heat:${heatColor(value)};--heat-ink:${heatInk(value)}" title="${metric === 'sr' ? 'Success rate: ' + label + '%' : 'Score: ' + label}${best ? ' · Best in column' : ''}">${label}</td>`;
}
function initBenchmarkMatrix() {
  const host = $('#benchmark-matrix');
  let mode = 'attributes',
    metric = 'sr',
    reference = 'best',
    fieldGroup = 'all',
    fieldOrder = 'gap',
    shiftView = 'table';
  const fieldGroups = [
    ['all', 'All 26 tasks', () => true],
    [
      'mobile-short',
      'Mobile · short',
      (t) => t.mobility === 'Mobile' && t.horizon === 'Short Horizon',
    ],
    [
      'mobile-long',
      'Mobile · long',
      (t) => t.mobility === 'Mobile' && t.horizon === 'Long Horizon',
    ],
    [
      'fixed-low-medium',
      'Tabletop · low / medium',
      (t) => t.mobility === 'Fixed' && t.precision !== 'High',
    ],
    ['fixed-high', 'Tabletop · high', (t) => t.mobility === 'Fixed' && t.precision === 'High'],
  ];
  host.classList.add('benchmark-explorer');
  host.innerHTML = `<div class="matrix-heading table-toolbar"><h3>Complete benchmark comparison</h3><a class="table-download matrix-download" href="data/report-main-results.csv" download title="Download benchmark data (CSV)" aria-label="Download benchmark data (CSV)">${reportIcon('download')}<span>CSV</span></a></div><div class="matrix-tabs" role="tablist" aria-label="Benchmark tables"><button type="button" id="matrix-tab-attributes" data-matrix="attributes" role="tab" aria-controls="matrix-content" aria-selected="true">Overall and task groups</button><button type="button" id="matrix-tab-tasks" data-matrix="tasks" role="tab" aria-controls="matrix-content" aria-selected="false" tabindex="-1">All 26 tasks</button><button type="button" id="matrix-tab-shifts" data-matrix="shifts" role="tab" aria-controls="matrix-content" aria-selected="false" tabindex="-1">Generalization dimensions</button><button type="button" id="matrix-tab-field" data-matrix="field" role="tab" aria-controls="matrix-content" aria-selected="false" tabindex="-1">GPT-6-Astra vs. field</button></div><p class="matrix-introduction" hidden></p><div class="matrix-controls"><div class="matrix-metric" role="group" aria-label="Table metric"><button type="button" data-matrix-metric="sr" aria-pressed="true">SR (%)</button><button type="button" data-matrix-metric="score" aria-pressed="false">Score</button></div><div class="shift-view-switch" role="group" aria-label="Generalization dimensions presentation" hidden><button type="button" data-shift-view="table" aria-pressed="true">Success rates</button><button type="button" data-shift-view="range" aria-pressed="false">Variation across conditions</button></div></div><div id="matrix-content" role="tabpanel" aria-labelledby="matrix-tab-attributes" tabindex="0"></div><p class="fineprint" id="matrix-scope-note"></p>`;
  initSegmentedControl(host.querySelector('.matrix-tabs'), '[aria-selected="true"]', {
    variant: 'underline',
    keyboard: false,
  });
  initSegmentedControl(host.querySelector('.matrix-metric'));
  initSegmentedControl(host.querySelector('.shift-view-switch'));
  function draw() {
    const target = host.querySelector('#matrix-content');
    target.setAttribute('aria-labelledby', `matrix-tab-${mode}`);
    const scopeNote = host.querySelector('#matrix-scope-note');
    scopeNote.hidden = mode !== 'shifts';
    scopeNote.textContent =
      mode === 'shifts'
        ? 'Task-averaged results under the Object, Background, Instruction, and Mix dimensions.'
        : '';
    host.querySelector('.matrix-introduction').hidden = mode !== 'field';
    host.querySelector('.matrix-controls').hidden = mode === 'tasks';
    host.querySelector('.matrix-metric').hidden =
      mode === 'tasks' || (mode === 'shifts' && shiftView === 'range');
    host.querySelector('.shift-view-switch').hidden = mode !== 'shifts';
    host
      .querySelectorAll('[data-shift-view]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.shiftView === shiftView)),
      );
    const download = host.querySelector('.matrix-download');
    download.hidden = mode === 'tasks';
    download.href = `data/report-${mode === 'shifts' ? 'generalization' : mode === 'field' ? 'tasks' : 'main-results'}.csv`;
    if (mode === 'tasks') {
      target.innerHTML = taskResultsMarkup();
      initTaskTable();
      return;
    }
    if (mode === 'field') {
      drawField(target);
      return;
    }
    if (mode === 'shifts' && shiftView === 'range') {
      target.innerHTML = '<div class="matrix-perturbation-ranges"></div>';
      renderPerturbationRanges(target.querySelector('.matrix-perturbation-ranges'));
      return;
    }
    const shifts = mode === 'shifts',
      groups = shifts
        ? ['object', 'background', 'instruction', 'mix']
        : ['Low', 'Medium', 'High', 'Mobile', 'Fixed', 'Short Horizon', 'Long Horizon'],
      labels = shifts
        ? ['Object', 'Background', 'Instruction', 'Mix']
        : ['Low', 'Medium', 'High', 'Mobile', 'Tabletop', 'Short', 'Long'];
    const systems = [...reportFigures.models].sort((a, b) => b.sr - a.sr),
      max = (get) => Math.max(...systems.map(get));
    target.innerHTML = `<div class="table-scroll benchmark-scroll" tabindex="0" role="region" aria-label="Comparison of GPT-6-Astra and eight post-trained policies: ${shifts ? 'controlled perturbations' : 'overall and task groups'}"><table class="report-table report-table--heat benchmark-table${shifts ? ' benchmark-table--shifts' : ''}"><thead><tr><th rowspan="2" scope="col">Model</th>${shifts ? '<th colspan="4" scope="colgroup">Controlled perturbations</th>' : '<th colspan="2" scope="colgroup">Overall</th><th colspan="3" scope="colgroup">Precision</th><th colspan="2" scope="colgroup">Mobility</th><th colspan="2" scope="colgroup">Horizon</th>'}</tr><tr>${shifts ? '' : '<th scope="col">SR (%)</th><th scope="col">Score</th>'}${labels.map((l) => `<th scope="col">${l}</th>`).join('')}</tr></thead><tbody>${systems
      .map(
        (m) =>
          `<tr class="${m.id === 'Astra (ICL)' ? 'astra-row' : ''}"><th scope="row">${modelLabel(m.id)}<small>${m.id === 'Astra (ICL)' ? 'direct control' : ''}</small></th>${shifts ? '' : matrixCell(m.sr, 'sr', m.sr === max((x) => x.sr)) + matrixCell(m.score, 'score', m.score === max((x) => x.score))}${groups
            .map((g) => {
              const v = (shifts ? m.generalization[g] : m.groups[g])[metric];
              return matrixCell(
                v,
                metric,
                v === max((x) => (shifts ? x.generalization[g] : x.groups[g])[metric]),
              );
            })
            .join('')}</tr>`,
      )
      .join(
        '',
      )}</tbody></table></div><div class="heat-legend"><span>${shifts ? '' : 'Task groups · '}${metric === 'sr' ? 'Success rate (%)' : 'Score'}</span><span>0</span><i aria-hidden="true"></i><span>${metric === 'sr' ? '100' : '1'}</span><span>Bold: best in column</span></div>`;
  }
  function drawField(target) {
    const referenceLabel =
      reference === 'best'
        ? 'best other model'
        : reference === 'median'
          ? 'median of others'
          : modelLabel(reference);
    const comparator =
      reference === 'best'
        ? 'the strongest alternative model on each task'
        : reference === 'median'
          ? 'the median of the eight post-trained policies'
          : modelLabel(reference);
    host.querySelector('.matrix-introduction').textContent =
      `Here, we evaluate task-level ${metric === 'sr' ? 'success-rate' : 'Score'} differences between GPT-6-Astra and ${comparator}.${metric === 'sr' ? ' Differences are reported in percentage points.' : ''}`;
    target.innerHTML = `<div class="insight-controls field-controls"><label>Compare against<select data-field-reference><option value="best" ${reference === 'best' ? 'selected' : ''}>Best other model, per task</option><option value="median" ${reference === 'median' ? 'selected' : ''}>Median of others</option>${chartModels
      .filter((m) => m[0] !== 'Astra (ICL)')
      .map(
        ([key, label]) =>
          `<option value="${key}" ${reference === key ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select></label><label>Task group<select data-field-group>${fieldGroups.map(([key, label]) => `<option value="${key}" ${fieldGroup === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Order<select data-field-order><option value="gap" ${fieldOrder === 'gap' ? 'selected' : ''}>Largest advantage first</option><option value="task" ${fieldOrder === 'task' ? 'selected' : ''}>Task name</option></select></label></div><div class="field-summary" aria-live="polite"></div><div class="viz-figure field-chart" data-viz-linked></div>`;
    const chart = target.querySelector('.field-chart'),
      draw = () => {
        const rows = viz.astraVersusField(chart, {
          tasks: tasks.filter(fieldGroups.find((g) => g[0] === fieldGroup)[2]),
          metric,
          reference,
          order: fieldOrder,
        });
        const pos = rows.filter((r) => r.delta > 1e-9).length,
          neg = rows.filter((r) => r.delta < -1e-9).length,
          tie = rows.length - pos - neg;
        target.querySelector('.field-summary').innerHTML =
          `<div class="pos"><b>${pos}</b><span>tasks where GPT-6-Astra leads ${referenceLabel}</span></div><div><b>${tie}</b><span>tasks tied</span></div><div class="neg"><b>${neg}</b><span>tasks where it trails</span></div>`;
        chart.querySelectorAll('.viz-diverge').forEach((g) =>
          g.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
          }),
        );
      };
    draw();
    viz.bindTips(target);
    viz.resizeRedraw(chart, draw);
  }
  host.addEventListener('click', (e) => {
    const view = e.target.closest('[data-shift-view]');
    if (view) {
      shiftView = view.dataset.shiftView;
      draw();
      host.querySelector(`[data-shift-view="${shiftView}"]`).focus();
      return;
    }
    const tab = e.target.closest('[data-matrix]'),
      button = e.target.closest('[data-matrix-metric]');
    if (tab) {
      mode = tab.dataset.matrix;
      host.querySelectorAll('[data-matrix]').forEach((b) => {
        b.setAttribute('aria-selected', String(b === tab));
        b.tabIndex = b === tab ? 0 : -1;
      });
    } else if (button) {
      metric = button.dataset.matrixMetric;
      host
        .querySelectorAll('[data-matrix-metric]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    } else return;
    draw();
  });
  host.addEventListener('change', (e) => {
    if (e.target.matches('[data-field-reference]')) reference = e.target.value;
    else if (e.target.matches('[data-field-group]')) fieldGroup = e.target.value;
    else if (e.target.matches('[data-field-order]')) fieldOrder = e.target.value;
    else return;
    const selector = e.target.hasAttribute('data-field-reference')
      ? '[data-field-reference]'
      : e.target.hasAttribute('data-field-group')
        ? '[data-field-group]'
        : '[data-field-order]';
    draw();
    host.querySelector(selector).focus();
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-matrix-link]');
    if (!link) return;
    const tab = host.querySelector(`[data-matrix="${link.dataset.matrixLink}"]`);
    if (tab) {
      if (link.dataset.matrixView) shiftView = link.dataset.matrixView;
      tab.click();
      tab.focus({ preventScroll: true });
    }
  });
  tabKeyboard(host.querySelector('.matrix-tabs'), '[data-matrix]');
  draw();
}
function tabKeyboard(root, selector) {
  root.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const buttons = [...root.querySelectorAll(selector)],
      i = buttons.indexOf(document.activeElement),
      next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? buttons.length - 1
            : (i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
    buttons[next].click();
    buttons[next].focus();
  });
}
function renderPoc(area) {
  const entries = [
    ['astra-poc', 'GPT-6-Astra', 'Places the bookmark, then the pen'],
    ['pi05-poc', 'π₀.₅', 'Brings the pen over the book'],
    ['openwam-poc-1', 'OpenWAM-α · Rollout 1', 'Moves the pen before the bookmark'],
    ['openwam-poc-2', 'OpenWAM-α · Rollout 2', 'Places the bookmark and stops'],
  ];
  area.innerHTML = `<div class="case-video-toolbar"><div class="case-model-tabs" aria-label="Composition model view"><button type="button" data-poc-focus="all" aria-pressed="true">Compare all</button>${entries.map(([_, name], i) => `<button type="button" data-poc-focus="${i}" aria-pressed="false">${i === 0 ? 'GPT-6-Astra' : i === 1 ? 'π₀.₅' : name}</button>`).join('')}</div><button type="button" class="case-play poc-play" aria-label="Play all" aria-pressed="false">${reportIcon('play')}<span>Play all</span></button></div><div class="poc-videos">${entries.map(([file, name, condition]) => video(`media/poc/${file}.mp4`, name, condition, 'Compositional evaluation')).join('')}</div>`;
  enhanceCaseControls(area);
  initVideos();
}
function initDemoLibrary() {
  $('#demo-group').innerHTML = taskGroupOptions();
  let page = 0;
  const size = 6,
    unique = tasks.map((t) => ({ task: t, demo: demos.find((d) => d.task === t.task) }));
  function draw() {
    const query = $('#demo-search').value.trim().toLowerCase(),
      group = $('#demo-group').value,
      outcome = $('#demo-outcome').value;
    const filtered = unique.filter(
        ({ task: t, demo: d }) =>
          d &&
          title(t.task).toLowerCase().includes(query) &&
          matchesTaskGroup(t, group) &&
          (outcome === 'all' ||
            (outcome === 'success'
              ? d.sr
              : !d.sr && (outcome === 'failed' ? d.score === 0 : d.score > 0))),
      ),
      pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.min(page, pages - 1);
    $('#library-grid')
      .querySelectorAll('video')
      .forEach((v) => {
        v.pause();
        observer.unobserve(v);
      });
    $('#library-grid').innerHTML =
      filtered
        .slice(page * size, page * size + size)
        .map(
          ({ task: t, demo: d }) =>
            `<article class="recording-library__item">${video(d.path, title(t.task), `Task SR <b>${pct(t['Astra (ICL)_sr'])}%</b> across ${t.episodes} episodes`, `${d.sr ? 'Success' : d.score > 0 ? 'Partial credit' : 'Score of zero'} (Score ${d.score.toFixed(2)})`)}</article>`,
        )
        .join('') || '<p class="recording-library__empty">No tasks match these filters.</p>';
    $('#library-count').textContent =
      `${filtered.length} tasks · ${filtered.length ? page * size + 1 : 0}–${Math.min((page + 1) * size, filtered.length)} shown`;
    $('#demo-page').textContent = `${page + 1} / ${pages}`;
    $('#demo-prev').disabled = page === 0;
    $('#demo-next').disabled = page === pages - 1;
    initVideos();
  }
  for (const id of ['#demo-search', '#demo-group', '#demo-outcome'])
    $(id).addEventListener(id === '#demo-search' ? 'input' : 'change', () => {
      page = 0;
      draw();
    });
  $('#demo-prev').addEventListener('click', () => {
    page--;
    draw();
  });
  $('#demo-next').addEventListener('click', () => {
    page++;
    draw();
  });
  draw();
}
async function initEpisodeOutcomes() {
  const response = await fetch('data/episodes.json');
  if (!response.ok) throw Error('Episode outcomes unavailable');
  const episodes = await response.json(),
    groups = [
      { id: 'success', name: 'Complete success', color: '#3456ef', test: (d) => d.sr === 1 },
      {
        id: 'partial',
        name: 'Partial credit',
        color: '#9eaff9',
        test: (d) => d.sr === 0 && d.score > 0,
      },
      {
        id: 'zero',
        name: 'Score of zero',
        color: '#dce1eb',
        test: (d) => d.sr === 0 && d.score === 0,
      },
    ].map((g) => ({ ...g, count: episodes.filter(g.test).length }));
  const ordered = groups.flatMap((g) =>
    episodes
      .filter(g.test)
      .map((d) => ({ ...d, group: g.id, outcomeName: g.name, color: g.color })),
  );
  const summary = `${episodes.length} episodes: ${groups.map((g) => `${g.name} ${g.count}`).join(', ')}.`;
  $('#episode-outcomes').innerHTML =
    `<div class="outcome-layout"><svg viewBox="0 0 480 286" role="img" aria-label="${summary}">${ordered.map((d, i) => `<circle data-outcome="${d.group}" data-index="${i}" cx="${8 + (i % 30) * 16}" cy="${9 + Math.floor(i / 30) * 16}" r="5.2" fill="${d.color}"><title>${title(d.task)} / ${d.seed}: ${d.outcomeName} · SR ${d.sr}, Score ${Number(d.score).toFixed(3)}</title></circle>`).join('')}</svg><div class="outcome-legend">${groups
      .map((g) => {
        return `<button type="button" data-outcome-filter="${g.id}" aria-pressed="false" style="--outcome:${g.color}"><span class="outcome-name">${g.name}</span><strong>${g.count}</strong><small>${((g.count / episodes.length) * 100).toFixed(1)}% of episodes</small></button>`;
      })
      .join(
        '',
      )}</div></div><p class="outcome-readout" aria-live="polite" aria-atomic="true"></p><p class="outcome-definition">Complete success: SR = 1. Partial credit: SR = 0 and Score &gt; 0. Score of zero: SR = 0 and Score = 0.</p><p class="fineprint">Episode-weighted success is 46.5%, and the headline 46.7% is the equal-weight mean across tasks. Partial Score follows each task’s scoring rules.</p>`;
  const host = $('#episode-outcomes');
  host.addEventListener('click', (e) => {
    const button = e.target.closest('[data-outcome-filter]');
    if (!button) return;
    const active = button.getAttribute('aria-pressed') !== 'true',
      key = button.dataset.outcomeFilter;
    host
      .querySelectorAll('[data-outcome-filter]')
      .forEach((b) => b.setAttribute('aria-pressed', String(active && b === button)));
    host
      .querySelectorAll('circle')
      .forEach((c) => (c.style.opacity = active && c.dataset.outcome !== key ? '.13' : '1'));
    const group = groups.find((g) => g.id === key);
    host.querySelector('.outcome-readout').textContent = active
      ? `${group.name} · ${group.count}/${episodes.length} episodes (${((100 * group.count) / episodes.length).toFixed(1)}%) highlighted.`
      : `All ${episodes.length} episodes shown.`;
  });
  host.addEventListener('pointerover', (e) => {
    const c = e.target.closest('circle');
    if (c)
      host.querySelector('.outcome-readout').textContent = c.querySelector('title').textContent;
  });
}
function initSafetyEvidence() {
  const cases = {
    dishwasher: {
      title: 'Independent single-arm commands can destabilize held objects during bimanual tasks.',
      path: 'dishwasher_009-web.mp4',
      label: 'Dishwasher',
      result: 'Score 0.67',
      observation:
        'The bowl slips from the left hand while the right hand opens the door, and the agent later searches the floor.',
    },
    apple: {
      title: 'Recovery attempts can drive the robot beyond safe workspace bounds.',
      path: 'apple_to_fruit_bowl_003-web.mp4',
      label: 'Apple to bowl',
      result: 'Score 0.00',
      observation:
        'After the apple falls, the agent searches below the table and behind the robot with targets outside the workspace.',
    },
    coffee: {
      title: 'Height and contact with the scene are hard to judge from RGB images without depth.',
      path: 'collect_coffee_beans_009-web.mp4',
      label: 'Coffee beans',
      result: 'Score 0.07',
      observation: 'The held jar and later the spoon contact the table edge.',
    },
  };
  const tabs = $('.safety-tabs'),
    panel = $('#safety-content');
  function draw(key) {
    panel.querySelectorAll('video').forEach((v) => {
      v.pause();
      observer.unobserve(v);
    });
    const item = cases[key];
    panel.setAttribute('aria-labelledby', 'safety-tab-' + key);
    panel.innerHTML = `<div class="safety-evidence"><div class="safety-case-copy"><h3>${item.title}</h3><p>${item.observation}</p></div>${video('media/cases/' + item.path, item.label, '', item.result)}</div>`;
    tabs.querySelectorAll('[data-safety]').forEach((b) => {
      const selected = b.dataset.safety === key;
      b.setAttribute('aria-selected', String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    initVideos();
  }
  tabs.addEventListener('click', (e) => {
    const button = e.target.closest('[data-safety]');
    if (button) draw(button.dataset.safety);
  });
  tabKeyboard(tabs, '[data-safety]');
  draw('dishwasher');
}
function initResearch() {
  initBenchmarkMatrix();
  initSafetyEvidence();
  initDemoLibrary();
  initEpisodeOutcomes().catch(() => {
    $('#episode-outcomes').innerHTML = '<p>Episode data could not load. Please reload.</p>';
  });
}
