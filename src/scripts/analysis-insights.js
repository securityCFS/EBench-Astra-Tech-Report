// Derived comparisons; source values and denominators remain inspectable.
async function initAnalysisInsights() {
  const ids = ['cross-group-chart', 'fixed-task-evidence', 'failure-depth-chart'];
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const taskName = (s) => s.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
  const number = (n) => n.toFixed(2);
  const astra = 'Astra (ICL)';
  let data;
  try {
    const r = await fetch('data/analysis-insights.json');
    if (!r.ok) throw Error('Analysis data');
    data = await r.json();
  } catch {
    for (const id of ids)
      document.getElementById(id).innerHTML =
        '<p>Analysis data could not load. Please reload the page.</p>';
    return;
  }
  const label = (id) => data.models.find((m) => m.id === id).label;
  const model = (id) => esc(label(id));
  const groupRoot = document.getElementById('cross-group-chart');
  const tableGroups = [
    {
      label: 'Operating Mode',
      rows: [
        ['Mobile', 'Mobile'],
        ['Tabletop', 'Fixed'],
      ].map(([label, mode]) => {
        const subset = tasks.filter((task) => task.mobility === mode);
        return {
          id: `mode-${mode.toLowerCase()}`,
          label,
          n: subset.length,
          values: (metric) =>
            data.models.map((m) => chartAggregate(m.id, metric, 'mobility', mode, subset)),
        };
      }),
    },
    ...[
      [
        'Horizon (mobile tasks only)',
        [
          ['mobile-short', 'Mobile \u00b7 Short'],
          ['mobile-long', 'Mobile \u00b7 Long'],
        ],
      ],
      [
        'Precision (tabletop tasks only)',
        [
          ['fixed-low-medium', 'Tabletop \u00b7 Low / Medium'],
          ['fixed-high', 'Tabletop \u00b7 High'],
        ],
      ],
    ].map(([label, rows]) => ({
      label,
      rows: rows.map(([id, label]) => {
        const group = data.groups.find((group) => group.id === id);
        const subset = tasks.filter((task) => group.tasks.includes(task.task));
        return {
          id,
          label,
          n: group.n,
          values: (metric) =>
            data.models.map((m) =>
              metric === 'sr'
                ? (group.reported_rates?.[m.id] ?? group.rates[m.id]) / 100
                : subset.reduce((sum, task) => sum + Number(task[m.id + '_score']), 0) /
                  subset.length,
            ),
        };
      }),
    })),
  ];
  let groupMetric = 'sr';
  groupRoot.innerHTML = `<div class="capability-table-controls"><div class="chart-metrics" role="group" aria-label="Capability comparison metric"><button type="button" data-metric="sr" aria-pressed="true">SR (%)</button><button type="button" data-metric="score" aria-pressed="false">Score</button></div></div><div class="insight-table-scroll" tabindex="0" role="region" aria-label="Performance by operating mode, horizon and precision"></div><p class="insight-note" id="capability-table-note">Each task has equal weight within its subgroup. The Operating Mode rows partition all 26 tasks. The Horizon rows split only the 19 mobile tasks and the Precision rows only the 7 tabletop tasks, so those four rows are cross-domain subsets and do not reproduce the benchmark's own Horizon or Precision groupings &mdash; for example the 12 mobile short-horizon tasks are a subset of the 19 short-horizon tasks. <strong>Bold</strong>: best in row; shaded column: GPT-6-Astra.</p>`;
  initSegmentedControl(groupRoot.querySelector('.chart-metrics'));
  function drawCapabilityTable() {
    const metricLabel = groupMetric === 'sr' ? 'Success rate (%)' : 'Score (0–1)';
    const format = (value) => (groupMetric === 'sr' ? (value * 100).toFixed(2) : value.toFixed(4));
    groupRoot.querySelector('.insight-table-scroll').innerHTML =
      `<table class="report-table report-table--plain insight-table capability-results" data-metric="${groupMetric}" aria-label="Capability comparison: ${metricLabel}" aria-describedby="capability-table-note"><caption class="chart-caption report-table-caption">Performance by operating mode, with horizon split within mobile tasks and precision within tabletop tasks</caption><thead><tr><th scope="col" rowspan="2" class="capability-dimension">Dimension</th><th scope="col" rowspan="2" class="capability-subgroup">Subgroup</th><th scope="colgroup" colspan="${data.models.length}">${metricLabel}</th></tr><tr>${data.models.map((m) => `<th scope="col" ${m.id === astra ? 'class="insight-astra"' : ''}>${model(m.id)}</th>`).join('')}</tr></thead>${tableGroups
        .map(
          (group) =>
            `<tbody>${group.rows
              .map((row, index) => {
                const values = row.values(groupMetric);
                const best = Math.max(...values);
                return `<tr data-subgroup="${row.id}">${index === 0 ? `<th scope="rowgroup" rowspan="${group.rows.length}" class="capability-dimension">${esc(group.label)}</th>` : ''}<th scope="row" class="capability-subgroup"><span class="subgroup-label">${esc(row.label)}</span></th>${data.models.map((m, i) => `<td data-model="${m.id}" data-value="${values[i]}" class="${m.id === astra ? 'insight-astra' : ''}">${Math.abs(values[i] - best) < 1e-8 ? `<strong>${format(values[i])}</strong>` : format(values[i])}</td>`).join('')}</tr>`;
              })
              .join('')}</tbody>`,
        )
        .join('')}</table>`;
  }
  groupRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-metric]');
    if (!button || button.dataset.metric === groupMetric) return;
    groupMetric = button.dataset.metric;
    groupRoot
      .querySelectorAll('button[data-metric]')
      .forEach((control) => control.setAttribute('aria-pressed', String(control === button)));
    drawCapabilityTable();
  });
  drawCapabilityTable();

  const fixed = document.getElementById('fixed-task-evidence');
  fixed.innerHTML = `<div class="insight-table-scroll"><table class="report-table report-table--plain insight-table fixed-insight-table"><thead><tr><th scope="col" rowspan="2">Task</th><th scope="colgroup" colspan="2">Success rate (%)</th><th scope="col" rowspan="2">Video</th></tr><tr><th scope="col">GPT-6-Astra</th><th scope="col">Qwen-RobotManip</th></tr></thead><tbody>${data.groups
    .find((g) => g.id === 'fixed-low-medium')
    .tasks.map((name) => {
      const t = data.tasks.find((t) => t.task === name);
      return `<tr><th scope="row">${esc(taskName(name))}</th><td class="insight-astra">${number(t.rates[astra])}</td><td>${number(t.rates['Qwen-RobotManip'])}</td><td><button class="appendix-link" data-task-video="${name}">Video link ${reportIcon('external-link')}</button></td></tr>`;
    })
    .join('')}</tbody></table></div>`;

  const failures = document.getElementById('failure-depth-chart');
  const selected = [
    'install_gear',
    'utensils_to_holder',
    'put_glass_in_glassbox',
    'tighten_nut',
    'peg_in_hole',
    'shop',
    'bottle',
  ];
  failures.classList.add('outcome-breakdown');
  // Each task carries two traits. Precision has three raw values and horizon two; only
  // five of the six combinations exist (no high-precision task is long-horizon), which the
  // filter row has to say rather than let a reader discover as an empty list.
  const traitAxes = {
    precision: { label: 'Precision', values: ['Low', 'Medium', 'High'], demanding: 'High' },
    horizon: { label: 'Horizon', values: ['Short', 'Long'], demanding: 'Long' },
  };
  const traitOf = (t) => ({
    precision: t.precision,
    horizon: String(t.horizon).startsWith('Long') ? 'Long' : 'Short',
  });
  const traitName = (axis, value) => `${value} ${axis}`;
  const traitMark = (axis, value) => reportIcon(`${axis}-${value.toLowerCase()}`);
  const traitButton = (axis, value) =>
    `<button type="button" data-trait-filter="${axis}" data-value="${value}" aria-pressed="false">${traitMark(axis, value)}<span class="outcome-trait-name">${value}</span><span class="outcome-trait-count" data-trait-count></span></button>`;
  const traitFilters = Object.entries(traitAxes)
    .map(
      ([axis, { label, values }]) =>
        `<div class="outcome-trait-group" role="group" aria-label="${label}"><span class="outcome-trait-axis">${label}</span>${values.map((value) => traitButton(axis, value)).join('')}</div>`,
    )
    .join('');
  failures.innerHTML = `<div class="outcome-split-legend"><span><i class="outcome-success" aria-hidden="true"></i>Complete success</span><span><i class="outcome-partial" aria-hidden="true"></i>Incomplete</span><span><i class="outcome-zero" aria-hidden="true"></i>Failed</span></div><div class="outcome-trait-filters" role="group" aria-label="Filter tasks by precision and horizon">${traitFilters}<button type="button" class="outcome-trait-clear" hidden>Clear filters</button></div><div class="outcome-breakdown-heading" aria-hidden="true"><span>Task</span><span>Episode outcomes</span><span>Episodes</span></div><div id="failure-depth-rows"></div><button class="failure-expand" type="button" aria-expanded="false" aria-controls="failure-depth-extra"><span data-failure-expand-label>Show all 26 tasks</span><span class="failure-expand-icon">${reportIcon('chevron-down')}</span></button><p class="outcome-filter-status" aria-live="polite" aria-atomic="true" hidden></p><p class="outcome-breakdown-note">Percentages use all evaluated episodes of each task. The marks under each task name give its precision and horizon, as in the filters above; the more demanding end of each axis &mdash; high precision, long horizon &mdash; is set in black. Select a task for exact counts.</p><p class="outcome-breakdown-readout" id="failure-readout" aria-live="polite" aria-atomic="true"></p>`;
  const initialRows = selected.map((name) => data.tasks.find((t) => t.task === name));
  const additionalRows = data.tasks
    .filter((t) => !selected.includes(t.task))
    .sort((a, b) => b.zero / b.n - a.zero / a.n || a.task.localeCompare(b.task));
  const outcomeLabels = { success: 'Complete success', partial: 'Incomplete', zero: 'Failed' };
  // Colour is already spent on the outcome split, so task type is marked by fixed-width
  // glyphs: the demanding end of each axis in ink, the rest recessive. The row's aria-label
  // spells the traits out, so the marks are decorative; a title keeps a text equivalent on hover.
  const taskTags = (t) => {
    const traits = traitOf(t);
    return `<span class="task-tags" aria-hidden="true">${Object.entries(traitAxes)
      .map(
        ([axis, { demanding }]) =>
          `<span class="task-tag${traits[axis] === demanding ? ' task-tag--demanding' : ''}" title="${traitName(axis, traits[axis])}">${traitMark(axis, traits[axis])}</span>`,
      )
      .join('')}</span>`;
  };
  const outcomeSummary = (t) =>
    `${taskName(t.task)} (${t.precision} precision, ${t.horizon}): ${Object.entries(outcomeLabels)
      .map(([key, label]) => `${label} ${t[key]}/${t.n} (${number((100 * t[key]) / t.n)}%)`)
      .join('; ')}.`;
  const failureRow = (t) =>
    `<button type="button" class="failure-depth-row" data-failure-task="${t.task}" data-precision="${traitOf(t).precision}" data-horizon="${traitOf(t).horizon}" aria-label="${esc(outcomeSummary(t))}"><span class="outcome-task-label">${esc(taskName(t.task))}${taskTags(t)}</span><span class="outcome-split-track" aria-hidden="true">${Object.entries(
      outcomeLabels,
    )
      .map(
        ([key, label]) =>
          `<span class="outcome-${key}" data-count="${t[key]}" style="width:${(100 * t[key]) / t.n}%" title="${label}: ${t[key]}/${t.n} (${number((100 * t[key]) / t.n)}%)">${(100 * t[key]) / t.n >= 10 ? Number(number((100 * t[key]) / t.n)) + '%' : ''}</span>`,
      )
      .join(
        '',
      )}</span><span class="outcome-task-count">${t.n}<span class="outcome-count-unit"> episodes</span></span></button>`;
  failures.querySelector('#failure-depth-rows').innerHTML =
    initialRows.map(failureRow).join('') +
    `<div id="failure-depth-extra" hidden>${additionalRows.map(failureRow).join('')}</div>`;
  const expandButton = failures.querySelector('.failure-expand');
  const clearSelection = () => {
    failures.querySelector('#failure-readout').textContent = '';
    failures
      .querySelectorAll('[data-failure-task]')
      .forEach((row) => row.removeAttribute('data-active'));
  };
  expandButton.addEventListener('click', () => {
    const expanded = expandButton.getAttribute('aria-expanded') !== 'true';
    expandButton.setAttribute('aria-expanded', String(expanded));
    failures.querySelector('#failure-depth-extra').hidden = !expanded;
    expandButton.querySelector('[data-failure-expand-label]').textContent = expanded
      ? 'Show fewer · 7 tasks'
      : 'Show all 26 tasks';
    if (!expanded) {
      clearSelection();
      if (expandButton.getBoundingClientRect().top < 90)
        expandButton.scrollIntoView({ block: 'center' });
    }
  });

  // Trait filters are a query over all 26 tasks, independent of the seven-task default:
  // while one is active every matching row is shown and the expand control steps aside;
  // clearing it returns to whichever of the two scopes was showing before.
  const filter = { precision: null, horizon: null };
  const other = (axis) => (axis === 'precision' ? 'horizon' : 'precision');
  const matching = (axis, value) =>
    data.tasks.filter((t) => {
      const traits = traitOf(t);
      return traits[axis] === value && (!filter[other(axis)] || traits[other(axis)] === filter[other(axis)]);
    }).length;
  const statusLine = failures.querySelector('.outcome-filter-status');
  const clearButton = failures.querySelector('.outcome-trait-clear');
  function applyTraitFilters() {
    const active = Boolean(filter.precision || filter.horizon);
    const expanded = expandButton.getAttribute('aria-expanded') === 'true';
    let shown = 0;
    failures.querySelectorAll('[data-failure-task]').forEach((row) => {
      const hide =
        active &&
        !(
          (!filter.precision || row.dataset.precision === filter.precision) &&
          (!filter.horizon || row.dataset.horizon === filter.horizon)
        );
      row.hidden = hide;
      if (!hide) shown++;
    });
    failures.querySelector('#failure-depth-extra').hidden = active ? false : !expanded;
    expandButton.hidden = active;
    const absent = [];
    failures.querySelectorAll('[data-trait-filter]').forEach((button) => {
      const axis = button.dataset.traitFilter,
        value = button.dataset.value,
        count = matching(axis, value),
        pressed = filter[axis] === value;
      button.setAttribute('aria-pressed', String(pressed));
      button.setAttribute('aria-disabled', String(!pressed && count === 0));
      button.querySelector('[data-trait-count]').textContent = count;
      button.setAttribute(
        'aria-label',
        `${traitName(axis, value)}, ${count} task${count === 1 ? '' : 's'}`,
      );
      // Name a value the current selection rules out, but only on the axis still open.
      if (!filter[axis] && count === 0) absent.push(traitName(axis, value).toLowerCase());
    });
    clearButton.hidden = !active;
    statusLine.hidden = !active;
    statusLine.textContent = active
      ? `Showing ${shown} of ${data.tasks.length} tasks: ${['precision', 'horizon']
          .filter((axis) => filter[axis])
          .map((axis) => traitName(axis, filter[axis]).toLowerCase())
          .join(', ')}.${absent.map((name) => ` None of them is ${name}.`).join('')}`
      : '';
    clearSelection();
  }
  failures.addEventListener('click', (event) => {
    const button = event.target.closest('[data-trait-filter]');
    if (button) {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const axis = button.dataset.traitFilter;
      filter[axis] = filter[axis] === button.dataset.value ? null : button.dataset.value;
    } else if (event.target.closest('.outcome-trait-clear')) {
      filter.precision = filter.horizon = null;
      failures.querySelector('[data-trait-filter]').focus();
    } else return;
    applyTraitFilters();
  });
  applyTraitFilters();
  function inspectFailure(e) {
    const b = e.target.closest('[data-failure-task]');
    if (!b) return;
    const t = data.tasks.find((t) => t.task === b.dataset.failureTask);
    const readout = failures.querySelector('#failure-readout');
    failures
      .querySelectorAll('[data-failure-task]')
      .forEach((row) => row.toggleAttribute('data-active', row === b));
    b.insertAdjacentElement('afterend', readout);
    readout.textContent = outcomeSummary(t);
  }
  failures.addEventListener('click', inspectFailure);
  failures.addEventListener('focusin', inspectFailure);
}

// Compare sensitivity to perturbations without hiding values behind plot markers.
function renderPerturbationRanges(container) {
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );
  const conditions = [
    ['object', 'Object', 120],
    ['background', 'Background', 130],
    ['instruction', 'Instruction', 130],
    ['mix', 'Mixed', 130],
  ];
  const rows = reportFigures.models
    .map((model) => {
      const rates = conditions.map(([key]) => model.generalization[key].sr * 100);
      return {
        id: model.id,
        label: modelLabel(model.id),
        rates,
        range: Math.max(...rates) - Math.min(...rates),
      };
    })
    .sort((a, b) => a.range - b.range || a.label.localeCompare(b.label));

  container.innerHTML = `
    <p class="perturbation-range-note" id="perturbation-range-note">
      <strong>How much does success rate change across conditions?</strong>
      Range is the highest minus the lowest success rate, in percentage points (pp).
    </p>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Success rates and variation across perturbation conditions">
      <table class="report-table report-table--plain perturbation-range-table" aria-describedby="perturbation-range-note">
        <thead><tr><th scope="col">Model</th>${conditions.map(([, label, episodes]) => `<th scope="col">${label}<small>${episodes} episodes</small></th>`).join('')}<th scope="col" aria-sort="ascending">Range (pp)</th></tr></thead>
        <tbody>${rows.map((row) => `<tr data-model="${escape(row.id)}" class="${row.id === 'Astra (ICL)' ? 'highlight' : ''}"><th scope="row">${escape(row.label)}</th>${row.rates.map((rate, i) => `<td data-condition="${conditions[i][0]}" data-value="${rate}">${rate.toFixed(2)}%</td>`).join('')}<td class="perturbation-range-value" data-range="${row.range}">${row.range.toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}
